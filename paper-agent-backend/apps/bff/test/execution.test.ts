import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ExecutionService } from '../src/services/execution.js'
import { TaskIndex, type TaskRecord } from '../src/store/task-index.js'
import { ApiError } from '../src/infra/errors.js'
import { createLogger } from '../src/infra/logger.js'
import type { AgnesGateway } from '../src/agh/gateway.js'

/**
 * 执行编排器单元测试（BE-05，需求 §8.1 接口 5–8 / §8.3 错误码 / §9.2 验收）：
 * - per-Task 互斥 → 409 BUSY
 * - 指令组装（必须指名工具 + run_dir，且要求真实调用）
 * - step 校验（缺字段 BAD_BODY / 未知步骤 BAD_PARAM）
 * - 状态同步（只读内核 state.json 回写索引；不 spawn 内核）
 * - resume/stop 的终态语义
 */

const GOAL = '检索并综述固态电解质界面阻抗的表征方法'
const STEPS = [
  { id: 'R1', label: '多源检索' },
  { id: 'R2', label: '论文精读' },
  { id: 'R3', label: '创新点拆解' },
]

class FakeGateway {
  prompts: Array<{ taskId: string; text: string }> = []
  cancelled: string[] = []
  /** 让 prompt 悬停在指定时长，便于构造并发窗口 */
  holdMs = 0
  async prompt(taskId: string, _sessionId: string, _cwd: string, text: string): Promise<{ reason: string; lastSeq: number }> {
    this.prompts.push({ taskId, text })
    if (this.holdMs > 0) await new Promise((r) => setTimeout(r, this.holdMs))
    return { reason: 'end_turn', lastSeq: 1 }
  }
  async cancelTurn(taskId: string): Promise<void> {
    this.cancelled.push(taskId)
  }
}

let tmp: string
let runsDir: string
let index: TaskIndex
let gateway: FakeGateway
let exec: ExecutionService

function makeTask(taskId: string, over: Partial<TaskRecord> = {}): TaskRecord {
  const rec: TaskRecord = {
    task_id: taskId,
    goal: GOAL,
    workflow: 'research',
    lit_source: 'local',
    sources: [],
    run_status: 'PLANNED',
    degraded: false,
    degraded_reasons: [],
    session_id: 'agnes:test',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: STEPS.map((s) => ({ ...s, status: 'PENDING', attempts: 0 })),
    ...over,
  }
  index.put(rec)
  return rec
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'paper-exec-'))
  runsDir = join(tmp, 'runs')
  mkdirSync(runsDir, { recursive: true })
  index = new TaskIndex(join(tmp, 'data'), createLogger('error'))
  gateway = new FakeGateway()
  exec = new ExecutionService(gateway as unknown as AgnesGateway, index, runsDir, createLogger('error'))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe('ExecutionService · 指令组装与派发', () => {
  it('run-all 指令包含 plan/run_all/status 三个工具与 run_dir', () => {
    makeTask('run-1')
    exec.runAll('run-1')
    const text = gateway.prompts[0]!.text
    expect(text).toContain('sciret_plan')
    expect(text).toContain('sciret_run_all')
    expect(text).toContain('sciret_status')
    expect(text).toContain('run_dir="')
    expect(text).toContain(join(runsDir, 'run-1').replace(/\\/g, '/'))
    expect(text).toContain(GOAL)
  })

  it('step 指令包含 sciret_run_step 与目标步骤', () => {
    makeTask('run-2')
    exec.step('run-2', 'R2')
    const text = gateway.prompts[0]!.text
    expect(text).toContain('sciret_run_step')
    expect(text).toContain('step="R2"')
  })

  it('resume 指令包含 sciret_resume 且 execute=true', () => {
    makeTask('run-3')
    exec.resume('run-3')
    expect(gateway.prompts[0]!.text).toContain('sciret_resume')
  })

  it('返回 202 语义字段：run_status=RUNNING', async () => {
    makeTask('run-4')
    expect(exec.runAll('run-4')).toEqual({ task_id: 'run-4', run_status: 'RUNNING' })
    await exec.whenIdle('run-4', 5000)
    makeTask('run-4b')
    expect(exec.step('run-4b', 'R1').run_status).toBe('RUNNING')
    await exec.whenIdle('run-4b', 5000)
  })
})

