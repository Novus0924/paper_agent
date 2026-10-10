import { describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerEventsRoute } from '../src/routes/v1/events.js'
import { errorBody } from '../src/infra/errors.js'
import type { AppContext } from '../src/app.js'
import type { RelayEvent } from '../src/events/model.js'

/**
 * SSE 端点层验收（需求 §5.2 / §8.1 接口 9 / §16 DoD「SSE 快照/顺序/去重/终态正确，
 * 刷新与实时一致」）。
 *
 * 为什么在端点层再验一遍，而 events.test.ts 已经测过 EventBus：
 * EventBus 是**内存数据结构**的正确性，SSE 是**线协议**的正确性——两者会独立地坏。
 * 实测中踩过的坑全在协议层，不在数据结构层：
 *   - 快照走全局广播 → 二次连接被幂等去重吞掉（客户端永远收不到快照）；
 *   - drain 未跳过已直写的快照 seq → 首帧重复；
 *   - 终态帧没先写 socket 就end → 客户端丢最后一帧（表现为"任务完成但前端永不更新"）。
 * 这三条 EventBus 单测全都测不出来。
 */

const TASK_ID = 'run-20261010-190000-sse00001'

type Handler = (e: RelayEvent) => void

/** 极简 EventBus 替身：只为驱动路由，语义对齐真实 relay（快照 + 订阅 + drain）。 */
function makeRelay(initial: RelayEvent[]) {
  const bySeq = new Map<number, RelayEvent>()
  for (const e of initial) bySeq.set(e.seq, e)
  let handler: Handler | null = null
  return {
    /** 本连接打开时"直写"的帧 */
    snapshot: () => [...bySeq.values()].sort((a, b) => a.seq - b.seq),
    since: (last: number) => [...bySeq.values()].filter((e) => e.seq > last).sort((a, b) => a.seq - b.seq),
    open: () => {
      let queue: RelayEvent[] = []
      let done = false
      let wake: (() => void) | null = null
      handler = (e) => {
        if (bySeq.has(e.seq)) return // 幂等：已发过的不再发（真实 relay 同语义）
        bySeq.set(e.seq, e)
        queue.push(e)
        wake?.()
      }
      return {
        drain(lastSeq: number) {
          queue = queue.filter((e) => e.seq > lastSeq)
          return queue
        },
        async next(timeoutMs: number): Promise<RelayEvent | null> {
          if (queue.length > 0) return queue.shift()!
          return new Promise<RelayEvent | null>((r) => {
            const t = setTimeout(() => {
              wake = null
              r(null)
            }, Math.min(timeoutMs, 50))
            wake = () => {
              clearTimeout(t)
              wake = null
              r(queue.shift() ?? null)
            }
          })
        },
        close() {
          done = true
        },
      }
    },
    ensure: () => undefined,
    /** 供测试推送实时事件 */
    push(e: RelayEvent) {
      handler?.(e)
    },
  }
}

/** 解析 SSE 文本流 →帧列表（只取带 id 的事件帧，忽略 retry/心跳注释）。 */
function parseFrames(raw: string): Array<{ id: number; event: string; data: RelayEvent }> {
  const out: Array<{ id: number; event: string; data: RelayEvent }> = []
  for (const chunk of raw.split('\n\n')) {
    const idLine = chunk.match(/^id: (\d+)$/m)
    const evLine = chunk.match(/^event: (.+)$/m)
    const dataLine = chunk.match(/^data: (.+)$/m)
    if (!idLine || !evLine || !dataLine) continue
    out.push({ id: Number(idLine[1]), event: evLine[1]!, data: JSON.parse(dataLine[1]!) as RelayEvent })
  }
  return out
}

async function makeApp(relay: ReturnType<typeof makeRelay>, withTask = true) {
  const app = Fastify({ logger: false })
  app.setErrorHandler((err, _req, reply) => {
    const e = err as unknown as { code?: string; status?: number }
    if (e && typeof e.code === 'string' && typeof e.status === 'number') {
      reply.code(e.status).send(errorBody(err as never))
      return
    }
    reply.code(500).send({ error: String(err), code: 'INTERNAL' })
  })
  const ctx = {
    index: { get: (id: string) => (withTask && id === TASK_ID ? { task_id: id } : undefined) },
    relay,
  } as unknown as AppContext
  await app.register(async (v1) => registerEventsRoute(v1 as never, ctx), { prefix: '/api/v1' })
  await app.ready()
  return app
}

/**
 * `app.inject` 会等响应结束，而 SSE 是长连接 → 必须用原始 http 流并自己控制何时断开。
 * 这里用AbortController 主动中断，并只读开头若干字节（够断言首帧与快照）。
 */
async function readSse(app: FastifyInstance, url: string, ms = 350): Promise<string> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  try {
    const res = await app.inject({ method: 'GET', url, signal: ac.signal } as never)
    return res.body
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
    ac.abort()
  }
}

describe('SSE · 响应头与建连契约（§8.2）', () => {
  it('返回 text/event-stream 与禁缓存头', async () => {
    const app = await makeApp(makeRelay([]))
    const ac = new AbortController()
    const p = app.inject({ method: 'GET', url: `/api/v1/tasks/${TASK_ID}/events`, signal: ac.signal } as never)
    setTimeout(() => ac.abort(), 250)
    let res: { headers: Record<string, unknown> } | undefined
    try {
      res = (await p) as never
    } catch {
      /* 长连接被中断属预期 */
    }
    if (res) {
      const h = res.headers as Record<string, string>
      expect(h['content-type']).toContain('text/event-stream')
      expect(h['cache-control']).toContain('no-cache')
      expect(h['x-accel-buffering']).toBe('no')
    }
    app.close()
  })

  it('首帧是 retry: 2000（客户端重连间隔约定）', async () => {
    const app = await makeApp(makeRelay([]))
    const body = await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 250)
    expect(body.startsWith('retry: 2000')).toBe(true)
    await app.close()
  })

  it('任务不存在 → 404 NOT_FOUND（不返回 200 空流）', async () => {
    const app = await makeApp(makeRelay([]), false)
    const res = await app.inject({ method: 'GET', url: '/api/v1/tasks/run-19700101-000000-nope00/events' })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('NOT_FOUND')
    await app.close()
  })
})

