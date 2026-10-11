import { create } from 'zustand';
import { api, type ConnectionState, type ListTasksParams } from '@/api/client';
import { toApiError } from '@/api/errors';
import type { ApiError } from '@/api/errors';
import { applyEnvelope, emptyRuntime, type TaskRuntimeState } from '@/api/normalize';
import { isRunning } from '@/lib/status';
import type {
  CreateTaskInput,
  EvidenceBundle,
  ExportKind,
  ExportResult,
  MessageStatus,
  ReportResponse,
  SourceName,
  SourcePreflight,
  SseEnvelope,
  TaskSnapshot,
} from '@/api/types';
import { useToastStore } from './toastStore';

interface TaskEntry extends TaskRuntimeState {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  connection: ConnectionState;
  /** 打开任务时未收到事件的说明（如任务不存在） */
  notFound?: boolean;
  evidence: EvidenceBundle | null;
  report: ReportResponse | null;
  /** 报告/证据刷新时间戳，用于"报告必达"重试提示 */
  lastFetchedAt: number | null;
}

const blankEntry = (snapshot: TaskSnapshot | null = null): TaskEntry => ({
  ...emptyRuntime(snapshot),
  loaded: false,
  loading: false,
  error: null,
  connection: 'online',
  evidence: null,
  report: null,
  lastFetchedAt: null,
});

/**
 * 后端预检值形如 'ok' | 'unavailable:HTTP 429'（services/preflight.ts probeSources）。
 * 它只给状态串、不给延迟，所以 ok 项不编造 latency_ms。
 */
function toSourcePreflight(sources: Record<string, string> | undefined): SourcePreflight[] {
  if (!sources) return [];
  return Object.entries(sources).map(([source, detail]) => ({
    source: source as SourceName,
    ok: detail === 'ok',
    ...(detail === 'ok' ? {} : { detail }),
  }));
}

/** 状态过滤 chips 的计数徽章数据源：只在"全量活跃"响应时更新 */
export interface TaskListCounts {
  all: number;
  running: number;
  done: number;
  failed: number;
  degraded: number;
}

interface TaskStoreState {
  tasks: TaskSnapshot[];
  listLoading: boolean;
  listError: string | null;
  /** 当前列表视图参数（状态 chips + 归档视图），由 OverviewPage 的 URL query 驱动 */
  listParams: ListTasksParams & { degraded?: boolean };
  listCounts: TaskListCounts | null;
  byId: Record<string, TaskEntry>;
  preflight: SourcePreflight[] | null;
  preflightLoading: boolean;

  loadTasks: (params?: ListTasksParams & { degraded?: boolean }) => Promise<void>;
  archiveTask: (taskId: string, archived: boolean) => Promise<boolean>;
  checkPreflight: (
    input: Pick<CreateTaskInput, 'sources' | 'lit_source'>,
  ) => Promise<SourcePreflight[]>;
  createTask: (
    input: CreateTaskInput,
  ) => Promise<{ ok: true; taskId: string } | { ok: false; error: ApiError }>;
  openTask: (taskId: string) => Promise<void>;
  closeTask: (taskId: string) => void;
  applyEvent: (taskId: string, evt: SseEnvelope) => void;
  setConnection: (taskId: string, state: ConnectionState) => void;
  startRun: (taskId: string) => Promise<void>;
  resumeTask: (taskId: string, fromStep?: string) => Promise<void>;
  stopTask: (taskId: string) => Promise<void>;
  reloadReport: (taskId: string) => Promise<void>;
  reloadEvidence: (taskId: string) => Promise<void>;
  sendMessage: (taskId: string, text: string, action: 'ask' | 'revise') => Promise<void>;
  sendNow: (taskId: string, turnId: string) => Promise<void>;
  removeQueued: (taskId: string, turnId: string) => Promise<void>;
  /** 从后端消息队列恢复排队/历史消息（刷新、重连后调用） */
  restoreMessages: (taskId: string) => Promise<void>;
  exportArtifact: (taskId: string, kind: ExportKind) => Promise<ExportResult>;
  downloadReportMd: (taskId: string) => Promise<ExportResult>;
  dropConnection: (taskId: string) => void;
  restoreConnection: (taskId: string) => void;
}