describe('ExecutionService · per-Task 互斥（§9.2 验收条款 2）', () => {
  it('同一任务执行中再次触发 → BUSY', async () => {
    makeTask('run-5')
    gateway.holdMs = 300
    exec.runAll('run-5')
    expect(() => exec.step('run-5', 'R1')).toThrowError(ApiError)
    try {
      exec.step('run-5', 'R1')
    } catch (e) {
      expect((e as ApiError).code).toBe('BUSY')
      expect((e as ApiError).status).toBe(409)
    }
    await exec.whenIdle('run-5', 5000)
    // 执行结束后可再次触发
    expect(() => exec.runAll('run-5')).not.toThrow()
  })

  it('不同任务互不影响', async () => {
    makeTask('run-6')
    makeTask('run-7')
    gateway.holdMs = 200
    exec.runAll('run-6')
    expect(() => exec.runAll('run-7')).not.toThrow()
    await exec.whenIdle('run-6', 5000)
    await exec.whenIdle('run-7', 5000)
  })
})

describe('ExecutionService · 入参校验', () => {
  it('未知步骤 → BAD_PARAM', () => {
    makeTask('run-8')
    try {
      exec.step('run-8', 'R9')
      throw new Error('应当抛出')
    } catch (e) {
      expect((e as ApiError).code).toBe('BAD_PARAM')
    }
  })

  it('缺 step → BAD_BODY', () => {
    makeTask('run-9')
    try {
      exec.step('run-9', undefined)
      throw new Error('应当抛出')
    } catch (e) {
      expect((e as ApiError).code).toBe('BAD_BODY')
    }
  })

  it('任务不存在 → NOT_FOUND', () => {
    try {
      exec.runAll('run-missing')
      throw new Error('应当抛出')
    } catch (e) {
      expect((e as ApiError).code).toBe('NOT_FOUND')
    }
  })
})

describe('ExecutionService · 状态同步（只读内核产物，不 spawn）', () => {
  it('读取 state.json 回写步骤/终态/降级', () => {
    const id = 'run-10'
    makeTask(id)
    const dir = join(runsDir, id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'state.json'),
      JSON.stringify({
        run_status: 'DONE',
        degraded: true,
        degraded_reasons: [{ level: 'degraded', source: 'crossref', reason: '限流', impact: '覆盖收窄', resumable: true, step: 'R1', at: 'now' }],
        source_status: { crossref: 'unavailable:429', openalex: 'ok:8' },
        steps: [
          { id: 'R1', status: 'DONE', attempts: 1 },
          { id: 'R2', status: 'FAILED', attempts: 2 },
          { id: 'R3', status: 'SKIPPED', attempts: 0 },
        ],
      }),
      'utf8',
    )
    const task = index.get(id)!
    const status = exec.syncFromKernel(task)
    expect(status).toBe('DONE')
    expect(task.steps.map((s) => s.status)).toEqual(['DONE', 'FAILED', 'SKIPPED'])
    expect(task.steps[1]!.attempts).toBe(2)
    expect(task.degraded).toBe(true)
    expect(task.degraded_reasons[0]!.source).toBe('crossref')
    expect(task.sources).toEqual(['crossref', 'openalex'])
  })

  it('state.json 缺失时保持原状态（不臆造）', () => {
    makeTask('run-11')
    const task = index.get('run-11')!
    expect(exec.syncFromKernel(task)).toBe('PLANNED')
    expect(task.run_status).toBe('PLANNED')
  })
})

