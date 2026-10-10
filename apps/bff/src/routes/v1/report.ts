import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../../app.js'
import { ApiError } from '../../infra/errors.js'
import { validateTaskId } from '../../infra/validate.js'
import type { ReportService } from '../../services/report.js'

/**
 * 报告与证据路由（BE-08/09，需求 §8.1 接口 10–13、§8.2 契约）：
 *   GET /api/v1/tasks/{id}/report        结构化报告
 *        就绪 → 200 { status:"ready", report:{ title, abstract, sections, conclusions[] } }
 *        未就绪 → 200 { status:"generating" }（**不报错**）；任务不存在 → 404 NOT_FOUND
 *   GET /api/v1/tasks/{id}/report.md     报告 Markdown（text/markdown）
 *        200 + X-Content-Type-Options: nosniff + Content-Disposition: inline；未就绪 → 404 NO_REPORT
 *   GET /api/v1/tasks/{id}/evidence      证据/结论/轨迹只读（面向视图 DTO）
 *   GET /api/v1/tasks/{id}/cite?ev=      引用回查（EV 编号或 ≥6 位哈希前缀）
 *
 * 全部只读内核产物，不 spawn 内核（执行一律经 AGH）。
 */

const EV_MAX_LENGTH = 128

export function registerReportRoutes(app: FastifyInstance, ctx: AppContext, reports: ReportService): void {
  /** 统一的任务存在性校验：不存在 → 404 NOT_FOUND（§8.3） */
  const requireTask = (raw: unknown): string => {
    const taskId = validateTaskId(raw)
    if (!ctx.index.get(taskId)) throw ApiError.notFound(`任务 ${taskId}`)
    return taskId
  }

  app.get('/tasks/:id/report', async (req) => {
    const taskId = requireTask((req.params as { id: string }).id)
    return reports.getReport(taskId)
  })

  app.get('/tasks/:id/report.md', async (req, reply) => {
    const taskId = requireTask((req.params as { id: string }).id)
    const md = reports.getReportMarkdown(taskId)
    if (md === null) {
      throw new ApiError(
        'NO_REPORT',
        `任务 ${taskId} 的报告尚未就绪`,
        '报告在流水线到达终态 DONE 后由内核装配（门禁通过才出报告）；可订阅 /events 等待 report 事件 status=ready。',
      )
    }
    reply.header('Content-Type', 'text/markdown; charset=utf-8')
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Content-Disposition', 'inline')
    return md
  })

  app.get('/tasks/:id/evidence', async (req) => {
    const taskId = requireTask((req.params as { id: string }).id)
    return reports.getEvidence(taskId)
  })

  app.get('/tasks/:id/cite', async (req) => {
    const taskId = requireTask((req.params as { id: string }).id)
    const query = req.query as { ev?: unknown }
    const ev = typeof query.ev === 'string' ? query.ev.trim() : ''
    if (ev.length > EV_MAX_LENGTH) {
      throw new ApiError('BAD_PARAM', `ev 过长（${ev.length} > ${EV_MAX_LENGTH}）`, '请传 EV-#### 编号或 ≥6 位哈希前缀。')
    }
    const out = reports.cite(taskId, ev)
    if (!out.found) {
      // 引用不存在属"查无此项"，用 404 并带上可查列表（便于前端提示）
      throw new ApiError(
        'NOT_FOUND',
        out.reason ?? `未找到引用 ${ev}`,
        out.available && out.available.length > 0 ? `可查证据编号：${out.available.join(', ')}` : undefined,
      )
    }
    return { task_id: taskId, ...out }
  })
}