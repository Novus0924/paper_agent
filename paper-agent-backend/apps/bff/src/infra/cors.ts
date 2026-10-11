/**
 * CORS 白名单的单一真源。
 *
 * 为什么单独成模块：`buildApp()` 的 onRequest 钩子能加响应头，但 SSE 路由
 * `reply.hijack()` 后自己用 `raw.writeHead()` 发头，Fastify 钩子设的头**一个都不会**
 * 落到那条响应上。于是同一个白名单被写了两遍还漏掉一处 —— 实际症状是
 * 普通接口跨域可用、`EventSource` 静默收不到任何帧（浏览器只在控制台报 CORS，
 * 界面表现为"连上了但没有进度"）。
 */

/**
 * 默认放行 Vite 的 5173（后端仓库 `web/` 时代）与 5174（2.0 前端
 * `paper-agent-frontend/vite.config.ts` 用 strictPort 钉死的端口）。
 * 同源代理下 CORS 不参与，但 `.env.example` 允许把 `VITE_API_BASE_URL`
 * 直接指向 8787；那时端口不在白名单就会表现为"接口能通、SSE 一帧都收不到"。
 */
export const DEFAULT_CORS_ORIGINS =
  'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174'

/**
 * 白名单来自环境变量（逗号分隔），默认只放本地 dev server。
 * `PAPER_AGENT_CORS_EXTRA_ORIGINS` 是**追加**而非覆盖：一键启动器知道自己把前端
 * 起在哪个端口（`PAPER_AGENT_WEB_PORT` 可改），需要把那个 Origin 加进来，
 * 又不该丢掉默认值——否则每处调用方都得抄一遍默认白名单（正是本模块要消灭的重复）。
 */
export function allowedOrigins(env: Record<string, string | undefined> = process.env): Set<string> {
  return new Set(
    [
      env['PAPER_AGENT_CORS_ORIGINS'] ?? DEFAULT_CORS_ORIGINS,
      env['PAPER_AGENT_CORS_EXTRA_ORIGINS'] ?? '',
    ]
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

/**
 * 命中白名单才按 Origin 回显（§11：不放任 `*`）。
 * 无 Origin（curl、同源请求）或不在白名单 → 返回空头，浏览器侧自然拦截。
 */
export function corsHeaders(origin: string | undefined, allowed: Set<string>): Record<string, string> {
  if (!origin || !allowed.has(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Last-Event-ID',
  }
}