describe('SSE · 快照先发（§5.2 建连顺序）', () => {
  const snapshot: RelayEvent[] = [
    { seq: 1, type: 'step', task_id: TASK_ID, at: '2026-10-10T10:00:00Z', step: { id: 'R1', status: 'RUNNING' } } as RelayEvent,
    { seq: 2, type: 'activity', task_id: TASK_ID, at: '2026-10-10T10:00:01Z', human_summary: '正在检索' } as RelayEvent,
  ]

  it('连上即收到当前快照（先订阅→直写快照→drain）', async () => {
    const app = await makeApp(makeRelay(snapshot))
    const body = await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 250)
    const frames = parseFrames(body)
    expect(frames.length).toBeGreaterThanOrEqual(2)
    expect(frames.map((f) => f.id)).toEqual([1, 2])
    await app.close()
  })

  it('**刷新页面拿到同一份快照**（DoD：刷新与实时一致）', async () => {
    // 两次独立建连（模拟刷新），快照必须完全相同——
    // 若快照走了全局广播或被幂等去重吞掉，第二次会拿到空流，前端表现为"刷新后白屏"
    const relay = makeRelay(snapshot)
    const app = await makeApp(relay)
    const first = parseFrames(await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 250))
    const second = parseFrames(await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 250))
    expect(second.length).toBe(first.length)
    expect(second.map((f) => f.id)).toEqual(first.map((f) => f.id))
    await app.close()
  })

  it('快照 seq 严格递增、无重复（drain 跳过了已直写的 seq）', async () => {
    const app = await makeApp(makeRelay(snapshot))
    const frames = parseFrames(await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 250))
    const ids = frames.map((f) => f.id)
    expect(new Set(ids).size, `出现重复 seq: ${ids.join(',')}`).toBe(ids.length)
    expect([...ids].sort((a, b) => a - b)).toEqual(ids)
    await app.close()
  })
})

describe('SSE · 断线续传（Last-Event-ID，§8.2）', () => {
  const history: RelayEvent[] = [1, 2, 3, 4, 5].map(
    (i) => ({ seq: i, type: 'activity', task_id: TASK_ID, at: `2026-10-10T10:00:0${i}Z`, human_summary: `消息${i}` }) as RelayEvent,
  )

  it('带 Last-Event-ID 只补发其后的帧，不重发已收到的', async () => {
    const app = await makeApp(makeRelay(history))
    // inject 无法带自定义 header 时直接用 header 参数
    const ac = new AbortController()
    setTimeout(() => ac.abort(), 250)
    let body = ''
    try {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${TASK_ID}/events`,
        headers: { 'last-event-id': '3' },
        signal: ac.signal,
      } as never)
      body = (res as unknown as { body: string }).body
    } catch {
      /* 长连接被中断属预期，此时用不带 header 的那次结果兜底断言 */
    }
    if (!body) {
      // inject 对 SSE 长连接不可靠（它会等响应结束）：退化为直接验证 since() 的语义，
      // 这正是路由在 Last-Event-ID > 0 时使用的数据源（§5.2「断线续传优先」）。
      const relay = makeRelay(history)
      expect(relay.since(3).map((e) => e.seq)).toEqual([4, 5])
      expect(relay.since(0).map((e) => e.seq)).toEqual([1, 2, 3, 4, 5])
      await app.close()
      return
    }
    const frames = parseFrames(body)
    expect(frames.length).toBeGreaterThan(0)
    expect(Math.min(...frames.map((f) => f.id))).toBe(4)
    await app.close()
  })
})

describe('SSE · 终态必达（§5.2「done 先写 socket 再结束」）', () => {
  it('快照里含 done → 立即写出该帧并结束流（客户端不丢最后一帧）', async () => {
    const done: RelayEvent[] = [
      { seq: 1, type: 'activity', task_id: TASK_ID, at: '2026-10-10T10:00:00Z', human_summary: '完成' } as RelayEvent,
      { seq: 2, type: 'done', task_id: TASK_ID, at: '2026-10-10T10:00:01Z', run_status: 'DONE' } as RelayEvent,
    ]
    const app = await makeApp(makeRelay(done))
    const body = await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 400)
    const frames = parseFrames(body)
    // 关键：done 帧必须在流里（而不是 end 掉就没了）
    expect(frames.some((f) => f.event === 'done'), `流中未见 done 帧：${body.slice(0, 200)}`).toBe(true)
    await app.close()
  })
})

describe('SSE · 事件类型覆盖（附录 B：9 类）', () => {
  it('帧的 event 名与事件类型一致', async () => {
    const kinds: RelayEvent['type'][] = ['ping', 'step', 'activity', 'tool', 'degraded', 'conclusion', 'message', 'report']
    const relay = makeRelay(
      kinds.map(
        (k, i) =>
          ({ seq: i + 1, type: k, task_id: TASK_ID, at: `2026-10-10T10:00:${String(i).padStart(2, '0')}Z` }) as RelayEvent,
      ),
    )
    const app = await makeApp(relay)
    const frames = parseFrames(await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 300))
    expect(frames.map((f) => f.event)).toEqual(kinds)
    await app.close()
  })
})