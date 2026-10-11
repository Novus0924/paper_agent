/* 前后端共享 DTO 契约（《后端需求文档》§8、《前端需求文档》附录 A）。
 * 字段名一律保持后端 snake_case，禁止自创字段。 */

export type RunStatus = 'PLANNED' | 'RUNNING' | 'DONE' | 'FAILED';
export type StepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'SKIPPED' | 'FAILED';
/** tier 取值 fact/artifact；kind 取值 literature/data/analysis/note/factcheck/draft/review，二者不可混用 */
export type EvidenceTier = 'fact' | 'artifact';
export type EvidenceKind =
  'literature' | 'data' | 'analysis' | 'note' | 'factcheck' | 'draft' | 'review';

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
  goal: string;
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
