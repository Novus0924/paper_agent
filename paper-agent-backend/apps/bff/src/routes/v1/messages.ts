import type { FastifyInstance } from 'fastify'
import type { AppContext } from '../../app.js'
import { validateTaskId, validateTurnId } from '../../infra/validate.js'
import type { MessageService } from '../../services/message.js'

/**
 * 多轮消息路由（BE-11，需求 §8.1 接口 14、§8.2 消息契约、§9.7 验收）：
 *   POST   /api/v1/tasks/{id}/messages        追问/修订（运行中排队）
 *   GET    /api/v1/tasks/{id}/messages        查询队列与历史（前端显示"待发 N 条"）
 *   DELETE /api/v1/tasks/{id}/messages/{turnId}  删除尚未发送的排队消息
 *
 * 契约（§8.2 原文）：
 *   Request: { "text": "...", "action": "ask" }        // ask | revise
 *   空闲:     200 { "queued": false, "turn_id": "...", "status": "running" }
 *   运行中:   200 { "queued": true, "order": 1, "turn_id": "...", "status": "queued" }
 *
 * 附两条辅助接口（不改变 POST 契约，前端渲染队列所需）：
 *   GET 用于回看待发/已发；DELETE 对应 §9.7「支持『立即发送/删除』」中的删除。
 *   「立即发送」= 空闲时 POST 天然立即投递（queued=false），无需额外接口。
 */

export function registerMessageRoutes(app: FastifyInstance, ctx: AppContext, messages: MessageService): void {
  app.post('/tasks/:id/messages', async (req, reply) => {
    const taskId = validateTaskId((req.params as { id: string }).id)
    const body = (req.body ?? {}) as { text?: unknown; action?: unknown }
    const result = messages.send(taskId, body.text, body.action)
    return reply.code(200).send(result)
  })

  app.get('/tasks/:id/messages', async (req) => {
    const taskId = validateTaskId((req.params as { id: string }).id)
    return messages.list(taskId)
  })

  app.delete('/tasks/:id/messages/:turnId', async (req, reply) => {
    const taskId = validateTaskId((req.params as { id: string }).id)
    const turnId = validateTurnId((req.params as { turnId: string }).turnId)
    const result = messages.remove(taskId, turnId)
    return reply.code(200).send(result)
  })

  // 触发 ctx 引用（保持与其它路由模块一致的装配签名；消息服务本身不读 ctx）
  void ctx
}
