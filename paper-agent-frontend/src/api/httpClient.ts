import { parseErrorBody, toApiError } from './errors';
import type { ApiClient, SubscribeHandlers } from './client';
import type {
  CreateTaskInput,
  CreateTaskResponse,
  EvidenceBundle,
  ExportKind,
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
      const reachable = true;
      return {
        status: raw.status === 'ok' ? 'ok' : 'degraded',
        mode: 'live',
        version: typeof raw.version === 'string' ? raw.version : undefined,
        task_count: typeof raw.tasks === 'number' ? raw.tasks : 0,
        session_ready: Boolean(raw.session ?? raw.plugin),
        bff_reachable: reachable,
        model: typeof raw.model === 'string' ? raw.model : undefined,
        issues: Array.isArray(raw.issues)
          ? (raw.issues as HealthInfo['issues'])
          : raw.status === 'ok'
            ? []
            : [
                {
                  id: 'bff-degraded',
                  title: '后端自检报告存在待处理项',
                  guidance: '请运行一键启动器的 doctor 自检，按提示补齐缺失依赖或配置。',
                  blocking: false,
                },
              ],
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
   * 契约缺口：后端 §8.1 未提供独立预检接口，预检结果随创建任务返回。
   * 这里探测扩展点，缺失时返回"待创建时确认"，界面据此给出可读说明而不是假数据。
   */
  async preflight(input: Pick<CreateTaskInput, 'sources'>): Promise<SourcePreflight[]> {
    try {
      const res = await this.request<{ sources?: Record<string, string> }>(
        '/sources/preflight',
        { method: 'POST', body: JSON.stringify({ sources: input.sources }) },
      );
      return input.sources.map((s) => {
        const detail = res.sources?.[s] ?? 'unknown';
        return { source: s, ok: detail === 'ok', detail };
      });
    } catch {
      return input.sources.map((s) => ({
        source: s,
        ok: true,
        detail: 'pending:创建任务时返回真实预检结果',
      }));
    }
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
   * 「立即发送」映射：后端无专用端点，按契约用 stop（请求停止）+ 发送该条实现。
   * 停止后终态以实际状态为准，因此这里不假设一定成功。
   */
  async sendNow(taskId: string, turnId: string): Promise<void> {
    const queued = await this.request<SendResult>(
      `/tasks/${encodeURIComponent(taskId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'flush', turn_id: turnId }),
      },
    ).catch(() => null);
    if (queued) return;
    await this.request<void>(`/tasks/${encodeURIComponent(taskId)}/stop`, {
      method: 'POST',
    });
  }

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
    };
  }
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
