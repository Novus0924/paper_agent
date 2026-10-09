import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../../app.js'
import { registerTasksRoutes } from './tasks.js'

/**
 * /api/v1 路由注册入口（版本化前缀，§8）。
 */

export function registerV1Routes(app: FastifyInstance, ctx: AppContext): void {
  app.register(
    async (v1) => {
      await registerTasksRoutes(v1, ctx)
    },
    { prefix: '/api/v1' },
  )
}
