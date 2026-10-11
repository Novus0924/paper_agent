import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AgnesGateway } from '../agh/gateway.js'
import type { Logger } from '../infra/logger.js'
import type { TaskIndex } from '../store/task-index.js'
import { EventBus } from '../events/bus.js'
import type { RelayEvent, RelayEventInput } from '../events/model.js'
import { asText } from '../infra/coerce.js'

/**
 * Event Relay（BE-06，需求文档 §5 / §9.3）：
 *
 * AGH 会话事件 → 归一事件 → SSE。
 *  - AGH 事件：`tool/call`、`tool/result`、`assistant/message`、`approval/*` 等（原生词汇）；
 *  - 领域真源：步骤/降级/结论/报告状态来自**内核产物**（state.json / ledger.jsonl / report.json，只读），
 *    因为 AGH 的 step/turn 是"模型回合"语义，与领域步骤（R1..R6）不是一回事（避免语义漂移）。
 *  - 终态：`done` 由执行编排器 settle 时必发（§5.2 终态保证）。
 */
export class EventRelay {
  private readonly bus = new EventBus()
  private readonly pumps = new Map<string, Promise<void>>()
  private readonly lastStepStatus = new Map<string, string>()
  /** toolUseId → 工具名（tool/result 无 tool 字段时回填，如 run_all/status） */
  private readonly toolNames = new Map<string, string>()

  constructor(
    private readonly gateway: AgnesGateway,
    private readonly index: TaskIndex,
    private readonly runsDir: string,
    private readonly log: Logger,
  ) {}

  get events(): EventBus {
    return this.bus
  }

  /** 订阅（先注册后补发，§5.2） */
  open(taskId: string) {
    return this.bus.open(taskId)
  }

  /**
   * 当前快照（§5.2：建连先发快照，**不走全局广播**）：
   * 逐条 `reserve`（只入缓冲、不下发给其他订阅者），调用方直写到本连接。
   */
  snapshot(taskId: string): RelayEvent[] {
    const task = this.index.get(taskId)
    if (!task) return []
    const out: RelayEvent[] = []
    const push = (e: RelayEventInput): void => {
      out.push(this.bus.reserve(taskId, e))
    }

    push({ type: 'ping' })
    for (const s of task.steps) {
      push({ type: 'step', step: s.id, status: s.status, elapsed_ms: undefined })
    }
    for (const d of task.degraded_reasons) {
      push({
        type: 'degraded',
        level: d.level,
        source: d.source,
        reason: d.reason,
        impact: d.impact,
        resumable: d.resumable,
        step: d.step,
      })
    }
    for (const c of this.readConclusions(taskId)) {
      push({ type: 'conclusion', cid: c.cid, text: c.text, evidence_ids: c.evidence_ids })
    }
    const reportReady = this.reportReady(taskId)
    push({ type: 'report', task_id: taskId, status: reportReady ? 'ready' : 'generating' })
    if (task.run_status === 'DONE' || task.run_status === 'FAILED') {
      push({
        type: 'done',
        run_status: task.run_status,
        report_ready: reportReady,
      })
    }
    return out
  }

  /** 启动某任务的 AGH 事件泵（幂等：同任务只起一个） */
  start(taskId: string, sessionId: string, cwd: string): void {
    if (this.pumps.has(taskId)) return
    const p = this.pump(taskId, sessionId, cwd).finally(() => {
      this.pumps.delete(taskId)
    })
    this.pumps.set(taskId, p)
  }

  /** 惰性确保：SSE 建连/状态变更时调用（只为该任务附加会话，不批量附加历史任务） */
  ensure(taskId: string): void {
    if (this.pumps.has(taskId)) return
    const task = this.index.get(taskId)
    if (!task?.session_id) return
    this.start(taskId, task.session_id, resolve(this.runsDir, taskId))
  }