describe('ExecutionService · resume / stop 终态语义', () => {
  it('已完成任务 resume → BAD_STATE（不空跑）', () => {
    const id = 'run-12'
    makeTask(id, {
      run_status: 'DONE',
      steps: STEPS.map((s) => ({ ...s, status: 'DONE', attempts: 1 })),
    })
    try {
      exec.resume(id)
      throw new Error('应当抛出')
    } catch (e) {
      expect((e as ApiError).code).toBe('BAD_STATE')
    }
  })

  it('运行中 stop → 中止回合 + final_state=CANCELLED（终态不可逆）', async () => {
    const id = 'run-13'
    makeTask(id)
    gateway.holdMs = 400
    exec.runAll(id)
    const out = await exec.stop(id)
    expect(out.final_state).toBe('CANCELLED')
    expect(out.run_status).toBe('FAILED')
    expect(gateway.cancelled).toContain(id)
    await exec.whenIdle(id, 5000)
  })

  it('已 DONE 的任务 stop → 幂等返回 DONE，不改状态', async () => {
    const id = 'run-14'
    makeTask(id, { run_status: 'DONE', steps: STEPS.map((s) => ({ ...s, status: 'DONE', attempts: 1 })) })
    const out = await exec.stop(id)
    expect(out.final_state).toBe('DONE')
    expect(out.run_status).toBe('DONE')
  })
})

describe('ExecutionService · 受控模型综合回合（T4）与规划查询（T5）', () => {
  /** 在 runs 目录伪造"整链 DONE + 报告就绪"的内核产物 */
  function seedDoneRun(id: string, withReport = true): void {
    const dir = join(runsDir, id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'state.json'),
      JSON.stringify({
        run_status: 'DONE',
        degraded: false,
        degraded_reasons: [],
        source_status: { crossref: 'ok:8' },
        steps: STEPS.map((s) => ({ ...s, status: 'DONE', attempts: 1 })),
      }),
      'utf8',
    )
    if (withReport) {
      writeFileSync(join(dir, 'report.json'), JSON.stringify({ title: 'r', sections: [], conclusions: [] }), 'utf8')
    }
  }

  it('run-all 到达 DONE 且报告就绪 → 同一会话追加 sciret_synthesize 指令回合', async () => {
    const id = 'run-syn'
    makeTask(id)
    seedDoneRun(id)
    exec.runAll(id)
    await exec.whenIdle(id, 5000)
    expect(gateway.prompts.length).toBe(2)
    const synth = gateway.prompts[1]!.text
    expect(synth).toContain('sciret_synthesize')
    expect(synth).toContain('[EV-')
    expect(synth).toContain('report.json')
    expect(synth).toContain(join(runsDir, id).replace(/\\/g, '/'))
  })

  it('报告未就绪（无 report.json）→ 不追加综合回合', async () => {
    const id = 'run-syn-nr'
    makeTask(id)
    seedDoneRun(id, false)
    exec.runAll(id)
    await exec.whenIdle(id, 5000)
    expect(gateway.prompts.length).toBe(1)
  })

  it('主链路未到 DONE → 不追加综合回合', async () => {
    const id = 'run-syn-partial'
    makeTask(id)
    exec.runAll(id)
    await exec.whenIdle(id, 5000)
    expect(gateway.prompts.length).toBe(1)
  })

  it('run-all 指令要求模型先产出英文检索查询并经 queries 传入 sciret_plan（T5）', () => {
    makeTask('run-q1')
    exec.runAll('run-q1')
    const text = gateway.prompts[0]!.text
    expect(text).toContain('queries')
    expect(text).toContain('英文关键词式')
    expect(text).toContain('Crossref/OpenAlex')
  })

  it('S1（受控模型步骤）手动单步 → BAD_PARAM', () => {
    makeTask('run-s5', {
      steps: [...STEPS.map((s) => ({ ...s, status: 'PENDING' as const, attempts: 0 })), { id: 'S1', label: '综合回答', status: 'PENDING', attempts: 0 }],
    })
    try {
      exec.step('run-s5', 'S1')
      throw new Error('应当抛出')
    } catch (e) {
      expect((e as ApiError).code).toBe('BAD_PARAM')
    }
  })

  it('resume 的续跑起点跳过 S1：仅剩 S1 待办时视为无可续跑（BAD_STATE，不空跑）', () => {
    makeTask('run-s6', {
      run_status: 'DONE',
      steps: [...STEPS.map((s) => ({ ...s, status: 'DONE' as const, attempts: 1 })), { id: 'S1', label: '综合回答', status: 'PENDING', attempts: 0 }],
    })
    try {
      exec.resume('run-s6')
      throw new Error('应当抛出')
    } catch (e) {
      expect((e as ApiError).code).toBe('BAD_STATE')
    }
  })
})