import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ApiError } from '../infra/errors.js'
import type { Logger } from '../infra/logger.js'
import type { AgnesGateway } from '../agh/gateway.js'
import type { DegradationRecord, RunStatus, StepStatus, TaskIndex, TaskRecord } from '../store/task-index.js'

/**
 * Execution Orchestrator（BE-05，需求文档 §4.1 / §8.1 接口 5–8 / §9.2）：
 *
 * 红线：执行**必须经 AGH 会话**（P-04/P-06）。本服务只做三件事：
 *   1) 组装自然语言指令 → 经 Session Gateway 下发到既有会话（同生命周期，不新建并行会话）；
 *   2) per-Task 互斥：同一任务已有执行在跑 → 409 BUSY；
 *   3) 终态收敛：以内核产物（runs/<task_id>/state.json，**只读**）为准回写任务索引。
 *
 * 明确不做：BFF 不 spawn 内核进程（BFF 只读自己的运行产物用于状态同步，不参与执行）。
 */

/** 领域内核 state.json 的结构（只读消费；权威定义在 kernel/sciret_kernel/state.py） */
type KernelState = {
  run_status?: RunStatus
  degraded?: boolean
  degraded_reasons?: DegradationRecord[]
  source_status?: Record<string, string>
  steps?: Array<{ id: string; status: StepStatus; attempts?: number }>
}

/** 受控模型步骤（与内核 workflow.MODEL_STEPS 同源）：
 *  由系统在整链完成后自动追加模型回合执行（sciret_synthesize），
 *  不参与手动单步推进与断点续跑。 */
const MODEL_STEP_IDS: ReadonlySet<string> = new Set(['S1'])

export type ExecutionAction = 'run-all' | 'step' | 'resume' | 'stop'

type Lock = { action: ExecutionAction; startedAt: string; sessionId: string }

export class ExecutionService {
  private readonly locks = new Map<string, Lock>()
  /** 完成回调（M4 Event Relay 用：终态必须发 done 事件） */
  private onSettled: ((taskId: string, runStatus: RunStatus) => void) | undefined
  /** 执行前钩子（用于确保事件泵已启动） */
  onBeforeExecute: ((taskId: string) => void) | undefined
  /**
   * 回合结束钩子（M8 消息服务：运行中排队的消息在此按序放行）。
   * 刻意用「回合结束」而非「任务终态」——任务跑完仍可追问（§9.7），队列必须在每个回合边界放行。
   */
  onTurnSettled: ((taskId: string) => void) | undefined
  /**
   * 外部忙碌判定（M8 消息服务：正在投递追问消息时也视作忙碌）。
   *
   * 为什么必须双向互斥：AGH 的 session 同时只允许一个活跃 turn。若只在执行侧加锁，
   * 「消息投递中→ 用户点运行」会让两个 session.prompt 并发打同一会话，行为未定义；
   * 反向「执行中→ 发消息」则由消息队列（入队）处理。故两侧都要看对方。
   */
  externalBusy: ((taskId: string) => boolean) | undefined

  constructor(
    private readonly gateway: AgnesGateway,
    private readonly index: TaskIndex,
    private readonly runsDir: string,
    private readonly log: Logger,
  ) {}

  setSettledListener(fn: (taskId: string, runStatus: RunStatus) => void): void {
    this.onSettled = fn
  }

  // ---------------------------------------------------------------- 对外接口

  /** POST /tasks/{id}/run-all —— 经会话跑完整流程（202，立即返回） */
  runAll(taskId: string): { task_id: string; run_status: RunStatus } {
    const task = this.mustGet(taskId)
    this.assertNotArchived(task)
    this.syncFromKernel(task)
    this.assertNotBusy(taskId)
    const instruction = this.buildInstruction(task, 'run-all')
    this.spawn(task, 'run-all', instruction)
    return { task_id: taskId, run_status: 'RUNNING' }
  }

