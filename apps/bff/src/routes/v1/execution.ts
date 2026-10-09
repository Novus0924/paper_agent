import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../../app.js'
import { validateTaskId } from '../../infra/validate.js'
import type { ExecutionService } from '../../services/execution.js'

/**
 * 执行编排路由（需求文档 §8.1 接口 5–8）：
 *   POST /api/v1/tasks/{id}/run-all   经会话跑完整流程        → 202 { task_id, run_status }
 *   POST /api/v1/tasks/{id}/step      经会话推进单步（body: step） → 202 { task_id, step, run_status }
 *   POST /api/v1/tasks/{id}/resume    断点续跑                → 202 { task_id, from_step, run_status }
 *   POST /api/v1/tasks/{id}/stop      请求停止（终态以实际为准） → 200 { task_id, run_status, stopped_at, final_state }
 *
 * 全部经 AGH 会话下发；同 Task 并发 → 409 BUSY（§8.3）。
 */

export function registerExecutionRoutes(app: FastifyInstance, ctx: AppContext, exec: ExecutionService): void {
  const taskIdOf = (req: { params: unknown }): string => validateTaskId((req.params as { id: string }).id)

  app.post('/tasks/:id/run-all', async (req, reply) => {
    const out = exec.runAll(taskIdOf(req))
    reply.code(202)
    return out
  })

  app.post('/tasks/:id/step', async (req, reply) => {
    const taskId = taskIdOf(req)
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>
    const out = exec.step(taskId, body['step'])
    reply.code(202)
    return out
  })

  app.post('/tasks/:id/resume', async (req, reply) => {
    const out = exec.resume(taskIdOf(req))
    reply.code(202)
    return out
  })

  app.post('/tasks/:id/stop', async (req) => {
    return exec.stop(taskIdOf(req))
  })

  // 供前端轮询/调试：执行是否在跑（不替代 SSE，SSE 在 M4）
  app.get('/tasks/:id/execution', async (req) => {
    const taskId = taskIdOf(req)
    const task = ctx.index.get(taskId)
    if (!task) {
      const { ApiError } = await import('../../infra/errors.js')
      throw ApiError.notFound(`任务 ${taskId}`)
    }
    exec.syncFromKernel(task)
    return {
      task_id: taskId,
      busy: exec.isBusy(taskId),
      run_status: task.run_status,
      degraded: task.degraded,
      steps: task.steps.map((s) => ({ id: s.id, label: s.label, status: s.status, attempts: s.attempts })),
    }
  })
}