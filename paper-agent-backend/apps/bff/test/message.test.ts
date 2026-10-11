import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { MessageService } from '../src/services/message.js'
import { ExecutionService } from '../src/services/execution.js'
import { TaskIndex } from '../src/store/task-index.js'
import { createLogger } from '../src/infra/logger.js'
import { errorBody } from '../src/infra/errors.js'
import type { AppContext } from '../src/app.js'
import { registerMessageRoutes } from '../src/routes/v1/messages.js'

/**
 * 多轮消息测试（BE-11，需求 §8.1 接口 14、§8.2 消息契约、§9.7 验收、P-05）：
 * - 空闲 → 200 {queued:false, turn_id, status:"running"}（立即投递）
 * - 运行中 → 200 {queued:true, order:N, status:"queued"}（**入队而非拒绝**，这是 P-05 病灶的核心）
 * - 回合结束后按序执行；删除仅限未发送；全程同一 AGH 会话（不新建会话）
 * - 双向互斥：消息投递中触发执行 → 409 BUSY（同一会话不能并发两个 turn）
 * - 终态任务允许 ask/revise（v2.2：追问不落产物，回复经 SSE 呈现）
 * - 校验：非法 action → 400；空/超长 text → 400；非法 turn_id → 400
 */

const TASK_ID = 'run-20261010-140000-aaa111'
const log = createLogger('error')

let tmp: string
let index: TaskIndex
let app: FastifyInstance
let exec: ExecutionService
let messages: MessageService
/** 记录每次 session.prompt 的调用，用于断言"同一会话 + 顺序" */
let prompts: Array<{ sessionId: string; cwd: string; text: string }>
/** 人工控制 prompt 的resolve 时机，从而确定性地构造"运行中" */
let gate: Array<() => void>

function seedTask(over: Record<string, unknown> = {}): void {
  index.put({
    task_id: TASK_ID,
    goal: '检索并综述固态电解质界面阻抗的表征方法',
    workflow: 'research',
    lit_source: 'local',
    sources: [],
    run_status: 'RUNNING',
    degraded: false,
    degraded_reasons: [],
    session_id: 'agnes:local:local-dev:cli:workspace:aaa111hash',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [{ id: 'R1', label: '多源检索', status: 'DONE', attempts: 1 }],
    ...over,
  } as never)
}

function makeGateway(): never {
  return {
    prompt: async (taskId: string, sessionId: string, cwd: string, text: string) => {
      prompts.push({ sessionId, cwd, text })
      // 挂起直到测试显式放行（构造确定性的"运行中"窗口）
      await new Promise<void>((resolve) => gate.push(resolve))
      return { reason: 'completed', lastSeq: 1 }
    },
  } as never
}

beforeEach(async () => {
  prompts = []
  gate = []
  tmp = mkdtempSync(join(tmpdir(), 'paper-msg-'))
  index = new TaskIndex(join(tmp, 'data'), log)
  const gateway = makeGateway()
  const runsDir = join(tmp, 'runs')
  exec = new ExecutionService(gateway, index, runsDir, log)
  messages = new MessageService(gateway, index, runsDir, log, (taskId) => exec.isExecuting(taskId))
  // 与 index.ts 装配保持一致的双向互斥
  exec.onTurnSettled = (taskId: string) => messages.onTaskIdle(taskId)
  exec.externalBusy = (taskId: string) => messages.isActive(taskId)

  const stubCtx = { index, cfg: { runsDir }, exec, messages } as unknown as AppContext
  app = Fastify({ logger: false })
  app.setErrorHandler((err, _req, reply) => {
    const e = err as { code?: string; status?: number; message?: string }
    if (e && typeof e.code === 'string' && typeof e.status === 'number') {
      reply.code(e.status).send(errorBody(err as never))
      return
    }
    reply.code(500).send({ error: String(e?.message ?? err), code: 'INTERNAL' })
  })
  await app.register(async (v1) => registerMessageRoutes(v1 as never, stubCtx, messages), { prefix: '/api/v1' })
  await app.ready()
})

afterEach(async () => {
  // 放行所有挂起的 prompt，避免测试结束时泄漏未resolve 的 Promise
  for (const r of gate) r()
  await app.close()
  rmSync(tmp, { recursive: true, force: true })
})