  /** POST /tasks/{id}/step —— 经会话推进单步（body: step） */
  step(taskId: string, rawStep: unknown): { task_id: string; step: string; run_status: RunStatus } {
    const task = this.mustGet(taskId)
    this.assertNotArchived(task)
    this.syncFromKernel(task)
    const stepId = this.validateStep(task, rawStep)
    this.assertNotBusy(taskId)
    const instruction = this.buildInstruction(task, 'step', { step: stepId })
    this.spawn(task, 'step', instruction)
    return { task_id: taskId, step: stepId, run_status: 'RUNNING' }
  }

  /** POST /tasks/{id}/resume —— 断点续跑（仅 PENDING/FAILED 会执行） */
  resume(taskId: string): { task_id: string; from_step: string | null; run_status: RunStatus } {
    const task = this.mustGet(taskId)
    this.assertNotArchived(task)
    this.syncFromKernel(task)
    this.assertNotBusy(taskId)
    // 受控模型步骤（S1）不参与续跑：由系统在整链完成后自动追加模型回合
    const fromStep =
      task.steps.find((s) => (s.status === 'PENDING' || s.status === 'FAILED') && !MODEL_STEP_IDS.has(s.id))?.id ?? null
    if (fromStep === null && task.run_status === 'DONE') {
      // 幂等：已是终态 DONE，无需再跑（返回 409 让调用方明确感知，而不是空跑）
      throw new ApiError('BAD_STATE', `任务 ${taskId} 已完成（无待续跑步骤）`, '如需重新执行，请新建任务。')
    }
    const instruction = this.buildInstruction(task, 'resume')
    this.spawn(task, 'resume', instruction)
    return { task_id: taskId, from_step: fromStep, run_status: 'RUNNING' }
  }

  /**
   * POST /tasks/{id}/stop —— 请求停止（终态以实际为准）
   * 契约：200 { run_status, stopped_at, final_state: DONE|FAILED|CANCELLED }
   * 映射说明（需求未规定 RunStatus 之外的终态）：运行中被用户中止 → RunStatus=FAILED + final_state=CANCELLED；
   * 若已自然到达 DONE/FAILED，则按实际返回且不动状态（终态不可逆，§4.3）。
   */
  async stop(taskId: string): Promise<{
    task_id: string
    run_status: RunStatus
    stopped_at: string
    final_state: 'DONE' | 'FAILED' | 'CANCELLED'
  }> {
    const task = this.mustGet(taskId)
    this.syncFromKernel(task)
    const stoppedAt = new Date().toISOString()
    const lock = this.locks.get(taskId)

    if (!lock && (task.run_status === 'DONE' || task.run_status === 'FAILED')) {
      const finalState = task.run_status === 'DONE' ? 'DONE' : 'FAILED'
      return { task_id: taskId, run_status: task.run_status, stopped_at: stoppedAt, final_state: finalState }
    }

    // 中止当前回合（若在跑）；内核侧已完成的步骤不受影响，剩余步骤保持 PENDING → 可 resume
    if (lock) {
      try {
        await this.gateway.cancelTurn(taskId, task.session_id, this.runDir(taskId))
        this.log.info('已请求中止会话回合', { taskId, action: lock.action })
      } catch (e) {
        this.log.warn('中止回合失败（按实际终态处理）', { taskId, reason: e instanceof Error ? e.message : String(e) })
      }
      this.locks.delete(taskId)
    }

    if (task.run_status !== 'DONE') {
      task.run_status = 'FAILED'
      const record: DegradationRecord = {
        level: 'info',
        source: 'user',
        reason: '用户请求停止执行',
        impact: '剩余步骤未执行，可通过 resume 断点续跑',
        resumable: true,
        step: this.currentStepId(task),
        at: stoppedAt,
      }
      task.degraded_reasons.push(record)
      this.index.put(task)
    }
    const finalState = task.run_status === 'DONE' ? 'DONE' : 'CANCELLED'
    return { task_id: taskId, run_status: task.run_status, stopped_at: stoppedAt, final_state: finalState }
  }

  // ---------------------------------------------------------------- 内部

