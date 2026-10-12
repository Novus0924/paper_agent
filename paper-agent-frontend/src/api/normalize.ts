import type {
  Activity,
  ChatMessage,
  Conclusion,
  DegradedInfo,
  DoneEvent,
  SseEnvelope,
  Step,
  TaskSnapshot,
  ToolCall,
} from './types';

/**
 * 一条按 step 聚合后的思考流条目（SSE `thinking`）。
 * 同一步的多帧思考累加去重为一条，供时间线整体渲染；时间序仍由 seq/ts 决定。
 */
export interface ThinkingEntry {
  /** `think-<step>`：同一步只有一条，随帧累加 */
  id: string;
  step?: string;
  text: string;
  ts: string;
  seq?: number;
}

/**
 * SSE 归一层（§6.2）：把后端事件统一映射为前端状态动作。
 * 实时路径与刷新后的快照重建走同一个 reducer，因此形状必然一致（P-03 旧缺陷消除）。
 */
export interface TaskRuntimeState {
  snapshot: TaskSnapshot | null;
  lastSeq: number;
  activities: Activity[];
  tools: ToolCall[];
  thinkings: ThinkingEntry[];
  degraded: DegradedInfo[];
  conclusions: Conclusion[];
  messages: ChatMessage[];
  reportStatus: 'unknown' | 'generating' | 'ready';
  done: DoneEvent | null;
}

export const emptyRuntime = (snapshot: TaskSnapshot | null = null): TaskRuntimeState => ({
  snapshot,
  lastSeq: 0,
  activities: [],
  tools: [],
  thinkings: [],
  degraded: [],
  conclusions: [],
  messages: [],
  reportStatus: snapshot?.report_ready ? 'ready' : 'unknown',
  done: null,
});

/**
 * 思考片段拼接：整段重复丢弃；新帧是更完整的整段则覆盖；否则按行增量累加。
 * 契约允许 text 既可能是增量 token，也可能是整段（"增量或整段"）。
 */
export function appendThinking(prev: string, chunk: string): string {
  const next = chunk.trim();
  if (!next) return prev;
  if (!prev) return next;
  if (prev === next || prev.includes(next)) return prev;
  if (next.startsWith(prev)) return next;
  return `${prev}\n${next}`;
}

const mergeById = <T extends { id: string }>(list: T[], item: T): T[] => {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const next = list.slice();
  next[idx] = { ...next[idx], ...item };
  return next;
};

const bySeq = <T extends { seq?: number }>(a: T, b: T) => (a.seq ?? 0) - (b.seq ?? 0);

