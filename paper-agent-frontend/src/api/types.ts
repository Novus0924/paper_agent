/* 前后端共享 DTO 契约（《后端需求文档》§8、《前端需求文档》附录 A）。
 * 字段名一律保持后端 snake_case，禁止自创字段。 */

export type RunStatus = 'PLANNED' | 'RUNNING' | 'DONE' | 'FAILED';
export type StepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'SKIPPED' | 'FAILED';
/**
 * tier 取值 fact/artifact；kind 取值 literature/data/analysis/note/factcheck/draft/review/synthesis，二者不可混用。
 * synthesis 是内核 S1「综合回答」产出的 artifact（kernel/sciret_kernel/ledger.py EVIDENCE_KINDS），
 * 之前漏登记会让文献库/证据页在遇到它时用 undefined 查文案表而整页崩溃。
 */
export type EvidenceTier = 'fact' | 'artifact';
export type EvidenceKind =
  | 'literature'
  | 'data'
  | 'analysis'
  | 'note'
  | 'factcheck'
  | 'draft'
  | 'review'
  | 'synthesis';

export type WorkflowName = 'research' | 'materials';
export type SourceName = 'arxiv' | 'crossref' | 'openalex' | 'semantic_scholar' | 'local';
export type LitSource = 'auto' | 'local' | 'arxiv';

export interface Step {
  id: string;
  label: string;
  status: StepStatus;
  attempts: number;
  elapsed_ms?: number;
  error?: string;
  is_current?: boolean;
}

export interface TaskSnapshot {
  task_id: string;
  /** 面向展示的标题（后端由 goal 摘要生成） */
  title: string;
  /**
   * 研究目标原文。
   * 后端面向视图 DTO（apps/bff/src/routes/v1/tasks.ts 的 taskSnapshot）
   * **只发 title，不发 goal**（实测 GET /api/v1/tasks/{id} 响应体无 goal 字段），
   * 所以这里必须是可选：写成必填会让 `snapshot.goal` 在 live 下恒为 undefined，
   * 而类型说它是 string —— 页面只会静默退回占位文案。
   */
  goal?: string;
  workflow: WorkflowName;
  lit_source: LitSource;
  sources: SourceName[];
  run_status: RunStatus;
  steps: Step[];
  /** 仅 L2 真降级会置为 true（§2.2 三级语义） */
  degraded: boolean;
  session_id: string;
  created_at: string;
  updated_at: string;
  /** AGH 会话是否已记录（P-04） */
  agh_recorded?: boolean;
  report_ready?: boolean;
  /** 已归档（v2.1）：旧快照无此字段视作未归档 */
  archived?: boolean;
  archived_at?: string | null;
}

export interface Activity {
  id: string;
  step: string;
  human_message: string;
  detail?: string;
  ts: string;
  seq?: number;
}

export interface SourceStatusItem {
  source: string;
  status: 'ok' | 'skipped' | 'unavailable';
  note?: string;
}

export interface ToolCall {
  id: string;
  step: string;
  tool: string;
  label: string;
  status: 'running' | 'done' | 'warn' | 'failed';
  input?: string;
  output?: string;
  sources_status?: SourceStatusItem[];
  ts: string;
  seq?: number;
}

export interface DegradedInfo {
  id: string;
  level: 'info' | 'degraded';
  source: string;
  reason: string;
  impact: string;
  resumable: boolean;
  step?: string;
  /** 降级时系统采取的调整动作，如「切换到 openalex」「跳过该源」 */
  action?: string;
  ts: string;
  seq?: number;
}

export interface Conclusion {
  cid: string;
  text: string;
  evidence_ids: string[];
  /** 展示用引用编号（1-based，与参考文献列表对应） */
  cite_no?: number;
}

export interface ReportSection {
  id: string;
  title: string;
  /** Markdown 正文，渲染前经消毒 */
  body: string;
}

export interface Report {
  task_id: string;
  title: string;
  abstract: string;
  sections: ReportSection[];
  conclusions: Conclusion[];
  degraded_statement?: string;
  generated_at?: string;
  meta?: {
    model?: string;
    session_id?: string;
    evidence_count?: number;
    citation_count?: number;
  };
  verdict?: {
    passed: boolean;
    text: string;
  };
}

