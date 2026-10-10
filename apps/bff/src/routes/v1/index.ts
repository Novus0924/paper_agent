import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../../app.js'
import { registerTasksRoutes } from './tasks.js'
import { registerExecutionRoutes } from './execution.js'
import { registerEventsRoute } from './events.js'
import { registerReportRoutes } from './report.js'
import { registerExportRoutes } from './export.js'
import { registerMessageRoutes } from './messages.js'
import type { ExecutionService } from '../../services/execution.js'
import type { ReportService } from '../../services/report.js'
import type { ExportService } from '../../export/service.js'
import type { MessageService } from '../../services/message.js'

/**
 * /api/v1 路由注册入口（版本化前缀，§8）。
 * 需求 §4.1 组件装配：任务服务 + 执行编排器（经会话执行）+ 事件中继（SSE）+ 会话网关
 *                + 报告/证据只读服务 + 导出服务（report/audit/session）+ 消息服务（多轮）。
 */

export function registerV1Routes(
  app: FastifyInstance,
  ctx: AppContext,
  exec: ExecutionService,
  reports: ReportService,
  exports: ExportService,
  messages: MessageService,
): void {
  app.register(
    async (v1) => {
      await registerTasksRoutes(v1, ctx)
      registerExecutionRoutes(v1, ctx, exec)
      registerEventsRoute(v1, ctx)
      registerReportRoutes(v1, ctx, reports)
      registerExportRoutes(v1, ctx, exports)
      registerMessageRoutes(v1, ctx, messages)
    },
    { prefix: '/api/v1' },
  )
}