  private mustGet(taskId: string): TaskRecord {
    const task = this.index.get(taskId)
    if (!task) throw ApiError.notFound(`任务 ${taskId}`)
    return task
  }

  /** 归档互锁（v2.1）：归档任务拒绝一切执行类操作（GET 类只读不受限） */
  private assertNotArchived(task: TaskRecord): void {
    if (task.archived === true) {
      throw new ApiError(
        'BAD_STATE',
        `任务 ${task.task_id} 已归档，请先恢复`,
        '通过 POST /api/v1/tasks/{id}/archive（body {"archived": false}）恢复后再执行。',
      )
    }
  }

  private runDir(taskId: string): string {
    return resolve(this.runsDir, taskId)
  }

  private currentStepId(task: TaskRecord): string {
    return task.steps.find((s) => s.status === 'RUNNING')?.id ?? task.steps.find((s) => s.status === 'PENDING')?.id ?? '-'
  }

  private validateStep(task: TaskRecord, raw: unknown): string {
    if (typeof raw !== 'string' || raw.trim() === '') {
      throw ApiError.badBody('缺少 step 字段（字符串）。')
    }
    const stepId = raw.trim()
    if (MODEL_STEP_IDS.has(stepId)) {
      throw new ApiError(
        'BAD_PARAM',
        `步骤 ${stepId} 是受控模型步骤，不支持手动单步执行`,
        '该步骤由系统在整链完成后自动执行（基于证据的综合回答），无需手动触发。',
      )
    }
    const known = task.steps.map((s) => s.id)
    if (!known.includes(stepId)) {
      throw new ApiError('BAD_PARAM', `未知步骤：${stepId}`, `该任务的步骤为：${known.join(' | ')}。`)
    }
    return stepId
  }

  private assertNotBusy(taskId: string): void {
    const lock = this.locks.get(taskId)
    // 消息投递中同样算忙碌：同一 AGH 会话不能并发两个 turn（见externalBusy 注释）
    const external = this.externalBusy?.(taskId) === true
    if (lock || external) {
      const what = lock
        ? `已有步骤在执行（${lock.action}，自 ${lock.startedAt}）`
        : '已有追问消息在同一会话中投递'
      throw new ApiError('BUSY', `该任务${what}`, '请等待当前回合完成（订阅 /events 获取 done 事件）后再触发。')
    }
  }

  /** 组装指令：要求模型真实调用内核工具（不得凭空回答） */
  private buildInstruction(task: TaskRecord, action: ExecutionAction, opts: { step?: string } = {}): string {
    const dir = this.runDir(task.task_id).replace(/\\/g, '/')
    // T5 查询规划（模型参与点 1，受控）：要求模型先依据 goal 产出 1-3 个英文检索查询，
    // 经 sciret_plan 的 queries 参数透传内核（写入 state.json 并用于 Crossref/OpenAlex 检索）。
    // 模型拒绝/未传时内核回落 goal 原文（既有行为），不阻断。
    const plan = [
      `首先调用 sciret_plan 工具初始化任务，参数 run_dir="${dir}"、goal="${task.goal}"、workflow="${task.workflow}"、lit_source="${task.lit_source}"。`,
      '调用 sciret_plan 前，请先依据研究目标产出 1-3 个面向 Crossref/OpenAlex 的**英文关键词式**检索查询'
        + '（如 "solid-state electrolyte interface impedance characterization"；不要中文整句），'
        + '把它们作为 sciret_plan 的 queries 参数（字符串数组）传入——中文目标对英文文献库直接检索相关性极差，'
        + '英文查询能显著提升命中质量。若你判断无法产出合理查询，可以不传该参数，系统会回退使用目标原文。',
    ].join('')

    if (action === 'run-all') {
      return [
        '你正在执行 paper-agent 科研流水线的「整链执行」。请严格按序完成：',
        plan,
        `然后调用 sciret_run_all 工具，参数 run_dir="${dir}"，跑完剩余全部步骤。`,
        '完成后调用 sciret_status 工具汇报 run_status 与已完成步数，并用一句话总结结果。',
        '必须真实调用上述工具，不要凭空回答；每一步的产物由内核写入 run 目录。',
      ].join('\n')
    }
    if (action === 'step') {
      return [
        `你正在执行 paper-agent 科研流水线的单步推进（${opts.step}）。`,
        plan,
        `然后调用 sciret_run_step 工具，参数 run_dir="${dir}"、step="${opts.step}"。`,
        '完成后调用 sciret_status 工具汇报状态。必须真实调用工具，不要凭空回答。',
      ].join('\n')
    }
    // resume
    return [
      '你正在执行 paper-agent 科研流水线的断点续跑。已完成的步骤会被复用，只需执行待办/失败步骤。',
      plan,
      `然后调用 sciret_resume 工具，参数 run_dir="${dir}"、execute=true。`,
      '完成后调用 sciret_status 工具汇报状态。必须真实调用工具，不要凭空回答。',
    ].join('\n')
  }