export function applyEnvelope(
  state: TaskRuntimeState,
  evt: SseEnvelope,
): TaskRuntimeState {
  // 幂等：已处理过的高序号或重复帧直接丢弃（§5.2 去重）
  if (evt.seq > 0 && evt.seq <= state.lastSeq) return state;
  const base: TaskRuntimeState = { ...state, lastSeq: Math.max(state.lastSeq, evt.seq) };

  switch (evt.event) {
    case 'ping':
      return base;

    case 'step': {
      const snapshot = base.snapshot;
      if (!snapshot) return base;
      const steps: Step[] = snapshot.steps.map((s) =>
        s.id === evt.data.step
          ? {
              ...s,
              status: evt.data.status,
              elapsed_ms: evt.data.elapsed_ms ?? s.elapsed_ms,
              error: evt.data.error ?? (evt.data.status === 'DONE' ? undefined : s.error),
              is_current: evt.data.status === 'RUNNING',
            }
          : { ...s, is_current: false },
      );
      const anyRunning = steps.some((s) => s.status === 'RUNNING');
      // 步骤失败即收敛为"未完成"；断点续跑后的 RUNNING/DONE 帧会重新推进
      const run_status =
        evt.data.status === 'FAILED'
          ? 'FAILED'
          : anyRunning || steps.some((s) => s.status === 'PENDING')
            ? 'RUNNING'
            : snapshot.run_status;
      return { ...base, snapshot: { ...snapshot, steps, run_status } };
    }

    case 'activity': {
      const activity: Activity = {
        id: `act-${evt.seq}`,
        seq: evt.seq,
        step: evt.data.step,
        human_message: evt.data.human_message,
        detail: evt.data.detail,
        ts: evt.data.ts,
      };
      return {
        ...base,
        activities: mergeById(base.activities, activity).sort(bySeq),
      };
    }

    case 'thinking': {
      const id = `think-${evt.data.step ?? 'run'}`;
      const prev = base.thinkings.find((x) => x.id === id);
      const entry: ThinkingEntry = {
        id,
        step: evt.data.step,
        text: appendThinking(prev?.text ?? '', evt.data.text),
        ts: evt.ts,
        seq: evt.seq,
      };
      return { ...base, thinkings: mergeById(base.thinkings, entry).sort(bySeq) };
    }

    case 'tool': {
      // 幂等键优先用事件自带的稳定 id（live 下是 AGH 的 toolUseId）：
      // tool/call 帧的 step 还是 '-'，tool/result 帧才带真实步骤，
      // 只用 step+tool 当键会把一次调用裂成两张卡（入参卡永远停在 running）。
      const id = evt.data.id
        ? `tool-${evt.data.id}`
        : `tool-${evt.data.step}-${evt.data.tool}`;
      const prev = base.tools.find((x) => x.id === id);
      const tool: ToolCall = {
        id,
        seq: evt.seq,
        step: evt.data.step,
        tool: evt.data.tool,
        // 终态帧常常只带结果：名称与入参沿用先到的帧，避免过程细节被清空。
        // label 缺失就留空：live 的 tool 事件只有工具名（sciret_*），
        // 拿名字兜底会让卡片显示成 "sciret_plansciret_plan" 这种重复。
        label: evt.data.label ?? prev?.label ?? '',
        status: evt.data.status,
        input: evt.data.input ?? prev?.input,
        output: evt.data.output ?? prev?.output,
        sources_status: evt.data.sources_status ?? prev?.sources_status,
        ts: prev?.ts ?? evt.data.ts ?? evt.ts,
      };
      // running → done 合并保留先前入参，避免后到的终态帧清空内容
      return { ...base, tools: mergeById(base.tools, tool).sort(bySeq) };
    }

    case 'degraded': {
      const id = `deg-${evt.data.step ?? 'run'}-${evt.data.source}-${evt.data.level}`;
      const info: DegradedInfo = {
        id,
        seq: evt.seq,
        level: evt.data.level,
        source: evt.data.source,
        reason: evt.data.reason,
        impact: evt.data.impact,
        resumable: evt.data.resumable,
        step: evt.data.step,
        action: evt.data.action,
        ts: evt.ts,
      };
      const snapshot = base.snapshot;
      return {
        ...base,
        degraded: mergeById(base.degraded, info).sort(bySeq),
        snapshot:
          snapshot && evt.data.level === 'degraded'
            ? { ...snapshot, degraded: true }
            : snapshot,
      };
    }

    case 'conclusion': {
      const conclusion: Conclusion = {
        cid: evt.data.cid,
        text: evt.data.text,
        evidence_ids: evt.data.evidence_ids,
      };
      const idx = base.conclusions.findIndex((c) => c.cid === conclusion.cid);
      const conclusions =
        idx === -1
          ? [...base.conclusions, conclusion]
          : base.conclusions.map((c, i) => (i === idx ? { ...c, ...conclusion } : c));
      return { ...base, conclusions };
    }

    case 'message': {
      const id = `${evt.data.turn_id}-${evt.data.role}`;
      const prev = base.messages.find((m) => m.id === id);
      const text =
        evt.data.text ??
        (prev ? prev.text + (evt.data.delta ?? '') : (evt.data.delta ?? ''));
      const message: ChatMessage = {
        id,
        seq: evt.seq,
        turn_id: evt.data.turn_id,
        role: evt.data.role,
        text,
        status: evt.data.status,
        queued_order: evt.data.queued_order,
        ts: evt.ts,
      };
      return {
        ...base,
        messages: mergeById(base.messages, message).sort(bySeq),
      };
    }

    case 'report':
      return { ...base, reportStatus: evt.data.status };

    case 'done': {
      const snapshot = base.snapshot;
      return {
        ...base,
        done: evt.data,
        reportStatus: evt.data.report_ready ? 'ready' : base.reportStatus,
        snapshot: snapshot
          ? {
              ...snapshot,
              run_status: evt.data.run_status,
              report_ready: evt.data.report_ready,
              updated_at: evt.ts,
            }
          : snapshot,
      };
    }

    default:
      return base;
  }
}

/** 快照 + 事件序列重建运行时状态（刷新/重连补数路径，与实时同形） */
export function rebuildRuntime(
  snapshot: TaskSnapshot,
  events: SseEnvelope[],
): TaskRuntimeState {
  return events.reduce<TaskRuntimeState>(applyEnvelope, emptyRuntime(snapshot));
}

export function currentActivity(state: TaskRuntimeState): Activity | null {
  return state.activities.at(-1) ?? null;
}

export function queuedMessages(state: TaskRuntimeState): ChatMessage[] {
  return state.messages
    .filter((m) => m.status === 'queued')
    .sort((a, b) => (a.queued_order ?? 0) - (b.queued_order ?? 0));
}

export function visibleMessages(state: TaskRuntimeState): ChatMessage[] {
  return state.messages.filter((m) => m.status !== 'queued').sort(bySeq);
}
