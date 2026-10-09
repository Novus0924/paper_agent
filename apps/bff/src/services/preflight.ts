/**
 * 连通性预检 Preflight（P-01 / BE-07）：
 * 新建任务前探测各数据源可达性；不可达源不默认启用。
 * 各源独立短超时，互不阻塞。
 */

export type SourceProbe = {
  source: string
  status: 'ok' | 'unavailable'
  detail?: string
  latency_ms?: number
}

/** 各源最小可达性探测端点（合规：仅元数据 API，不做全文抓取） */
const PROBE_ENDPOINTS: Record<string, string> = {
  arxiv: 'https://export.arxiv.org/api/query?search_query=all:electron&max_results=1',
  crossref: 'https://api.crossref.org/works?rows=1',
  openalex: 'https://api.openalex.org/works?per-page=1',
  semantic_scholar: 'https://api.semanticscholar.org/graph/v1/paper/search?query=electron&limit=1',
}

export const KNOWN_SOURCES = Object.keys(PROBE_ENDPOINTS)

const PROBE_TIMEOUT_MS = 4000

export async function probeSource(source: string): Promise<SourceProbe> {
  const url = PROBE_ENDPOINTS[source]
  if (!url) return { source, status: 'unavailable', detail: '未知数据源' }
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, method: 'GET' })
    const latency = Date.now() - started
    // 429/5xx 视为不可用（携带原因，前端不默认勾选）
    if (res.ok) return { source, status: 'ok', latency_ms: latency }
    return { source, status: 'unavailable', detail: `HTTP ${res.status}`, latency_ms: latency }
  } catch (e) {
    const reason = e instanceof Error ? (e.name === 'AbortError' ? `超时（>${PROBE_TIMEOUT_MS}ms）` : e.message) : String(e)
    return { source, status: 'unavailable', detail: reason, latency_ms: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

export async function probeSources(sources: string[]): Promise<Record<string, string>> {
  const results = await Promise.all(sources.map((s) => probeSource(s)))
  const out: Record<string, string> = {}
  for (const r of results) out[r.source] = r.status === 'ok' ? 'ok' : `unavailable:${r.detail ?? 'unknown'}`
  return out
}