/** 订阅句柄放在模块作用域：store 状态保持可序列化，便于测试与时间旅行 */
const subscriptions = new Map<string, () => void>();
const pendingTimers = new Map<string, number>();

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  listLoading: false,
  listError: null,
  listParams: {},
  listCounts: null,
  byId: {},
  preflight: null,
  preflightLoading: false,

  async loadTasks(params) {
    // "已降级"是前端特有视图（后端 ?status= 不支持 degraded）：全量拉取后客户端过滤
    const next = params ?? get().listParams;
    const wired: ListTasksParams = { status: next.status, archived: next.archived };
    set({
      listLoading: true,
      listError: null,
      ...(params ? { listParams: next } : {}),
    });
    try {
      const res = await api.listTasks(wired);
      const tasks = next.degraded ? res.filter((t) => t.degraded) : res;
      const isFullActiveScan = !next.status && !next.degraded && next.archived !== 'true';
      const counts: TaskListCounts = isFullActiveScan
        ? {
            all: res.length,
            running: res.filter((t) => isRunning(t.run_status)).length,
            done: res.filter((t) => t.run_status === 'DONE').length,
            failed: res.filter((t) => t.run_status === 'FAILED').length,
            degraded: res.filter((t) => t.degraded).length,
          }
        : (get().listCounts ?? {
            all: res.length,
            running: res.filter((t) => isRunning(t.run_status)).length,
            done: res.filter((t) => t.run_status === 'DONE').length,
            failed: res.filter((t) => t.run_status === 'FAILED').length,
            degraded: res.filter((t) => t.degraded).length,
          });
      set({ tasks, listLoading: false, listCounts: counts });
    } catch (err) {
      set({ listLoading: false, listError: toApiError(err).code });
    }
  },

  async archiveTask(taskId, archived) {
    try {
      await api.archiveTask(taskId, archived);
      useToastStore
        .getState()
        .push(archived ? 'overview.archivedDone' : 'overview.restoredDone', 'ok');
      await get().loadTasks();
      return true;
    } catch (err) {
      useToastStore.getState().pushError(toApiError(err));
      return false;
    }
  },

  async checkPreflight(input) {
    set({ preflightLoading: true });
    try {
      const preflight = await api.preflight(input);
      // live 模式后端无独立预检接口，返回空集：如实回到"未检测"，不显示伪造结果
      set({ preflight: preflight.length > 0 ? preflight : null, preflightLoading: false });
      return preflight;
    } catch (err) {
      set({ preflightLoading: false, listError: toApiError(err).code });
      return [];
    }
  },

  async createTask(input) {
    try {
      const res = await api.createTask(input);
      // 创建即建立会话并开始执行（监控页自动订阅）
      await api.runAll(res.task_id);
      // 真实预检结果随创建任务返回（后端 routes/v1/tasks.ts），回填后界面显示的是实测值
      const probed = toSourcePreflight(res.preflight?.sources);
      set((s) => ({
        byId: { ...s.byId, [res.task_id]: blankEntry(res.state) },
        tasks: [res.state, ...s.tasks],
        ...(probed.length > 0 ? { preflight: probed } : {}),
      }));
      return { ok: true, taskId: res.task_id };
    } catch (err) {
      return { ok: false, error: toApiError(err) };
    }
  },

  async openTask(taskId) {
    const existing = get().byId[taskId];
    set((s) => ({
      byId: {
        ...s.byId,
        [taskId]: {
          ...(existing ?? blankEntry()),
          loading: true,
          error: null,
          notFound: false,
        },
      },
    }));

    try {
      // 先取快照，再订阅事件：刷新/重连与实时路径同形（§6.2）
      const snapshot = await api.getTask(taskId);
      set((s) => ({
        byId: {
          ...s.byId,
          [taskId]: {
            ...(s.byId[taskId] ?? blankEntry(snapshot)),
            snapshot,
            loading: false,
          },
        },
      }));
    } catch (err) {
      const e = toApiError(err);
      set((s) => ({
        byId: {
          ...s.byId,
          [taskId]: {
            ...(s.byId[taskId] ?? blankEntry()),
            loading: false,
            error: e.code,
            notFound: e.code === 'NOT_FOUND',
          },
        },
      }));
      return;
    }

    subscriptions.get(taskId)?.();
    const unsub = api.subscribe(taskId, {
      onEvent: (evt) => get().applyEvent(taskId, evt),
      onConnection: (state) => get().setConnection(taskId, state),
    });
    subscriptions.set(taskId, unsub);

    // 重复 openTask（断点续跑/回到同一路由）必须先撤掉上一轮的轮询，否则定时器会叠加
    const stale = pendingTimers.get(taskId);
    if (stale !== undefined) window.clearInterval(stale);

    // 打开时一次性取报告与证据：终态任务即使没收到 SSE 也能看到同一份报告
    await Promise.all([get().reloadReport(taskId), get().reloadEvidence(taskId)]);
    // 排队/历史消息从后端队列恢复（刷新后 Composer 的"待发 N 条"与后端对齐）
    await get().restoreMessages(taskId);

    // 运行中的任务需要持续刷新证据（新条目陆续登记）
    const timer = window.setInterval(() => {
      const entry = get().byId[taskId];
      if (!entry) return;
      if (
        entry.snapshot?.run_status === 'RUNNING' ||
        entry.connection === 'reconnecting'
      ) {
        void get().reloadReport(taskId);
        void get().reloadEvidence(taskId);
      }
    }, 6000);
    pendingTimers.set(taskId, timer);
  },

  closeTask(taskId) {
    subscriptions.get(taskId)?.();
    subscriptions.delete(taskId);
    const timer = pendingTimers.get(taskId);
    if (timer !== undefined) {
      window.clearInterval(timer);
      pendingTimers.delete(taskId);
    }
  },

  applyEvent(taskId, evt) {
    const before = get().byId[taskId] ?? blankEntry();
    const next = applyEnvelope(before, evt);
    if (next === before) return;
    const entry: TaskEntry = { ...before, ...next, loaded: true };
    set((s) => ({ byId: { ...s.byId, [taskId]: entry } }));

    // 事件驱动的按需取数：报告就绪、终态收敛
    if (evt.event === 'report' && evt.data.status === 'ready')
      void get().reloadReport(taskId);
    if (evt.event === 'done') {
      void get().reloadReport(taskId);
      void get().reloadEvidence(taskId);
      void get().loadTasks();
      const toast = useToastStore.getState().push;
      if (evt.data.run_status === 'DONE') {
        toast(
          entry.snapshot?.degraded ? 'toast.taskDegraded' : 'toast.taskDone',
          entry.snapshot?.degraded ? 'warn' : 'ok',
        );
      } else {
        toast('toast.taskFailed', 'fail');
      }
    }
    if (evt.event === 'degraded' && evt.data.level === 'degraded') {
      useToastStore.getState().push('status.degraded', 'warn');
    }
  },

  setConnection(taskId, state) {
    set((s) => {
      const entry = s.byId[taskId] ?? blankEntry();
      return { byId: { ...s.byId, [taskId]: { ...entry, connection: state } } };
    });
  },

  async startRun(taskId) {
    try {
      await api.runAll(taskId);
      await get().openTask(taskId);
    } catch (err) {
      useToastStore.getState().pushError(toApiError(err));
    }
  },

  async resumeTask(taskId, fromStep) {
    try {
      await api.resumeTask(taskId, fromStep);
      useToastStore.getState().push('monitor.reconnect', 'info');
      await get().openTask(taskId);
    } catch (err) {
      useToastStore.getState().pushError(toApiError(err));
    }
  },

  async stopTask(taskId) {
    try {
      const res = await api.stopTask(taskId);
      // 主动中止用警示色区分自然失败：剩余步骤保留，可断点续跑
      if (res.final_state === 'CANCELLED')
        useToastStore.getState().push('monitor.stopped', 'warn');
      await get().openTask(taskId);
    } catch (err) {
      useToastStore.getState().pushError(toApiError(err));
    }
  },

  async reloadReport(taskId) {
    try {
      const report = await api.getReport(taskId);
      set((s) => {
        const entry = s.byId[taskId] ?? blankEntry();
        return {
          byId: { ...s.byId, [taskId]: { ...entry, report, lastFetchedAt: Date.now() } },
        };
      });
    } catch (err) {
      const e = toApiError(err);
      if (e.code === 'NO_REPORT' || e.code === 'NOT_READY') return;
      set((s) => {
        const entry = s.byId[taskId] ?? blankEntry();
        return { byId: { ...s.byId, [taskId]: { ...entry, error: e.code } } };
      });
    }
  },

  async reloadEvidence(taskId) {
    try {
      const evidence = await api.getEvidence(taskId);
      set((s) => {
        const entry = s.byId[taskId] ?? blankEntry();
        return { byId: { ...s.byId, [taskId]: { ...entry, evidence } } };
      });
    } catch {
      set((s) => {
        const entry = s.byId[taskId] ?? blankEntry();
        return { byId: { ...s.byId, [taskId]: { ...entry, evidence: null } } };
      });
    }
  },

  async sendMessage(taskId, text, action) {
    const entry = get().byId[taskId] ?? blankEntry();
    const turnId = `local-${Math.random().toString(36).slice(2, 9)}`;
    // 乐观显示：先落一条 sending 的用户消息，失败时保留内容并给出重试
    const optimistic: TaskRuntimeState['messages'][number] = {
      id: `${turnId}-user`,
      turn_id: turnId,
      role: 'user',
      text,
      status: 'sending',
      ts: new Date().toISOString(),
      seq: (entry.lastSeq ?? 0) + 1,
    };
    set((s) => ({
      byId: {
        ...s.byId,
        [taskId]: {
          ...(s.byId[taskId] ?? blankEntry()),
          messages: [...entry.messages, optimistic],
        },
      },
    }));

    try {
      const res = await api.sendMessage(taskId, text, action);
      if (res.queued) {
        useToastStore.getState().push('composer.queued', 'info');
      }
      set((s) => {
        const cur = s.byId[taskId] ?? blankEntry();
        // SSE user 帧可能先于 HTTP 回包到达（服务端投递开始即广播），
        // 此时权威 id（turn-user）已存在于列表；若仍把乐观条目改写成该 id
        // 会出现重复 → React duplicate key。已存在则丢弃乐观条目即可。
        const canonicalId = `${res.turn_id ?? turnId}-user`;
        const nextStatus: MessageStatus = res.queued ? 'queued' : 'done';
        const withoutOptimistic = cur.messages.filter((m) => m.id !== optimistic.id);
        const messages = withoutOptimistic.some((m) => m.id === canonicalId)
          ? withoutOptimistic
          : cur.messages.map((m) =>
              m.id === optimistic.id
                ? {
                    ...m,
                    status: nextStatus,
                    turn_id: res.turn_id ?? m.turn_id,
                    id: canonicalId,
                    queued_order: res.order,
                  }
                : m,
            );
        return {
          byId: {
            ...s.byId,
            [taskId]: { ...cur, messages },
          },
        };
      });
    } catch (err) {
      const e = toApiError(err);
      set((s) => {
        const cur = s.byId[taskId] ?? blankEntry();
        return {
          byId: {
            ...s.byId,
            [taskId]: {
              ...cur,
              messages: cur.messages.map((m) =>
                m.id === optimistic.id ? { ...m, status: 'failed', error: e.code } : m,
              ),
            },
          },
        };
      });
      useToastStore.getState().pushError(e);
    }
  },

  async sendNow(taskId, turnId) {
    // live 模式不提供该能力（见 ApiClient.sendNow 注释）；界面此时也不会渲染此按钮
    if (!api.sendNow) return;
    try {
      await api.sendNow(taskId, turnId);
    } catch (err) {
      useToastStore.getState().pushError(toApiError(err));
    }
  },

  async removeQueued(taskId, turnId) {
    try {
      await api.removeQueued(taskId, turnId);
      set((s) => {
        const cur = s.byId[taskId] ?? blankEntry();
        return {
          byId: {
            ...s.byId,
            [taskId]: {
              ...cur,
              messages: cur.messages.filter(
                (m) => !(m.turn_id === turnId && m.status === 'queued'),
              ),
            },
          },
        };
      });
    } catch (err) {
      useToastStore.getState().pushError(toApiError(err));
    }
  },

  async restoreMessages(taskId) {
    try {
      const res = await api.listMessages(taskId);
      set((s) => {
        const cur = s.byId[taskId];
        if (!cur) return {};
        const restored: TaskRuntimeState['messages'][number][] = [];
        for (const m of [...(res.active ? [res.active] : []), ...res.pending, ...res.history]) {
          restored.push({
            // 与 SSE message 帧同键（turn_id-role），幂等合并靠它去重
            id: `${m.turn_id}-user`,
            turn_id: m.turn_id,
            role: 'user',
            text: m.text,
            status:
              m.status === 'queued'
                ? 'queued'
                : m.status === 'running'
                  ? 'sending'
                  : m.status === 'failed'
                    ? 'failed'
                    : 'done',
            queued_order: m.status === 'queued' ? m.order : undefined,
            ts: m.queued_at,
            seq: m.order,
            ...(m.error ? { error: m.error } : {}),
          });
        }
        // 只补缺不覆盖：实时路径已落库的消息（含乐观发送）优先，历史不重复显示
        const seen = new Set(cur.messages.map((m) => m.id));
        const messages = [...cur.messages, ...restored.filter((m) => !seen.has(m.id))].sort(
          (a, b) => (a.seq ?? 0) - (b.seq ?? 0),
        );
        return { byId: { ...s.byId, [taskId]: { ...cur, messages } } };
      });
    } catch {
      // 队列恢复失败不打断任务页：后续 SSE / 重连仍会补齐
    }
  },

  async exportArtifact(taskId, kind) {
    try {
      return await api.exportArtifact(taskId, kind);
    } catch (err) {
      const e = toApiError(err);
      return { ok: false, kind, code: e.code, error: e.message };
    }
  },

  async downloadReportMd(taskId) {
    try {
      return await api.downloadReportMd(taskId);
    } catch (err) {
      const e = toApiError(err);
      return { ok: false, kind: 'report', code: e.code, error: e.message };
    }
  },

  dropConnection(taskId) {
    api.demo?.dropConnection(taskId);
  },

  restoreConnection(taskId) {
    api.demo?.restoreConnection(taskId);
  },
}));

/** 仅供单测：清理模块级订阅，避免用例串扰 */
export function __resetTaskSubscriptions(): void {
  subscriptions.forEach((u) => u());
  subscriptions.clear();
  pendingTimers.forEach((t) => window.clearInterval(t));
  pendingTimers.clear();
}

export function entryOf(taskId: string | undefined): TaskEntry | undefined {
  return taskId ? useTaskStore.getState().byId[taskId] : undefined;
}
