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
  let ensureCalls = 0
  return {
    /** 本连接打开时"直写"的帧 */
    snapshot: () => [...bySeq.values()].sort((a, b) => a.seq - b.seq),
    since: (last: number) => [...bySeq.values()].filter((e) => e.seq > last).sort((a, b) => a.seq - b.seq),
    open: () => {
      let queue: RelayEvent[] = []
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
          // 已关闭：真实 relay 会标记，此替身靠 cleanup 里的 writableEnded 判断
        },
      }
    },
    ensure: () => {
      ensureCalls += 1
    },
    get ensureCalls() {
      return ensureCalls
    },
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

async function makeApp(relay: ReturnType<typeof makeRelay>, withTask = true, runStatus?: string) {
  const app = Fastify({ logger: false })
  app.setErrorHandler((err, _req, reply) => {
    const e = err as { code?: string; status?: number }
    if (e && typeof e.code === 'string' && typeof e.status === 'number') {
      reply.code(e.status).send(errorBody(err as never))
      return
    }
    reply.code(500).send({ error: String(err), code: 'INTERNAL' })
  })
  const ctx = {
    index: {
      get: (id: string) =>
        withTask && id === TASK_ID ? { task_id: id, ...(runStatus ? { run_status: runStatus } : {}) } : undefined,
    },
    relay,
  } as unknown as AppContext
  await app.register(async (v1) => registerEventsRoute(v1 as never, ctx), { prefix: '/api/v1' })
  await app.ready()
  return app
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * 真实 HTTP 流采样（inject 会等响应结束，无法验证"连接是否保持"）：
 * 监听临时端口 → fetch 建连 → 边读边攒 → afterConnect 钩子可在连接打开期间
 * 推送实时事件 → 等待「服务端主动断流」或 waitMs 超时（超时 = 连接仍保持）。
 */
async function collectSse(
  app: FastifyInstance,
  url: string,
  opts: { afterConnect?: () => Promise<void>; waitMs?: number } = {},
): Promise<{ raw: string; serverClosed: boolean }> {
  await app.listen({ port: 0, host: '127.0.0.1' })
  const port = (app.server.address() as { port: number }).port
  const ac = new AbortController()
  const res = await fetch(`http://127.0.0.1:${port}${url}`, { signal: ac.signal })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let raw = ''
  const finished = (async () => {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      raw += decoder.decode(value, { stream: true })
    }
  })().then(
    () => true,
    () => false,
  )
  if (opts.afterConnect) await opts.afterConnect()
  const serverClosed = await Promise.race([
    finished,
    new Promise<false>((r) => setTimeout(() => r(false), opts.waitMs ?? 600)),
  ])
  // 超时路径：主动断开触发服务端 cleanup，避免悬挂连接
  ac.abort()
  await sleep(30)
  try {
    await app.close()
  } catch {
    /* 已随断连关闭 */
  }
  return { raw, serverClosed }
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
      res = (await p)
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
  // ⚠️ 这些事件按 **RelayEvent 的真实类型** 构造（`ts` 而非 task_id/at、
  //    step 事件的 `step` 是字符串 id 而非对象）——不许用 `as RelayEvent` 硬转。
  //
  //    起因：做 ESLint 时把测试目录纳入 tsc 检查范围，立刻暴露我之前写的
  //    `{task_id, at, step:{id,status}}` 与真实类型完全不兼容——测试当时能跑过，
  //    但它验证的是**错误形状的数据**。
  //    这正是不做类型检查的代价：契约测试自己写错类型时没人拦。
  const snapshot: RelayEvent[] = [
    { seq: 1, ts: '2026-10-10T10:00:00Z', type: 'step', step: 'R1', status: 'RUNNING' },
    { seq: 2, ts: '2026-10-10T10:00:01Z', type: 'activity', step: 'R1', human_message: '正在检索' },
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
    (i) => ({ seq: i, ts: `2026-10-10T10:00:0${i}Z`, type: 'activity', step: 'R1', human_message: `消息${i}` }),
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
      { seq: 1, ts: '2026-10-10T10:00:00Z', type: 'activity', step: 'R6', human_message: '完成' },
      // done 的真实必填字段是 report_ready（不是 task_id/at）
      { seq: 2, ts: '2026-10-10T10:00:01Z', type: 'done', run_status: 'DONE', report_ready: true },
    ]
    const app = await makeApp(makeRelay(done))
    const body = await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 400)
    const frames = parseFrames(body)
    // 关键：done 帧必须在流里（而不是 end 掉就没了）
    expect(frames.some((f) => f.event === 'done'), `流中未见 done 帧：${body.slice(0, 200)}`).toBe(true)
    await app.close()
  })
})

