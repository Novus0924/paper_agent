import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PreviewMerger, type Session } from '@agnes/sdk'
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

/** 过程帧落盘滚动上限：超过即裁剪，只保留最近 N 条（过程记录用于展示，无需无限增长） */
const TRACE_LIMIT = 500
/** 快照回放上限：重访时最多回放最近 N 条过程帧（避免超长历史拖慢建连） */
const TRACE_REPLAY_LIMIT = 200

export class EventRelay {
  private readonly bus = new EventBus()
  private readonly pumps = new Map<string, Promise<void>>()
  private readonly lastStepStatus = new Map<string, string>()
  /** toolUseId → 工具名（tool/result 无 tool 字段时回填，如 run_all/status） */
  private readonly toolNames = new Map<string, string>()
  /** 每步 RUNNING 打点（key `${taskId}:${step}`）→ DONE/FAILED 时算 elapsed_ms */
  private readonly stepStartedAt = new Map<string, number>()
  /** trace.jsonl 行数（滚动裁剪用；首次 append 时惰性读取初始化） */
  private readonly traceCounts = new Map<string, number>()
  /** 回合内 assistant 回复文本回调（v2.4：供消息服务把回复与消息轮次关联落盘） */
  onAssistantReply: ((taskId: string, text: string) => void) | undefined

  constructor(
    private readonly gateway: AgnesGateway,
    private readonly index: TaskIndex,
    private readonly runsDir: string,
    private readonly log: Logger,
  ) {
    // 过程帧落盘（v2.4 P2 修复）：所有**实时下发**的 activity/tool/step 帧写 `trace.jsonl`，
    // 供终态任务重访时快照回放（内存 buffer 在换页/重启后为空，快照因此拿不到过程记录）。
    // 挂在 bus 的发布钩子上集中处理（快照 `reserve` 不触发，避免回放自己再落一遍）。
    this.bus.onEvent = (taskId, ev) => this.appendTrace(taskId, ev)
  }

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
    // 缓冲是否为空必须在**本快照 reserve 之前**判定（reserve 会立刻往缓冲里写 ping/step…）
    const bufferWasEmpty = this.bus.since(taskId, 0).length === 0
    const out: RelayEvent[] = []
    const push = (e: RelayEventInput): void => {
      out.push(this.bus.reserve(taskId, e))
    }

    // 一次性读回过程记录（trace.jsonl）：既用于填充步骤耗时，也用于终态回放，避免重复读盘
    const trace = this.readTrace(taskId, TRACE_LIMIT)
    const elapsed = new Map<string, number>()
    for (const e of trace) {
      if (e.type === 'step' && typeof e.elapsed_ms === 'number' && e.elapsed_ms > 0) {
        elapsed.set(e.step, e.elapsed_ms)
      }
    }

    push({ type: 'ping' })
    for (const s of task.steps) {
      // 耗时（P2 修复）：索引不存 elapsed_ms，取 trace 里 RUNNING→DONE 的实测值回填
      const ms = elapsed.get(s.id)
      push({ type: 'step', step: s.id, status: s.status, ...(ms !== undefined ? { elapsed_ms: ms } : {}) })
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
    const terminal = task.run_status === 'DONE' || task.run_status === 'FAILED'
    if (task.run_status === 'DONE' || task.run_status === 'FAILED') {
      push({
        type: 'done',
        run_status: task.run_status,
        report_ready: reportReady,
      })
    }

    // 过程帧回放（P2 修复）：终态任务（或内存缓冲为空时）从 trace.jsonl 回放 activity/tool，
    // 保证重访时 Agent Trace/研究过程非空。进行中任务内存优先、不回放，避免与实时帧重复。
    // 只回放 activity/tool：step/degraded/conclusion/report/done 已由上面的快照**按当前状态重建**，
    // 若再回放历史 step 帧，可能把已 DONE 的步骤回退成 RUNNING（trace 尾部恰为 RUNNING 时），故不混入。
    if (terminal || bufferWasEmpty) {
      for (const e of trace.slice(-TRACE_REPLAY_LIMIT)) {
        if (e.type === 'activity' || e.type === 'tool') push(e as RelayEventInput)
      }
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
      // 思考流接线（v2.4）：AGH 原生预览流是「思考文本」的唯一载体（账本 assistant/output 只有计数）。
      const offThinking = this.attachThinking(taskId, session)
      try {
        for await (const raw of session.events({ preview: true })) {
          const ev = raw as unknown as { seq: number; type: string; data?: unknown }
          this.onAghEvent(taskId, ev.type, ev.data)
          this.syncDomain(taskId)
        }
      } finally {
        offThinking()
      }
    } catch (e) {
      this.log.warn('事件泵结束', { taskId, reason: e instanceof Error ? e.message : String(e) })
    }
  }

