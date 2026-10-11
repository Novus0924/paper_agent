import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { ExecutionService } from '../src/services/execution.js'
import { MessageService } from '../src/services/message.js'
import { TaskIndex, type TaskRecord } from '../src/store/task-index.js'
import { createLogger } from '../src/infra/logger.js'
import { errorBody } from '../src/infra/errors.js'
import type { AppContext } from '../src/app.js'
import { registerTasksRoutes } from '../src/routes/v1/tasks.js'
import { registerExecutionRoutes } from '../src/routes/v1/execution.js'
import { registerMessageRoutes } from '../src/routes/v1/messages.js'
import type { AgnesGateway } from '../src/agh/gateway.js'

/**
 * 任务归档（v2.1）：
 * - POST /api/v1/tasks/{id}/archive（body {"archived": boolean} 必填）
 *   成功 200 {task_id, archived, archived_at}（恢复时 archived_at=null）；
 *   RUNNING / 执行锁占用 → 409 BAD_STATE；任务不存在 → 404；非法 body → 400 BAD_BODY。
 * - GET /api/v1/tasks?archived= 三态过滤（缺省 false 只看活跃；true 只看归档；all 全部）。
 * - 归档互锁：执行类操作（run-all/step/resume）与 messages POST → 409 BAD_STATE；GET 不受限。
 */

const TASK_ID = 'run-20261011-090000-aaa111'
const log = createLogger('error')

let tmp: string
let index: TaskIndex
let app: FastifyInstance
let exec: ExecutionService
let messages: MessageService
let heldPromises: Array<() => void>

class FakeGateway {
  async prompt(): Promise<{ reason: string; lastSeq: number }> {
    await new Promise<void>((resolve) => heldPromises.push(resolve))
    return { reason: 'end_turn', lastSeq: 1 }
  }
  async cancelTurn(): Promise<void> {}
}

function seedTask(over: Partial<TaskRecord> = {}): TaskRecord {
  const rec: TaskRecord = {
    task_id: TASK_ID,
    goal: '检索并综述固态电解质界面阻抗的表征方法',
    workflow: 'research',
    lit_source: 'local',
    sources: [],
    run_status: 'PLANNED',
    degraded: false,
    degraded_reasons: [],
    session_id: 'agnes:local:local-dev:cli:workspace:aaa111hash',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [{ id: 'R1', label: '多源检索', status: 'PENDING', attempts: 0 }],
    ...over,
  }
  index.put(rec)
  return rec
}

beforeEach(async () => {
  heldPromises = []
  tmp = mkdtempSync(join(tmpdir(), 'paper-archive-'))
  index = new TaskIndex(join(tmp, 'data'), log)
  const gateway = new FakeGateway()
  const runsDir = join(tmp, 'runs')
  exec = new ExecutionService(gateway as unknown as AgnesGateway, index, runsDir, log)
  messages = new MessageService(gateway as unknown as AgnesGateway, index, runsDir, log, (id) => exec.isExecuting(id))

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
  await app.register(async (v1) => {
    registerTasksRoutes(v1 as never, stubCtx)
    registerExecutionRoutes(v1 as never, stubCtx, exec)
    registerMessageRoutes(v1 as never, stubCtx, messages)
  }, { prefix: '/api/v1' })
  await app.ready()
})

afterEach(async () => {
  for (const r of heldPromises) r()
  await app.close()
  rmSync(tmp, { recursive: true, force: true })
})

const archive = (body: unknown, taskId = TASK_ID) =>
  app.inject({ method: 'POST', url: `/api/v1/tasks/${taskId}/archive`, payload: body as never })
const listTasks = (query = '') => app.inject({ method: 'GET', url: `/api/v1/tasks${query}` })

// ------------------------------------------------------------------ 归档契约