  private async pump(taskId: string, sessionId: string, cwd: string): Promise<void> {
    try {
      const session = await this.gateway.attachSession(taskId, sessionId, cwd)
      this.syncDomain(taskId) // 建连即同步一次（补偿建连前已发生的事件）
      for await (const raw of session.events({})) {
        const ev = raw as unknown as { seq: number; type: string; data?: unknown }
        this.onAghEvent(taskId, ev.type, ev.data)
        this.syncDomain(taskId)
      }
    } catch (e) {
      this.log.warn('事件泵结束', { taskId, reason: e instanceof Error ? e.message : String(e) })
    }
  }

  /** AGH 原生事件 → 归一事件 */
  private onAghEvent(taskId: string, type: string, data: unknown): void {
    const d = (data ?? {}) as Record<string, unknown>
    switch (type) {
      case 'tool/call': {
        const tool = asText(d['name'])
        if (!tool) return
        const toolUseId = asText(d['toolUseId'])
        // 记录 toolUseId → 工具名：内核部分工具（run_all/status/verify）的返回不含 tool 字段
        if (toolUseId) this.toolNames.set(toolUseId, tool)
        this.bus.publish(taskId, {
          type: 'tool',
          id: toolUseId,
          step: '-',
          tool,
          status: 'running',
          input: d['args'],
        })
        return
      }
      case 'tool/result': {
        const toolUseId = asText(d['toolUseId'])
        const structured = (d['structured'] ?? {}) as Record<string, unknown>
        const isError = d['isError'] === true
        const sciretTool = typeof structured['tool'] === 'string' ? String(structured['tool']) : ''
        const step = typeof structured['step'] === 'string' ? structured['step'] : '-'
        // 工具名解析优先级：内核返回的 tool 名 → 本连接记录的 tool/call 映射（覆盖 run_all/status 这类无 tool 字段的返回）
        const mapped = this.toolNames.get(toolUseId)
        const displayName = sciretTool ? `sciret_${sciretTool}` : (mapped ?? 'unknown')
        this.bus.publish(taskId, {
          type: 'tool',
          id: toolUseId,
          step,
          tool: displayName,
          status: isError ? 'error' : 'ok',
          output: sciretTool ? structured : (d['content'] ?? structured),
          ...(structured['sources_status'] ? { sources_status: structured['sources_status'] as Record<string, string> } : {}),
        })
        // 人类可读活动（替代直接抛工具细节，§5.1 activity）
        const summary = structured['human_summary']
        if (typeof summary === 'string' && summary) {
          this.bus.publish(taskId, { type: 'activity', step, human_message: summary, detail: { tool: displayName } })
        }
        return
      }
      case 'assistant/message': {
        const content = Array.isArray(d['content']) ? (d['content'] as Array<{ type?: string; text?: string }>) : []
        const text = content
          .filter((c) => c?.type === 'text' && typeof c.text === 'string')
          .map((c) => c.text)
          .join('')
        // requestSeq 可能是数字，也可能是 AGH 给的字符串；两种都要正确取文本，
        // 但绝不能让它以 '[object Object]' 的形式混进 turn_id（那是审计字段）。
        const seqText = asText(d['requestSeq'], '0')
        if (!text) return
        this.bus.publish(taskId, { type: 'message', id: seqText, turn_id: seqText, role: 'assistant', text, status: 'done' })
        return
      }
      case 'approval/decided': {
        const toolCall = (d['toolCall'] ?? {}) as Record<string, unknown>
        // outcome 优先从 decision 对象里取；两者都可能是任意类型 → 用 asText 兜底
        const decision = asText((d['decision'] as Record<string, unknown> | undefined)?.['outcome']) || asText(d['outcome'])
        this.bus.publish(taskId, {
          type: 'activity',
          step: '-',
          human_message: `工具调用已由受控审批策略处理（${decision || '已决策'}）`,
          detail: { toolCallId: toolCall['toolCallId'] },
        })
        return
      }
      default:
        return
    }
  }

