import type { FastifyInstance } from 'fastify'
import type { LibraryService } from '../../services/library.js'

/**
 * 跨 run 文献/证据库路由（契约冻结，前端并行开发）：
 *   GET /api/v1/library/evidence?q=&kind=&tier=&source=&task_id=&dedupe=on&limit=50&offset=0
 *
 * 只读聚合（不 spawn 内核、不写产物），非法参数由服务层抛 400 BAD_PARAM，
 * 统一错误处理器映射为 { error, code }。
 */
export function registerLibraryRoutes(app: FastifyInstance, library: LibraryService): void {
  app.get('/library/evidence', async (req) => {
    return library.query((req.query ?? {}) as Record<string, unknown>)
  })
}