export interface ReportResponse {
  status: 'ready' | 'generating';
  report?: Report;
  /** 未就绪时说明需要完成的步骤，而不是报错 */
  pending_note?: string;
}

export interface EvidenceItem {
  ev_id: string;
  tier: EvidenceTier;
  kind: EvidenceKind;
  title: string;
  /** 来源标识：DOI / 数据集名 / 产物路径 */
  ref: string;
  producer_step: string;
  year?: string;
  authors?: string;
  summary?: string;
  sha256?: string;
  chain_hash?: string;
  cite_no?: number;
}

export interface TraceEntry {
  id: string;
  ts: string;
  type: string;
  label: string;
  detail?: string;
  seq?: number;
}

export interface EvidenceBundle {
  task_id: string;
  evidence: EvidenceItem[];
  conclusions: Conclusion[];
  trace: TraceEntry[];
}

/** 文献库条目的书目引用块（GET /library/evidence 契约 v1） */
export interface LibraryRef {
  /** 有 DOI 时为准一去重键；非文献证据为空串 */
  doi: string;
  title: string;
  authors: string;
  year: string;
  venue: string;
  /** 检索来源：arxiv / crossref / openalex / semantic_scholar / local */
  source: string;
}

/** 跨任务汇总的一条证据（文献库列表行） */
export interface LibraryEvidenceItem {
  ev_id: string;
  task_id: string;
  /** 来源任务的研究目标（可能与 title 不同，用于展示归属） */
  task_goal: string;
  tier: EvidenceTier;
  kind: EvidenceKind;
  title: string;
  ref: LibraryRef;
  producer_step: string;
  /** 该 DOI 被合并掉的重复条数（去重开启时 > 0） */
  duplicates_count: number;
}

/** GET /library/evidence 响应（契约冻结） */
export interface LibraryEvidenceResponse {
  /** 过滤（含去重）后的总条数，与分页无关 */
  total: number;
  /** 本次结果覆盖的任务数 */
  tasks_scanned: number;
  items: LibraryEvidenceItem[];
  offset: number;
  limit: number;
}

/** GET /library/evidence 过滤参数 */
export interface ListLibraryParams {
  /** 关键词：标题 / 作者 / DOI / 来源任务 */
  q?: string;
  kind?: EvidenceKind;
  tier?: EvidenceTier;
  source?: string;
  task_id?: string;
  /** 按 DOI 去重，缺省视为开启（契约默认 on） */
  dedupe?: boolean;
  limit?: number;
  offset?: number;
}

export type MessageStatus = 'queued' | 'sending' | 'streaming' | 'done' | 'failed';

export interface ChatMessage {
  id: string;
  turn_id: string;
  role: 'user' | 'agent';
  text: string;
  status: MessageStatus;
  queued_order?: number;
  ts: string;
  seq?: number;
  /** 失败时的人类可读原因 */
  error?: string;
}

export interface SourcePreflight {
  source: SourceName;
  ok: boolean;
  /** 形如 "unavailable:429" */
  detail?: string;
  latency_ms?: number;
}

export interface Preflight {
  sources: Record<string, string>;
}

export interface CreateTaskInput {
  goal: string;
  workflow: WorkflowName;
  lit_source: LitSource;
  sources: SourceName[];
}

export interface CreateTaskResponse {
  task_id: string;
  session_id: string;
  state: TaskSnapshot;
  preflight: Preflight;
}

export type ExportKind = 'report' | 'audit' | 'session';

export interface ExportManifestItem {
  name: string;
  kind: string;
  verified: boolean;
  note?: string;
}

export interface ExportResult {
  ok: boolean;
  kind: ExportKind;
  filename?: string;
  mime?: string;
  content?: string;
  /** Live 模式下载文件流时给出的对象 URL（用后由调用方释放） */
  blobUrl?: string;
  manifest?: ExportManifestItem[];
  error?: string;
  code?: string;
}

export interface SendResult {
  queued: boolean;
  turn_id?: string;
  order?: number;
  status?: 'running' | 'queued';
}

/** GET /tasks/{id}/messages 里的单条消息（后端 services/message.ts QueuedMessage） */
export interface MessageQueueEntry {
  turn_id: string;
  task_id: string;
  action: 'ask' | 'revise';
  text: string;
  /** 入队序号（从 1 起，"第 N 条待发"） */
  order: number;
  queued_at: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'deleted';
  error?: string;
}