const post = (body: unknown, taskId = TASK_ID) =>
  app.inject({ method: 'POST', url: `/api/v1/tasks/${taskId}/messages`, payload: body as never })

// ------------------------------------------------------------------ 契约

describe('POST /api/v1/tasks/{id}/messages（§8.2 契约）', () => {
  it('空闲 →200 {queued:false, turn_id, status:"running"}（立即投递）', async () => {
    seedTask({ run_status: 'PLANNED' })
    const res = await post({ text: '请补充近两年的最新进展', action: 'ask' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ queued: false, status: 'running' })
    expect(res.json().turn_id).toBe('turn-1')
  })

  it('运行中 → 200 {queued:true, order:N, status:"queued"}（入队，不是拒绝）', async () => {
    seedTask({ run_status: 'RUNNING' })
    // 第一条占用 active，第二条必须排队
    const first = await post({ text: '第一条' })
    expect(first.json()).toMatchObject({ queued: false })
    const second = await post({ text: '第二条' })
    expect(second.statusCode).toBe(200)
    expect(second.json()).toMatchObject({ queued: true, order: 1, status: 'queued' })
    const third = await post({ text: '第三条' })
    expect(third.json()).toMatchObject({ queued: true, order: 2 })
  })

  it('action 缺省时默认 ask（§8.2 示例）', async () => {
    seedTask({ run_status: 'PLANNED' })
    const res = await post({ text: '只给文本' })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/messages` })
    expect(list.json().active.action).toBe('ask')
  })

  it('revise 走修订指令：要求落到内核工具 + 禁止凭空断言（§11）', async () => {
    seedTask({ run_status: 'PLANNED' })
    await post({ text: '把结论改成保守表述', action: 'revise' })
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.text).toContain('修订')
    expect(prompts[0]!.text).toContain('禁止凭空断言')
    expect(prompts[0]!.text).toContain('把结论改成保守表述')
  })

  it('ask 追问要求引用证据编号（防止模型自由发挥）', async () => {
    seedTask({ run_status: 'PLANNED' })
    await post({ text: '这些结论有证据支撑吗？', action: 'ask' })
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts[0]!.text).toContain('[EV-xxxx]')
    expect(prompts[0]!.text).toContain('这些结论有证据支撑吗？')
  })
})

// ------------------------------------------------------------------ 同会话

describe('§9.7「全程仍在同一 AGH 会话留痕」', () => {
  it('追问复用任务的既有 session_id 与 run 目录，不新建会话', async () => {
    seedTask({ run_status: 'PLANNED' })
    await post({ text: '第一条' })
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 10))
    await post({ text: '第二条' })
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts).toHaveLength(2)
    expect(prompts[0]!.sessionId).toBe('agnes:local:local-dev:cli:workspace:aaa111hash')
    expect(prompts[1]!.sessionId).toBe(prompts[0]!.sessionId)
    // cwd 必须是 runs/<task_id>（AGH 会话 id 由 cwd 派生，写错会导致会话键不匹配）
    expect(prompts[0]!.cwd).toContain(TASK_ID)
    expect(prompts[1]!.cwd).toBe(prompts[0]!.cwd)
  })
})

// ------------------------------------------------------------------ 排队

describe('运行中排队与按序执行（§9.7「结束后按序执行」）', () => {
  it('空闲钩子触发后按入队顺序依次投递', async () => {
    seedTask({ run_status: 'PLANNED' })
    // 先让执行回合占位（模拟运行中），此时三条都只能入队
    exec['locks'].set(TASK_ID, { action: 'run-all', startedAt: new Date().toISOString(), sessionId: 'x' })
    await post({ text: '第一' })
    await post({ text: '第二' })
    await post({ text: '第三' })
    expect(prompts).toHaveLength(0)

    // 释放执行锁并触发空闲回调 → 放行**第一条**（串行：一次只发一条）
    exec['locks'].delete(TASK_ID)
    messages.onTaskIdle(TASK_ID)
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.text).toContain('第一')

    // 第一条完成后自动接第二条
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts).toHaveLength(2)
    expect(prompts[1]!.text).toContain('第二')

    // 第二条完成后接第三条
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts).toHaveLength(3)
    expect(prompts[2]!.text).toContain('第三')
  })

  it('投递失败要落历史并可观测（不静默吞掉），且不阻塞后续队列', async () => {
    seedTask({ run_status: 'PLANNED' })
    let calls = 0
    const failing = {
      prompt: async () => {
        calls += 1
        if (calls === 1) throw new Error('会话不可用')
        return { reason: 'completed', lastSeq: 1 }
      },
    } as never
    const svc = new MessageService(failing, index, join(tmp, 'runs'), log, () => false)
    const r1 = svc.send(TASK_ID, '会失败的一条', 'ask')
    expect(r1.queued).toBe(false)
    await new Promise((r) => setTimeout(r, 20))
    const list = svc.list(TASK_ID)
    expect(list.history).toHaveLength(1)
    expect(list.history[0]!.status).toBe('failed')
    expect(list.history[0]!.error).toContain('会话不可用')
    // 失败作为 info 级降级记录落到任务上（前端能看到"这条没发出去"）
    const task = index.get(TASK_ID)!
    expect(task.degraded_reasons.some((d) => d.reason.includes('追问发送失败'))).toBe(true)
  })

  it('运行中排队，终态后仍按序放行（v2.2：排队消息不因任务跑完被丢弃）', async () => {
    seedTask({ run_status: 'PLANNED' })
    exec['locks'].set(TASK_ID, { action: 'run-all', startedAt: new Date().toISOString(), sessionId: 'x' })
    await post({ text: '排队消息' })
    index.get(TASK_ID)!.run_status = 'DONE'
    index.put(index.get(TASK_ID)!)
    exec['locks'].delete(TASK_ID)
    messages.onTaskIdle(TASK_ID)
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts).toHaveLength(1)
    expect(prompts[0]!.text).toContain('排队消息')
  })
})

// ------------------------------------------------------------------ 互斥

describe('双向互斥（同一 AGH 会话不能并发两个 turn）', () => {
  it('消息投递中触发执行 → 409 BUSY（不是并发打同一会话）', () => {
    seedTask({ run_status: 'PLANNED' })
    messages.send(TASK_ID, '正在投递', 'ask')
    expect(messages.isActive(TASK_ID)).toBe(true)
    expect(() => exec.runAll(TASK_ID)).toThrow(/追问消息/)
  })

  it('消息投递中 busy 为 true（前端据此禁用运行按钮）', async () => {
    seedTask({ run_status: 'PLANNED' })
    messages.send(TASK_ID, '正在投递', 'ask')
    const res = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/messages` })
    expect(res.json().busy).toBe(true)
  })
})

