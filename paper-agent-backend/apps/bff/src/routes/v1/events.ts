import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../../app.js'
import { validateTaskId } from '../../infra/validate.js'
import { allowedOrigins, corsHeaders } from '../../infra/cors.js'
import { ApiError } from '../../infra/errors.js'
import type { RelayEvent } from '../../events/model.js'

/**
 * SSE 实时事件（需求文档 §5.2 + §8.1 接口 9）：
 *
 * 建连顺序（**强制**，旧版竞态缺陷正是在此）：
 *   ① 先注册订阅（此后产生的事件进入缓冲，不会丢）
 *   ② 直写当前快照 / Last-Event-ID 补发到本连接（不走全局广播）
 *   ③ drain() 续接缓冲与实时事件
 *
 * 响应头（§8.2）：`text/event-stream`、`no-cache, no-transform`、`keep-alive`、`X-Accel-Buffering: no`；
 * 首帧 `retry: 2000`；30s 心跳 `: ping`；终态 `done` **先写 socket 再结束**（终态帧必达）。
 */

const HEARTBEAT_MS = 30_000
const POLL_GRACE_MS = 60_000

function frame(e: RelayEvent): string {
  return `id: ${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`
}

export function registerEventsRoute(app: FastifyInstance, ctx: AppContext): void {
  app.get('/tasks/:id/events', async (req, reply) => {
    const taskId = validateTaskId((req.params as { id: string }).id)
    const task = ctx.index.get(taskId)
    if (!task) throw ApiError.notFound(`任务 ${taskId}`)

    const lastEventId = Number(req.headers['last-event-id'] ?? '0') || 0

    //⚠️ 必须 hijack：声明"这个响应由我完全接管"。
    //
    //   不 hijack 时，Fastify 不知道我们已用 raw.writeHead 发过头，
    //   于是路由后续任何抛错（最常见：客户端断连 → await 期间 AbortError）
    //   都会走它的错误处理器**再发一次响应** → `ERR_HTTP_HEADERS_SENT`，
    //   表现为一条 Unhandled Rejection + 难懂的 "Cannot write headers"。
    //   客户端断连对 SSE 是**常态**（切页面/ 关标签 / 网络抖动），
    //   所以这不是边缘情况，而是必须处理的主路径。
    //
    //   hijack 之后由我们自己负责结束连接（cleanup() 里reply.raw.end()）。
    reply.hijack()

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      // hijack 之后 app 级 onRequest 钩子设的头不会出现在这条响应上，
      // 跨域 EventSource 会在"连接成功但收不到帧"的形态下静默失败，
      // 所以 SSE 必须自己按同一份白名单回头。
      ...corsHeaders(req.headers.origin, allowedOrigins()),
    })
    reply.raw.write('retry: 2000\n\n')

    // ① 先注册订阅（此后产生的事件进入缓冲，不会丢）
    const sub = ctx.relay.open(taskId)
    // 惰性确保事件泵在跑（历史任务首次建连时才附加会话）
    ctx.relay.ensure(taskId)

    // ② 补发：断线续传优先，否则当前快照
    const backlog = lastEventId > 0 ? ctx.relay.events.since(taskId, lastEventId) : ctx.relay.snapshot(taskId)
    for (const e of backlog) {
      reply.raw.write(frame(e))
      if (e.type === 'done') {
        reply.raw.end()
        sub.close()
        return reply
      }
    }

    // ③ 续接实时：快照已直写，跳过这些 seq，避免重复下发
    let closed = false
    const cleanup = (): void => {
      if (closed) return
      closed = true
      clearInterval(heartbeat)
      sub.close()
      if (!reply.raw.writableEnded) reply.raw.end()
    }
    const heartbeat = setInterval(() => {
      if (!closed && !reply.raw.writableEnded) reply.raw.write(': ping\n\n')
    }, HEARTBEAT_MS)
    req.raw.on('close', cleanup)
    req.raw.on('error', cleanup)

    sub.drain(backlog.at(-1)?.seq)

    // 事件循环：实时推送（每轮带超时，便于定期写心跳）
    //
    // ⚠️ 必须自己兜住异常：**响应头已经用 writeHead 直写出去了**，
    //    若此处抛出（如客户端在 await 期间断连 → AbortError），
    //    Fastify 的错误处理器会再发一次响应 → `ERR_HTTP_HEADERS_SENT`，
    //    表现为一条 Unhandled Rejection/未捕获错误，而不是干净的连接关闭。
    //    客户端断连对 SSE 是**常态**（切页面、关标签、网络抖动），
    //    所以这不是边缘情况，必须按"正常关闭"处理。
    try {
      const deadline = Date.now() + POLL_GRACE_MS
      for (;;) {
        if (closed || reply.raw.writableEnded) break
        const e = await sub.next(HEARTBEAT_MS)
        if (e) {
          reply.raw.write(frame(e))
          if (e.type === 'done') break // 终态帧已写入，随后清理
        } else if (Date.now() > deadline) {
          // 长时间无事件（异常兜底）：发送当前状态心跳后继续，避免连接僵死
          if (!reply.raw.writableEnded) reply.raw.write(': ping\n\n')
        }
      }
    } catch (e) {
      // 头已发出，不能再走 Fastify 的错误响应；按正常关闭收尾即可。
      // 记日志是为了让"连接异常终止"可观测，而不是静默吞掉。
      ctx.log.warn('SSE 连接异常终止', { taskId, reason: e instanceof Error ? e.message : String(e) })
    }

    cleanup()
    return reply
  })
}
