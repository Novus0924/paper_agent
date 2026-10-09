import Fastify, { type FastifyInstance } from 'fastify'
import type { AppConfig } from './config.js'
import type { Logger } from './infra/logger.js'
import { ApiError, errorBody } from './infra/errors.js'
import type { AgnesGateway } from './agh/gateway.js'
import type { TaskIndex } from './store/task-index.js'
import { registerHealthRoute } from './routes/health.js'
import { registerV1Routes } from './routes/v1/index.js'

/**
 * BFF 应用装配（BE-01）：
 * - 统一错误模型 { error, code }；
 * - CORS 白名单按 Origin 回显（不放任 *）；
 * - 仅 127.0.0.1（在 index.ts listen 层硬约束）；
 * - 可选 token 鉴权开关（默认关）。
 */

export interface AppContext {
  cfg: AppConfig
  log: Logger
  gateway: AgnesGateway
  index: TaskIndex
}

export function buildApp(ctx: AppContext): FastifyInstance {
  const app = Fastify({
    logger: false, // 自有结构化日志
    bodyLimit: 1 * 1024 * 1024, // 1MB 足够 goal/消息类请求
    disableRequestLogging: false,
  })

  // CORS：白名单按 Origin 回显（§11：不放任 *）
  const allowedOrigins = new Set(
    (process.env['PAPER_AGENT_CORS_ORIGINS'] ?? 'http://127.0.0.1:5173,http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  app.addHook('onRequest', async (req, reply) => {
    const origin = req.headers.origin
    if (origin && allowedOrigins.has(origin)) {
      reply.header('Access-Control-Allow-Origin', origin)
      reply.header('Vary', 'Origin')
      reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Last-Event-ID')
    }
    if (req.method === 'OPTIONS' && origin) {
      reply.code(204).send()
    }
    // 可选 token 鉴权（BE-15 预留）：设置时对写路由校验，未设置行为不变
    const token = ctx.cfg.token
    if (token && req.method !== 'GET' && req.method !== 'OPTIONS' && req.url.startsWith('/api/')) {
      const auth = req.headers.authorization
      if (auth !== `Bearer ${token}`) {
        reply.code(401).send({ error: '缺少或错误的令牌（Authorization: Bearer <token>）', code: 'UNAUTHORIZED' })
      }
    }
  })

  // 统一错误处理：ApiError → {error, code}；未知错误 → INTERNAL（不泄露堆栈）
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError) {
      reply.code(err.status).send(errorBody(err))
      return
    }
    // Fastify body 解析错误 → BAD_BODY
    const maybe = err as { statusCode?: number; message?: string }
    if (maybe.statusCode === 400 && typeof maybe.message === 'string' && /JSON|body|Unexpected/i.test(maybe.message)) {
      reply.code(400).send({ error: `请求体解析失败：${maybe.message}`, code: 'BAD_BODY' })
      return
    }
    ctx.log.error('未处理错误', {
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    reply.code(500).send({ error: '服务器内部错误，请查看服务端日志。', code: 'INTERNAL' })
  })

  app.get('/api', async () => ({
    service: 'paper-agent-bff',
    docs: 'REST + SSE；统一前缀 /api/v1；健康探针 /api/health',
  }))

  registerHealthRoute(app, ctx.cfg, ctx.gateway, ctx.index)
  registerV1Routes(app, ctx)

  return app
}