// ------------------------------------------------------------------ 终态追问

describe('终态任务追问（v2.2：DONE/FAILED 允许 ask/revise，产物不可变）', () => {
  it('DONE 任务 ask → 200 立即投递（拿到报告后的第一动作就是追问）', async () => {
    seedTask({ run_status: 'DONE' })
    const res = await post({ text: '结论的依据是什么？', action: 'ask' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ queued: false, status: 'running' })
  })

  it('FAILED 任务 ask → 200 立即投递', async () => {
    seedTask({ run_status: 'FAILED' })
    const res = await post({ text: '失败原因是什么？' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ queued: false })
  })

  it('DONE 任务 ask 指令：基于既有证据回答，且不改写终态产物', async () => {
    seedTask({ run_status: 'DONE' })
    await post({ text: '再解释下证据链', action: 'ask' })
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts[0]!.text).toContain('不可变')
    expect(prompts[0]!.text).toContain('[EV-xxxx]')
    expect(prompts[0]!.text).toContain('再解释下证据链')
  })

  it('DONE 任务 revise → 修订建议语义：只给建议文本，不重建报告（重建属后续里程碑）', async () => {
    seedTask({ run_status: 'DONE' })
    await post({ text: '结论表述太绝对', action: 'revise' })
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 10))
    expect(prompts[0]!.text).toContain('修订建议')
    expect(prompts[0]!.text).not.toContain('重跑受影响步骤')
    expect(prompts[0]!.text).toContain('结论表述太绝对')
  })

  it('终态投递经 SSE message 事件呈现（user running）', async () => {
    seedTask({ run_status: 'DONE' })
    const events: Array<Record<string, unknown>> = []
    messages.onMessageEvent = (taskId, ev) => events.push({ task_id: taskId, ...ev })
    await post({ text: '追问', action: 'ask' })
    await new Promise((r) => setTimeout(r, 10))
    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(events[0]).toMatchObject({ role: 'user', status: 'running', text: '追问' })
  })

  it('归档互锁优先于终态放行：DONE 且已归档 → 409 BAD_STATE', async () => {
    seedTask({ run_status: 'DONE', archived: true })
    const res = await post({ text: '还能问吗' })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('BAD_STATE')
    expect(res.json().error).toContain('归档')
  })

  it('锁与互斥规则不变：终态任务消息投递中触发执行 → 409 BUSY', () => {
    seedTask({ run_status: 'DONE' })
    messages.send(TASK_ID, '正在投递', 'ask')
    expect(messages.isActive(TASK_ID)).toBe(true)
    expect(() => exec.runAll(TASK_ID)).toThrow(/追问消息/)
  })
})