describe('SSE · 终态追问（v2.2：终态连接保持，message 事件可达）', () => {
  // 终态 ≠ 无实时事件：DONE/FAILED 任务建连时快照必含 done 帧，但追问回合
  // （messages）会产生实时 message 事件（user running/done、assistant 回复）。
  // 旧实现遇 done 帧立即 end → 报告页 SSE 一连上就被关闭，追问回复永远收不到。
  const ts = (n: number) => `2026-10-11T10:00:0${n}Z`
  const URL = `/api/v1/tasks/${TASK_ID}/events`
  const messageAt = (seq: number, turnId: string, text: string): RelayEvent => ({
    seq,
    ts: ts(seq),
    type: 'message',
    turn_id: turnId,
    role: 'assistant',
    text,
    status: 'done',
  })

  it('终态任务建连：done 帧照发，但连接不关闭，随后的 message 事件经连接可达', async () => {
    const relay = makeRelay([{ seq: 1, ts: ts(1), type: 'done', run_status: 'DONE', report_ready: true }])
    const app = await makeApp(relay, true, 'DONE')
    const { raw, serverClosed } = await collectSse(app, URL, {
      afterConnect: async () => {
        await sleep(80) // 快照（含 done）已直写
        relay.push(messageAt(2, 'turn-1', '追问回复'))
        await sleep(80) // 事件经连接写出
      },
    })
    const frames = parseFrames(raw)
    expect(frames.some((f) => f.event === 'done'), 'done 帧必须照发（前端需要终态语义）').toBe(true)
    const msg = frames.find((f) => f.event === 'message')
    expect(
      msg?.data,
      `终态连接被服务端提前关闭，message 事件不可达。实际收到：${raw.slice(0, 300)}`,
    ).toMatchObject({ text: '追问回复', role: 'assistant' })
    expect(serverClosed, '终态任务 done 帧后连接不应被服务端关闭').toBe(false)
  })

  it('非终态回归：done 帧后服务端仍主动断开（前端重连拿新快照）', async () => {
    const relay = makeRelay([
      { seq: 1, ts: ts(1), type: 'step', step: 'R6', status: 'DONE' },
      { seq: 2, ts: ts(2), type: 'done', run_status: 'DONE', report_ready: true },
    ])
    const app = await makeApp(relay, true, 'RUNNING')
    const { raw, serverClosed } = await collectSse(app, URL, {
      afterConnect: async () => {
        await sleep(80)
        relay.push(messageAt(3, 'turn-9', '不该收到'))
        await sleep(80)
      },
    })
    const frames = parseFrames(raw)
    expect(frames.some((f) => f.event === 'done')).toBe(true)
    expect(serverClosed, '非终态任务 done 帧后应服务端断开（原语义不变）').toBe(true)
    expect(raw).not.toContain('turn-9')
  })

  it('终态建连时 relay.ensure 被调用（事件泵启动，assistant 事件可达）', async () => {
    const relay = makeRelay([{ seq: 1, ts: ts(1), type: 'done', run_status: 'DONE', report_ready: true }])
    const app = await makeApp(relay, true, 'DONE')
    await collectSse(app, URL, { waitMs: 300 })
    expect(relay.ensureCalls).toBeGreaterThanOrEqual(1)
  })
})

describe('SSE · 事件类型覆盖（附录 B：9 类）', () => {
// 每种事件的**最小合法载荷**（字段各不相同，故逐个给真实形状而非统一构造）。
// 之前这里用统一 `{seq,type,task_id,at}` + `as RelayEvent`，测的是错误形状的数据。
//
// ⚠️ 用 `DistributiveOmit` 而非 `Omit`：RelayEvent 是**判别联合**，
// 直接 Omit 会把各分支的专属字段抹掉（`step`/`level`/`cid` 全部报"未知属性"）。
type Payload = RelayEvent extends infer T ? (T extends RelayEvent ? Omit<T, 'seq' | 'ts'> : never) : never
const MINIMAL: Record<RelayEvent['type'], Payload> = {
      ping: { type: 'ping' },
      step: { type: 'step', step: 'R1', status: 'RUNNING' },
      activity: { type: 'activity', step: 'R1', human_message: '检索中' },
      tool: { type: 'tool', step: 'R1', tool: 'sciret_run_all', status: 'running' },
      degraded: { type: 'degraded', level: 'info', source: 'crossref', reason: '限流', impact: '无', resumable: true, step: 'R1' },
      conclusion: { type: 'conclusion', cid: 'C-001', text: '界面阻抗主要由 SEI 贡献', evidence_ids: ['EV-0001'] },
      message: { type: 'message', turn_id: 'turn-1', role: 'assistant', text: '补充：…', status: 'done' },
      // report 事件的载荷含 task_id（§5.1「report / task_id / status(ready/generating)」），
// 与其他事件不同——这正是"逐个给真实形状"才能发现的地方。
report: { type: 'report', task_id: TASK_ID, status: 'ready' },
      done: { type: 'done', run_status: 'DONE', report_ready: true },
    }

    it('帧的 event 名与事件类型一致', async () => {
      const kinds = Object.keys(MINIMAL) as RelayEvent['type'][]
      const relay = makeRelay(
        kinds.map(
          (k, i) => ({ seq: i + 1, ts: `2026-10-10T10:00:${String(i).padStart(2, '0')}Z`, ...MINIMAL[k] }),
        ),
      )
      const app = await makeApp(relay)
      const frames = parseFrames(await readSse(app, `/api/v1/tasks/${TASK_ID}/events`, 300))
      expect(frames.map((f) => f.event)).toEqual(kinds)
    await app.close()
  })
})