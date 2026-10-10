import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../../app.js'
import { validateTaskId } from '../../infra/validate.js'
import { ApiError } from '../../infra/errors.js'
import { EXPORT_KINDS, type ExportKind, type ExportService } from '../../export/service.js'

/**
 * 导出路由（BE-10，需求 §8.1 接口 15、§8.2 导出契约）：
 *   GET /api/v1/tasks/{id}/export?kind=report|audit|session
 *
 * - `report`  → Markdown 文件流（text/markdown）
 * - `audit`   → 审计包 ZIP（报告+账本+事件+结论+**校验脚本**+清单）
 * - `session` → AGH 会话轨迹（经 AGH 原生导出；`&format=agnes|sharegpt|claude-code`，默认 agnes）
 *
 * 未完成 → 409 NOT_READY 并说明可导出范围（§386）；失败 → 500 EXPORT_ERROR 附原因与重试指引。
 * 非法 kind → 400 BAD_PARAM并列出允许值（不静默回退，§6枚举回退须显式告知）。
 */

const DEFAULT_SESSION_FORMAT = 'agnes'

export function registerExportRoutes(app: FastifyInstance, ctx: AppContext, exports: ExportService): void {
  app.get('/tasks/:id/export', async (req, reply) => {
    const taskId = validateTaskId((req.params as { id: string }).id)
    const task = ctx.index.get(taskId)
    if (!task) throw ApiError.notFound(`任务 ${taskId}`)

    const query = req.query as { kind?: unknown; format?: unknown }
    const kindRaw = typeof query.kind === 'string' ? query.kind.trim() : ''
    if (kindRaw === '') {
      throw new ApiError(
        'BAD_PARAM',
        '缺少查询参数 kind',
        `请指定导出类型：${EXPORT_KINDS.join(' | ')}（如 ?kind=audit）`,
      )
    }
    if (!(EXPORT_KINDS as string[]).includes(kindRaw)) {
      throw new ApiError(
        'BAD_PARAM',
        `不支持的导出类型：${kindRaw}`,
        `允许：${EXPORT_KINDS.join(' | ')}；会话轨迹可用 format 参数指定 agnes | sharegpt | claude-code。`,
      )
    }
    const kind = kindRaw as ExportKind
    const format = typeof query.format === 'string' && query.format.trim() !== '' ? query.format.trim() : DEFAULT_SESSION_FORMAT

    const result = await exports.export(task, kind, format)

    reply.header('Content-Type', result.contentType)
    // 附件下载但允许浏览器内联预览 report（与 report.md 的 inline 策略一致）
    reply.header('Content-Disposition', `${kind === 'report' ? 'inline' : 'attachment'}; filename="${result.filename}"`)
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Export-Contents', result.contents.join(','))
    return result.body
  })
}