describe('POST /api/v1/tasks/{id}/archive', () => {
  it('归档成功 → 200 {task_id, archived:true, archived_at:ISO8601}', async () => {
    seedTask()
    const res = await archive({ archived: true })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.task_id).toBe(TASK_ID)
    expect(body.archived).toBe(true)
    expect(body.archived_at).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(body.archived_at))).toBe(false)
  })

  it('恢复（archived=false）→ 200 {archived:false, archived_at:null}', async () => {
    seedTask({ archived: true, archived_at: new Date().toISOString() })
    const res = await archive({ archived: false })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ task_id: TASK_ID, archived: false, archived_at: null })
  })

  it('RUNNING 任务归档 → 409 BAD_STATE（任务运行中，请先停止）', async () => {
    seedTask({ run_status: 'RUNNING' })
    const res = await archive({ archived: true })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('BAD_STATE')
    expect(res.json().error).toContain('任务运行中')
  })

  it('执行锁占用（isBusy）→ 409 BAD_STATE', async () => {
    seedTask()
    exec['locks'].set(TASK_ID, { action: 'run-all', startedAt: new Date().toISOString(), sessionId: 'x' })
    const res = await archive({ archived: true })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('BAD_STATE')
  })

  it('任务不存在 → 404 NOT_FOUND', async () => {
    seedTask()
    const res = await archive({ archived: true }, 'run-19700101-000000-nope00')
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NOT_FOUND')
  })

  it('body 校验：archived 缺失/非布尔 → 400 BAD_BODY', async () => {
    seedTask()
    for (const body of [undefined, {}, { archived: 'true' }, { archived: 1 }, { archived: null }]) {
      const res = await archive(body)
      expect(res.statusCode).toBe(400)
      expect(res.json().code).toBe('BAD_BODY')
    }
  })

  it('非法 task_id → 400 BAD_ID（白名单校验）', async () => {
    seedTask()
    const res = await archive({ archived: true }, 'notATask')
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('BAD_ID')
  })
})

// ------------------------------------------------------------------ 列表过滤

describe('GET /api/v1/tasks?archived=（三态过滤）', () => {
  it('缺省 archived=false：只看活跃，归档任务不可见', async () => {
    seedTask()
    seedTask({ task_id: 'run-20261011-090000-bbb222', archived: true, archived_at: new Date().toISOString() })
    const res = await listTasks()
    expect(res.json().total).toBe(1)
    expect(res.json().tasks[0].task_id).toBe(TASK_ID)
  })

  it('archived=true：只看归档', async () => {
    seedTask()
    seedTask({ task_id: 'run-20261011-090000-bbb222', archived: true, archived_at: new Date().toISOString() })
    const res = await listTasks('?archived=true')
    expect(res.json().total).toBe(1)
    expect(res.json().tasks[0].task_id).toBe('run-20261011-090000-bbb222')
  })

  it('archived=all：全部可见', async () => {
    seedTask()
    seedTask({ task_id: 'run-20261011-090000-bbb222', archived: true, archived_at: new Date().toISOString() })
    const res = await listTasks('?archived=all')
    expect(res.json().total).toBe(2)
  })

  it('archived 非法值 → 400 BAD_PARAM', async () => {
    seedTask()
    const res = await listTasks('?archived=whatever')
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('BAD_PARAM')
  })

  it('旧记录（无 archived 字段）视作活跃；快照 DTO 透传 archived/archived_at', async () => {
    seedTask()
    const res = await listTasks()
    expect(res.json().tasks[0].archived).toBe(false)
    expect(res.json().tasks[0].archived_at).toBeNull()
    const snap = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}` })
    expect(snap.json().archived).toBe(false)
    expect(snap.json().archived_at).toBeNull()
  })
})

// ------------------------------------------------------------------ 归档互锁

describe('归档互锁（执行类操作与 messages POST 拒绝；GET 不受限）', () => {
  it('archived 任务 run-all / step / resume → 409 BAD_STATE（任务已归档，请先恢复）', async () => {
    seedTask({ archived: true, archived_at: new Date().toISOString() })
    for (const fire of [
      () => exec.runAll(TASK_ID),
      () => exec.step(TASK_ID, 'R1'),
      () => exec.resume(TASK_ID),
    ]) {
      try {
        fire()
        throw new Error('应当抛出')
      } catch (e) {
        expect((e as { code?: string }).code).toBe('BAD_STATE')
        expect((e as Error).message).toContain('已归档')
      }
    }
  })

  it('archived 任务 POST messages → 409 BAD_STATE；恢复后可正常发送', async () => {
    seedTask({ archived: true, archived_at: new Date().toISOString() })
    const res = await app.inject({ method: 'POST', url: `/api/v1/tasks/${TASK_ID}/messages`, payload: { text: '追问' } as never })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('BAD_STATE')
    expect(res.json().error).toContain('已归档')

    await archive({ archived: false })
    const ok = await app.inject({ method: 'POST', url: `/api/v1/tasks/${TASK_ID}/messages`, payload: { text: '恢复后的追问' } as never })
    expect(ok.statusCode).toBe(200)
  })

  it('未归档任务执行不受影响；GET 快照对 archived 任务保持 200', async () => {
    seedTask({ archived: true, archived_at: new Date().toISOString() })
    const snap = await app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}` })
    expect(snap.statusCode).toBe(200)

    seedTask({ task_id: 'run-20261011-090000-ccc333' })
    const res = app.inject({ method: 'POST', url: '/api/v1/tasks/run-20261011-090000-ccc333/step', payload: { step: 'R1' } as never })
    await res
    for (const r of heldPromises) r()
    expect((await res).statusCode).toBe(202)
  })
})
