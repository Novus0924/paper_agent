import { create } from 'zustand';
import { api, type ConnectionState } from '@/api/client';
import { toApiError } from '@/api/errors';
import type { ApiError } from '@/api/errors';
import { applyEnvelope, emptyRuntime, type TaskRuntimeState } from '@/api/normalize';
import type {
  CreateTaskInput,
  EvidenceBundle,
  ExportKind,
  ExportResult,
  ReportResponse,
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

interface TaskStoreState {
  tasks: TaskSnapshot[];
  listLoading: boolean;
  listError: string | null;
  byId: Record<string, TaskEntry>;
  preflight: SourcePreflight[] | null;
  preflightLoading: boolean;

  loadTasks: () => Promise<void>;
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
  reloadReport: (taskId: string) => Promise<void>;
  reloadEvidence: (taskId: string) => Promise<void>;
  sendMessage: (taskId: string, text: string, action: 'ask' | 'revise') => Promise<void>;
  sendNow: (taskId: string, turnId: string) => Promise<void>;
  removeQueued: (taskId: string, turnId: string) => Promise<void>;
  exportArtifact: (taskId: string, kind: ExportKind) => Promise<ExportResult>;
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
  byId: {},
  preflight: null,
  preflightLoading: false,

  async loadTasks() {
    set({ listLoading: true, listError: null });
    try {
      const tasks = await api.listTasks();
      set({ tasks, listLoading: false });
    } catch (err) {
      set({ listLoading: false, listError: toApiError(err).code });
    }
  },

  async checkPreflight(input) {
    set({ preflightLoading: true });
    try {
      const preflight = await api.preflight(input);
      set({ preflight, preflightLoading: false });
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
      set((s) => ({
        byId: { ...s.byId, [res.task_id]: blankEntry(res.state) },
        tasks: [res.state, ...s.tasks],
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
        return {
          byId: {
            ...s.byId,
            [taskId]: {
              ...cur,
              messages: cur.messages.map((m) =>
                m.id === optimistic.id
                  ? {
                      ...m,
                      status: res.queued ? 'queued' : 'done',
                      turn_id: res.turn_id ?? m.turn_id,
                      id: `${res.turn_id ?? turnId}-user`,
                      queued_order: res.order,
                    }
                  : m,
              ),
            },
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

  async exportArtifact(taskId, kind) {
    try {
      return await api.exportArtifact(taskId, kind);
    } catch (err) {
      const e = toApiError(err);
      return { ok: false, kind, code: e.code, error: e.message };
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
