import type { FastifyInstance } from 'fastify'
import type { LibraryService } from '../../services/library.js'
import { ApiError } from '../../infra/errors.js'
import { renderBibtex } from '../../export/bibtex.js'

/**
 * 跨 run 文献/证据库路由（契约冻结，前端并行开发）：
 *   GET /api/v1/library/evidence?q=&kind=&tier=&source=&task_id=&dedupe=on&limit=50&offset=0
 *   GET /api/v1/library/export?kind=bibtex   ← v2.4 全库 BibTeX 导出
 *
 * 只读聚合（不 spawn 内核、不写产物），非法参数由服务层抛 400 BAD_PARAM，
 * 统一错误处理器映射为 { error, code }。
 */
export function registerLibraryRoutes(app: FastifyInstance, library: LibraryService): void {
  app.get('/library/evidence', async (req) => {
    return library.query((req.query ?? {}) as Record<string, unknown>)
  })

  /**
   * 全库 BibTeX 导出（v2.4）：聚合**全部任务**的 R1 文献证据（复用文献库 DOI 去重），
   * 生成 `paper-agent-library.bib` 附件（text/plain）。
   * 无任何文献 → 409 NOT_READY（可读说明，不静默产出空文件）；非法/缺 kind → 400 BAD_PARAM。
   */
  app.get('/library/export', async (req, reply) => {
    const query = (req.query ?? {}) as { kind?: unknown }
    const kind = typeof query.kind === 'string' ? query.kind.trim() : ''
    if (kind === '') {
      throw new ApiError('BAD_PARAM', '缺少查询参数 kind', '请指定导出类型：bibtex（如 ?kind=bibtex）')
    }
    if (kind !== 'bibtex') {
      throw new ApiError('BAD_PARAM', `不支持的全库导出类型：${kind}`, '当前允许：bibtex')
    }

    const items = library.literature()
    if (items.length === 0) {
      throw new ApiError(
        'NOT_READY',
        '文献库暂无可用文献（没有任何任务的 R1 检索证据），无法导出 BibTeX',
        '请先完成任务 R1 多源检索，使证据落入各任务账本后再导出。',
      )
    }

    const body = renderBibtex(items.map((it) => it.ref as unknown as Record<string, unknown>))
    reply.header('Content-Type', 'text/plain; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="paper-agent-library.bib"')
    reply.header('X-Content-Type-Options', 'nosniff')
    return body
  })
}