  /** 领域状态同步：步骤 / 降级 / 结论 / 报告（只读内核产物，不经 BFF 索引，避免索引刷新滞后导致步骤不动） */
  private syncDomain(taskId: string): void {
    const task = this.index.get(taskId)
    if (!task) return

    // 步骤：以内核 state.json 为准（权威），索引仅作兜底
    const kernelSteps = this.readKernelSteps(taskId)
    for (const s of kernelSteps.length > 0 ? kernelSteps : task.steps) {
      const prev = this.lastStepStatus.get(`${taskId}:${s.id}`)
      if (prev === s.status) continue
      this.lastStepStatus.set(`${taskId}:${s.id}`, s.status)
      if (s.status === 'PENDING') continue // PENDING 由快照给出，无需实时事件
      this.bus.publish(taskId, { type: 'step', step: s.id, status: s.status })
    }

    for (const r of this.readConclusions(taskId)) {
      this.bus.publish(taskId, { type: 'conclusion', cid: r.cid, text: r.text, evidence_ids: r.evidence_ids })
    }

    this.bus.publish(taskId, { type: 'report', task_id: taskId, status: this.reportReady(taskId) ? 'ready' : 'generating' })
  }

  /** 只读内核 state.json 的步骤快照（权威状态源） */
  private readKernelSteps(taskId: string): Array<{ id: string; status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'SKIPPED' }> {
    const file = resolve(this.runsDir, taskId, 'state.json')
    if (!existsSync(file)) return []
    try {
      const s = JSON.parse(readFileSync(file, 'utf8')) as {
        steps?: Array<{ id: string; status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'SKIPPED' }>
      }
      return (s.steps ?? []).map((x) => ({ id: x.id, status: x.status }))
    } catch {
      return []
    }
  }

  /** 报告就绪判定（唯一口径：内核产出 report.json；门禁不过则永不就绪） */
  private reportReady(taskId: string): boolean {
    return existsSync(resolve(this.runsDir, taskId, 'report.json'))
  }

  /** 终态：执行编排器 settle 时必发（§5.2） */
  emitDone(taskId: string, runStatus: 'DONE' | 'FAILED', error?: string): void {
    const reportReady = existsSync(resolve(this.runsDir, taskId, 'report.json'))
    this.bus.publish(taskId, {
      type: 'done',
      run_status: runStatus === 'DONE' ? 'DONE' : 'FAILED',
      report_ready: reportReady,
      ...(error ? { error } : {}),
    })
  }

  /**
   * 发布多轮消息事件（M8 / §5.3 事件表 message 类型）。
   * 与 assistant 消息走同一个事件类型，保证前端只有一条渲染路径。
   */
  publishMessage(
    taskId: string,
    ev: { turn_id: string; role: 'user' | 'assistant'; status: 'running' | 'done'; text?: string; queued_order?: number },
  ): void {
    this.bus.publish(taskId, {
      type: 'message',
      id: ev.turn_id,
      turn_id: ev.turn_id,
      role: ev.role,
      status: ev.status,
      ...(ev.text ? { text: ev.text } : {}),
    })
    // 队列顺序也要让前端可见（"待发第 N 条"），挂在 detail 供调试与 UI 定位
    if (ev.queued_order !== undefined) {
      this.bus.publish(taskId, {
        type: 'activity',
        step: '-',
        human_message: `追问已发送（第 ${ev.queued_order} 条）：${ev.text?.slice(0, 40) ?? ''}`,
        detail: { turn_id: ev.turn_id, queued_order: ev.queued_order, role: ev.role },
      })
    }
  }

  private readConclusions(taskId: string): Array<{ cid: string; text: string; evidence_ids: string[] }> {
    const file = resolve(this.runsDir, taskId, 'ledger.jsonl')
    if (!existsSync(file)) return []
    try {
      const out: Array<{ cid: string; text: string; evidence_ids: string[] }> = []
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim()) continue
        const r = JSON.parse(line) as Record<string, unknown>
        if (r['record_type'] !== 'conclusion') continue
        out.push({
          cid: asText(r['cid']),
          text: asText(r['text']),
          evidence_ids: Array.isArray(r['evidence_ids']) ? (r['evidence_ids'] as string[]) : [],
        })
      }
      return out
    } catch {
      return []
    }
  }

  stop(taskId: string): void {
    this.pumps.delete(taskId)
    this.bus.close(taskId)
  }
}
