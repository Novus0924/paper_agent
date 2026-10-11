import { env, type ApiMode } from '@/config/env';
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
  RunStatus,
  SendResult,
  SseEnvelope,
  SourcePreflight,
  StopResult,
  TaskSnapshot,
} from './types';

export type ConnectionState = 'online' | 'reconnecting' | 'offline';
export type Unsubscribe = () => void;

/** GET /tasks 的过滤参数：status 取 RunStatus 词表；archived 缺省 false（只看活跃） */
export interface ListTasksParams {
  status?: RunStatus;
  archived?: 'false' | 'true' | 'all';
}

export interface SubscribeHandlers {
  onEvent: (evt: SseEnvelope) => void;
  onConnection?: (state: ConnectionState) => void;
}

/** 视图与 store 只依赖该接口；切换 Mock/Live 不改视图代码（§6.3） */
export interface ApiClient {
  readonly mode: ApiMode;
  health(): Promise<HealthInfo>;
  listTasks(params?: ListTasksParams): Promise<TaskSnapshot[]>;
  /** 归档 / 恢复（archived=false）；运行中任务后端拒绝（409 BAD_STATE） */
  archiveTask(taskId: string, archived: boolean): Promise<ArchiveResult>;
  getTask(taskId: string): Promise<TaskSnapshot>;
  preflight(
    input: Pick<CreateTaskInput, 'sources' | 'lit_source'>,
  ): Promise<SourcePreflight[]>;
  createTask(input: CreateTaskInput): Promise<CreateTaskResponse>;
  runAll(taskId: string): Promise<void>;
  resumeTask(taskId: string, fromStep?: string): Promise<void>;
  /** 请求停止执行（终态以实际为准；运行中停止 → FAILED + CANCELLED，剩余步骤可 resume） */
  stopTask(taskId: string): Promise<StopResult>;
  subscribe(taskId: string, handlers: SubscribeHandlers): Unsubscribe;
  getReport(taskId: string): Promise<ReportResponse>;
  getEvidence(taskId: string): Promise<EvidenceBundle>;
  /**
   * 文献库：跨任务汇总证据（GET /library/evidence）。
   * 与任务内证据页不同，这里扫描全部任务、按 DOI 可选去重，供全局检索。
   */
  listLibraryEvidence(params?: ListLibraryParams): Promise<LibraryEvidenceResponse>;
  cite(
    taskId: string,
    evId: string,
  ): Promise<{ ev_id: string; ref: string; detail: string }>;
  sendMessage(
    taskId: string,
    text: string,
    action: 'ask' | 'revise',
  ): Promise<SendResult>;
  /** 查询队列与历史消息（刷新/重连后恢复"待发 N 条"与已发送记录） */
  listMessages(taskId: string): Promise<MessageQueueResponse>;
  /**
   * 「立即发送」：仅 mock 提供。后端契约无强制投递口（运行中消息按序排队、
   * 回合结束自动放行），live 不提供伪实现，界面据此不显示该按钮。
   */
  sendNow?(taskId: string, turnId: string): Promise<void>;
  removeQueued(taskId: string, turnId: string): Promise<void>;
  /** 直接下载报告 Markdown 原始文件（GET /tasks/{id}/report.md，文件名 {task_id}.md） */
  downloadReportMd(taskId: string): Promise<ExportResult>;
  exportArtifact(taskId: string, kind: ExportKind): Promise<ExportResult>;
  /** 演示辅助（仅 mock 模式提供实现）：模拟断线 / 快进 / 重置 */
  demo?: {
    supports: true;
    dropConnection(taskId: string): void;
    restoreConnection(taskId: string): void;
    setSpeed(speed: number): void;
    reset(): void;
  };
}

import { LiveApiClient } from './httpClient';
import { MockApiClient } from './mock/mockClient';

/** 唯一决定数据来源模式的地方：视图与 store 只依赖 ApiClient 接口 */
export const api: ApiClient =
  env.apiMode === 'live' ? new LiveApiClient(env.apiBaseUrl) : MockApiClient.shared();
