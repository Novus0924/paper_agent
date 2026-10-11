import { resolve } from 'node:path'
import { ApiError } from '../infra/errors.js'
import type { Logger } from '../infra/logger.js'
import type { AgnesGateway } from '../agh/gateway.js'
import type { TaskIndex, TaskRecord } from '../store/task-index.js'

/**
 * Message Service（BE-11，需求文档 §4.1 / §8.1 接口 14/ §8.2 消息契约 / §9.7 验收、P-05）。
 *
 * 解决 P-05「底部对话框不起作用 → 未定义/未接线多轮追问接口」。
 *
 * 红线与边界：
 * - 追问/修订**必须在同一 AGH 会话内执行**（§9.7「全程仍在同一 AGH 会话留痕」），
 *   即复用 `task.session_id`，绝不新建并行会话、绝不绕过 AGH。
 * - 本服务**只做编排**：排队、顺序、投递。不解析模型输出、不改写结论、不写账本。
 *
 * 排队语义（§8.2）：
 *   Request:  { "text": "请补充近两年的最新进展", "action": "ask" }   // ask | revise
 *   空闲:      200 { "queued": false, "turn_id": "...", "status": "running" }
 *   运行中:    200 { "queued": true, "order": 1 }
 *
 * 为什么消息队列与执行锁是**两把独立的锁**：
 * - 执行锁（ExecutionService.locks）保证「同一任务同时只有一个流水线回合」；
 * - 消息锁（本类的 queues）保证「同一任务同时只有一条消息在投递」。
 * 二者必须分开，否则会出现"执行中发消息 → 直接 409 BUSY"，
 * 而需求要的是**入队**（§9.7「运行中发送进入排队、显示顺序，结束后按序执行」）。
 * 共用一把锁会把「排队」语义退化成「拒绝」，这正是 P-05 病灶的翻版。
 *
 * 投递时机：消息入队后由 `onTaskIdle` 驱动；执行服务在回合结束时回调它。
 * 这样队列与执行生命周期解耦——执行刚结束就能自动放行下一条，无需轮询。
 */

export type MessageAction = 'ask' | 'revise'

export type QueuedMessage = {
  turn_id: string
  task_id: string
  action: MessageAction
  text: string
  /** 入队序号（从 1 起，运行中请求据此显示"第 N 条待发"） */
  order: number
  queued_at: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'deleted'
  error?: string
}

export type SendResult =
  | { queued: false; turn_id: string; status: 'running' }
  | { queued: true; order: number; turn_id: string; status: 'queued' }

type TaskQueue = {
  /** 按order 升序的待发消息 */
  pending: QueuedMessage[]
  /** 正在投递的那一条（用于幂等：终态消息不重复发） */
  active: QueuedMessage | undefined
  /** 已完成的消息（供前端回看历史，含失败原因） */
  history: QueuedMessage[]
  seq: number
}

const MAX_TEXT = 4000
const MAX_QUEUE = 20

export class MessageService {
  private readonly queues = new Map<string, TaskQueue>()
  /** 终态/消息事件回调（M4 Event Relay：消息需经 SSE 推送） */
  onMessageEvent: ((taskId: string, event: { turn_id: string; role: 'user' | 'assistant'; status: 'running' | 'done'; text?: string; queued_order?: number }) => void) | undefined

  constructor(
    private readonly gateway: AgnesGateway,
    private readonly index: TaskIndex,
    private readonly runsDir: string,
    private readonly log: Logger,
    /** 仅指「执行回合」是否在跑（不含消息自身；否则 drain 会被自己判成忙而永不投递） */
    private readonly isExecBusy: (taskId: string) => boolean,
  ) {}

  /** 本任务是否有消息正在投递（供ExecutionService 做双向互斥判断） */
  isActive(taskId: string): boolean {
    return this.queues.get(taskId)?.active !== undefined
  }

  private queue(taskId: string): TaskQueue {
    let q = this.queues.get(taskId)
    if (!q) {
      q = { pending: [], active: undefined, history: [], seq: 0 }
      this.queues.set(taskId, q)
    }
    return q
  }

  private runDir(taskId: string): string {
    // 统一用 resolve + 正斜杠：会话 cwd 必须与执行侧**完全一致**，
    // 否则 session id（由 cwd 派生）对不上 → attach 报 SEMANTIC_REJECTED
    return resolve(this.runsDir, taskId).replace(/\\/g, '/')
  }

  // ---------------------------------------------------------------- 对外接口

