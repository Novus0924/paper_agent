import { env, type ApiMode } from '@/config/env';
import type {
  CreateTaskInput,
  CreateTaskResponse,
  EvidenceBundle,
  ExportKind,
  ExportResult,
  HealthInfo,
  ReportResponse,
  SendResult,
  SseEnvelope,
  SourcePreflight,
  TaskSnapshot,
} from './types';

export type ConnectionState = 'online' | 'reconnecting' | 'offline';
export type Unsubscribe = () => void;

export interface SubscribeHandlers {
  onEvent: (evt: SseEnvelope) => void;
  onConnection?: (state: ConnectionState) => void;
}

/** 视图与 store 只依赖该接口；切换 Mock/Live 不改视图代码（§6.3） */
export interface ApiClient {
  readonly mode: ApiMode;
  health(): Promise<HealthInfo>;
  listTasks(): Promise<TaskSnapshot[]>;
  getTask(taskId: string): Promise<TaskSnapshot>;
  preflight(
    input: Pick<CreateTaskInput, 'sources' | 'lit_source'>,
  ): Promise<SourcePreflight[]>;
  createTask(input: CreateTaskInput): Promise<CreateTaskResponse>;
  runAll(taskId: string): Promise<void>;
  resumeTask(taskId: string, fromStep?: string): Promise<void>;
  subscribe(taskId: string, handlers: SubscribeHandlers): Unsubscribe;
  getReport(taskId: string): Promise<ReportResponse>;
  getEvidence(taskId: string): Promise<EvidenceBundle>;
  cite(
    taskId: string,
    evId: string,
  ): Promise<{ ev_id: string; ref: string; detail: string }>;
  sendMessage(
    taskId: string,
    text: string,
    action: 'ask' | 'revise',
  ): Promise<SendResult>;
  sendNow(taskId: string, turnId: string): Promise<void>;
  removeQueued(taskId: string, turnId: string): Promise<void>;
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
