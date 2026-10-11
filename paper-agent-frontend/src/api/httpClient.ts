import { parseErrorBody, toApiError } from './errors';
import type { ApiClient, ListTasksParams, SubscribeHandlers } from './client';
import type {
  ArchiveResult,
  Conclusion,
  CreateTaskInput,
  CreateTaskResponse,
  EvidenceBundle,
  EvidenceItem,
  EvidenceKind,
  EvidenceTier,
  ExportKind,
  ExportManifestItem,
  ExportResult,
  HealthInfo,
  MessageQueueResponse,
  ReportResponse,
  SseEnvelope,
  SseEventName,
  SendResult,
  SourcePreflight,
  StopResult,
  TaskSnapshot,
  TraceEntry,
} from './types';

const V1 = '/api/v1';

/**
 * Live 适配器：对接《后端需求文档》§8 的 BFF 契约。
 * SSE 事件按 §5.1 目录解析为归一信封，断线由浏览器 EventSource 续传 Last-Event-ID。
 */
export class LiveApiClient implements ApiClient {
  readonly mode = 'live' as const;
  constructor(private baseUrl: string) {}

  private url(path: string): string {
    return `${this.baseUrl}${V1}${path}`;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.url(path), {
        ...init,
        // 无体的 POST（run-all / resume / stop）不能带 Content-Type: application/json：
        // Fastify 的内容解析器会先于路由拒绝空 JSON 体 → 400 BAD_BODY（实测）。
        headers: {
          ...(init?.body == null ? {} : { 'Content-Type': 'application/json' }),
          ...(init?.headers ?? {}),
        },
      });
    } catch (err) {
      throw toApiError(err);
    }
    if (!res.ok) throw await parseErrorBody(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async health(): Promise<HealthInfo> {
    try {
      // 健康探针不在 /api/v1 前缀下（后端 §8.1）
      const raw = (await (await fetch(`${this.baseUrl}/api/health`)).json()) as Record<
        string,
        unknown
      >;
      // 后端实际字段（routes/health.ts）：status/service/version/root/runs_dir/tasks/
      // agh{connected,agnes_version,socket,sessions_open,error}/runs_dir_ok/runs_dir_error。
      // 没有 model 与 issues：model 属报告元数据、issues 由下面按真实故障源推导。
      const agh = (raw.agh ?? {}) as Record<string, unknown>;
      const connected = agh.connected === true;
      const runsDirOk = raw.runs_dir_ok !== false;
      const issues: HealthInfo['issues'] = [];
      if (!connected) {
        issues.push({
          id: 'agh-disconnected',
          title: 'AGH 会话服务未连接，任务无法执行',
          guidance: agh.error
            ? `后端上报原因：${String(agh.error)}`
            : '请确认 AGH daemon 已启动（bash agh.sh daemon start），且 PAPER_AGENT_AGH_ROOT 指向已构建的 AGH 仓库。',
          blocking: true,
        });
      }
      if (!runsDirOk) {
        issues.push({
          id: 'runs-dir-unavailable',
          title: '运行产物目录不可读写',
          guidance: raw.runs_dir_error
            ? `后端上报原因：${String(raw.runs_dir_error)}`
            : '请检查 runs 目录权限或磁盘可用空间。',
          blocking: true,
        });
      }
      return {
        status: raw.status === 'ok' ? 'ok' : 'degraded',
        mode: 'live',
        version: typeof raw.version === 'string' ? raw.version : undefined,
        task_count: typeof raw.tasks === 'number' ? raw.tasks : 0,
        session_ready: connected,
        bff_reachable: true,
        model: undefined,
        issues,
        checked_at: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'down',
        mode: 'live',
        task_count: 0,
        session_ready: false,
        bff_reachable: false,
        issues: [
          {
            id: 'bff-unreachable',
            title: '无法连接后端服务',
            guidance:
              '请先用一键启动器启动 AGH 与 BFF（前端无需单独启动服务）；若只想看演示数据，可在 URL 后加 ?mode=mock。',
            blocking: true,
            action_label: '查看启动指引',
            action_href: '#/settings',
          },
        ],
        checked_at: new Date().toISOString(),
      };
    }
  }

  /** 后端返回信封 `{ tasks, total }`（routes/v1/tasks.ts），不是裸数组 */
  async listTasks(params?: ListTasksParams): Promise<TaskSnapshot[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.archived) query.set('archived', params.archived);
    const qs = query.toString();
    const res = await this.request<{ tasks?: TaskSnapshot[] }>(
      `/tasks${qs ? `?${qs}` : ''}`,
    );
    return res.tasks ?? [];
  }

  archiveTask(taskId: string, archived: boolean): Promise<ArchiveResult> {
    return this.request<ArchiveResult>(
      `/tasks/${encodeURIComponent(taskId)}/archive`,
      { method: 'POST', body: JSON.stringify({ archived }) },
    );
  }

  getTask(taskId: string): Promise<TaskSnapshot> {
    return this.request<TaskSnapshot>(`/tasks/${encodeURIComponent(taskId)}`);
  }

  /**
   * 后端 §8.1 没有独立预检接口（routes/v1/tasks.ts 在 POST /tasks 内 probeSources），
   * 真实结果只随创建任务返回。这里不发请求、不编造 ok：返回空数组，
   * 让界面如实显示"未检测"，由 createTask 用 res.preflight 回填真实值。
   */
  async preflight(): Promise<SourcePreflight[]> {
    return [];
  }

  createTask(input: CreateTaskInput): Promise<CreateTaskResponse> {
    return this.request<CreateTaskResponse>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        goal: input.goal,
        workflow: input.workflow,
        lit_source: input.lit_source,
        sources: input.sources,
      }),
    });
  }

  runAll(taskId: string): Promise<void> {
    return this.request<void>(`/tasks/${encodeURIComponent(taskId)}/run-all`, {
      method: 'POST',
    });
  }

  async resumeTask(taskId: string, fromStep?: string): Promise<void> {
    if (fromStep) {
      await this.request<void>(`/tasks/${encodeURIComponent(taskId)}/step`, {
        method: 'POST',
        body: JSON.stringify({ step: fromStep }),
      });
      return;
    }
    await this.request<void>(`/tasks/${encodeURIComponent(taskId)}/resume`, {
      method: 'POST',
    });
  }

  stopTask(taskId: string): Promise<StopResult> {
    return this.request<StopResult>(`/tasks/${encodeURIComponent(taskId)}/stop`, {
      method: 'POST',
    });
  }

  subscribe(taskId: string, handlers: SubscribeHandlers): () => void {
    const source = new EventSource(
      `${this.baseUrl}${V1}/tasks/${encodeURIComponent(taskId)}/events`,
      { withCredentials: false },
    );
    const names: SseEventName[] = [
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

    source.onopen = () => handlers.onConnection?.('online');
    source.onerror = () => {
      // EventSource 自带重连（retry: 2000），这里只反映连接状态
      handlers.onConnection?.(
        source.readyState === EventSource.CLOSED ? 'offline' : 'reconnecting',
      );
    };

    for (const name of names) {
      source.addEventListener(name, (raw) => {
        const msg = raw as MessageEvent<string>;
        const envelope = toEnvelope(taskId, name, msg);
        if (envelope) handlers.onEvent(envelope);
      });
    }

    return () => source.close();
  }

  getReport(taskId: string): Promise<ReportResponse> {
    return this.request<ReportResponse>(`/tasks/${encodeURIComponent(taskId)}/report`);
  }

  /**
   * 证据响应按后端契约（services/report.ts getEvidence）归一化后再给界面：
   * 字段名与类型都不同（doi / authors[] / year:number / venue / source），且没有 trace。
   * 取 `?view=audit`：卡片「审计细节」要显示单条 chain_hash，而默认视图会把它剥掉
   * （http/dto.ts 的 AUDIT_ONLY_KEYS），显示成"不适用"反而是假信息。
   */
  async getEvidence(taskId: string): Promise<EvidenceBundle> {
    const raw = await this.request<Record<string, unknown>>(
      `/tasks/${encodeURIComponent(taskId)}/evidence?view=audit`,
    );
    return toEvidenceBundle(raw);
  }

  async cite(
    taskId: string,
    evId: string,
  ): Promise<{ ev_id: string; ref: string; detail: string }> {
    // 后端响应是 `{ task_id, view, found, citation }`（找不到时给 reason + available），
    // 证据字段全在 citation 里，不在顶层。
    const res = await this.request<Record<string, unknown>>(
      `/tasks/${encodeURIComponent(taskId)}/cite?ev=${encodeURIComponent(evId)}`,
    );
    const citation = asRecord(res.citation);
    if (res.found !== true) {
      return {
        ev_id: text(citation.ev_id) || evId,
        ref: '—',
        detail: text(res.reason) || '后端未返回该证据的回查结果',
      };
    }
    const authors = Array.isArray(citation.authors)
      ? citation.authors.map((a) => text(a)).filter((a) => a !== '')
      : [];
    const detail = [
      text(citation.title),
      authors.join('、'),
      text(citation.venue),
      text(citation.year),
    ]
      .filter((s) => s !== '')
      .join(' · ');
    return {
      ev_id: text(citation.ev_id) || evId,
      ref:
        text(citation.doi) || text(citation.source) || text(citation.file) || '—',
      detail: detail || '（该证据无书目字段，见审计细节中的内容哈希）',
    };
  }

  sendMessage(
    taskId: string,
    text: string,
    action: 'ask' | 'revise',
  ): Promise<SendResult> {
    return this.request<SendResult>(`/tasks/${encodeURIComponent(taskId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, action }),
    });
  }

  /**
   * 不实现「立即发送」：后端契约里 action 白名单只有 ask|revise 且 text 必填
   * （services/message.ts validateAction/validateText），没有 flush 这类强制投递口；
   * 运行中的消息按序排队、回合结束由 onTaskIdle 自动放行（§8.2）。
   * 旧实现先试 {action:'flush'} 必然 400，再回落到 POST /stop —— 那会中断整轮执行，
   * 把"提前发一条消息"做成了"停掉任务"，故删除。接口里 sendNow 为可选，live 不提供。
   */

  listMessages(taskId: string): Promise<MessageQueueResponse> {
    return this.request<MessageQueueResponse>(
      `/tasks/${encodeURIComponent(taskId)}/messages`,
    );
  }

  async removeQueued(taskId: string, turnId: string): Promise<void> {
    await this.request<void>(
      `/tasks/${encodeURIComponent(taskId)}/messages/${encodeURIComponent(turnId)}`,
      {
        method: 'DELETE',
      },
    );
  }

  /** 报告 Markdown 直下：与 exportArtifact 同样走文件流，文件名固定 {task_id}.md */
  async downloadReportMd(taskId: string): Promise<ExportResult> {
    const path = `/tasks/${encodeURIComponent(taskId)}/report.md`;
    let res: Response;
    try {
      res = await fetch(this.url(path));
    } catch (err) {
      throw toApiError(err);
    }
    if (!res.ok) {
      const err = await parseErrorBody(res);
      return { ok: false, kind: 'report', code: err.code, error: err.message };
    }
    const blob = await res.blob();
    return {
      ok: true,
      kind: 'report',
      filename: `${taskId}.md`,
      mime: blob.type || 'text/markdown;charset=utf-8',
      blobUrl: URL.createObjectURL(blob),
    };
  }

  async exportArtifact(taskId: string, kind: ExportKind): Promise<ExportResult> {
    const path = `/tasks/${encodeURIComponent(taskId)}/export?kind=${kind}`;
    let res: Response;
    try {
      res = await fetch(this.url(path));
    } catch (err) {
      throw toApiError(err);
    }
    if (!res.ok) {
      const err = await parseErrorBody(res);
      return { ok: false, kind, code: err.code, error: err.message };
    }
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const filename =
      /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ??
      `${taskId}-${kind}`;
    const blob = await res.blob();
    const content = kind === 'report' ? await blob.text() : undefined;
    return {
      ok: true,
      kind,
      filename: decodeURIComponent(filename),
      mime: blob.type || 'application/octet-stream',
      content,
      blobUrl: URL.createObjectURL(blob),
      // 后端在 X-Export-Contents 里如实列出该次导出实际打进去的产物
      // （routes/v1/export.ts 的 result.contents），据此生成清单而不是凭空罗列。
      manifest: splitExportContents(res.headers.get('X-Export-Contents')),
    };
  }
}

/** 后端 JSON 字段宽松取值：缺字段一律空串，不猜值 */
function text(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function asList(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.map(asRecord) : [];
}

const EVIDENCE_TIERS = new Set<string>(['fact', 'artifact']);
const EVIDENCE_KINDS = new Set<string>([
  'literature',
  'data',
  'analysis',
  'note',
  'factcheck',
  'draft',
  'review',
]);

/**
 * 证据项：后端给 `doi: string|null`、`authors: string[]`、`year: number|null`、`venue`、`source`
 * （services/report.ts getEvidence 的投影），与前端 EvidenceItem 的 `ref`/`authors: string`/`year: string` 不同名也不同型。
 */
function toEvidenceItem(raw: Record<string, unknown>): EvidenceItem {
  const doi = text(raw.doi);
  const source = text(raw.source);
  const authors = Array.isArray(raw.authors)
    ? raw.authors.map((a) => text(a)).filter((a) => a !== '')
    : [];
  const kind = text(raw.kind);
  const tier = text(raw.tier);
  const year = text(raw.year);
  const sha256 = text(raw.sha256);
  const chainHash = text(raw.chain_hash);
  return {
    ev_id: text(raw.ev_id),
    tier: EVIDENCE_TIERS.has(tier) ? (tier as EvidenceTier) : 'fact',
    // 内核只写 literature/analysis/factcheck/draft/review；出现未知值时归入 note，
    // 而不是给界面一个没有译文、标签会变空白的 kind。
    kind: EVIDENCE_KINDS.has(kind) ? (kind as EvidenceKind) : 'note',
    title: text(raw.title),
    /** ref = 「DOI / 数据集名 / 产物路径」；后端拆成 doi + source，按此优先级取真值，两者都缺则留空 */
    ref: doi !== '' ? doi : source,
    producer_step: text(raw.producer_step),
    ...(year !== '' ? { year } : {}),
    ...(authors.length > 0 ? { authors: authors.join('、') } : {}),
    ...(sha256 !== '' ? { sha256 } : {}),
    ...(chainHash !== '' ? { chain_hash: chainHash } : {}),
  };
}

function toConclusion(raw: Record<string, unknown>): Conclusion {
  return {
    cid: text(raw.cid),
    text: text(raw.text),
    evidence_ids: Array.isArray(raw.evidence_ids)
      ? raw.evidence_ids.map((x) => text(x)).filter((s) => s !== '')
      : [],
  };
}

/**
 * 后端证据响应没有 trace 字段（历史轨迹只在 SSE 与导出包的 events.json 里，无 GET 接口）。
 * 这里只用响应里真实存在的记录（证据 / 判断 / 备注）拼时间线，不拿假事件填面板。
 */
function toTraceEntries(raw: Record<string, unknown>): TraceEntry[] {
  const entries: TraceEntry[] = [];
  asList(raw.evidence).forEach((e) => {
    const evId = text(e.ev_id);
    const step = text(e.producer_step);
    entries.push({
      id: `ev-${evId}`,
      ts: text(e.at),
      type: 'evidence',
      label: `${evId} ${text(e.title)}`.trim(),
      ...(step !== '' ? { detail: step } : {}),
    });
  });
  asList(raw.judgments).forEach((j) => {
    const seq = Number(j.seq);
    entries.push({
      id: `judge-${text(j.seq)}`,
      ts: text(j.at),
      type: 'judgment',
      label: text(j.summary) || '判断',
      ...(Number.isFinite(seq) ? { seq } : {}),
    });
  });
  asList(raw.notes).forEach((n) => {
    const seq = Number(n.seq);
    entries.push({
      id: `note-${text(n.seq)}`,
      ts: text(n.at),
      type: 'note',
      label: text(n.text),
      ...(Number.isFinite(seq) ? { seq } : {}),
    });
  });
  // 只有 judgment/note 带 seq，证据条目不带，跨类型只能用 at 排序；
  // 时间戳相同（内核批量落账）时 sort 稳定，保持记录原有顺序。
  return entries.sort((a, b) => {
    if (a.ts === b.ts) return 0;
    return a.ts < b.ts ? -1 : 1;
  });
}

function toEvidenceBundle(raw: Record<string, unknown>): EvidenceBundle {
  return {
    task_id: text(raw.task_id),
    evidence: asList(raw.evidence).map(toEvidenceItem),
    conclusions: asList(raw.conclusions).map(toConclusion),
    trace: toTraceEntries(raw),
  };
}

/** 审计包内已知产物的可读类别；未知名字回落为通用标签，不假装认识 */
const EXPORT_LABELS: Record<string, string> = {
  'run/report.md': '报告',
  'run/ledger.jsonl': '证据账本',
  'run/state.json': '运行状态',
  'run/report_gate.json': '报告门禁结论',
  'run/events.json': '归一事件',
  'run/conclusions.json': '结论与证据绑定',
  'verify.py': '校验脚本',
  'manifest.json': '清单',
  'report.md': '报告',
};

function splitExportContents(header: string | null): ExportManifestItem[] {
  if (!header) return [];
  return header
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
    .map((name) => ({ name, kind: EXPORT_LABELS[name] ?? '产物', verified: true }));
}

function toEnvelope(
  taskId: string,
  name: SseEventName,
  msg: MessageEvent<string>,
): SseEnvelope | null {
  let data: Record<string, unknown>;
  try {
    data = msg.data ? (JSON.parse(msg.data) as Record<string, unknown>) : {};
  } catch {
    return null;
  }
  const seq = Number(msg.lastEventId ?? data.seq ?? 0);
  return {
    seq: Number.isFinite(seq) ? seq : 0,
    ts: typeof data.ts === 'string' ? data.ts : new Date().toISOString(),
    task_id: taskId,
    event: name,
    data: normalizeEventData(name, data),
  } as unknown as SseEnvelope;
}

/** AGH 侧工具状态（events/model.ts：running|ok|error）→ 前端 ToolCall.status */
const TOOL_STATUS: Record<string, 'running' | 'done' | 'warn' | 'failed'> = {
  running: 'running',
  ok: 'done',
  error: 'failed',
};

/** 结构化的事件字段转成可读文本；字符串原样保留，对象按缩进 JSON 展示（实测单帧 ≤2.3KB） */
function toText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  try {
    return JSON.stringify(v, null, 2) ?? String(v);
  } catch {
    return String(v);
  }
}

/**
 * 后端事件体与前端事件类型"同名不同型"（apps/bff/src/events/model.ts RelayEvent）：
 * tool.input/output 是对象（AGH 的 args / structured）、status 是 running|ok|error、
 * sources_status 是 map、message.status 是 running|done。
 * 只转形状与词表，不补造字段：对象序列化为文本，未知状态归入 warn（既不谎报成功也不谎报失败）。
 * 不做的后果实测过：<pre>{对象}</pre> 直接抛错并把整棵 React 树卸掉。
 */
function normalizeEventData(
  name: SseEventName,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (name === 'tool') {
    const out: Record<string, unknown> = {
      ...data,
      status: TOOL_STATUS[text(data.status)] ?? 'warn',
    };
    if ('input' in data) out.input = toText(data.input);
    if ('output' in data) out.output = toText(data.output);
    const sources = data.sources_status;
    if (sources && typeof sources === 'object' && !Array.isArray(sources)) {
      // 内核本轮未产出该字段，取值集合无实测样本：原样透传字符串，
      // 界面只按 `!== 'ok'` 判灰（ToolCard），不假造 ok/skipped/unavailable 三态。
      out.sources_status = Object.entries(sources as Record<string, unknown>).map(
        ([source, status]) => ({ source, status: toText(status) }),
      );
    }
    return out;
  }
  if (name === 'message') {
    // 后端词表是 assistant|user（events/model.ts）与 running|done，
    // 前端联合类型是 agent|user（types.ts）与 streaming|done：两个字段都要过词表，
    // 否则 'assistant' 会带着类型外的值进入 store（当前只有 MessageList 的
    // `!== 'user'` 分支恰好兜住，任何按 'agent' 判断的新代码都会静默失效）。
    return {
      ...data,
      role: data.role === 'assistant' ? 'agent' : data.role,
      status: data.status === 'running' ? 'streaming' : data.status,
    };
  }
  if (name === 'activity' && data.detail !== undefined) {
    return { ...data, detail: toText(data.detail) };
  }
  return data;
}