  /**
   * 受控模型综合回合（T4，模型参与点 2）：整链 DONE 且报告就绪后，在同一会话
   * 追加一轮模型指令，要求模型基于 report.json 与 ledger.jsonl 的证据撰写
   * 300-600 字对 goal 的直接回答（必须用 [EV-xxxx] 角标引用真实证据），
   * 并调用 sciret_synthesize 落盘（内核校验角标、artifact 入账本、重装配报告）。
   *
   * 红线对齐：模型输出是 artifact（不进结论、不影响门禁）；执行仍经 AGH 会话；
   * 失败只记日志、不回滚主链路产物（综合回答缺失 ≠ 任务失败）。
   */
  private buildSynthesisInstruction(task: TaskRecord): string {
    const dir = this.runDir(task.task_id).replace(/\\/g, '/')
    return [
      `你正在为 paper-agent 任务 ${task.task_id} 生成「对研究问题的直接回答」（受控模型判断点，全额留痕）。`,
      `请先读取 run 目录 ${dir} 中的 report.json 与 ledger.jsonl（只读，不得修改任何既有产物）。`,
      `然后基于其中真实存在的证据，撰写 300-600 字对研究目标「${task.goal}」的直接回答：`,
      '每个事实性表述必须用 [EV-xxxx] 角标标注所依据的证据编号；只能使用 ledger.jsonl 中真实存在的证据编号，严禁编造证据号；没有证据支撑的表述请明确标注为推断。',
      `完成后调用 sciret_synthesize 工具，参数 run_dir="${dir}"、text=<你撰写的回答全文>。`,
      '必须真实调用工具落盘；不要凭空声称已完成。',
    ].join('\n')
  }

  /** 综合回合是否该跑：整链 DONE 且报告产物已就绪（缺一不可） */
  private synthesisEligible(taskId: string): boolean {
    const task = this.index.get(taskId)
    if (!task || task.run_status !== 'DONE') return false
    return existsSync(resolve(this.runDir(taskId), 'report.json'))
  }

