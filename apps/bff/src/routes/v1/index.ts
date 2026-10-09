import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../../app.js'
import { registerTasksRoutes } from './tasks.js'
import { registerExecutionRoutes } from './execution.js'
import type { ExecutionService } from '../../services/execution.js'

/**
 * /api/v1 路由注册入口（版本化前缀，§8）。
 * 需求 §4.1 组件装配：任务服务 + 执行编排器（经会话执行）+ 会话网关。
 */

export function registerV1Routes(app: FastifyInstance, ctx: AppContext, exec: ExecutionService): void {
  app.register(
    async (v1) => {
      await registerTasksRoutes(v1, ctx)
      registerExecutionRoutes(v1, ctx, exec)
    },
    { prefix: '/api/v1' },
  )
}
