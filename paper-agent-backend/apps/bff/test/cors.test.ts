import { describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { registerEventsRoute } from '../src/routes/v1/events.js'
import { allowedOrigins, corsHeaders, DEFAULT_CORS_ORIGINS } from '../src/infra/cors.js'
import type { AppContext } from '../src/app.js'
import type { RelayEvent } from '../src/events/model.js'

/**
 * CORS 契约（§11：白名单按 Origin 回显，不放任 `*`）。
 *
 * 起因：`buildApp()` 的 onRequest 钩子给普通接口回头，但 SSE 路由 `reply.hijack()` 后
 * 用 `raw.writeHead()` 自己发头，钩子设的头**不会**出现在那条响应上。
 * 表现极难查：REST 全部跨域可用，`EventSource` 却被浏览器拦下，
 * 界面只显示"已连接但没有进度"。所以这里**按真实响应头**验收，而不是只测纯函数。
 */

const TASK_ID = 'run-20261011-000000-cors000'

/** 快照只有一帧 done：路由写完 done 立即 raw.end()，inject 才能干净返回（无需 abort）。 */
function doneRelay() {
  const done: RelayEvent = { seq: 1, ts: '2026-10-11T00:00:00Z', type: 'done', run_status: 'DONE', report_ready: true }
  return {
    snapshot: () => [done],
    since: () => [] as RelayEvent[],
    ensure: () => undefined,
    open: () => ({ drain: () => [], next: async () => null, close: () => undefined }),
  }
}

async function sseHeaders(origin?: string): Promise<Record<string, string>> {
  const app = Fastify({ logger: false })
  const ctx = {
    index: { get: (id: string) => (id === TASK_ID ? { task_id: id } : undefined) },
    relay: doneRelay(),
    log: { warn: () => undefined },
  } as unknown as AppContext
  await app.register(async (v1) => registerEventsRoute(v1 as never, ctx), { prefix: '/api/v1' })
  await app.ready()
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/tasks/${TASK_ID}/events`,
    ...(origin ? { headers: { origin } } : {}),
  })
  await app.close()
  return res.headers as unknown as Record<string, string>
}

describe('CORS · 白名单纯函数', () => {
  it('默认白名单只有本地 dev server（不放行任何远程/公网 origin）', () => {
    const set = allowedOrigins({})
    expect([...set].every((o) => o.startsWith('http://127.0.0.1:') || o.startsWith('http://localhost:'))).toBe(true)
    expect(set.size).toBeGreaterThan(0)
    expect(DEFAULT_CORS_ORIGINS).toContain('127.0.0.1')
  })

  it('默认白名单含 2.0 前端钉死的 dev 端口 5174（paper-agent-frontend/vite.config.ts strictPort）', () => {
    // 直连模式（VITE_API_BASE_URL=http://127.0.0.1:8787）下，Origin 就是它。
    // 缺这条时症状是"JSON 能通、SSE 一帧不到"，排查成本极高。
    const set = allowedOrigins({})
    expect(set.has('http://127.0.0.1:5174')).toBe(true)
  })

  it('环境变量可覆盖白名单（本机 dev server 跑在 5174 时要能加进去）', () => {
    const set = allowedOrigins({ PAPER_AGENT_CORS_ORIGINS: 'http://127.0.0.1:5174, http://localhost:5174,' })
    expect([...set]).toEqual(['http://127.0.0.1:5174', 'http://localhost:5174'])
  })

  it('EXTRA 只追加，不覆盖默认白名单（启动器换前端端口时用）', () => {
    const set = allowedOrigins({ PAPER_AGENT_CORS_EXTRA_ORIGINS: 'http://127.0.0.1:5178,' })
    expect(set.has('http://127.0.0.1:5178')).toBe(true)
    // 关键：默认项必须还在。若 EXTRA 变成"覆盖"，5173/5174 会被静默丢掉，
    // 症状是"另一个人的机器上 SSE 突然全挂"。
    expect(set.has('http://127.0.0.1:5173')).toBe(true)
    expect(set.has('http://127.0.0.1:5174')).toBe(true)
  })

  it('命中白名单才回显，且回显的是该 origin 本身而不是 *', () => {
    const allowed = allowedOrigins({ PAPER_AGENT_CORS_ORIGINS: 'http://127.0.0.1:5174' })
    expect(corsHeaders('http://127.0.0.1:5174', allowed)['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:5174')
    expect(corsHeaders('https://evil.example', allowed)).toEqual({})
    expect(corsHeaders(undefined, allowed)).toEqual({})
  })
})

describe('CORS · SSE 长连接自己回头（hijack 后钩子不生效）', () => {
  it('白名单内 Origin → 响应带 ACAO 与 Vary: Origin', async () => {
    const origin = [...allowedOrigins()][0]!
    const h = await sseHeaders(origin)
    expect(h['access-control-allow-origin']).toBe(origin)
    expect(h['vary']).toBe('Origin')
  })

  it('白名单外 Origin → 不带 ACAO（浏览器侧拦截，服务端不放行）', async () => {
    const h = await sseHeaders('https://evil.example')
    expect(h['access-control-allow-origin']).toBeUndefined()
  })

  it('无 Origin（curl / 同源请求）→ 不带 ACAO，其余头照常', async () => {
    const h = await sseHeaders()
    expect(h['access-control-allow-origin']).toBeUndefined()
    expect(String(h['content-type'])).toContain('text/event-stream')
  })
})