  /**
   * POST /tasks/{id}/messages
   * 空闲 →立即投递（queued=false）；运行中 → 入队（queued=true + order）。
   */
  send(taskId: string, rawText: unknown, rawAction: unknown): SendResult {
    const task = this.mustGet(taskId)
    const text = this.validateText(rawText)
    const action = this.validateAction(rawAction)
    const q = this.queue(taskId)

    q.seq += 1
    const turnId = `turn-${q.seq}`
    // 队列上限保护：先判后插，绝不"插完再删旧的然后报错"（那会静默吃掉用户的一条消息）
    if (q.pending.length >= MAX_QUEUE) {
      throw new ApiError(
        'BUSY',
        `该任务待发消息已达上限（${MAX_QUEUE}），新消息未入队`,
        '请等待队列消化，或删除尚未发送的消息（DELETE /api/v1/tasks/{id}/messages/{turn_id}）后再试。',
      )
    }
    const msg: QueuedMessage = {
      turn_id: turnId,
      task_id: taskId,
      action,
      text,
      // order = 在**待发队列**中的位置（1 起）。正在投递的那条已离开队列，
      // 不该占位——否则前端会把"第 2 条待发"显示成"第 3 条"。
      order: q.pending.length + 1,
      queued_at: new Date().toISOString(),
      status: 'queued',
    }

    // 终态任务不接受新消息：模型回合会立刻结束，回复无意义 → 如实报错而非静默丢弃
    if (task.run_status === 'DONE' || task.run_status === 'FAILED') {
      throw new ApiError(
        'BAD_STATE',
        `任务 ${taskId} 已处于终态（${task.run_status}），不接受新的追问/修订`,
        '如需基于新问题继续，请新建任务（POST /api/v1/tasks）；终态任务的产物与账本不可变。',
      )
    }

    q.pending.push(msg)

    const busy = this.isExecBusy(taskId)
    if (!busy && !q.active) {
      // 空闲：立即投递（契约 queued=false, status=running）
      void this.drain(taskId)
      return { queued: false, turn_id: turnId, status: 'running' }
    }
    // 运行中：入队并给出显示顺序（契约 queued=true, order=N）
    return { queued: true, order: msg.order, turn_id: turnId, status: 'queued' }
  }

  /** DELETE /tasks/{id}/messages/{turn_id} —— 仅允许删「尚未发送」的（进行中/已完成的删不得） */
  remove(taskId: string, turnId: string): { deleted: true; turn_id: string } {
    this.mustGet(taskId)
    const q = this.queue(taskId)
    const idx = q.pending.findIndex((m) => m.turn_id === turnId)
    if (idx < 0) {
      const active = q.active?.turn_id === turnId
      const done = q.history.some((m) => m.turn_id === turnId)
      throw new ApiError(
        'BAD_STATE',
        active ? '该消息正在发送，无法删除' : done ? '该消息已发送完成，属会话留痕，不可删除' : '未找到该待发消息',
        '只有尚未发送的排队消息可以删除（DELETE /api/v1/tasks/{id}/messages/{turn_id}）。',
      )
    }
    // 先取出再删：splice 的返回值类型带 undefined（noUncheckedIndexedAccess），
    // 直接解构会让后面的 removed.turn_id 失去类型收窄。
    const removed = q.pending[idx]!
    q.pending.splice(idx, 1)
    removed.status = 'deleted'
    // 重排 order，保证前端显示的"第 N 条"与实际队列一致
    q.pending.forEach((m, i) => {
      m.order = i + 1
    })
    this.log.info('已删除待发消息', { taskId, turnId })
    return { deleted: true, turn_id: removed.turn_id }
  }

  /** GET /tasks/{id}/messages —— 查询队列与历史（前端渲染"待发 N 条"用） */
  list(taskId: string): {
    task_id: string
    busy: boolean
    pending: QueuedMessage[]
    active: QueuedMessage | undefined
    history: QueuedMessage[]
  } {
    this.mustGet(taskId)
    const q = this.queue(taskId)
    return {
      task_id: taskId,
      busy: this.isExecBusy(taskId) || this.isActive(taskId),
      pending: [...q.pending],
      active: q.active,
      history: [...q.history],
    }
  }

  /**
   * 执行回合结束后由 ExecutionService 调用 → 放行队列下一条（§9.7「结束后按序执行」）。
   * 这是队列与执行生命周期之间的**唯一耦合点**，无轮询、无定时器。
   */
  onTaskIdle(taskId: string): void {
    const q = this.queues.get(taskId)
    if (!q) return
    if (q.active) return // 还有消息在投递，等它自己结束
    if (q.pending.length === 0) return
    // 任务已终态则不再放行（避免对终态会话发消息）
    const task = this.index.get(taskId)
    if (!task || task.run_status === 'DONE' || task.run_status === 'FAILED') {
      q.pending.length = 0
      return
    }
    void this.drain(taskId)
  }

  // ---------------------------------------------------------------- 内部

