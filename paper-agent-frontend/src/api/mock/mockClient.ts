import type { ApiClient, ListTasksParams, SubscribeHandlers } from '../client';
import type {
  ArchiveResult,
  CreateTaskInput,
  CreateTaskResponse,
  EvidenceBundle,
  ExportKind,
  ExportResult,
  HealthInfo,
  LibraryEvidenceResponse,
  ListLibraryParams,
  MessageQueueResponse,
  ReportResponse,
  SendResult,
  SourcePreflight,
  StopResult,
  TaskSnapshot,
} from '../types';
import { mockPreflight, SOURCES } from './fixtures';
import { MockRuntime } from './runtime';
import { ApiError } from '../errors';

/** 演示数据适配器（FE-12）：与 Live 同接口、同 DTO 形状；Live 跑通后整个 mock/ 目录可以删掉 */
export class MockApiClient implements ApiClient {
  readonly mode = 'mock' as const;
  private static instance: MockApiClient | null = null;
  private runtime: MockRuntime;

  private constructor(runtime: MockRuntime) {
    this.runtime = runtime;
  }

  static shared(): MockApiClient {
    if (!MockApiClient.instance) {
      MockApiClient.instance = new MockApiClient(new MockRuntime());
    }
    return MockApiClient.instance;
  }

  /** 单测里需要干净的运行时，避免 localStorage 串扰 */
  static withRuntime(runtime: MockRuntime): MockApiClient {
    return new MockApiClient(runtime);
  }

  async health(): Promise<HealthInfo> {
    return this.runtime.health();
  }

  async listTasks(params?: ListTasksParams): Promise<TaskSnapshot[]> {
    return this.runtime.list(params);
  }

  async archiveTask(taskId: string, archived: boolean): Promise<ArchiveResult> {
    return this.runtime.archive(taskId, archived);
  }

  async getTask(taskId: string): Promise<TaskSnapshot> {
    const snapshot = this.runtime.get(taskId);
    if (!snapshot) throw new ApiError('NOT_FOUND');
    return snapshot;
  }

  async preflight(input: Pick<CreateTaskInput, 'sources'>): Promise<SourcePreflight[]> {
    // 模拟真实探测耗时
    await new Promise((r) => setTimeout(r, 420));
    const known = new Set(SOURCES.map((s) => s.name));
    return mockPreflight(input.sources.filter((s) => known.has(s)));
  }

  async createTask(input: CreateTaskInput): Promise<CreateTaskResponse> {
    const goal = input.goal.trim();
    if (goal.length === 0) throw new ApiError('BAD_GOAL');
    if (goal.length > 8192) throw new ApiError('BAD_GOAL');
    const { task_id, session_id, state } = this.runtime.createTask({
      goal,
      workflow: input.workflow,
      sources: input.sources,
    });
    const preflights = mockPreflight(input.sources);
    return {
      task_id,
      session_id,
      state,
      preflight: {
        sources: Object.fromEntries(
          preflights.map((p) => [p.source, p.ok ? 'ok' : (p.detail ?? 'unavailable')]),
        ),
      },
    };
  }

  async runAll(taskId: string): Promise<void> {
    this.runtime.startRun(taskId);
  }

  async resumeTask(taskId: string, fromStep?: string): Promise<void> {
    this.runtime.resume(taskId, fromStep);
  }

  async stopTask(taskId: string): Promise<StopResult> {
    return this.runtime.stop(taskId);
  }

  subscribe(taskId: string, handlers: SubscribeHandlers) {
    return this.runtime.subscribe(taskId, handlers.onEvent, handlers.onConnection);
  }

  async getReport(taskId: string): Promise<ReportResponse> {
    return this.runtime.report(taskId);
  }

  async getEvidence(taskId: string): Promise<EvidenceBundle> {
    return this.runtime.evidence(taskId);
  }

  async listLibraryEvidence(
    params?: ListLibraryParams,
  ): Promise<LibraryEvidenceResponse> {
    // 与 Live 一致地留一点网络耗时：加载骨架才有机会被看到（也让"防抖 + 异步"路径可测）
    await new Promise((r) => setTimeout(r, 60));
    return this.runtime.library(params);
  }

  async cite(taskId: string, evId: string) {
    const bundle = this.runtime.evidence(taskId);
    const item = bundle.evidence.find((e) => e.ev_id === evId);
    if (!item) throw new ApiError('NOT_FOUND');
    return {
      ev_id: item.ev_id,
      ref: item.ref,
      detail: `${item.title}${item.authors ? ` · ${item.authors}` : ''}${item.year ? ` · ${item.year}` : ''}`,
    };
  }

  async sendMessage(
    taskId: string,
    text: string,
    action: 'ask' | 'revise',
  ): Promise<SendResult> {
    if (text.trim().length === 0) throw new ApiError('BAD_BODY');
    return this.runtime.sendMessage(taskId, text.trim(), action);
  }

  async sendNow(taskId: string, turnId: string): Promise<void> {
    this.runtime.sendNow(taskId, turnId);
  }

  async listMessages(taskId: string): Promise<MessageQueueResponse> {
    return this.runtime.listMessages(taskId);
  }

  async downloadReportMd(taskId: string): Promise<ExportResult> {
    await new Promise((r) => setTimeout(r, 150));
    return this.runtime.downloadReportMd(taskId);
  }

  async removeQueued(taskId: string, turnId: string): Promise<void> {
    this.runtime.removeQueued(taskId, turnId);
  }

  async exportArtifact(taskId: string, kind: ExportKind): Promise<ExportResult> {
    await new Promise((r) => setTimeout(r, 260));
    return this.runtime.export(taskId, kind);
  }

  demo = {
    supports: true as const,
    dropConnection: (taskId: string) => this.runtime.simulateConnectionDrop(taskId),
    restoreConnection: (taskId: string) => this.runtime.simulateConnectionRestore(taskId),
    setSpeed: (speed: number) => this.runtime.setSpeed(speed),
    reset: () => this.runtime.reset(),
  };
}
