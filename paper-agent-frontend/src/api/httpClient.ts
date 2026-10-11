import { parseErrorBody, toApiError } from './errors';
import type { ApiClient, SubscribeHandlers } from './client';
import type {
  CreateTaskInput,
  CreateTaskResponse,
  EvidenceBundle,
  ExportKind,
  ExportManifestItem,
  ExportResult,
  HealthInfo,
  ReportResponse,
  SseEnvelope,
  SseEventName,
  SendResult,
  SourcePreflight,
  TaskSnapshot,
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
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
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

  listTasks(): Promise<TaskSnapshot[]> {
    return this.request<TaskSnapshot[]>('/tasks');
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

  getEvidence(taskId: string): Promise<EvidenceBundle> {
    return this.request<EvidenceBundle>(`/tasks/${encodeURIComponent(taskId)}/evidence`);
  }

  async cite(
    taskId: string,
    evId: string,
  ): Promise<{ ev_id: string; ref: string; detail: string }> {
    const res = await this.request<Record<string, unknown>>(
      `/tasks/${encodeURIComponent(taskId)}/cite?ev=${encodeURIComponent(evId)}`,
    );
    return {
      ev_id: String(res.ev_id ?? evId),
      ref: String(res.ref ?? res.doi ?? '—'),
      detail: String(res.detail ?? res.title ?? JSON.stringify(res)),
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

  async removeQueued(taskId: string, turnId: string): Promise<void> {
    await this.request<void>(
      `/tasks/${encodeURIComponent(taskId)}/messages/${encodeURIComponent(turnId)}`,
      {
        method: 'DELETE',
      },
    );
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
    data,
  } as unknown as SseEnvelope;
}
