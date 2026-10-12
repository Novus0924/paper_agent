/**
 * tests/liveEnv.ts —— 契约级 fake backend（v2.5 测试策略核心）。
 *
 * 背景：v2.5 移除全部 mock 功能后，前端唯一数据通道是 LiveApiClient（真实 AGH 经 BFF
 * 中转）。测试不能再靠"按前端类型编造响应"的 mock 适配器——那正是 mock 世代
 * "后端真实返回 vs 前端类型声明"差异全覆盖不到的病根。本文件提供一个
 * **镜像后端契约**的 fake backend：
 *
 *   - fetch 路由全表：逐条对应 apps/bff/src/routes/v1/* 的路径、方法、状态码、
 *     信封形状与错误文案（错误体恒为 { error, code } 两字段，action 并入 error）；
 *   - EventSource 桩：按 events/events.ts 的建连时序（① 注册订阅 ② 快照直写
 *     ③ 续接实时）与 events/relay.ts snapshot() 的帧序重放；
 *   - 执行模拟：run-all / step / resume 经"脚本帧"推进步骤状态机，stop 落
 *     FAILED + 用户降级记录并补发 done；思考流（thinking）帧**全量不过滤**；
 *   - 消息队列：send 空闲即投递 / 运行中入队，回合结束（onTurnSettled）按序放行，
 *     DELETE 仅允许 pending 并重排 order；
 *   - 文献库 / 导出 / 回查 / 报告 / 证据：与 services/library.ts、export/service.ts、
 *     services/report.ts、http/dto.ts 的同序实现（含 AUDIT_ONLY_KEYS 剥离子层）。
 *
 * 与真实后端的一处刻意差异：不启动 AGH daemon 与内核，"执行"由策展帧
 * （SSE_CONTINUATION / HARD_CARBON_DELTA）或确定性合成帧代替；帧的形状、
 * 顺序、seq 分配与持久化口径（appendTrace：activity/tool/step 非 PENDING，
 * thinking 不落盘）与真实后端逐条对齐。
 *
 * 用法：
 *   const backend = useLiveBackend();                 // 桩住 fetch + EventSource
 *   const res = await api.createTask({...});          // 走 LiveApiClient 真实形状翻译
 *   await backend.flush();                            // 放行挂起操作（建连重放 / 投递 / 续跑）
 *   backend.unstub();                                 // afterEach 还原全局
 */

import { createHash } from 'node:crypto';
import { vi } from 'vitest';
import type { LiveApiClient } from '@/api/httpClient';
import { applyEnvelope, emptyRuntime } from '@/api/normalize';
import type { SseEnvelope } from '@/api/types';
import { snapshot } from './helpers';
import {
  AUDIT_EXPORT_CONTENTS,
  CONCLUSIONS_BY_TASK,
  EVIDENCE_BY_TASK,
  HARD_CARBON_DELTA,
  HEALTH_AGH_DOWN,
  HEALTH_OK,
  JUDGMENTS_BY_TASK,
  MESSAGE_HISTORY,
  NOTES_BY_TASK,
  PREFLIGHT_SOURCES,
  RESEARCH_STEPS,
  REPORTS,
  SEED_TASKS,
  SESSION_EXPORT_CONTENTS,
  SSE_CONTINUATION,
  SSE_FRAMES,
  bibtexOf,
  citationOf,
  errorBody,
  evidenceResponseOf,
  fixtureHash,
  followUpFrames,
  followUpReply,
  libraryRefOf,
  libraryQuery,
  lookupEvidenceIn,
  reportMarkdownOf,
  snapshotOf,
  type LibraryCorpus,
  type RawConclusion,
  type RawEvidence,
  type RawJudgment,
  type RawNote,
  type RawReport,
  type RelayFrame,
  type SeedMessageEntry,
  type SeedTask,
} from './fixtures/seed';

/* ==========================================================================
 * 常量与类型
 * ========================================================================== */

/** 与 src/api/client.ts 的默认 base 一致：fake backend 桩在同一 base 上，页面测试无需注入 */
export const LIVE_BASE = 'http://127.0.0.1:8787';
const V1 = '/api/v1';

/** live-contract 契约回归用的实测任务 id（保持既有用例不变） */
const CONTRACT_TASK = 'run-20261011-124613-to8fge';

const KNOWN_SOURCES = ['arxiv', 'crossref', 'openalex', 'semantic_scholar', 'local'] as const;
const LIT_SOURCES = ['local', 'arxiv', 'auto'] as const;
const EXPORT_KINDS = ['report', 'audit', 'session', 'bibtex'] as const;
const SESSION_FORMATS = ['agnes', 'sharegpt', 'claude-code'] as const;
const MAX_TEXT = 4000;
const MAX_QUEUE = 20;
const EV_MAX_LENGTH = 128;
const TRACE_REPLAY_LIMIT = 200;

/** infra/errors.ts 的 STATUS 映射（fake 错误响应的状态码来源） */
const STATUS_OF: Record<string, number> = {
  BAD_GOAL: 400,
  BAD_BODY: 400,
  BAD_PARAM: 400,
  BAD_ID: 400,
  NOT_FOUND: 404,
  NO_REPORT: 404,
  BUSY: 409,
  BAD_STATE: 409,
  NOT_READY: 409,
  SESSION_ERROR: 500,
  CLI_ERROR: 500,
  EXPORT_ERROR: 500,
  INTERNAL: 500,
};

/** 假时钟基准：晚于全部种子任务（最新 2026-10-10T16:32），保证新任务排序与消息时序不逆 */
const CLOCK_BASE_MS = Date.parse('2026-10-11T12:00:00.000Z');

export interface ResSpec {
  status?: number;
  json?: unknown;
  body?: string;
  mime?: string;
  headers?: Record<string, string>;
}

export interface Call {
  url: string;
  init?: RequestInit;
}

export interface LiveBackendOptions {
  /** ok = 正常；agh-down = 健康探针报 AGH 断连；down = fetch 抛 TypeError（客户端落 status:'down'） */
  health?: 'ok' | 'agh-down' | 'down';
  /** run-all/step/resume 后自动放行脚本帧（默认 true；false 时用 backend.pump 手动推进） */
  autoRun?: boolean;
  /** 自动放行延迟（毫秒，默认 24） */
  runDelay?: number;
  /** 路由兜底优先的覆盖项：字符串 → url.includes，RegExp → test */
  overrides?: Array<{ match: string | RegExp; spec: ResSpec }>;
}

/** services/message.ts QueuedMessage 的同形结构 */
interface QueuedMessage {
  turn_id: string;
  task_id: string;
  action: 'ask' | 'revise';
  text: string;
  order: number;
  queued_at: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'deleted';
  error?: string;
}

/** GET /messages history 单条（v2.4 起带 role） */
interface HistoryEntry extends QueuedMessage {
  role: 'user' | 'assistant';
}

/** 单任务的 fake 运行态（后端 TaskRecord + 账本 + 事件通道 + 消息队列的合体） */
export interface TaskRuntime {
  task: SeedTask;
  evidence: RawEvidence[];
  conclusions: RawConclusion[];
  judgments: RawJudgment[];
  notes: RawNote[];
  report: RawReport | null;
  /** 每任务单调递增的帧序号（对齐 events/bus.ts 的 channel seq） */
  seq: number;
  /** 过程帧持久化（对齐 relay.appendTrace：activity/tool/step 非 PENDING；thinking 不落盘） */
  trace: RelayFrame[];
  /** 种子任务冻结历史长度：其后的 trace 条目才是新建过程帧 */
  baseTraceLen: number;
  /** 执行锁是否持有（对齐 ExecutionService.locks） */
  running: boolean;
  script: RelayFrame[] | null;
  scriptScope: string[];
  scriptKind: 'hard-carbon-delta' | 'generated';
  scriptTerminal: boolean;
  lockAction?: 'run-all' | 'step' | 'resume';
  lockStartedAt?: string;
  queue: {
    pending: QueuedMessage[];
    active: QueuedMessage | undefined;
    history: QueuedMessage[];
    records: SeedMessageEntry[];
    seq: number;
    assistantText: string[];
  };
}

export interface LiveBackend {
  /** 全部 fetch 调用记录（按序） */
  readonly calls: Call[];
  /** 全部存活的 EventSource 桩（含已 close 的） */
  readonly sources: FakeEventSource[];
  /** 执行锁或消息投递中（对齐 exec.isBusy） */
  isRunning(taskId: string): boolean;
  runtimeOf(taskId: string): TaskRuntime | undefined;
  taskIds(): string[];
  /** 本次 POST /tasks 新建的任务 id */
  readonly createdTaskIds: string[];
  /** 文献库语料（含新建任务的账本，DOI 跨任务合并才与真后端同结果） */
  corpus(): LibraryCorpus;
  /** autoRun:false 时手动放行脚本帧 */
  pump(taskId: string): void;
  /** 放行全部挂起操作（建连重放、消息投递、续跑），测试的主同步点 */
  flush(): Promise<void>;
  /** 当前假时钟值（不推进） */
  now(): string;
  unstub(): void;
}

/* ==========================================================================
 * HTTP 桩（从 live-contract.test.ts 提升，全测试套件共用一份）
 * ========================================================================== */

export function toResponse(spec: ResSpec): Response {
  const status = spec.status ?? 200;
  const headers = new Map(
    Object.entries(spec.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const body = spec.body ?? JSON.stringify(spec.json ?? {});
  const mime = spec.mime ?? 'application/octet-stream';
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    json: async () => spec.json,
    text: async () => body,
    // 界面只用到 blob.type / blob.text()，jsdom 的 Blob 没有 text()
    blob: async () => ({ type: mime, text: async () => body }) as unknown as Blob,
  } as unknown as Response;
}

/** 按 URL 路由的 fetch 桩；同时记录调用顺序、方法与请求头（路由函数可抛错，模拟网络失败） */
export function stubFetch(route: (url: string, init?: RequestInit) => ResSpec): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input);
      calls.push({ url, init });
      return toResponse(route(url, init));
    }),
  );
  return calls;
}

