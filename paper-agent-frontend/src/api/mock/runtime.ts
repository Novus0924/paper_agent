import {
  applyEnvelope,
  emptyRuntime,
  rebuildRuntime,
  type TaskRuntimeState,
} from '../normalize';
import { ApiError } from '../errors';
import type {
  Conclusion,
  EvidenceBundle,
  EvidenceItem,
  ExportKind,
  ExportManifestItem,
  ExportResult,
  HealthInfo,
  Report,
  ReportResponse,
  SseEnvelope,
  SourceName,
  Step,
  TaskSnapshot,
  WorkflowName,
} from '../types';
import {
  buildFollowUpScript,
  buildScript,
  datasetFor,
  revisionSection,
  WORKFLOWS,
  type ScriptFrame,
} from './fixtures';

/* ==========================================================================
   Mock 运行时：localStorage 持久化 + 链式事件调度器。
   与 Live 同形：快照 + 事件序列 → 同一 reducer 重建（§6.2），
   因此刷新、重连、断网演示拿到的都是同一份形状与同一份报告。
   ========================================================================== */

/** v3：演示脚本改为按任务所选来源生成，旧种子数据的来源集合与脚本不再自洽 */
export const MOCK_STORAGE_KEY = 'paper-agent-frontend.mock.v3';

export type ConnectionState = 'online' | 'reconnecting' | 'offline';

interface StoredTask {
  snapshot: TaskSnapshot;
  script: ScriptFrame[];
  emitted: SseEnvelope[];
  cursor: number;
  runStartedAt: number | null;
  scheduled: boolean;
  paused: boolean;
  revisions: { turn_no: number; text: string; action: 'ask' | 'revise' }[];
}

interface MockStore {
  version: number;
  tasks: Record<string, StoredTask>;
  order: string[];
}

type Listener = (evt: SseEnvelope) => void;
type ConnListener = (state: ConnectionState) => void;

const nowIso = () => new Date().toISOString();

function newTaskId(d = new Date()): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const rand = Math.random().toString(36).slice(2, 8);
  return `run-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}${pad(d.getSeconds())}-${rand}`;
}

function makeSteps(workflow: WorkflowName, mutate?: (s: Step) => Step): Step[] {
  return WORKFLOWS[workflow].steps.map((s) => {
    const step: Step = {
      id: s.id,
      label: s.label,
      status: 'PENDING',
      attempts: 0,
      is_current: false,
    };
    return mutate ? mutate(step) : step;
  });
}

function makeSnapshot(input: {
  task_id: string;
  session_id: string;
  goal: string;
  workflow: WorkflowName;
  sources: SourceName[];
  created_at: string;
  run_status?: TaskSnapshot['run_status'];
  degraded?: boolean;
  steps?: Step[];
  report_ready?: boolean;
}): TaskSnapshot {
  return {
    task_id: input.task_id,
    title: input.goal.length > 24 ? `${input.goal.slice(0, 24)}…` : input.goal,
    goal: input.goal,
    workflow: input.workflow,
    lit_source:
      input.sources.includes('local') && input.sources.length === 1 ? 'local' : 'auto',
    sources: input.sources,
    run_status: input.run_status ?? 'PLANNED',
    steps: input.steps ?? makeSteps(input.workflow),
    degraded: input.degraded ?? false,
    session_id: input.session_id,
    created_at: input.created_at,
    updated_at: input.created_at,
    agh_recorded: true,
    report_ready: input.report_ready ?? false,
  };
}

export class MockRuntime {
  private store: MockStore;
  private listeners = new Map<string, Set<Listener>>();
  private connListeners = new Map<string, Set<ConnListener>>();
  private timers = new Map<string, number>();
  private runtime = new Map<string, TaskRuntimeState>();
  private saveTimer: number | null = null;
  private speed = 1;

  constructor() {
    this.store = this.load();
    this.resumeAll();
    // 关页面时补写防抖里还没落盘的变更：刷新与切走都经过 pagehide
    window.addEventListener('pagehide', () => this.flush());
  }

  /* ---------------- 持久化 ---------------- */