  /**
   * 思考流接线（v2.4）：把 AGH 原生预览流（`_agnes/v1/session.preview`，stream='thinking'）的
   * 增量文本归一为 `thinking` SSE 事件。
   *
   * 为什么用预览流而不是账本行：取证确认账本 `assistant/output` 只带 `chars:{text,thinking}` 计数、
   * 不含思考文本（`state:'interrupted'` 才偶带内容），思考文本只在预览流里逐帧到达。
   * 预览可能重复/乱序（无 seq，只有 offset），故复用官方 `PreviewMerger` 按偏移对齐，只下发**新增片段**；
   * 片段为空（重复/重叠）则不发帧——不硬造、不发空帧。当前部署模型 thinking=0 时不产生任何帧，属如实反映。
   */
  private attachThinking(taskId: string, session: Session): () => void {
    const merger = new PreviewMerger()
    return session.onPreview((p) => {
      if (p.stream !== 'thinking') return
      const before = merger.text(p.effectId)?.thinking.length ?? 0
      if (!merger.add(p)) return
      const piece = (merger.text(p.effectId)?.thinking ?? '').slice(before)
      if (!piece) return
      this.bus.publish(taskId, { type: 'thinking', text: piece })
    })
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
        // v2.4：不仅推 SSE，还通知消息服务把这段回复与当前消息轮次关联落盘
        this.onAssistantReply?.(taskId, text)
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
      // AGH 会话生命周期 → 人类可读 activity（提升"过程可见性"，v2.4）。
      // 注意：AGH 的 turn/step 是**模型回合/模型步**语义，与领域步骤 R1..R6 **不是一回事**，
      // 故 step 字段恒为 '-'，文案显式标注"模型回合/第 N 步"，避免语义漂移（§9 语义对齐）。
      case 'turn/start': {
        const turn = asText(d['turn'])
        const trigger = asText(d['trigger']) || 'prompt'
        this.bus.publish(taskId, {
          type: 'activity',
          step: '-',
          human_message: `模型回合 ${turn || '?'} 开始（${trigger}）`,
          detail: { turn: d['turn'], trigger: d['trigger'] },
        })
        return
      }
      case 'turn/end': {
        const reason = asText(d['reason']) || 'completed'
        this.bus.publish(taskId, {
          type: 'activity',
          step: '-',
          human_message: `模型回合结束（${reason}）`,
          detail: { reason: d['reason'], lastAssistantSeq: d['lastAssistantSeq'] },
        })
        return
      }
      case 'step/start': {
        const turn = asText(d['turn'])
        const step = asText(d['step'])
        this.bus.publish(taskId, {
          type: 'activity',
          step: '-',
          human_message: `模型回合 ${turn || '?'} 第 ${step || '?'} 步开始`,
          detail: { turn: d['turn'], step: d['step'] },
        })
        return
      }
      case 'step/end': {
        const turn = asText(d['turn'])
        const step = asText(d['step'])
        this.bus.publish(taskId, {
          type: 'activity',
          step: '-',
          human_message: `模型回合 ${turn || '?'} 第 ${step || '?'} 步结束`,
          detail: { turn: d['turn'], step: d['step'] },
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
      const key = `${taskId}:${s.id}`
      const prev = this.lastStepStatus.get(key)
      if (prev === s.status) continue
      this.lastStepStatus.set(key, s.status)
      if (s.status === 'PENDING') continue // PENDING 由快照给出，无需实时事件
      // 耗时（P2 修复）：RUNNING 打点，DONE/FAILED 结算差值；写入帧并落 trace，快照回放时回填
      let elapsedMs: number | undefined
      if (s.status === 'RUNNING') {
        this.stepStartedAt.set(key, Date.now())
      } else if (s.status === 'DONE' || s.status === 'FAILED') {
        const startedAt = this.stepStartedAt.get(key)
        if (startedAt !== undefined) {
          elapsedMs = Date.now() - startedAt
          this.stepStartedAt.delete(key)
        }
      }
      this.bus.publish(taskId, {
        type: 'step',
        step: s.id,
        status: s.status,
        ...(elapsedMs !== undefined ? { elapsed_ms: elapsedMs } : {}),
      })
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

  // ---------------------------------------------------------- 过程帧持久化（P2 修复）

  /**
   * 把**过程帧**（activity/tool + step 的非 PENDING 关键帧）追加到 `runs/<task_id>/trace.jsonl`（append-only）。
   *
   * 为什么需要落盘：AGH 工具/回合事件是一次性转发——SSE 建连时才 `ensure` 附加会话，历史帧不在内存 buffer 里；
   * BFF 重启后 buffer 更是全空。终态任务重访时 `snapshot()` 因此拿不到任何 activity/tool（QA 实测 Trace 条目 0）。
   * 落一份 append-only 的过程记录，使快照可回放。
   *
   * 滚动上限：文件保留最近 `TRACE_LIMIT` 条，超限即重写裁剪（过程记录用于展示，无需无限增长）。
   * 失败只告警、不影响实时推送——落盘是增强，不是主路径。
   */
  private appendTrace(taskId: string, ev: RelayEvent): void {
    const traceable =
      ev.type === 'activity' || ev.type === 'tool' || (ev.type === 'step' && ev.status !== 'PENDING')
    if (!traceable) return
    try {
      const dir = resolve(this.runsDir, taskId)
      mkdirSync(dir, { recursive: true })
      const file = resolve(dir, 'trace.jsonl')
      // 行数计数惰性初始化（跨进程重启时内存计数丢失，从文件现状续算）
      let n = this.traceCounts.get(taskId)
      if (n === undefined) n = this.countLines(file)
      appendFileSync(file, `${JSON.stringify(ev)}\n`, 'utf8')
      n += 1
      this.traceCounts.set(taskId, n)
      if (n > TRACE_LIMIT) this.trimTrace(taskId, file)
    } catch (e) {
      this.log.warn('过程帧落盘失败', { taskId, reason: e instanceof Error ? e.message : String(e) })
    }
  }

  /** 裁剪 trace.jsonl 到最近 TRACE_LIMIT 条（保留写入序，即原 seq 序） */
  private trimTrace(taskId: string, file: string): void {
    const kept = this.readTraceFile(file).slice(-TRACE_LIMIT)
    writeFileSync(file, kept.length > 0 ? `${kept.join('\n')}\n` : '', 'utf8')
    this.traceCounts.set(taskId, kept.length)
  }

  /** 读取最近 limit 条过程帧（保持写入序；坏行跳过，不让一行脏数据毁掉整条回放） */
  private readTrace(taskId: string, limit: number): RelayEvent[] {
    const file = resolve(this.runsDir, taskId, 'trace.jsonl')
    if (!existsSync(file)) return []
    try {
      return this.readTraceFile(file)
        .slice(-limit)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as RelayEvent]
          } catch {
            return [] // 坏行跳过
          }
        })
    } catch (e) {
      this.log.warn('读取过程帧失败', { taskId, reason: e instanceof Error ? e.message : String(e) })
      return []
    }
  }

  /** 原始行读取（去空行） */
  private readTraceFile(file: string): string[] {
    return readFileSync(file, 'utf8').split('\n').filter((l) => l.trim())
  }

  private countLines(file: string): number {
    try {
      return this.readTraceFile(file).length
    } catch {
      return 0
    }
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