export function headerOf(init: RequestInit | undefined, name: string): string | undefined {
  const raw = init?.headers as Record<string, string> | undefined;
  if (!raw) return undefined;
  const key = Object.keys(raw).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? raw[key] : undefined;
}

/* ==========================================================================
 * EventSource 桩（jsdom 不实现；只覆盖 subscribe() 用到的接口）
 * ========================================================================== */

export class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly withCredentials: boolean;
  readyState = FakeEventSource.OPEN;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  private readonly listeners = new Map<string, ((raw: unknown) => void)[]>();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, cb: (raw: unknown) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), cb]);
  }

  hasListener(name: string): boolean {
    return (this.listeners.get(name)?.length ?? 0) > 0;
  }

  close(): void {
    this.closed = true;
  }

  /** 模拟连接层错误（真实 EventSource 在网络断开时自动触发 onerror） */
  error(): void {
    this.onerror?.();
  }

  /** 模拟后端 frame：`id: <seq>` 供 lastEventId，`data:` 为 RelayEvent JSON */
  emit(name: string, data: Record<string, unknown>, seq: number): void {
    this.emitRaw(name, JSON.stringify({ ...data, seq, ts: '2026-10-11T05:00:47.187Z' }), seq);
  }

  /** 坏帧（data 不是合法 JSON）：适配器必须忽略而不是抛错 */
  rawEmitBroken(name: string, data: string, seq: number): void {
    this.emitRaw(name, data, seq);
  }

  /** 原样投递一个已装配好的帧（seq/ts 以帧为准）——fake backend 的后端语义重放用 */
  deliver(frame: RelayFrame): void {
    this.emitRaw(frame.type, JSON.stringify(frame), frame.seq);
  }

  protected emitRaw(name: string, data: string, seq: number): void {
    for (const cb of this.listeners.get(name) ?? []) {
      cb({ data, lastEventId: String(seq) });
    }
  }

  static instances: FakeEventSource[] = [];
}

/** 把 subscribe() 收到的信封喂进与实时/重建共用的 reducer；latest() 读当前状态 */
export function collect(
  client: { subscribe: LiveApiClient['subscribe'] },
  taskId = CONTRACT_TASK,
) {
  let state = emptyRuntime(snapshot({ task_id: taskId }));
  const envelopes: SseEnvelope[] = [];
  const unsubscribe = client.subscribe(taskId, {
    onEvent: (evt) => {
      envelopes.push(evt);
      state = applyEnvelope(state, evt);
    },
  });
  const source = FakeEventSource.instances.at(-1);
  if (!(source instanceof FakeEventSource)) throw new Error('EventSource 未构造');
  return { source, envelopes, unsubscribe, latest: () => state };
}

/* ==========================================================================
 * 帧构造（不依赖 fixtures 的 FrameBuilder：seq/ts 由 emitFrame 统一分配）
 * ========================================================================== */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type FrameInput = DistributiveOmit<RelayFrame, 'seq' | 'ts'>;

/** 每步的领域工具（对齐内核 sciret_* 工具名） */
const TOOL_OF_STEP: Record<string, string> = {
  R1: 'sciret_search_literature',
  R2: 'sciret_read_papers',
  R3: 'sciret_analyze',
  R4: 'sciret_factcheck',
  R5: 'sciret_write_report',
  R6: 'sciret_review',
  S1: 'sciret_synthesize',
};

/**
 * 新任务执行时的思考流片段（AGH 原生预览流归一后的 thinking 帧）。
 * 只给 R2/R3/S1 三个"需要判断"的步骤——与真实部署一致：思考流是**实时帧**、
 * 不落盘，重连快照不回放；这里保证新任务的思考流覆盖被锁定。
 */
const STEP_THINKING: Record<string, string[]> = {
  R2: [
    '先按界面类型与表征原理聚类，再抽取关键参数，避免把不同体系的数据混为一谈。',
    '同一指标存在多套报道口径时，按 as-reported 记录并标注条件差异。',
  ],
  R3: [
    '对比维度必须可回溯到具体证据，不能凭印象归纳。',
    '分歧点单独标注，不做跨体系直接比较。',
  ],
  S1: [
    '回答只使用账本中真实存在的证据编号，逐条核对角标。',
    '没有证据支撑的表述明确标注为推断，不补造文献。',
  ],
};

/* ==========================================================================
 * useLiveBackend
 * ========================================================================== */