  private load(): MockStore {
    const raw = this.readStorage();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MockStore;
        if (parsed.version === 3 && parsed.tasks) return parsed;
      } catch {
        /* 数据损坏时重建演示数据，不让用户卡在空白页 */
      }
    }
    const seeded = this.seed();
    this.writeStorage(JSON.stringify(seeded));
    return seeded;
  }

  private readStorage(): string | null {
    try {
      return localStorage.getItem(MOCK_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private writeStorage(value: string): void {
    try {
      localStorage.setItem(MOCK_STORAGE_KEY, value);
    } catch {
      /* 容量或隐私模式限制：演示仍可运行，只是刷新后回到初始数据 */
    }
  }

  private persist(): void {
    if (this.saveTimer !== null) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      this.write();
    }, 180);
  }

  /**
   * 立即落盘：新建任务与页面卸载不能等防抖，
   * 否则"创建后马上刷新"会因为 180ms 窗口没写入而找不到任务（用户实测）。
   */
  private flush(): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.write();
  }

  private write(): void {
    this.writeStorage(JSON.stringify(this.store));
  }

  reset(): void {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers.clear();
    this.runtime.clear();
    this.store = this.seed();
    this.writeStorage(JSON.stringify(this.store));
  }

  /* ---------------- 演示种子数据 ---------------- */

  private seed(): MockStore {
    const tasks: Record<string, StoredTask> = {};
    const order: string[] = [];
    const day = 86_400_000;
    const base = Date.now();

    const put = (task: StoredTask) => {
      tasks[task.snapshot.task_id] = task;
      order.unshift(task.snapshot.task_id);
    };

    // 1) 已完成：研究综述，覆盖充足未降级
    {
      const id = newTaskId(new Date(base - day * 1 - 3_600_000));
      const sources: SourceName[] = ['arxiv', 'crossref', 'openalex', 'semantic_scholar'];
      const script = buildScript(
        'research',
        '固态电解质界面阻抗的主要表征方法有哪些？',
        sources,
      );
      const snapshot = makeSnapshot({
        task_id: id,
        session_id: `sess-${id.slice(-6)}`,
        goal: '固态电解质界面阻抗的主要表征方法有哪些？请检索近五年文献，给出方法对比与结论。',
        workflow: 'research',
        sources,
        created_at: new Date(base - day * 1 - 3_600_000).toISOString(),
      });
      const emitted = script.map((f, i) => this.stamp(id, f, i + 1));
      const rt = rebuildRuntime(snapshot, emitted);
      put({
        snapshot: rt.snapshot ?? { ...snapshot, run_status: 'DONE', report_ready: true },
        script,
        emitted,
        cursor: script.length,
        runStartedAt: base - day * 1 - 3_600_000,
        scheduled: false,
        paused: false,
        revisions: [],
      });
    }

    // 2) 已降级完成：材料分析（真实降级 + 橙色横幅）
    {
      const id = newTaskId(new Date(base - day * 2 - 7_200_000));
      // 降级帧讲的是语义检索源不可用，它必须在这条任务的实际计划内才成立
      const sources: SourceName[] = ['arxiv', 'openalex', 'semantic_scholar', 'local'];
      const script = buildScript('materials', '', sources);
      const snapshot = makeSnapshot({
        task_id: id,
        session_id: `sess-${id.slice(-6)}`,
        goal: '钙钛矿太阳能电池缺陷钝化有哪些主流策略？请比较其效率与稳定性提升。',
        workflow: 'materials',
        sources,
        created_at: new Date(base - day * 2 - 7_200_000).toISOString(),
        degraded: true,
      });
      const emitted = script.map((f, i) => this.stamp(id, f, i + 1));
      const rt = rebuildRuntime(snapshot, emitted);
      put({
        snapshot: rt.snapshot ?? snapshot,
        script,
        emitted,
        cursor: script.length,
        runStartedAt: base - day * 2 - 7_200_000,
        scheduled: false,
        paused: false,
        revisions: [],
      });
    }

    // 3) 失败：需要重试或改源后重跑
    {
      const id = newTaskId(new Date(base - day * 3));
      const sources: SourceName[] = ['arxiv', 'crossref', 'semantic_scholar'];
      // 截在失败点之前：R4 起的帧不能留进脚本，否则终态运行里会留下「进行中」步骤
      const full = buildScript('research', '', sources);
      const cutAt = full.findIndex((f) => (f.data as { step?: string }).step === 'R4');
      const head = full.slice(0, cutAt === -1 ? 20 : cutAt);
      const lastAt = head.at(-1)?.at ?? 0;
      // 脚本停在失败点：订阅补发必须收敛回"未完成"，不能被排程继续播放
      const frames: ScriptFrame[] = [
        ...head,
        {
          at: lastAt + 400,
          event: 'step',
          data: {
            step: 'R3',
            status: 'FAILED',
            elapsed_ms: 5200,
            error: '检索来源连续超时，未能建立完整对比维度',
          },
        },
        {
          at: lastAt + 800,
          event: 'done',
          data: { run_status: 'FAILED', report_ready: false },
        },
      ];
      const steps = makeSteps('research', (s) =>
        s.id === 'R3'
          ? {
              ...s,
              status: 'FAILED',
              attempts: 2,
              error: '检索来源连续超时，未能建立完整对比维度',
            }
          : s.id === 'R1' || s.id === 'R2'
            ? { ...s, status: 'DONE' }
            : s,
      );
      const snapshot = makeSnapshot({
        task_id: id,
        session_id: `sess-${id.slice(-6)}`,
        goal: '锂金属负极枝晶的形成机理与抑制手段有哪些？请整理近五年进展。',
        workflow: 'research',
        sources,
        created_at: new Date(base - day * 3).toISOString(),
        run_status: 'FAILED',
        steps,
      });
      const emitted = frames.map((f, i) => this.stamp(id, f, i + 1));
      put({
        snapshot: rebuildRuntime(snapshot, emitted).snapshot ?? snapshot,
        script: frames,
        emitted,
        cursor: frames.length,
        runStartedAt: base - day * 3,
        scheduled: false,
        paused: false,
        revisions: [],
      });
    }

    // 4) 执行中：刷新后可继续推进（验证实时路径与刷新路径同形）
    {
      const id = newTaskId(new Date(base - 1_200_000));
      const sources: SourceName[] = ['arxiv', 'openalex', 'semantic_scholar'];
      const script = buildScript('research', '', sources);
      const snapshot = makeSnapshot({
        task_id: id,
        session_id: `sess-${id.slice(-6)}`,
        goal: '钠离子电池硬碳负极孔径调控对首次库伦效率的影响有哪些结论？',
        workflow: 'research',
        sources,
        created_at: new Date(base - 1_200_000).toISOString(),
        run_status: 'RUNNING',
      });
      const upto = 8;
      const emitted = script.slice(0, upto).map((f, i) => this.stamp(id, f, i + 1));
      put({
        snapshot: rebuildRuntime(snapshot, emitted).snapshot ?? snapshot,
        script,
        emitted,
        cursor: upto,
        runStartedAt: Date.now() - (script[upto]?.at ?? 0),
        scheduled: false,
        paused: false,
        revisions: [],
      });
    }

    return { version: 3, tasks, order };
  }

  private stamp(taskId: string, frame: ScriptFrame, seq: number): SseEnvelope {
    const data =
      frame.event === 'report'
        ? { ...frame.data, task_id: taskId }
        : { ...(frame.data as object) };
    // 丢弃排队顺序里不适用的 undefined
    return {
      seq,
      ts: nowIso(),
      task_id: taskId,
      event: frame.event as SseEnvelope['event'],
      data,
    } as SseEnvelope;
  }

  private elapsed(task: StoredTask): number {
    return task.runStartedAt === null ? 0 : (Date.now() - task.runStartedAt) * this.speed;
  }

  /** 快进/正常速度（演示用）：切换时重新对齐基线，保持虚拟时间连续 */
  setSpeed(speed: number): void {
    const entries = this.store.order
      .map((id) => this.store.tasks[id])
      .filter((t): t is StoredTask => t !== undefined && t.runStartedAt !== null);
    const before = entries.map((t) => ({ t, virtual: this.elapsed(t) }));
    this.speed = speed;
    for (const { t, virtual } of before) {
      t.runStartedAt = Date.now() - virtual / speed;
    }
    this.persist();
    // 用新的间隔重新排程当前进度
    for (const id of this.store.order) {
      const t = this.store.tasks[id];
      if (t && t.cursor < t.script.length && !t.paused) this.scheduleNext(id);
    }
  }

  /* ---------------- 调度 ---------------- */

  private resumeAll(): void {
    for (const id of this.store.order) {
      const task = this.store.tasks[id];
      if (!task) continue;
      this.runtime.set(id, rebuildRuntime(task.snapshot, task.emitted));
      if (
        task.cursor < task.script.length &&
        !task.paused &&
        task.runStartedAt !== null
      ) {
        const next = task.script[task.cursor];
        if (next) {
          // 重新对齐基线，使未播放的帧从"现在"继续（模拟真实节奏）
          task.runStartedAt = Date.now() - next.at;
          this.scheduleNext(id);
        }
      }
    }
  }

  private scheduleNext(taskId: string): void {
    const task = this.store.tasks[taskId];
    if (!task) return;
    const existing = this.timers.get(taskId);
    if (existing !== undefined) window.clearTimeout(existing);
    this.timers.delete(taskId);

    const frame = task.script[task.cursor];
    if (!frame || task.paused) {
      if (!frame) {
        task.scheduled = false;
        this.persist();
      }
      return;
    }
    const delay = Math.max(0, (frame.at - this.elapsed(task)) / this.speed);
    task.scheduled = true;
    const timer = window.setTimeout(() => {
      this.emit(taskId);
      task.cursor += 1;
      this.scheduleNext(taskId);
    }, delay);
    this.timers.set(taskId, timer);
  }

  private emit(taskId: string): void {
    const task = this.store.tasks[taskId];
    if (!task) return;
    const frame = task.script[task.cursor];
    if (!frame) return;
    const envelope = this.stamp(taskId, frame, task.emitted.length + 1);
    task.emitted.push(envelope);
    const state = applyEnvelope(
      this.runtime.get(taskId) ?? emptyRuntime(task.snapshot),
      envelope,
    );
    this.runtime.set(taskId, state);
    if (state.snapshot) task.snapshot = state.snapshot;
    this.listeners.get(taskId)?.forEach((l) => l(envelope));
    this.persist();
  }

  /** 外部追加帧（多轮消息）后立即尝试调度 */
  private kick(taskId: string): void {
    const task = this.store.tasks[taskId];
    if (!task || task.paused) return;
    if (task.cursor < task.script.length && !this.timers.has(taskId))
      this.scheduleNext(taskId);
  }

  /* ---------------- 订阅（含快照补发） ---------------- */

  subscribe(taskId: string, onEvent: Listener, onConn?: ConnListener): () => void {
    const set = this.listeners.get(taskId) ?? new Set<Listener>();
    set.add(onEvent);
    this.listeners.set(taskId, set);
    const cset = this.connListeners.get(taskId) ?? new Set<ConnListener>();
    if (onConn) {
      cset.add(onConn);
      this.connListeners.set(taskId, cset);
      // 建连即视为在线；订阅先于补发（对齐后端 §5.2 的竞态修复）
      window.setTimeout(() => onConn('online'), 0);
    }

    const task = this.store.tasks[taskId];
    if (task) {
      for (const evt of task.emitted) onEvent(evt);
      // 排队中的多轮消息也要恢复
      this.kick(taskId);
    }
    return () => {
      set.delete(onEvent);
      if (onConn) cset.delete(onConn);
    };
  }

  /** 演示用：模拟连接断开与恢复（仅 mock 模式暴露该入口） */
  simulateConnectionDrop(taskId: string): void {
    const task = this.store.tasks[taskId];
    if (!task) return;
    task.paused = true;
    const t = this.timers.get(taskId);
    if (t !== undefined) window.clearTimeout(t);
    this.timers.delete(taskId);
    this.connListeners.get(taskId)?.forEach((l) => l('offline'));
    this.persist();
  }

  simulateConnectionRestore(taskId: string): void {
    const task = this.store.tasks[taskId];
    if (!task) return;
    task.paused = false;
    const next = task.script[task.cursor];
    if (next && task.runStartedAt) task.runStartedAt = Date.now() - next.at;
    this.connListeners.get(taskId)?.forEach((l) => {
      l('online');
    });
    this.scheduleNext(taskId);
  }

  /* ---------------- 命令 ---------------- */

  createTask(input: { goal: string; workflow: WorkflowName; sources: SourceName[] }): {
    task_id: string;
    session_id: string;
    state: TaskSnapshot;
  } {
    const id = newTaskId();
    const snapshot = makeSnapshot({
      task_id: id,
      session_id: `sess-${id.slice(-6)}`,
      goal: input.goal,
      workflow: input.workflow,
      sources: input.sources,
      created_at: nowIso(),
    });
    const task: StoredTask = {
      snapshot,
      script: buildScript(input.workflow, input.goal, input.sources),
      emitted: [],
      cursor: 0,
      runStartedAt: null,
      scheduled: false,
      paused: false,
      revisions: [],
    };
    this.store.tasks[id] = task;
    this.store.order.unshift(id);
    this.runtime.set(id, emptyRuntime(snapshot));
    this.flush();
    return { task_id: id, session_id: snapshot.session_id, state: snapshot };
  }

  startRun(taskId: string): void {
    const task = this.store.tasks[taskId];
    if (!task) return;
    if (task.runStartedAt === null) {
      task.runStartedAt = Date.now();
      task.snapshot = { ...task.snapshot, run_status: 'RUNNING' };
    }
    task.paused = false;
    this.scheduleNext(taskId);
    this.persist();
  }

  /** 断点续跑 / 重试失败步骤：从首个未完成帧继续播放 */
  resume(taskId: string, fromStep?: string): void {
    const task = this.store.tasks[taskId];
    if (!task) return;
    // 失败任务的脚本停在失败点，续跑先换回完整工作流脚本，重跑才能走到报告产出
    task.script = buildScript(
      task.snapshot.workflow,
      task.snapshot.goal ?? task.snapshot.title,
      task.snapshot.sources,
    );
    let index = task.script.findIndex(
      (f) => f.event === 'step' && (f.data as { status: string }).status === 'RUNNING',
    );
    if (fromStep) {
      const byStep = task.script.findIndex(
        (f) => (f.data as { step?: string }).step === fromStep,
      );
      if (byStep >= 0) index = byStep;
    }
    if (index < 0) index = task.cursor;
    task.cursor = index;
    const frame = task.script[index];
    task.runStartedAt = Date.now() - (frame?.at ?? 0);
    task.paused = false;
    task.snapshot = {
      ...task.snapshot,
      run_status: 'RUNNING',
      steps: task.snapshot.steps.map((s) =>
        s.status === 'FAILED'
          ? { ...s, status: 'PENDING', error: undefined, attempts: s.attempts + 1 }
          : s,
      ),
    };
    this.runtime.set(taskId, rebuildRuntime(task.snapshot, task.emitted));
    this.scheduleNext(taskId);
    this.persist();
  }

  list(): TaskSnapshot[] {
    return this.store.order
      .map((id) => this.store.tasks[id]?.snapshot)
      .filter((s): s is TaskSnapshot => Boolean(s));
  }

  get(taskId: string): TaskSnapshot | null {
    return this.store.tasks[taskId]?.snapshot ?? null;
  }

  state(taskId: string): TaskRuntimeState | null {
    const task = this.store.tasks[taskId];
    if (!task) return null;
    return this.runtime.get(taskId) ?? rebuildRuntime(task.snapshot, task.emitted);
  }

  /** 多轮：运行中排队、空闲即执行；返回后端同形的 SendResult */
  sendMessage(
    taskId: string,
    text: string,
    action: 'ask' | 'revise',
  ): { queued: boolean; turn_id: string; order?: number } {
    const task = this.store.tasks[taskId];
    if (!task) throw new ApiError('NOT_FOUND');
    const running =
      task.snapshot.run_status === 'RUNNING' || task.snapshot.run_status === 'PLANNED';
    const turnId = `turn-${Math.random().toString(36).slice(2, 8)}`;
    const nowAt = this.elapsed(task);
    const lastAt = task.script.at(-1)?.at ?? 0;
    const pending = task.script.filter(
      (f) =>
        f.event === 'message' &&
        (f.data as { role?: string; status?: string }).role === 'user' &&
        (f.data as { status?: string }).status === 'queued',
    ).length;
    const insertAt = running ? Math.max(lastAt + 400, nowAt + 300) : nowAt + 100;

    const userFrame: ScriptFrame = {
      at: nowAt,
      event: 'message',
      turnId,
      data: {
        turn_id: turnId,
        role: 'user',
        text,
        status: running ? 'queued' : 'done',
        queued_order: running ? pending + 1 : undefined,
      },
    };
    // 轮到该条时先把排队状态收敛为已发送，再播放回复帧
    const promoteFrame: ScriptFrame = {
      at: insertAt,
      event: 'message',
      turnId,
      data: { turn_id: turnId, role: 'user', text, status: 'done' },
    };
    const follow = buildFollowUpScript(turnId, text, action, {
      reportReady: task.snapshot.report_ready === true,
    }).map((f) => ({
      ...f,
      at: insertAt + f.at,
    }));

    task.script.push(userFrame, promoteFrame, ...follow);
    if (action === 'revise') {
      task.revisions.push({ turn_no: task.revisions.length + 1, text, action });
    }
    this.persist();
    this.kick(taskId);
    return { queued: running, turn_id: turnId, order: running ? pending + 1 : undefined };
  }

  /** 立即发送：把该轮帧整体前移到当前时刻，其余帧顺延（真实可用，非占位） */
  sendNow(taskId: string, turnId: string): void {
    const task = this.store.tasks[taskId];
    if (!task) return;
    const timer = this.timers.get(taskId);
    if (timer !== undefined) window.clearTimeout(timer);
    this.timers.delete(taskId);

    const head = task.script.slice(0, task.cursor);
    const rest = task.script.slice(task.cursor);
    const target = rest.filter((f) => f.turnId === turnId);
    if (target.length === 0) return;
    const others = rest.filter((f) => f.turnId !== turnId);

    const firstAt = target[0]?.at ?? 0;
    const shift = this.elapsed(task) + 100 - firstAt;
    const moved = target.map((f) => ({ ...f, at: f.at + shift }));
    const turnEnd = moved.reduce((max, f) => Math.max(max, f.at), 0) + 200;
    const othersStart = others[0]?.at ?? turnEnd;
    const delay = Math.max(0, turnEnd - othersStart);
    const delayed = others.map((f) => ({ ...f, at: f.at + delay }));

    task.script = [...head, ...moved, ...delayed];
    task.cursor = head.length;
    this.scheduleNext(taskId);
    this.persist();
  }

  removeQueued(taskId: string, turnId: string): void {
    const task = this.store.tasks[taskId];
    if (!task) return;
    const head = task.script.slice(0, task.cursor);
    const tail = task.script.slice(task.cursor).filter((f) => f.turnId !== turnId);
    task.script = [...head, ...tail];
    task.cursor = Math.min(task.cursor, task.script.length);
    this.persist();
    this.scheduleNext(taskId);
  }

  report(taskId: string): ReportResponse {
    const task = this.store.tasks[taskId];
    if (!task) throw new ApiError('NOT_FOUND');
    const state = this.state(taskId);
    const ready = task.snapshot.report_ready === true || state?.reportStatus === 'ready';
    if (!ready) {
      return {
        status: 'generating',
        pending_note:
          task.snapshot.run_status === 'FAILED'
            ? '任务未完成：需先重试或改源后重跑，完成检索、分析与写作步骤才会产出报告。'
            : '报告需要完成检索、分析、核验与写作步骤后自动汇聚。',
      };
    }
    const dataset = datasetFor(task.snapshot.workflow);
    const report: Report = {
      ...dataset.report,
      task_id: taskId,
      generated_at: task.snapshot.updated_at,
      meta: { ...dataset.report.meta, session_id: task.snapshot.session_id },
      conclusions:
        state && state.conclusions.length > 0 ? state.conclusions : dataset.conclusions,
      sections: this.sectionsWithRevisions(task, dataset),
    };
    return { status: 'ready', report };
  }

  private sectionsWithRevisions(
    task: StoredTask,
    dataset: ReturnType<typeof datasetFor>,
  ) {
    const base = [...dataset.report.sections];
    task.revisions.forEach((rev) => {
      const conclusionCount = dataset.conclusions.length + rev.turn_no;
      base.push(revisionSection(rev.turn_no, rev.text));
      void conclusionCount;
    });
    return base;
  }

  evidence(taskId: string): EvidenceBundle {
    const task = this.store.tasks[taskId];
    const state = this.state(taskId);
    if (!task) return { task_id: taskId, evidence: [], conclusions: [], trace: [] };
    const dataset = datasetFor(task.snapshot.workflow);
    const ready =
      task.snapshot.report_ready === true || task.snapshot.run_status === 'DONE';
    const started = task.emitted.length > 0;
    const evidence: EvidenceItem[] = ready
      ? dataset.evidence
      : started
        ? dataset.evidence.filter((e) =>
            task.snapshot.steps.some(
              (s) => s.id === e.producer_step && s.status === 'DONE',
            ),
          )
        : [];
    const conclusions: Conclusion[] =
      state && state.conclusions.length
        ? state.conclusions
        : ready
          ? dataset.conclusions
          : [];
    return {
      task_id: taskId,
      evidence,
      conclusions,
      trace: this.trace(taskId),
    };
  }

  trace(taskId: string) {
    const task = this.store.tasks[taskId];
    if (!task) return [];
    return task.emitted.map((e) => ({
      id: `${e.seq}`,
      seq: e.seq,
      ts: e.ts,
      type: e.event,
      label: labelForEvent(e),
      detail: JSON.stringify(e.data),
    }));
  }

  export(taskId: string, kind: ExportKind): ExportResult {
    const task = this.store.tasks[taskId];
    if (!task) return { ok: false, kind, code: 'NOT_FOUND', error: '没有找到这个任务。' };
    const bundle = this.evidence(taskId);
    const reportRes = this.report(taskId);
    const manifestBase: ExportManifestItem[] = [
      { name: 'report.md', kind: '报告', verified: reportRes.status === 'ready' },
      {
        name: 'evidence-ledger.json',
        kind: '证据账本',
        verified: bundle.evidence.length > 0,
      },
      { name: 'events.jsonl', kind: '归一事件', verified: task.emitted.length > 0 },
      {
        name: 'conclusions.json',
        kind: '结论与证据绑定',
        verified: bundle.conclusions.length > 0,
      },
      {
        name: 'verify.sh',
        kind: '校验脚本',
        verified: true,
        note: '演示数据内为只读校验清单',
      },
    ];

    if (kind === 'report') {
      if (reportRes.status !== 'ready' || !reportRes.report) {
        return {
          ok: false,
          kind,
          code: 'NOT_READY',
          error: '报告尚未生成，无法导出 Markdown；会话轨迹现在可以导出。',
          manifest: manifestBase,
        };
      }
      return {
        ok: true,
        kind,
        filename: `${sanitizeName(reportRes.report.title)}.md`,
        mime: 'text/markdown;charset=utf-8',
        content: this.reportMarkdown(task, reportRes.report, bundle),
        manifest: manifestBase,
      };
    }

    if (kind === 'session') {
      const payload = {
        task_id: taskId,
        session_id: task.snapshot.session_id,
        recorded_by: 'Agnes Harness（演示数据）',
        exported_at: nowIso(),
        events: task.emitted,
      };
      return {
        ok: true,
        kind,
        filename: `session-${task.snapshot.session_id}-trace.json`,
        mime: 'application/json',
        content: JSON.stringify(payload, null, 2),
        manifest: [
          { name: 'events.jsonl', kind: '会话事件', verified: task.emitted.length > 0 },
          { name: 'session-meta.json', kind: '会话映射', verified: true },
        ],
      };
    }

    if (reportRes.status !== 'ready') {
      return {
        ok: false,
        kind,
        code: 'NOT_READY',
        error: '审计包需要报告与账本就绪后生成；会话轨迹现在可以导出。',
        manifest: manifestBase,
      };
    }
    const pack = {
      task_id: taskId,
      session_id: task.snapshot.session_id,
      package: 'audit-pack（演示数据为单文件 JSON，真实运行由后端产出 ZIP）',
      generated_at: nowIso(),
      report: reportRes.report,
      evidence: bundle.evidence,
      conclusions: bundle.conclusions,
      trace: this.trace(taskId),
      verify: {
        evidence_binding: '100%',
        hash_chain: 'intact',
        reproduce: 'PASS',
      },
    };
    return {
      ok: true,
      kind,
      filename: `${taskId}-audit-pack.json`,
      mime: 'application/json',
      content: JSON.stringify(pack, null, 2),
      manifest: [
        ...manifestBase,
        {
          name: `${taskId}-audit-pack.json`,
          kind: '演示数据包',
          verified: true,
          note: '演示数据合并为单文件 JSON，真实运行由后端产出 ZIP',
        },
      ],
    };
  }

  private reportMarkdown(
    task: StoredTask,
    report: Report,
    bundle: EvidenceBundle,
  ): string {
    const lines: string[] = [];
    lines.push(`# ${report.title}`, '');
    lines.push(
      `> 任务 \`${task.snapshot.task_id}\` ｜ 会话 \`${task.snapshot.session_id}\` ｜ 证据 ${
        bundle.evidence.length
      } 条 ｜ 结论 ${bundle.conclusions.length} 条`,
      '',
    );
    lines.push('## 摘要', report.abstract, '');
    report.sections.forEach((s) => {
      lines.push(`## ${s.title}`, '', s.body, '');
    });
    lines.push('## 结论', '');
    report.conclusions.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.text} ${c.evidence_ids.map((e) => `[${e}]`).join('')}`);
    });
    lines.push('');
    if (report.degraded_statement) {
      lines.push('## 降级声明', '', report.degraded_statement, '');
    }
    if (task.snapshot.degraded) {
      lines.push('## 降级声明', '', '本次执行发生降级，详见上方报告正文说明。', '');
    }
    lines.push('## 参考文献', '');
    bundle.evidence
      .filter((e) => e.tier === 'fact')
      .forEach((e, i) => {
        lines.push(`${i + 1}. ${e.title} · ${e.year ?? '—'} · ${e.ref} · ${e.ev_id}`);
      });
    return lines.join('\n');
  }

  health(): HealthInfo {
    return {
      status: 'ok',
      mode: 'mock',
      version: '2.0.0-mock',
      task_count: this.store.order.length,
      session_ready: true,
      bff_reachable: true,
      model: 'Agnes · Flash（演示数据）',
      issues: [],
      checked_at: nowIso(),
    };
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
}

function labelForEvent(e: SseEnvelope): string {
  const d = e.data as unknown as Record<string, unknown>;
  switch (e.event) {
    case 'step':
      return `步骤 ${String(d.step)} → ${String(d.status)}`;
    case 'activity':
      return String(d.human_message ?? '活动');
    case 'tool':
      return `工具 ${String(d.tool)} · ${String(d.status)}`;
    case 'degraded':
      return `${String(d.level) === 'degraded' ? '降级' : '信息'}：${String(d.source)}`;
    case 'conclusion':
      return `结论 ${String(d.cid)}`;
    case 'message':
      return `${String(d.role)} 消息 · ${String(d.status)}`;
    case 'report':
      return `报告 ${String(d.status)}`;
    case 'done':
      return `终态 ${String(d.run_status)}`;
    default:
      return e.event;
  }
}