  /** 启动后台执行：立即返回（202 语义），锁持有到回合结束 */
  private spawn(task: TaskRecord, action: ExecutionAction, instruction: string): void {
    const taskId = task.task_id
    this.locks.set(taskId, { action, startedAt: new Date().toISOString(), sessionId: task.session_id })
    const fresh = this.index.get(taskId) ?? task
    if (fresh.run_status !== 'DONE') {
      fresh.run_status = 'RUNNING'
      this.index.put(fresh)
    }
    // 保证事件泵在跑（否则前端 SSE 建连前的事件会漏）
    this.onBeforeExecute?.(taskId)
    this.log.info('已下发执行指令', { taskId, action })

    void (async () => {
      let firstTurnFailed = false
      try {
        try {
          await this.gateway.prompt(taskId, task.session_id, this.runDir(taskId), instruction)
          this.log.info('会话回合结束', { taskId, action })
        } catch (e) {
          firstTurnFailed = true
          this.log.error('执行回合失败', { taskId, action, reason: e instanceof Error ? e.message : String(e) })
          const t = this.index.get(taskId)
          if (t && t.run_status === 'RUNNING') {
            t.run_status = 'FAILED'
            const record: DegradationRecord = {
              level: 'degraded',
              source: 'session',
              reason: `会话执行失败：${e instanceof Error ? e.message : String(e)}`,
              impact: '任务未完成，可 resume 断点续跑',
              resumable: true,
              step: '-',
              at: new Date().toISOString(),
            }
            t.degraded_reasons.push(record)
            this.index.put(t)
          }
        }
        // T4：run-all 主链路成功到达 DONE 且报告就绪 → 同一会话追加受控模型综合回合。
        // 锁保持持有（消息队列不会在综合回答期间并发投递）；综合回合失败不回滚主链路。
        if (!firstTurnFailed && action === 'run-all') {
          // 先以内核产物为准同步状态：spawn 时索引里是 RUNNING，不同步就判断会漏
          this.syncFromKernel(this.index.get(taskId))
          if (this.synthesisEligible(taskId)) {
            const after = this.index.get(taskId)
            if (after) {
              try {
                await this.gateway.prompt(taskId, task.session_id, this.runDir(taskId), this.buildSynthesisInstruction(after))
                this.log.info('综合回答回合结束', { taskId, action: 'synthesize' })
              } catch (e) {
                this.log.warn('综合回答回合失败（不影响主链路产物，报告保持确定性部分）', {
                  taskId,
                  reason: e instanceof Error ? e.message : String(e),
                })
              }
            }
          }
        }
      } finally {
        this.locks.delete(taskId)
        this.syncFromKernel(this.index.get(taskId))
        const settled = this.index.get(taskId)
        if (settled) this.onSettled?.(taskId, settled.run_status)
        // 回合结束（不等于任务终态）：放行排队中的追问消息（§9.7「结束后按序执行」）
        this.onTurnSettled?.(taskId)
      }
    })()
  }

  /**
   * 状态同步：以内核产物 state.json 为准回写任务索引。
   * 只读本项目的运行产物（不执行任何领域进程，符合"执行不绕过 AGH"红线）。
   */
  syncFromKernel(task: TaskRecord | undefined): RunStatus | undefined {
    if (!task) return undefined
    const file = resolve(this.runDir(task.task_id), 'state.json')
    if (!existsSync(file)) return task.run_status
    let state: KernelState
    try {
      state = JSON.parse(readFileSync(file, 'utf8')) as KernelState
    } catch (e) {
      this.log.warn('state.json 解析失败（保留当前状态）', { taskId: task.task_id, reason: e instanceof Error ? e.message : String(e) })
      return task.run_status
    }
    for (const step of state.steps ?? []) {
      const mine = task.steps.find((s) => s.id === step.id)
      if (!mine) continue
      mine.status = step.status
      mine.attempts = step.attempts ?? mine.attempts
    }
    task.run_status = (state.run_status ?? task.run_status)
    task.degraded = Boolean(state.degraded ?? task.degraded)
    if (state.degraded_reasons?.length) task.degraded_reasons = state.degraded_reasons
    if (state.source_status && Object.keys(state.source_status).length) {
      task.sources = Object.keys(state.source_status).filter((k) => k !== 'corpus_snapshot')
    }
    this.index.put(task)
    return task.run_status
  }

  /** 测试与诊断用：等待某任务当前执行结束（不含消息投递，仅等执行回合） */
  async whenIdle(taskId: string, timeoutMs = 180_000): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (!this.locks.has(taskId)) return
      await new Promise((r) => setTimeout(r, 300))
    }
    throw new Error(`等待任务 ${taskId} 执行超时（${timeoutMs}ms）`)
  }

  isBusy(taskId: string): boolean {
    return this.locks.has(taskId) || this.externalBusy?.(taskId) === true
  }

  /** 仅指「执行回合」是否在跑（不含消息投递；消息服务用它判断能否立即投递） */
  isExecuting(taskId: string): boolean {
    return this.locks.has(taskId)
  }
}