export function useLiveBackend(options: LiveBackendOptions = {}): LiveBackend {
  const health = options.health ?? 'ok';
  const autoRun = options.autoRun ?? true;
  const runDelay = options.runDelay ?? 24;
  const overrides = options.overrides ?? [];

  const runtimes = new Map<string, TaskRuntime>();
  const createdTaskIds: string[] = [];
  /** pump/stop 后写入的动态终态快照（之后的建连改走 dynamicSnapshot） */
  const replayOverrides = new Map<string, RelayFrame[]>();

  let clockMs = CLOCK_BASE_MS - 1000;
  let createdSeq = 0;
  let sessionSeq = 0;

  const nowIso = (): string => {
    clockMs += 1000;
    return new Date(clockMs).toISOString();
  };

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  const nextSeqOf = (items: Array<{ seq: number }>): number =>
    items.reduce((n, x) => Math.max(n, x.seq), 0) + 1;

  const evNum = (evId: string): number => {
    const m = /^EV-(\d+)$/.exec(evId);
    return m ? Number(m[1]) : 0;
  };

  /* ---------------------------------------------------------------- 初始态 */

  for (const seed of SEED_TASKS) {
    runtimes.set(seed.task_id, {
      task: clone(seed),
      evidence: clone(EVIDENCE_BY_TASK[seed.task_id] ?? []),
      conclusions: clone(CONCLUSIONS_BY_TASK[seed.task_id] ?? []),
      judgments: clone(JUDGMENTS_BY_TASK[seed.task_id] ?? []),
      notes: clone(NOTES_BY_TASK[seed.task_id] ?? []),
      report: REPORTS[seed.task_id] ? clone(REPORTS[seed.task_id]!) : null,
      seq: 0,
      trace: clone(SSE_FRAMES[seed.task_id] ?? []),
      baseTraceLen: (SSE_FRAMES[seed.task_id] ?? []).length,
      running: false,
      script: null,
      scriptScope: [],
      scriptKind: 'generated',
      scriptTerminal: false,
      queue: {
        pending: [],
        active: undefined,
        history: [],
        records: clone(MESSAGE_HISTORY[seed.task_id] ?? []),
        seq: 0,
        assistantText: [],
      },
    });
  }

  /* -------------------------------------------------- 挂起操作与 flush 泵 */

  const pendingOps: Array<() => void> = [];
  let pendingTimers = 0;

  const later = (fn: () => void, delay = 0): void => {
    if (delay <= 0) {
      pendingOps.push(fn);
      return;
    }
    pendingTimers += 1;
    setTimeout(() => {
      pendingTimers -= 1;
      fn();
    }, delay);
  };

  const macrotask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  const flush = async (): Promise<void> => {
    const deadline = Date.now() + 5000;
    for (;;) {
      await macrotask();
      const ops = pendingOps.splice(0, pendingOps.length);
      for (const op of ops) op();
      if (pendingOps.length === 0 && pendingTimers === 0) {
        // 再让两个宏任务，确认没有新调度（如续跑定时器刚触发）
        await macrotask();
        await macrotask();
        if (pendingOps.length === 0 && pendingTimers === 0) return;
      }
      if (Date.now() > deadline) {
        throw new Error('liveEnv: flush 超时（5s），仍有挂起操作未完成');
      }
    }
  };

  /* ------------------------------------------------------------ 帧的投递 */

  const stamp = (rt: TaskRuntime, frame: FrameInput): RelayFrame => {
    rt.seq += 1;
    return { ...frame, seq: rt.seq, ts: nowIso() } as RelayFrame;
  };

  const broadcast = (taskId: string, frame: RelayFrame): void => {
    for (const src of FakeEventSource.instances) {
      if (src instanceof BackendEventSource && src.taskId === taskId && !src.closed) {
        src.deliver(frame);
      }
    }
  };

  /** 实时下发：分配 seq/ts → 按 appendTrace 口径落 trace → 广播（对齐 bus.publish + onEvent 钩子） */
  const emitFrame = (rt: TaskRuntime, frame: FrameInput): void => {
    const full = stamp(rt, frame);
    const traceable =
      full.type === 'activity' || full.type === 'tool' || (full.type === 'step' && full.status !== 'PENDING');
    if (traceable) rt.trace.push(full);
    broadcast(rt.task.task_id, full);
  };

  const emitDone = (rt: TaskRuntime, runStatus: 'DONE' | 'FAILED', error?: string): void => {
    emitFrame(rt, {
      type: 'done',
      run_status: runStatus,
      report_ready: rt.report !== null,
      ...(error ? { error } : {}),
    });
  };

  /* -------------------------------------------------- 快照（relay.snapshot） */

  const elapsedOf = (rt: TaskRuntime, stepId: string): number | undefined => {
    for (let i = rt.trace.length - 1; i >= 0; i--) {
      const f = rt.trace[i];
      if (f && f.type === 'step' && f.step === stepId && typeof f.elapsed_ms === 'number' && f.elapsed_ms > 0) {
        return f.elapsed_ms;
      }
    }
    return undefined;
  };

  /** 逐条镜像 relay.snapshot()：ping → steps → degraded → conclusions → report → done → trace 回放 */
  const dynamicSnapshot = (rt: TaskRuntime): RelayFrame[] => {
    const out: FrameInput[] = [];
    out.push({ type: 'ping' });
    for (const s of rt.task.steps) {
      const ms = elapsedOf(rt, s.id);
      out.push({ type: 'step', step: s.id, status: s.status, ...(ms !== undefined ? { elapsed_ms: ms } : {}) });
    }
    for (const d of rt.task.degraded_reasons) {
      out.push({
        type: 'degraded',
        level: d.level,
        source: d.source,
        reason: d.reason,
        impact: d.impact,
        resumable: d.resumable,
        step: d.step,
      });
    }
    for (const c of rt.conclusions) {
      out.push({ type: 'conclusion', cid: c.cid, text: c.text, evidence_ids: c.evidence_ids });
    }
    const reportReady = rt.report !== null;
    out.push({ type: 'report', task_id: rt.task.task_id, status: reportReady ? 'ready' : 'generating' });
    const terminal = rt.task.run_status === 'DONE' || rt.task.run_status === 'FAILED';
    if (terminal) {
      out.push({ type: 'done', run_status: rt.task.run_status as 'DONE' | 'FAILED', report_ready: reportReady });
    }
    // 终态（或内存缓冲为空时）回放 activity/tool；step 等已由上面按当前状态重建，不混入
    const bufferWasEmpty = rt.trace.length === rt.baseTraceLen;
    if (terminal || bufferWasEmpty) {
      const activityTool = rt.trace.filter((f) => f.type === 'activity' || f.type === 'tool');
      for (const f of activityTool.slice(-TRACE_REPLAY_LIMIT)) out.push(f);
    }
    return out as RelayFrame[];
  };

  /** 建连重放：pump/stop 后的动态快照优先，否则按 relay.snapshot() 语义重建（含 trace 回放） */
  const replayFramesFor = (taskId: string): RelayFrame[] => {
    const override = replayOverrides.get(taskId);
    if (override) return override;
    const rt = runtimes.get(taskId);
    if (!rt) return [];
    // 种子任务的 SSE_FRAMES 冻结历史保存在 rt.trace 里（appendTrace 口径），统一由
    // dynamicSnapshot 决定回放与否（terminal || bufferWasEmpty），与真实后端逐条对齐
    return dynamicSnapshot(rt);
  };

  /* -------------------------------------------------------- EventSource 桩 */

  class BackendEventSource extends FakeEventSource {
    readonly taskId: string;

    constructor(url: string, opts?: { withCredentials?: boolean }) {
      super(url, opts);
      const m = /\/api\/v1\/tasks\/([^/]+)\/events$/.exec(url);
      const taskId = m ? decodeURIComponent(m[1] ?? '') : '';
      this.taskId = taskId;
      const known = taskId !== '' && /^run-[0-9A-Za-z_-]+$/.test(taskId) && runtimes.has(taskId);
      if (!known) {
        // 浏览器对 404 流的表现：异步 onerror（EventSource 自带重试）
        setTimeout(() => this.onerror?.(), 0);
        return;
      }
      // 对齐 events.ts 建连时序：onopen → 快照直写（②），实时帧由后续 publish 续接（③）
      setTimeout(() => {
        if (this.closed) return;
        this.onopen?.();
        const rt = runtimes.get(taskId);
        if (!rt) return;
        for (const frame of replayFramesFor(taskId)) this.deliver(stamp(rt, frame));
      }, 0);
    }
  }

  /* ------------------------------------------------------------ 执行模拟 */

  const isRunning = (taskId: string): boolean => {
    const rt = runtimes.get(taskId);
    return rt ? rt.running || rt.queue.active !== undefined : false;
  };

  const runScope = (task: SeedTask, action: 'run-all' | 'step' | 'resume', fromStep?: string): string[] => {
    const ids = RESEARCH_STEPS.map((s) => s.id);
    if (action === 'resume' && fromStep) {
      const start = ids.indexOf(fromStep);
      return start >= 0 ? ids.slice(start) : ids;
    }
    // run-all：跑完剩余全部步骤（内核 sciret_run_all 语义）
    return ids.filter((id) => {
      const s = task.steps.find((x) => x.id === id);
      return !s || s.status !== 'DONE';
    });
  };

  /** 合成一份确定性账本（新任务终态时）：证据 → 结论（只绑 fact）→ 判断/备注 → 报告 */
  const synthesizeLedger = (rt: TaskRuntime): void => {
    const taskId = rt.task.task_id;
    const maxEv = rt.evidence.reduce((n, e) => Math.max(n, evNum(e.ev_id)), 0);
    const at = nowIso();
    const slug = taskId.replace(/[^0-9a-z]/gi, '').slice(-8) || 'task';
    const mk = (
      i: number,
      o: Pick<RawEvidence, 'tier' | 'kind' | 'title' | 'producer_step'> &
        Partial<Pick<RawEvidence, 'doi' | 'authors' | 'year' | 'venue' | 'source'>>,
    ): RawEvidence => {
      const evId = `EV-${String(maxEv + i).padStart(4, '0')}`;
      return {
        ev_id: evId,
        tier: o.tier,
        kind: o.kind,
        title: o.title,
        producer_step: o.producer_step,
        doi: o.doi ?? null,
        authors: o.authors ?? [],
        year: o.year ?? null,
        venue: o.venue ?? '',
        source: o.source ?? 'local',
        sha256: fixtureHash(`sha256:${taskId}:${evId}`),
        at,
        chain_hash: fixtureHash(`chain:${taskId}:${evId}`),
      };
    };
    // 文献证据用独立 DOI 命名空间（10.5555/<slug>-N）：跨任务不误合并，全库导出可验证
    const added: RawEvidence[] = [
      mk(1, {
        tier: 'fact',
        kind: 'literature',
        title: `${rt.task.goal}（检索文献一）`,
        producer_step: 'R1',
        doi: `10.5555/${slug}-1`,
        authors: ['A. Author', 'B. Collaborator'],
        year: 2024,
        venue: 'Journal of Synthetic Evidence',
        source: 'arxiv',
      }),
      mk(2, {
        tier: 'fact',
        kind: 'literature',
        title: `${rt.task.goal}（检索文献二）`,
        producer_step: 'R1',
        doi: `10.5555/${slug}-2`,
        authors: ['C. Researcher'],
        year: 2023,
        venue: 'Synthetic Reviews',
        source: 'crossref',
      }),
      mk(3, { tier: 'artifact', kind: 'data', title: '结构化抽取数据', producer_step: 'R2', source: `runs/${taskId}/extraction.json` }),
      mk(4, { tier: 'artifact', kind: 'analysis', title: '对比维度矩阵', producer_step: 'R3', source: `runs/${taskId}/matrix.json` }),
      mk(5, { tier: 'artifact', kind: 'factcheck', title: '事实验证结果', producer_step: 'R4', source: `runs/${taskId}/factcheck.json` }),
      mk(6, { tier: 'artifact', kind: 'draft', title: '综述草稿', producer_step: 'R5', source: `runs/${taskId}/report.md` }),
      mk(7, { tier: 'artifact', kind: 'review', title: '自评审结果', producer_step: 'R6', source: 'runs/audit' }),
      mk(8, { tier: 'artifact', kind: 'synthesis', title: `综合回答：${rt.task.goal}`, producer_step: 'S1', source: `runs/${taskId}/synthesis.md` }),
    ];
    rt.evidence.push(...added);

    const factIds = added.filter((e) => e.tier === 'fact').map((e) => e.ev_id);
    const cAt = nowIso();
    const conclusions: RawConclusion[] = [
      {
        cid: 'C-0001',
        text: `围绕「${rt.task.goal}」的两条核心文献在方法路径上互为补充，需按适用条件分别引用。`,
        evidence_ids: factIds,
        confidence: 'high',
        producer_step: 'R5',
        at: cAt,
      },
      {
        cid: 'C-0002',
        text: '产物链（抽取 → 矩阵 → 校验 → 草稿 → 评审 → 综合）完整，可逐环复现。',
        evidence_ids: factIds.length > 1 ? [factIds[1]!] : factIds,
        confidence: 'medium',
        producer_step: 'R5',
        at: cAt,
      },
    ];
    rt.conclusions.push(...conclusions);

    rt.judgments.push({
      seq: nextSeqOf(rt.judgments),
      at: nowIso(),
      summary: '证据绑定校验',
      data: { binding_rate: '100%', unbound: [], conclusions: conclusions.length },
    });
    rt.notes.push({
      seq: nextSeqOf(rt.notes),
      at: nowIso(),
      text: `fake backend：任务 ${taskId} 合成账本 ${added.length} 条证据、${conclusions.length} 条结论（确定性种子哈希，可复现）。`,
    });

    const last = rt.evidence[rt.evidence.length - 1];
    rt.report = {
      task_id: taskId,
      title: rt.task.goal,
      abstract: `本报告由 fake backend 依据任务 ${taskId} 的证据账本合成，用于契约级联调；结论均绑定 fact 级证据。`,
      sections: [
        { id: 'background', title: '一、研究背景', body: `研究目标：${rt.task.goal}` },
        {
          id: 'findings',
          title: '二、核心发现',
          body: `共形成 ${conclusions.length} 条结论，均绑定 fact 级证据；产物链完整可复现。`,
        },
      ],
      conclusions: conclusions.map((c) => ({
        cid: c.cid,
        text: c.text,
        evidence_ids: c.evidence_ids,
        confidence: c.confidence,
      })),
      evidence_count: rt.evidence.length,
      degraded: false,
      ledger_digest: fixtureHash(`digest:${taskId}`),
      ledger_head: last ? last.chain_hash : '',
      gate: { passed: true },
      run_status: 'DONE',
      generated_at: nowIso(),
    };
  };

  const applyHardCarbonDelta = (rt: TaskRuntime): void => {
    rt.evidence.push(...clone(HARD_CARBON_DELTA.evidence));
    rt.conclusions.push(...clone(HARD_CARBON_DELTA.conclusions));
    rt.report = clone(HARD_CARBON_DELTA.report);
    rt.judgments.push({
      seq: nextSeqOf(rt.judgments),
      at: nowIso(),
      summary: '证据绑定校验',
      data: { binding_rate: '100%', unbound: [], conclusions: HARD_CARBON_DELTA.conclusions.length },
    });
    rt.notes.push({
      seq: nextSeqOf(rt.notes),
      at: nowIso(),
      text: 'fake backend：硬碳续跑完成，R2–S1 全部 DONE，报告就绪。',
    });
  };

  /** 生成执行脚本帧：每步 activity + thinking（R2/R3/S1）+ tool running/ok + step RUNNING/DONE */
  const buildGeneratedFrames = (rt: TaskRuntime, scope: string[], terminal: boolean): RelayFrame[] => {
    const out: FrameInput[] = [];
    scope.forEach((stepId, idx) => {
      const label = RESEARCH_STEPS.find((s) => s.id === stepId)?.label ?? stepId;
      out.push({ type: 'activity', step: stepId, human_message: `${label}：正在执行…` });
      for (const t of STEP_THINKING[stepId] ?? []) {
        out.push({ type: 'thinking', step: stepId, text: t });
      }
      const tool = TOOL_OF_STEP[stepId] ?? 'sciret_status';
      out.push({ type: 'tool', step: stepId, tool, status: 'running', input: { step: stepId, goal: rt.task.goal } });
      out.push({ type: 'step', step: stepId, status: 'RUNNING' });
      out.push({ type: 'tool', step: stepId, tool, status: 'ok', output: { step: stepId, ok: true } });
      out.push({ type: 'step', step: stepId, status: 'DONE', elapsed_ms: 1200 + idx * 100 });
    });
    if (terminal) {
      for (const c of rt.conclusions) {
        out.push({ type: 'conclusion', cid: c.cid, text: c.text, evidence_ids: c.evidence_ids });
      }
      out.push({ type: 'report', task_id: rt.task.task_id, status: 'ready' });
      out.push({ type: 'done', run_status: 'DONE', report_ready: true });
    }
    return out as RelayFrame[];
  };

  /** 脚本帧落定任务状态（步骤状态机 + 终态），再逐帧投递 */
  const applyScriptState = (rt: TaskRuntime, frames: RelayFrame[], terminal: boolean): void => {
    for (const f of frames) {
      if (f.type !== 'step') continue;
      const step = rt.task.steps.find((s) => s.id === f.step);
      if (!step) continue;
      if (f.status !== 'PENDING') step.status = f.status;
      if (f.status === 'RUNNING' || f.status === 'DONE' || f.status === 'FAILED') {
        step.attempts = Math.max(step.attempts, 1);
      }
    }
    if (terminal) {
      rt.task.run_status = 'DONE';
      rt.task.updated_at = nowIso();
    }
  };

  /** 释放脚本帧（autoRun 定时器或手动 pump 的入口） */
  const pump = (taskId: string): void => {
    const rt = runtimes.get(taskId);
    if (!rt || !rt.running) return;
    if (rt.scriptKind === 'hard-carbon-delta') {
      applyHardCarbonDelta(rt);
      rt.script = SSE_CONTINUATION[taskId] ?? [];
    } else {
      if (rt.scriptTerminal && rt.scriptScope.length > 0) synthesizeLedger(rt);
      rt.script = buildGeneratedFrames(rt, rt.scriptScope, rt.scriptTerminal);
    }
    const frames = rt.script;
    rt.script = null;
    applyScriptState(rt, frames, rt.scriptTerminal);
    for (const f of frames) emitFrame(rt, f);
    rt.running = false;
    rt.lockAction = undefined;
    rt.lockStartedAt = undefined;
    replayOverrides.set(taskId, dynamicSnapshot(rt));
    // 回合结束（≠ 任务终态）：放行排队中的追问消息（§9.7）
    later(() => drain(taskId));
  };

  /** 对齐 ExecutionService.spawn：置锁 → 非 DONE 置 RUNNING → 异步下发指令 */
  const spawnScript = (
    rt: TaskRuntime,
    action: 'run-all' | 'step' | 'resume',
    fromStep: string | undefined,
    terminal: boolean,
  ): void => {
    rt.lockAction = action;
    rt.lockStartedAt = nowIso();
    if (rt.task.run_status !== 'DONE') {
      rt.task.run_status = 'RUNNING';
      rt.task.updated_at = rt.lockStartedAt;
    }
    const curated = action === 'step' ? undefined : SSE_CONTINUATION[rt.task.task_id];
    if (curated) {
      rt.scriptKind = 'hard-carbon-delta';
      rt.script = null;
      rt.scriptScope = [];
      rt.scriptTerminal = true;
    } else {
      rt.scriptKind = 'generated';
      rt.script = null;
      rt.scriptScope = action === 'step' && fromStep ? [fromStep] : runScope(rt.task, action, fromStep);
      rt.scriptTerminal = terminal;
    }
    rt.running = true;
    if (autoRun) later(() => pump(rt.task.task_id), runDelay);
  };

  /* ------------------------------------------------------------ 消息队列 */

  const mergeHistory = (rt: TaskRuntime): HistoryEntry[] => {
    const byKey = new Map<string, HistoryEntry>();
    // 内存在前：字段完整（含 error/order/queued_at），代表同一轮的最新状态
    for (const m of rt.queue.history) byKey.set(`${m.turn_id}:user`, { ...m, role: 'user' });
    for (const r of rt.queue.records) {
      const key = `${r.turn_id}:${r.role}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        turn_id: r.turn_id,
        task_id: rt.task.task_id,
        role: r.role,
        action: r.action,
        text: r.text,
        order: 0,
        queued_at: r.queued_at,
        status: r.status,
      });
    }
    const out = [...byKey.values()].sort((a, b) => {
      if (a.queued_at !== b.queued_at) return a.queued_at < b.queued_at ? -1 : 1;
      // 同一时刻：user 先于 assistant（提问在回复之前）
      return a.role === b.role ? 0 : a.role === 'user' ? -1 : 1;
    });
    out.forEach((e, i) => {
      e.order = i + 1;
    });
    return out;
  };

  /** 顺序投递：一次只发一条，前一条结束后再取下一条（§9.7「按序执行」） */
  const drain = (taskId: string): void => {
    const rt = runtimes.get(taskId);
    if (!rt) return;
    const q = rt.queue;
    if (q.active) return; // 幂等：已在投递
    if (rt.running) return; // 执行中，等 onTurnSettled 来触发
    const next = q.pending.shift();
    if (!next) return;

    q.active = next;
    next.status = 'running';
    q.assistantText = [];
    // onMessageEvent：user running 帧 + 排队提示 activity（publishMessage 两连发）
    const frames = followUpFrames(next.turn_id, next.action, next.text, { queuedOrder: next.order });
    emitFrame(rt, frames[0]!);
    emitFrame(rt, {
      type: 'activity',
      step: '-',
      human_message: `追问已发送（第 ${next.order} 条）：${next.text.slice(0, 40)}`,
      detail: { turn_id: next.turn_id, queued_order: next.order, role: 'user' },
    });
    for (const f of frames.slice(1)) emitFrame(rt, f);

    next.status = 'done';
    // persistTurn：user 提交 + assistant 回复两行（回复文本与帧同源）
    q.records.push({
      turn_id: next.turn_id,
      task_id: taskId,
      action: next.action,
      role: 'user',
      text: next.text,
      order: 0,
      queued_at: next.queued_at,
      status: 'done',
    });
    q.records.push({
      turn_id: next.turn_id,
      task_id: taskId,
      action: next.action,
      role: 'assistant',
      text: followUpReply(next.action, next.text),
      order: 0,
      queued_at: nowIso(),
      status: 'done',
    });
    q.assistantText = [];
    q.active = undefined;
    q.history.push(next);
    if (q.pending.length > 0 && !rt.running) drain(taskId);
  };

  /* ------------------------------------------------------------ 错误响应 */

  const err = (code: string, message: string, action?: string): ResSpec => ({
    status: STATUS_OF[code] ?? 400,
    json: errorBody(code, message, action),
  });

  const notFoundRoute = (pathname: string): ResSpec =>
    err('NOT_FOUND', `路径 ${pathname}`, '请核对接口路径（《后端需求文档》§8.1）。');

  const parseBody = (init?: RequestInit): Record<string, unknown> => {
    const raw = init?.body;
    if (typeof raw !== 'string' || raw === '') return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };

  /* ------------------------------------------------ 视图分层（http/dto.ts） */

  const AUDIT_ONLY_KEYS = [
    'ledger_digest',
    'chain_hash',
    'prev_hash',
    'entry_hash',
    'hash',
    'prompt',
    'system_prompt',
    'instruction',
    'raw',
    'tool_args',
  ];

  const isAuditKey = (key: string): boolean => {
    const norm = key.toLowerCase().replace(/-/g, '_');
    return AUDIT_ONLY_KEYS.some((k) => k.toLowerCase().replace(/-/g, '_') === norm);
  };

  const stripAuditFields = (input: unknown, depth = 0): unknown => {
    if (depth > 12) return input;
    if (Array.isArray(input)) return input.map((v) => stripAuditFields(v, depth + 1));
    if (input === null || typeof input !== 'object') return input;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (isAuditKey(k)) continue;
      out[k] = stripAuditFields(v, depth + 1);
    }
    return out;
  };

  type ViewLevel = 'view' | 'audit';

  const parseViewLevel = (raw: string | null): ViewLevel | ResSpec => {
    if (raw === null || raw.trim() === '') return 'view';
    const v = raw.trim().toLowerCase();
    if (v === 'audit') return 'audit';
    if (v === 'view') return 'view';
    return err('BAD_PARAM', `不支持的 view：${JSON.stringify(raw)}`, '允许：view（默认）| audit（含哈希与门禁等审计字段）。');
  };

  const respond = (taskId: string, level: ViewLevel, payload: Record<string, unknown>): Record<string, unknown> => {
    if (level === 'audit') return { task_id: taskId, view: 'audit', ...payload };
    return { task_id: taskId, view: 'view', ...(stripAuditFields(payload) as Record<string, unknown>) };
  };

  /* -------------------------------------------------------- 导出装配 */

  const ledgerJsonl = (rt: TaskRuntime): string => {
    const lines: string[] = [];
    let seq = 0;
    const push = (record_type: string, at: string, chain: string, data: Record<string, unknown>): void => {
      seq += 1;
      lines.push(JSON.stringify({ seq, record_type, at, chain_hash: chain, ...data }));
    };
    for (const ev of rt.evidence) {
      push('evidence', ev.at, ev.chain_hash, {
        ev_id: ev.ev_id,
        tier: ev.tier,
        kind: ev.kind,
        title: ev.title,
        producer_step: ev.producer_step,
        ref: {
          doi: ev.doi,
          title: ev.title,
          authors: ev.authors,
          year: ev.year,
          venue: ev.venue,
          source: ev.source,
          sha256: ev.sha256,
        },
        sha256: ev.sha256,
      });
    }
    for (const c of rt.conclusions) {
      push('conclusion', c.at, fixtureHash(`chain:${rt.task.task_id}:${c.cid}`), {
        cid: c.cid,
        text: c.text,
        evidence_ids: c.evidence_ids,
        confidence: c.confidence,
        producer_step: c.producer_step,
      });
    }
    for (const j of rt.judgments) {
      push('judgment', j.at, fixtureHash(`chain:${rt.task.task_id}:j${j.seq}`), { summary: j.summary, ...j.data });
    }
    for (const n of rt.notes) {
      push('note', n.at, fixtureHash(`chain:${rt.task.task_id}:n${n.seq}`), { text: n.text });
    }
    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  };

  /** 审计包内独立校验脚本（用账本自身复核：seq 连续 + 结论绑定 fact 证据） */
  const VERIFY_SCRIPT = `#!/usr/bin/env python3
"""审计包独立校验脚本（fake backend 生成）。

用法（在审计包根目录）：
    python verify.py --run-dir ./run

校验两项：
    1. 账本记录 seq 连续（1..N）
    2. 结论 100% 绑定 fact 级证据
退出码：0 通过 / 1 存在问题
"""
import json
import sys
from pathlib import Path


def main():
    args = sys.argv[1:]
    run_dir = Path(args[args.index("--run-dir") + 1] if "--run-dir" in args else "./run")
    records = [
        json.loads(line)
        for line in (run_dir / "ledger.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    problems = []
    for idx, rec in enumerate(records):
        if rec.get("seq") != idx + 1:
            problems.append(f"seq 不连续：期望 {idx + 1}，实际 {rec.get('seq')}")
    facts = {
        r["ev_id"]
        for r in records
        if r.get("record_type") == "evidence" and r.get("tier") == "fact"
    }
    for r in records:
        if r.get("record_type") == "conclusion":
            unbound = [e for e in r.get("evidence_ids", []) if e not in facts]
            if unbound:
                problems.append(f"结论 {r.get('cid')} 绑定非 fact 证据：{unbound}")
    for p in problems:
        print(f"[FAIL] {p}")
    if problems:
        print(f"[FAIL] 共 {len(problems)} 项问题")
        return 1
    print("[OK] 校验通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
`;

  const zipStore = (entries: Array<{ name: string; content: string }>): string => {
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;
    for (const e of entries) {
      const nameBytes = enc.encode(e.name);
      const data = enc.encode(e.content);
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0x2100, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      chunks.push(local, data);

      const cd = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x2100, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      central.push(cd);
      offset += local.length + data.length;
    }
    const cdSize = central.reduce((n, c) => n + c.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    const all = [...chunks, ...central, end];
    const total = all.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    for (const c of all) {
      out.set(c, p);
      p += c.length;
    }
    let s = '';
    for (const b of out) s += String.fromCharCode(b);
    return s;
  };

  const auditEntries = (rt: TaskRuntime): Array<{ name: string; content: string }> => {
    const md = rt.report ? reportMarkdownOf(rt.report) : '';
    const ledger = ledgerJsonl(rt);
    const gate = { passed: true, reasons: [] as string[], checked_at: nowIso(), human_summary: '哈希链完整、结论 100% 绑定 fact 证据' };
    const conclusions = rt.conclusions.map((c) => ({ cid: c.cid, text: c.text, evidence_ids: c.evidence_ids }));
    const files = [
      { name: 'run/report.md', content: md },
      { name: 'run/ledger.jsonl', content: ledger },
      {
        name: 'run/state.json',
        content: JSON.stringify(
          {
            run_status: rt.task.run_status,
            degraded: rt.task.degraded,
            degraded_reasons: rt.task.degraded_reasons,
            steps: rt.task.steps,
          },
          null,
          2,
        ),
      },
      { name: 'run/report_gate.json', content: JSON.stringify(gate, null, 2) },
      {
        name: 'run/events.json',
        content: JSON.stringify(
          {
            task_id: rt.task.task_id,
            counts: {
              evidence: rt.evidence.length,
              conclusions: rt.conclusions.length,
              judgments: rt.judgments.length,
              notes: rt.notes.length,
            },
            steps: rt.task.steps,
          },
          null,
          2,
        ),
      },
      { name: 'run/conclusions.json', content: JSON.stringify(conclusions, null, 2) },
      { name: 'verify.py', content: VERIFY_SCRIPT },
    ];
    const withHash = files.map((f) => ({
      name: f.name,
      bytes: Buffer.byteLength(f.content, 'utf8'),
      sha256: createHash('sha256').update(f.content, 'utf8').digest('hex'),
    }));
    files.push({
      name: 'manifest.json',
      content: JSON.stringify(
        {
          task_id: rt.task.task_id,
          session_id: rt.task.session_id,
          goal: rt.task.goal,
          workflow: rt.task.workflow,
          run_status: rt.task.run_status,
          degraded: rt.task.degraded,
          generated_at: nowIso(),
          gate,
          counts: {
            evidence: rt.evidence.length,
            conclusions: rt.conclusions.length,
            judgments: rt.judgments.length,
            notes: rt.notes.length,
          },
          files: withHash,
        },
        null,
        2,
      ),
    });
    return files;
  };

  const sessionJsonl = (rt: TaskRuntime): string => {
    const lines = [
      { seq: 1, type: 'session/open', session_id: rt.task.session_id, task_id: rt.task.task_id, at: rt.task.created_at },
      { seq: 2, type: 'turn/start', turn: 1, trigger: 'run-all', at: rt.task.created_at },
      { seq: 3, type: 'assistant/message', chars: { text: rt.task.goal.length, thinking: 0 }, at: rt.task.updated_at },
      {
        seq: 4,
        type: 'turn/end',
        turn: 1,
        reason: rt.task.run_status === 'DONE' ? 'completed' : 'interrupted',
        at: rt.task.updated_at,
      },
    ];
    return `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`;
  };

  /** 该任务当前可导出的格式（对齐 ExportService.availableKinds） */
  const availableKinds = (rt: TaskRuntime): string[] =>
    EXPORT_KINDS.filter((k) => {
      if (k === 'report' || k === 'audit') return rt.report !== null;
      if (k === 'session') return rt.task.session_id.includes('workspace:');
      return rt.evidence.some((e) => e.producer_step === 'R1');
    });

  const notReady = (taskId: string, kinds: string[], reason?: string): ResError =>
    err(
      'NOT_READY',
      `任务 ${taskId} 尚不可导出${reason ? `：${reason}` : ''}。当前可导出：${kinds.length > 0 ? kinds.join(' | ') : '（当前无可导出格式）'}`,
      '报告类导出需流水线达终态 DONE 且门禁通过；会话导出需 AGH daemon 运行且该任务有 AGH 会话映射。',
    );

  /* ------------------------------------------------------------ 路由全表 */

  const describe = (v: unknown): string =>
    typeof v === 'string' ? v : `${typeof v}:${JSON.stringify(v)?.slice(0, 40) ?? String(v)}`;

  interface ValidatedEnum<T extends string> {
    value: T;
    fellBack: boolean;
    reason?: string;
  }

  const validateEnum = <T extends string>(
    raw: unknown,
    allowed: readonly T[],
    fallback: T,
    label: string,
  ): ValidatedEnum<T> => {
    if (raw === undefined || raw === null || raw === '') return { value: fallback, fellBack: false };
    if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) {
      return { value: raw as T, fellBack: false };
    }
    return {
      value: fallback,
      fellBack: true,
      reason: `${label} 非法：${JSON.stringify(raw)}，已回退默认 ${fallback}（允许：${allowed.join(' | ')}）`,
    };
  };

  const validateSources = (raw: unknown, allowed: readonly string[]): { value: string[]; dropped: string[] } => {
    if (raw === undefined || raw === null) return { value: [], dropped: [] };
    if (!Array.isArray(raw)) return { value: [], dropped: [describe(raw)] };
    const seen = new Set<string>();
    const value: string[] = [];
    const dropped: string[] = [];
    for (const item of raw) {
      if (typeof item !== 'string' || !allowed.includes(item)) {
        dropped.push(describe(item));
        continue;
      }
      if (seen.has(item)) continue;
      seen.add(item);
      value.push(item);
    }
    return { value, dropped };
  };

  const validateGoal = (raw: unknown): string | ResError => {
    if (typeof raw !== 'string') return err('BAD_GOAL', 'goal 必须是字符串。', '请检查研究目标输入（去空格后非空、长度不超过上限）。');
    const goal = raw.trim();
    if (goal === '') return err('BAD_GOAL', 'goal 不能为空。', '请检查研究目标输入（去空格后非空、长度不超过上限）。');
    if (goal.length > 8192) {
      return err('BAD_GOAL', `goal 长度超限：${goal.length} > 8192。`, '请检查研究目标输入（去空格后非空、长度不超过上限）。');
    }
    return goal;
  };

  const validateTaskId = (raw: string): string | ResError => {
    if (!/^run-[0-9A-Za-z_-]+$/.test(raw) || raw.includes('..')) {
      return err('BAD_ID', `非法标识：${raw}`, 'task_id 应形如 run-YYYYMMDD-HHMMSS-xxxxxx（仅字母数字下划线连字符）。');
    }
    return raw;
  };

  const validateTurnId = (raw: string): string | ResError => {
    if (!/^turn-[0-9]{1,9}$/.test(raw)) {
      return err('BAD_PARAM', `非法回合标识：${raw}`, 'turn_id 形如 turn-1（turn- + 数字）。');
    }
    return raw;
  };

  const validateText = (raw: unknown): string | ResError => {
    if (typeof raw !== 'string') {
      return err('BAD_PARAM', 'text 必须是字符串', '请传入非空字符串，例如：{"text":"请补充近两年的最新进展"}。');
    }
    const text = raw.trim();
    if (text === '') return err('BAD_PARAM', 'text 不能为空', '追问/修订内容不可为空。');
    if (text.length > MAX_TEXT) {
      return err('BAD_PARAM', `text 过长（${text.length} 字符，上限 ${MAX_TEXT}）`, `请精简到 ${MAX_TEXT} 字符以内。`);
    }
    return text;
  };

  const validateAction = (raw: unknown): 'ask' | 'revise' | ResError => {
    if (raw === undefined || raw === null || raw === '') return 'ask';
    if (raw !== 'ask' && raw !== 'revise') {
      const shown = typeof raw === 'string' ? raw : JSON.stringify(raw)?.slice(0, 40) ?? typeof raw;
      return err('BAD_PARAM', `不支持的 action：${shown}`, '允许：ask（追问）| revise（修订）。');
    }
    return raw;
  };

  const newTaskId = (): string => {
    createdSeq += 1;
    const d = new Date(CLOCK_BASE_MS + createdSeq * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
    return `run-${stamp}-live${String(createdSeq).padStart(3, '0')}`;
  };

  const listTasks = (query: URLSearchParams): ResSpec => {
    const statusRaw = query.get('status');
    let statusFilter: string | undefined;
    if (statusRaw) {
      const allowed = ['PLANNED', 'RUNNING', 'DONE', 'FAILED'];
      if (!allowed.includes(statusRaw)) {
        return err('BAD_PARAM', `status 过滤值非法：${statusRaw}`, '允许：PLANNED | RUNNING | DONE | FAILED。');
      }
      statusFilter = statusRaw;
    }
    const archivedRaw = query.get('archived') ?? 'false';
    if (!['false', 'true', 'all'].includes(archivedRaw)) {
      return err('BAD_PARAM', `archived 过滤值非法：${archivedRaw}`, '允许：false（活跃）| true（归档）| all（全部）。');
    }
    let tasks = [...runtimes.values()].map((rt) => rt.task);
    tasks = tasks.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    if (statusFilter) tasks = tasks.filter((t) => t.run_status === statusFilter);
    if (archivedRaw !== 'all') {
      const wantArchived = archivedRaw === 'true';
      tasks = tasks.filter((t) => (t.archived === true) === wantArchived);
    }
    return { json: { tasks: tasks.map(snapshotOf), total: tasks.length } };
  };

  const createTask = (body: Record<string, unknown>): ResSpec => {
    const goal = validateGoal(body['goal']);
    if (typeof goal !== 'string') return goal;
    // Fail-fast：白名单外的 workflow 创建时即 400（镜像 routes/v1/tasks.ts；
    // materials 已于 2026-10-12 全层删除，任何非 research 一律通用文案）
    const wfRaw = typeof body['workflow'] === 'string' ? body['workflow'].trim() : '';
    if (wfRaw && wfRaw !== 'research') {
      return err(
        'BAD_PARAM',
        `workflow=${wfRaw} 暂不可用`,
        `支持的工作流：research。注：白名单按实现情况收紧——新增工作流须先落地内核算子，不能只在 API 层声明。`,
      );
    }
    const workflow = validateEnum(body['workflow'], ['research'] as const, 'research', 'workflow');
    const litSource = validateEnum(body['lit_source'], LIT_SOURCES, 'auto', 'lit_source');
    const sources = validateSources(body['sources'], KNOWN_SOURCES);
    const effectiveSources =
      sources.value.length > 0 ? sources.value : litSource.value === 'local' ? [] : [...KNOWN_SOURCES];

    const preflight: Record<string, string> = {};
    for (const s of effectiveSources) preflight[s] = PREFLIGHT_SOURCES[s] ?? 'ok';

    const taskId = newTaskId();
    sessionSeq += 1;
    const sessionId = `workspace:live-${sessionSeq}`;
    const now = nowIso();
    const task: SeedTask = {
      task_id: taskId,
      goal,
      workflow: 'research',
      lit_source: litSource.value,
      sources: effectiveSources,
      run_status: 'PLANNED',
      degraded: false,
      degraded_reasons: [],
      session_id: sessionId,
      created_at: now,
      updated_at: now,
      steps: RESEARCH_STEPS.map((s) => ({ ...s, status: 'PENDING', attempts: 0 })),
    };
    runtimes.set(taskId, {
      task,
      evidence: [],
      conclusions: [],
      judgments: [],
      notes: [],
      report: null,
      seq: 0,
      trace: [],
      baseTraceLen: 0,
      running: false,
      script: null,
      scriptScope: [],
      scriptKind: 'generated',
      scriptTerminal: false,
      queue: { pending: [], active: undefined, history: [], records: [], seq: 0, assistantText: [] },
    });
    createdTaskIds.push(taskId);

    const notes: string[] = [];
    if (workflow.fellBack && workflow.reason) notes.push(workflow.reason);
    if (litSource.fellBack && litSource.reason) notes.push(litSource.reason);
    if (sources.dropped.length > 0) notes.push(`已忽略非法数据源：${sources.dropped.join(', ')}`);
    return {
      status: 201,
      json: {
        task_id: taskId,
        session_id: sessionId,
        state: snapshotOf(task),
        preflight: { sources: preflight },
        ...(notes.length > 0 ? { notes } : {}),
      },
    };
  };

  const route = (url: string, init?: RequestInit): ResSpec => {
    const path = url.startsWith(LIVE_BASE) ? url.slice(LIVE_BASE.length) : url;
    const qi = path.indexOf('?');
    const pathname = qi >= 0 ? path.slice(0, qi) : path;
    const query = new URLSearchParams(qi >= 0 ? path.slice(qi + 1) : '');
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = parseBody(init);

    // 覆盖项优先（测试显式意图 > 模式）
    for (const ov of overrides) {
      const hit = typeof ov.match === 'string' ? url.includes(ov.match) : ov.match.test(url);
      if (hit) return ov.spec;
    }

    // 健康探针不在 /api/v1 前缀下（routes/health.ts）
    if (pathname === '/api/health') {
      if (health === 'down') throw new TypeError('connect ECONNREFUSED 127.0.0.1:8787');
      const base = health === 'agh-down' ? HEALTH_AGH_DOWN : HEALTH_OK;
      return {
        json: { ...base, tasks: runtimes.size, agh: { ...base.agh, sessions_open: runtimes.size } },
      };
    }
    if (!pathname.startsWith(V1)) return notFoundRoute(pathname);
    const segs = pathname.slice(V1.length).split('/').filter((s) => s !== '');

    // ---------------------------------------------------------- 文献库
    if (segs[0] === 'library') {
      if (segs[1] === 'evidence' && method === 'GET') return libraryEvidence(query);
      if (segs[1] === 'export' && method === 'GET') return libraryExport(query);
      return notFoundRoute(pathname);
    }
    if (segs[0] !== 'tasks') return notFoundRoute(pathname);

    // ------------------------------------------------------ 任务集合
    if (segs.length === 1) {
      if (method === 'GET') return listTasks(query);
      if (method === 'POST') return createTask(body);
      return notFoundRoute(pathname);
    }

    const rawId = decodeURIComponent(segs[1] ?? '');
    const taskId = validateTaskId(rawId);
    if (typeof taskId !== 'string') return taskId;
    const rt = runtimes.get(taskId);
    if (!rt) return err('NOT_FOUND', `任务 ${taskId} 不存在`, '请先通过 GET /api/v1/tasks 核对标识。');
    const sub = segs[2];
    const tail = segs[3];

    if (sub === undefined && method === 'GET') {
      return { json: snapshotOf(rt.task) };
    }

    if (sub === 'archive' && method === 'POST') {
      if (typeof body['archived'] !== 'boolean') {
        return err('BAD_BODY', 'archived 必填且必须是布尔值（body 形如 {"archived": true}）。', '请检查请求体 JSON 结构。');
      }
      // 运行中（状态机 RUNNING 或执行锁/消息投递占用）不可归档：先 stop 再操作
      if (rt.task.run_status === 'RUNNING' || isRunning(taskId)) {
        return err(
          'BAD_STATE',
          '任务运行中，请先停止',
          '等待执行结束（订阅 /events 获取 done 事件）或先 POST /api/v1/tasks/{id}/stop，再执行归档/恢复。',
        );
      }
      rt.task.archived = body['archived'];
      rt.task.archived_at = body['archived'] ? nowIso() : null;
      return { json: { task_id: taskId, archived: rt.task.archived, archived_at: rt.task.archived_at } };
    }

    if (sub === 'run-all' && method === 'POST') {
      if (rt.task.archived === true) {
        return err('BAD_STATE', `任务 ${taskId} 已归档，请先恢复`, '通过 POST /api/v1/tasks/{id}/archive（body {"archived": false}）恢复后再执行。');
      }
      if (rt.running || rt.queue.active !== undefined) return busySpec(rt);
      spawnScript(rt, 'run-all', undefined, true);
      return { status: 202, json: { task_id: taskId, run_status: 'RUNNING' } };
    }

    if (sub === 'step' && method === 'POST') {
      if (rt.task.archived === true) {
        return err('BAD_STATE', `任务 ${taskId} 已归档，请先恢复`, '通过 POST /api/v1/tasks/{id}/archive（body {"archived": false}）恢复后再执行。');
      }
      const rawStep = body['step'];
      if (typeof rawStep !== 'string' || rawStep.trim() === '') {
        return err('BAD_BODY', '缺少 step 字段（字符串）。', '请检查请求体 JSON 结构。');
      }
      const stepId = rawStep.trim();
      if (stepId === 'S1') {
        return err(
          'BAD_PARAM',
          `步骤 ${stepId} 是受控模型步骤，不支持手动单步执行`,
          '该步骤由系统在整链完成后自动执行（基于证据的综合回答），无需手动触发。',
        );
      }
      const known = rt.task.steps.map((s) => s.id);
      if (!known.includes(stepId)) {
        return err('BAD_PARAM', `未知步骤：${stepId}`, `该任务的步骤为：${known.join(' | ')}。`);
      }
      if (rt.running || rt.queue.active !== undefined) return busySpec(rt);
      spawnScript(rt, 'step', stepId, false);
      return { status: 202, json: { task_id: taskId, step: stepId, run_status: 'RUNNING' } };
    }

    if (sub === 'resume' && method === 'POST') {
      if (rt.task.archived === true) {
        return err('BAD_STATE', `任务 ${taskId} 已归档，请先恢复`, '通过 POST /api/v1/tasks/{id}/archive（body {"archived": false}）恢复后再执行。');
      }
      if (rt.running || rt.queue.active !== undefined) return busySpec(rt);
      const fromStep =
        rt.task.steps.find((s) => (s.status === 'PENDING' || s.status === 'FAILED') && s.id !== 'S1')?.id ?? null;
      if (fromStep === null && rt.task.run_status === 'DONE') {
        return err('BAD_STATE', `任务 ${taskId} 已完成（无待续跑步骤）`, '如需重新执行，请新建任务。');
      }
      spawnScript(rt, 'resume', fromStep ?? undefined, true);
      return { status: 202, json: { task_id: taskId, from_step: fromStep, run_status: 'RUNNING' } };
    }

    if (sub === 'stop' && method === 'POST') {
      const stoppedAt = nowIso();
      const locked = rt.lockAction !== undefined;
      if (!locked && (rt.task.run_status === 'DONE' || rt.task.run_status === 'FAILED')) {
        const finalState = rt.task.run_status === 'DONE' ? 'DONE' : 'FAILED';
        return {
          json: { task_id: taskId, run_status: rt.task.run_status, stopped_at: stoppedAt, final_state: finalState },
        };
      }
      if (locked) {
        rt.script = null;
        rt.running = false;
        rt.lockAction = undefined;
        rt.lockStartedAt = undefined;
      }
      if (rt.task.run_status !== 'DONE') {
        rt.task.run_status = 'FAILED';
        rt.task.degraded_reasons.push({
          level: 'info',
          source: 'user',
          reason: '用户请求停止执行',
          impact: '剩余步骤未执行，可通过 resume 断点续跑',
          resumable: true,
          step: currentStepId(rt.task),
          at: stoppedAt,
        });
      }
      const finalState = rt.task.run_status === 'DONE' ? 'DONE' : 'CANCELLED';
      replayOverrides.set(taskId, dynamicSnapshot(rt));
      // 中止回合后 relay settle 必发 done（§5.2 终态保证）
      later(() => emitDone(rt, rt.task.run_status === 'DONE' ? 'DONE' : 'FAILED'));
      return {
        json: { task_id: taskId, run_status: rt.task.run_status, stopped_at: stoppedAt, final_state: finalState },
      };
    }

    if (sub === 'report' && method === 'GET') {
      const level = parseViewLevel(query.get('view'));
      if (typeof level !== 'string') return level;
      if (rt.report === null) {
        return {
          json: respond(taskId, level, { status: 'generating', gate: null, run_status: rt.task.run_status }),
        };
      }
      return { json: respond(taskId, level, { status: 'ready', report: rt.report }) };
    }

    if (sub === 'report.md' && method === 'GET') {
      if (rt.report === null) {
        return err(
          'NO_REPORT',
          `任务 ${taskId} 的报告尚未就绪`,
          '报告在流水线到达终态 DONE 后由内核装配（门禁通过才出报告）；可订阅 /events 等待 report 事件 status=ready。',
        );
      }
      return {
        body: reportMarkdownOf(rt.report),
        mime: 'text/markdown; charset=utf-8',
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': 'inline',
        },
      };
    }

    if (sub === 'evidence' && method === 'GET') {
      const level = parseViewLevel(query.get('view'));
      if (typeof level !== 'string') return level;
      return {
        json: respond(
          taskId,
          level,
          evidenceResponseOf({
            task: rt.task,
            evidence: rt.evidence,
            conclusions: rt.conclusions,
            judgments: rt.judgments,
            notes: rt.notes,
          }) as unknown as Record<string, unknown>,
        ),
      };
    }

    if (sub === 'cite' && method === 'GET') {
      const level = parseViewLevel(query.get('view'));
      if (typeof level !== 'string') return level;
      const ev = (query.get('ev') ?? '').trim();
      if (ev.length > EV_MAX_LENGTH) {
        return err('BAD_PARAM', `ev 过长（${ev.length} > ${EV_MAX_LENGTH}）`, '请传 EV-#### 编号或 ≥6 位哈希前缀。');
      }
      const hit = lookupEvidenceIn(rt.evidence, ev);
      if (!hit.found) {
        // 引用不存在属"查无此项"：404 并带上可查列表（便于前端提示）
        const available = ev === '' ? [] : rt.evidence.slice(0, 20).map((e) => e.ev_id);
        return err(
          'NOT_FOUND',
          hit.reason,
          available.length > 0 ? `可查证据编号：${available.join(', ')}` : undefined,
        );
      }
      const citation = citationOf(hit.evidence);
      const byId = hit.evidence.ev_id === ev;
      return { json: respond(taskId, level, byId ? citation : { ...citation, matched_by: 'sha256_prefix' }) };
    }

    if (sub === 'export' && method === 'GET') {
      const kindRaw = (query.get('kind') ?? '').trim();
      if (kindRaw === '') {
        return err('BAD_PARAM', '缺少查询参数 kind', `请指定导出类型：${EXPORT_KINDS.join(' | ')}（如 ?kind=audit）`);
      }
      if (!(EXPORT_KINDS as readonly string[]).includes(kindRaw)) {
        return err(
          'BAD_PARAM',
          `不支持的导出类型：${kindRaw}`,
          `允许：${EXPORT_KINDS.join(' | ')}；会话轨迹可用 format 参数指定 agnes | sharegpt | claude-code。`,
        );
      }
      const kind = kindRaw as (typeof EXPORT_KINDS)[number];
      // 可用性检查先于 format 校验（对齐 ExportService.export 的顺序）
      if (kind === 'report' && rt.report === null) {
        return notReady(taskId, availableKinds(rt), '报告尚未就绪（流水线未达终态 DONE 或门禁未通过）');
      }
      if (kind === 'audit' && rt.report === null) {
        return notReady(taskId, availableKinds(rt), '报告尚未就绪（审计包需以报告为聚合根）');
      }
      if (kind === 'session' && !rt.task.session_id.includes('workspace:')) {
        return notReady(taskId, availableKinds(rt), '该任务没有 AGH 会话映射（session_id 非 AGH 会话格式）');
      }
      if (kind === 'bibtex' && !rt.evidence.some((e) => e.producer_step === 'R1')) {
        return notReady(taskId, availableKinds(rt), '任务尚无 R1 检索文献证据（无文献可导出为 BibTeX）');
      }
      const format = (query.get('format') ?? '').trim() || 'agnes';
      if (kind === 'session' && !(SESSION_FORMATS as readonly string[]).includes(format)) {
        return err(
          'BAD_PARAM',
          `不支持的 session 导出格式：${format}`,
          `允许：${[...SESSION_FORMATS].join(' | ')}（如 ?kind=session&format=agnes）`,
        );
      }
      if (kind === 'report') {
        return fileResponse('text/markdown; charset=utf-8', 'inline', `${taskId}-report.md`, reportMarkdownOf(rt.report!), ['report.md']);
      }
      if (kind === 'audit') {
        return fileResponse('application/zip', 'attachment', `${taskId}-audit.zip`, zipStore(auditEntries(rt)), [...AUDIT_EXPORT_CONTENTS]);
      }
      if (kind === 'session') {
        const ext = format === 'agnes' ? 'jsonl' : 'json';
        const mime = format === 'agnes' ? 'application/x-ndjson; charset=utf-8' : 'application/json; charset=utf-8';
        return fileResponse(
          mime,
          'attachment',
          `${taskId}-session.${ext}`,
          sessionJsonl(rt),
          format === 'agnes' ? [...SESSION_EXPORT_CONTENTS] : [`session.${format}`],
        );
      }
      // bibtex：该任务 R1 文献证据全量（**不去重**、按账本序，序号即防碰撞键尾号）
      const refs = rt.evidence.filter((e) => e.producer_step === 'R1').map(libraryRefOf);
      return fileResponse('text/plain; charset=utf-8', 'attachment', `${taskId}.bib`, bibtexOf(refs), [`${taskId}.bib`]);
    }

    if (sub === 'messages') {
      if (method === 'GET') {
        return {
          json: {
            task_id: taskId,
            busy: rt.running || rt.queue.active !== undefined,
            pending: rt.queue.pending.map((m) => ({ ...m })),
            ...(rt.queue.active ? { active: { ...rt.queue.active } } : {}),
            history: mergeHistory(rt),
          },
        };
      }
      if (method === 'POST') {
        if (rt.task.archived === true) {
          return err(
            'BAD_STATE',
            `任务 ${taskId} 已归档，请先恢复`,
            '通过 POST /api/v1/tasks/{id}/archive（body {"archived": false}）恢复后再发送消息。',
          );
        }
        const text = validateText(body['text']);
        if (typeof text !== 'string') return text;
        const action = validateAction(body['action']);
        if (typeof action !== 'string') return action;
        const q = rt.queue;
        q.seq += 1;
        const turnId = `turn-${q.seq}`;
        // 队列上限保护：先判后插（绝不"插完再删旧的然后报错"）
        if (q.pending.length >= MAX_QUEUE) {
          return err(
            'BUSY',
            `该任务待发消息已达上限（${MAX_QUEUE}），新消息未入队`,
            '请等待队列消化，或删除尚未发送的消息（DELETE /api/v1/tasks/{id}/messages/{turn_id}）后再试。',
          );
        }
        const msg: QueuedMessage = {
          turn_id: turnId,
          task_id: taskId,
          action,
          text,
          order: q.pending.length + 1,
          queued_at: nowIso(),
          status: 'queued',
        };
        q.pending.push(msg);
        const busy = rt.running;
        if (!busy && !q.active) {
          // 空闲：立即投递（契约 queued=false, status=running）
          later(() => drain(taskId));
          return { json: { queued: false, turn_id: turnId, status: 'running' } };
        }
        return { json: { queued: true, order: msg.order, turn_id: turnId, status: 'queued' } };
      }
      if (method === 'DELETE' && tail !== undefined) {
        const turnId = validateTurnId(decodeURIComponent(tail));
        if (typeof turnId !== 'string') return turnId;
        const q = rt.queue;
        const idx = q.pending.findIndex((m) => m.turn_id === turnId);
        if (idx < 0) {
          const active = q.active?.turn_id === turnId;
          const done = q.history.some((m) => m.turn_id === turnId);
          return err(
            'BAD_STATE',
            active ? '该消息正在发送，无法删除' : done ? '该消息已发送完成，属会话留痕，不可删除' : '未找到该待发消息',
            '只有尚未发送的排队消息可以删除（DELETE /api/v1/tasks/{id}/messages/{turn_id}）。',
          );
        }
        const removed = q.pending[idx];
        if (!removed) return err('BAD_STATE', '未找到该待发消息', '只有尚未发送的排队消息可以删除。');
        q.pending.splice(idx, 1);
        removed.status = 'deleted';
        // 重排 order，保证前端显示的"第 N 条"与实际队列一致
        q.pending.forEach((m, i) => {
          m.order = i + 1;
        });
        return { json: { deleted: true, turn_id: removed.turn_id } };
      }
      return notFoundRoute(pathname);
    }

    return notFoundRoute(pathname);
  };

  /* ---------------------------------------------------------- 子路由实现 */

  type ResError = ResSpec;

  const currentStepId = (task: SeedTask): string =>
    task.steps.find((s) => s.status === 'RUNNING')?.id ?? task.steps.find((s) => s.status === 'PENDING')?.id ?? '-';

  const busySpec = (rt: TaskRuntime): ResSpec => {
    const what = rt.lockAction
      ? `已有步骤在执行（${rt.lockAction}，自 ${rt.lockStartedAt}）`
      : '已有追问消息在同一会话中投递';
    return err('BUSY', `该任务${what}`, '请等待当前回合完成（订阅 /events 获取 done 事件）后再触发。');
  };

  const fileResponse = (
    mime: string,
    disposition: 'inline' | 'attachment',
    filename: string,
    body: string,
    contents: string[],
  ): ResSpec => ({
    body,
    mime,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'X-Export-Contents': contents.join(','),
    },
  });

  const libraryEvidence = (query: URLSearchParams): ResSpec => {
    // services/library.ts 的四组参数校验（同一参数重复出现时 URLSearchParams 取首个，
    // 与 Fastify 的 querystring 解析差异在此不影响契约文案）
    const text = (name: string): string | ResError => {
      const raw = query.get(name);
      if (raw === null) return '';
      return raw.trim();
    };
    const q = text('q');
    if (typeof q !== 'string') return q;
    const kind = text('kind');
    if (typeof kind !== 'string') return kind;
    const tier = text('tier');
    if (typeof tier !== 'string') return tier;
    const source = text('source');
    if (typeof source !== 'string') return source;
    const taskId = text('task_id');
    if (typeof taskId !== 'string') return taskId;
    const dedupeRaw = (query.get('dedupe') ?? '').trim().toLowerCase();
    let dedupe: boolean;
    if (dedupeRaw === '' || dedupeRaw === 'on') dedupe = true;
    else if (dedupeRaw === 'off') dedupe = false;
    else return err('BAD_PARAM', `查询参数 dedupe 非法：${dedupeRaw}`, '允许值：on | off（默认 on）。');
    const int = (name: string, fallback: number, min: number, max: number): number | ResError => {
      const raw = query.get(name);
      if (raw === null || raw === '') return fallback;
      if (!/^\d+$/.test(raw.trim())) {
        return err('BAD_PARAM', `查询参数 ${name} 非法：${raw}`, `应为 ${min}~${max} 之间的整数。`);
      }
      const n = Number(raw.trim());
      if (n < min || n > max) {
        return err('BAD_PARAM', `查询参数 ${name} 越界：${n}`, `应为 ${min}~${max} 之间的整数。`);
      }
      return n;
    };
    const limit = int('limit', 50, 1, 500);
    if (typeof limit !== 'number') return limit;
    const offset = int('offset', 0, 0, Number.MAX_SAFE_INTEGER);
    if (typeof offset !== 'number') return offset;

    const tasks = [...runtimes.values()].map((rt) => rt.task);
    const evidence: Record<string, RawEvidence[]> = {};
    for (const [id, rt] of runtimes) evidence[id] = rt.evidence;
    return {
      json: libraryQuery(
        { q, kind, tier, source, task_id: taskId, dedupe, limit, offset },
        { tasks, evidence },
      ),
    };
  };

  const libraryExport = (query: URLSearchParams): ResSpec => {
    const kind = (query.get('kind') ?? '').trim();
    if (kind === '') {
      return err('BAD_PARAM', '缺少查询参数 kind', '请指定导出类型：bibtex（如 ?kind=bibtex）');
    }
    if (kind !== 'bibtex') {
      return err('BAD_PARAM', `不支持的全库导出类型：${kind}`, '当前允许：bibtex');
    }
    // literature()：collect 全任务 → 过滤 producer_step='R1' → dedupeByDoi
    const items = libraryQuery({ limit: 1000 }, corpus(), { producerStep: 'R1' }).items;
    if (items.length === 0) {
      return err(
        'NOT_READY',
        '文献库暂无可用文献（没有任何任务的 R1 检索证据），无法导出 BibTeX',
        '请先完成任务 R1 多源检索，使证据落入各任务账本后再导出。',
      );
    }
    return fileResponse(
      'text/plain; charset=utf-8',
      'attachment',
      'paper-agent-library.bib',
      bibtexOf(items.map((it) => it.ref)),
      ['paper-agent-library.bib'],
    );
  };

  /* -------------------------------------------------------------- 装配 */

  const corpus = (): LibraryCorpus => {
    const tasks = [...runtimes.values()].map((rt) => rt.task);
    const evidence: Record<string, RawEvidence[]> = {};
    for (const [id, rt] of runtimes) evidence[id] = rt.evidence;
    return { tasks, evidence };
  };

  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', BackendEventSource);
  const calls = stubFetch(route);

  return {
    calls,
    get sources(): FakeEventSource[] {
      return FakeEventSource.instances;
    },
    isRunning,
    runtimeOf: (taskId: string) => runtimes.get(taskId),
    taskIds: () => [...runtimes.keys()],
    createdTaskIds,
    corpus,
    pump,
    flush,
    now: () => new Date(clockMs).toISOString(),
    unstub: () => vi.unstubAllGlobals(),
  };
}

/* ==========================================================================
 * 小工具（ZIP 组装需要 CRC32）
 * ========================================================================== */

const CRC_TABLE: Int32Array = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    c = (c >>> 8) ^ (CRC_TABLE[(c ^ bytes[i]!) & 0xff] ?? 0);
  }
  return (c ^ -1) >>> 0;
}