  /** 顺序投递：一次只发一条，前一条结束后再取下一条（§9.7「按序执行」） */
  private async drain(taskId: string): Promise<void> {
    const q = this.queue(taskId)
    if (q.active) return // 幂等：已在投递
    if (this.isExecBusy(taskId)) return // 执行中，等 onTaskIdle 来触发
    const next = q.pending.shift()
    if (!next) return

    q.active = next
    next.status = 'running'
    this.onMessageEvent?.(taskId, { turn_id: next.turn_id, role: 'user', status: 'running', text: next.text, queued_order: next.order })
    this.log.info('开始投递消息', { taskId, turnId: next.turn_id, action: next.action })

    try {
      const task = this.index.get(taskId)
      if (!task?.session_id) throw new Error('任务缺少 AGH 会话映射')
      // 同一会话内追问（P-05 / §9.7「全程仍在同一 AGH 会话留痕」）
      await this.gateway.prompt(taskId, task.session_id, this.runDir(taskId), this.buildInstruction(task, next))
      next.status = 'done'
      this.log.info('消息回合结束', { taskId, turnId: next.turn_id })
    } catch (e) {
      next.status = 'failed'
      next.error = e instanceof Error ? e.message : String(e)
      this.log.error('消息投递失败', { taskId, turnId: next.turn_id, reason: next.error })
      // 失败要可观测：作为降级记录落到任务上（前端能看到"这条没发出去"）
      const t = this.index.get(taskId)
      if (t) {
        t.degraded_reasons.push({
          level: 'info',
          source: 'message',
          reason: `追问发送失败（${next.action}，${next.turn_id}）：${next.error}`,
          impact: '该条消息未送达会话，后续队列消息继续按序投递',
          resumable: true,
          step: '-',
          at: new Date().toISOString(),
        })
        this.index.put(t)
      }
    } finally {
      q.active = undefined
      q.history.push(next)
      // 队列还有下一条 → 继续（每条之间重新检查执行锁，避免与新触发的执行回合竞争）
      if (q.pending.length > 0 && !this.isExecBusy(taskId)) {
        void this.drain(taskId)
      }
    }
  }

  /** 组装指令：要求模型基于**既有证据**回答，不得凭空断言（§11 审计真实性） */
  private buildInstruction(task: TaskRecord, msg: QueuedMessage): string {
    const dir = this.runDir(task.task_id)
    if (msg.action === 'revise') {
      return [
        '用户对本次研究提出了修订请求。请在同一会话内处理，并严格遵守：',
        `1) 先调用 sciret_status 工具（run_dir="${dir}"）确认当前 run_status 与已完成步骤；`,
        '2) 修订必须落到内核工具上：可调用 sciret_run_step 重跑受影响步骤，或调用 sciret_report 重新装配报告；',
        '3) **禁止凭空断言**：所有事实性表述必须来自账本中的证据（EV-*），结论必须绑定证据；',
        '4) 修订完成后调用 sciret_verify 工具校验哈希链，并用一句话说明改了什么、依据哪些证据。',
        `用户修订要求：${msg.text}`,
      ].join('\n')
    }
    return [
      '用户在原任务基础上追加一个追问。请在同一会话内回答，并严格遵守：',
      `1) 先调用 sciret_status 工具（run_dir="${dir}"）确认当前状态；`,
      '2) 需要证据支撑时调用 sciret_evidence 或 sciret_cite 工具回查，引用格式为 [EV-xxxx]；',
      '3) **禁止凭空断言**：若现有证据不足以回答，请明确说明"现有证据无法支持"，不要编造文献或数据；',
      '4) 回答末尾用一句话说明本次回答用到了哪些证据编号。',
      `用户追问：${msg.text}`,
    ].join('\n')
  }

  // ---------------------------------------------------------------- 校验

  private mustGet(taskId: string): TaskRecord {
    const task = this.index.get(taskId)
    if (!task) throw ApiError.notFound(`任务 ${taskId}`)
    return task
  }

  private validateText(raw: unknown): string {
    if (typeof raw !== 'string') throw new ApiError('BAD_PARAM', 'text 必须是字符串', '请传入非空字符串，例如：{"text":"请补充近两年的最新进展"}。')
    const text = raw.trim()
    if (text === '') throw new ApiError('BAD_PARAM', 'text 不能为空', '追问/修订内容不可为空。')
    if (text.length > MAX_TEXT) {
      throw new ApiError('BAD_PARAM', `text 过长（${text.length} 字符，上限 ${MAX_TEXT}）`, `请精简到 ${MAX_TEXT} 字符以内。`)
    }
    return text
  }

  private validateAction(raw: unknown): MessageAction {
    // 未指定时默认 ask（§8.2 示例即 ask）；显式非法值必须报错，不静默回退（§6）
    if (raw === undefined || raw === null || raw === '') return 'ask'
    if (raw !== 'ask' && raw !== 'revise') {
      // 错误信息必须显示用户实际传的值；String(raw) 对对象会变成 '[object Object]'，
      // 用户看到"不支持的 action：[object Object]"根本不知道该改什么。
      throw new ApiError(
        'BAD_PARAM',
        `不支持的 action：${typeof raw === 'string' ? raw : JSON.stringify(raw)?.slice(0, 40) ?? typeof raw}`,
        '允许：ask（追问）| revise（修订）。',
      )
    }
    return raw
  }
}