// ------------------------------------------------------------------ 删除

describe('DELETE /api/v1/tasks/{id}/messages/{turnId}（§9.7「支持立即发送/删除」）', () => {
  it('可删除未发送的排队消息，且order 重排', async () => {
    seedTask({ run_status: 'RUNNING' })
    await post({ text: '占位（active）' })
    const b = await post({ text: '待删' })
    const c = await post({ text: '保留' })
    expect(b.json().order).toBe(1)
    expect(c.json().order).toBe(2)
    const del = await app.inject({ method: 'DELETE', url: `/api/v1/tasks/${TASK_ID}/messages/${b.json().turn_id}` })
    expect(del.statusCode).toBe(200)
    expect(del.json()).toEqual({ deleted: true, turn_id: b.json().turn_id })
    const list = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/messages` })
    expect(list.json().pending).toHaveLength(1)
    // 删除后重排：保留的那条变成第 1 条
    expect(list.json().pending[0].order).toBe(1)
  })

  it('删除不存在的 turn → 400 BAD_PARAM（turn_id 白名单）', async () => {
    seedTask()
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/tasks/${TASK_ID}/messages/not-a-turn` })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('BAD_PARAM')
  })

  it('删除已完成的消息 → 409 BAD_STATE（属会话留痕，不可删）', async () => {
    seedTask({ run_status: 'PLANNED' })
    const sent = await post({ text: '已完成' })
    for (const r of gate) r()
    await new Promise((r) => setTimeout(r, 20))
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/tasks/${TASK_ID}/messages/${sent.json().turn_id}` })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('BAD_STATE')
    expect(res.json().error).toContain('会话留痕')
  })
})

// ------------------------------------------------------------------ 校验

describe('参数校验', () => {
  it('text 缺失/空/非字符串 → 400 BAD_PARAM', async () => {
    seedTask()
    for (const body of [{}, { text: '' }, { text: '   ' }, { text: 123 }]) {
      const res = await post(body)
      expect(res.statusCode).toBe(400)
      expect(res.json().code).toBe('BAD_PARAM')
    }
  })

  it('text 超长 → 400 并给出上限', async () => {
    seedTask()
    const res = await post({ text: 'x'.repeat(5000) })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('4000')
  })

  it('非法 action → 400 并列出允许值（不静默回退）', async () => {
    seedTask()
    const res = await post({ text: '文本', action: 'delete' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('ask')
    expect(res.json().error).toContain('revise')
  })

  it('任务不存在 → 404；非法 task_id → 400 BAD_ID', async () => {
    const missing = await post({ text: 'x' }, 'run-19700101-000000-nope00')
    expect(missing.statusCode).toBe(404)
    const bad = await post({ text: 'x' }, 'notATask')
    expect(bad.statusCode).toBe(400)
    expect(bad.json().code).toBe('BAD_ID')
  })

  it('队列上限保护：超过 MAX_QUEUE 拒绝并提示可删除', async () => {
    seedTask({ run_status: 'RUNNING' })
    messages.send(TASK_ID, '占位', 'ask')
    for (let i = 0; i < 20; i += 1) messages.send(TASK_ID, `第${i}条`, 'ask')
    const res = await post({ text: '超限' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toContain('上限')
    expect(res.json().error).toContain('DELETE')
  })
})