/** GET /tasks/{id}/messages 响应：队列与历史（前端恢复"待发 N 条"用） */
export interface MessageQueueResponse {
  task_id: string;
  busy: boolean;
  pending: MessageQueueEntry[];
  active?: MessageQueueEntry | null;
  history: MessageQueueEntry[];
}

/** POST /tasks/{id}/archive 响应：恢复时 archived_at 置 null */
export interface ArchiveResult {
  task_id: string;
  archived: boolean;
  archived_at: string | null;
}

/** POST /tasks/{id}/stop 响应（后端 services/execution.ts stop）：终态以实际为准 */
export interface StopResult {
  task_id: string;
  run_status: RunStatus;
  stopped_at: string;
  /** 运行中被用户中止 → CANCELLED（RunStatus 落为 FAILED）；已终态时与 run_status 一致 */
  final_state: 'DONE' | 'FAILED' | 'CANCELLED';
}

export interface HealthIssue {
  id: string;
  title: string;
  guidance: string;
  blocking: boolean;
  action_label?: string;
  action_href?: string;
}

export interface HealthInfo {
  status: 'ok' | 'degraded' | 'down';
  mode: 'mock' | 'live';
  version?: string;
  task_count: number;
  session_ready: boolean;
  bff_reachable: boolean;
  model?: string;
  issues: HealthIssue[];
  checked_at: string;
}

/* ---------------- SSE 事件（后端文档 §5.1） ---------------- */

export interface StepEvent {
  step: string;
  status: StepStatus;
  elapsed_ms?: number;
  error?: string;
}
export interface ActivityEvent {
  step: string;
  human_message: string;
  detail?: string;
  ts: string;
}
export interface ToolEvent {
  step: string;
  tool: string;
  /** 稳定幂等键（live 下为 AGH toolUseId；mock 帧不带，回落到 step+tool） */
  id?: string;
  label?: string;
  status: 'running' | 'done' | 'warn' | 'failed';
  input?: string;
  output?: string;
  sources_status?: SourceStatusItem[];
  ts?: string;
}
export interface DegradedEvent {
  level: 'info' | 'degraded';
  source: string;
  reason: string;
  impact: string;
  resumable: boolean;
  step?: string;
  action?: string;
}
export interface ConclusionEvent {
  cid: string;
  text: string;
  evidence_ids: string[];
}
export interface MessageEvent {
  turn_id: string;
  role: 'user' | 'agent';
  delta?: string;
  text?: string;
  status: MessageStatus;
  queued_order?: number;
}
export interface ReportEvent {
  task_id: string;
  status: 'ready' | 'generating';
}
export interface DoneEvent {
  run_status: RunStatus;
  report_ready: boolean;
  error?: string;
}
export interface PingEvent {
  ts: string;
}

export type SseEventName =
  | 'ping'
  | 'step'
  | 'activity'
  | 'tool'
  | 'degraded'
  | 'conclusion'
  | 'message'
  | 'report'
  | 'done';

interface EnvelopeBase {
  /** 单调序号：用于保序与幂等（§5.2） */
  seq: number;
  ts: string;
  task_id: string;
}

/** 归一化事件信封：按 event 判别的联合类型 */
export type SseEnvelope =
  | (EnvelopeBase & { event: 'ping'; data: PingEvent })
  | (EnvelopeBase & { event: 'step'; data: StepEvent })
  | (EnvelopeBase & { event: 'activity'; data: ActivityEvent })
  | (EnvelopeBase & { event: 'tool'; data: ToolEvent })
  | (EnvelopeBase & { event: 'degraded'; data: DegradedEvent })
  | (EnvelopeBase & { event: 'conclusion'; data: ConclusionEvent })
  | (EnvelopeBase & { event: 'message'; data: MessageEvent })
  | (EnvelopeBase & { event: 'report'; data: ReportEvent })
  | (EnvelopeBase & { event: 'done'; data: DoneEvent });

export const SSE_EVENT_NAMES: SseEventName[] = [
  'ping',
  'step',
  'activity',
  'tool',
  'degraded',
  'conclusion',
  'message',
  'report',
  'done',
];
