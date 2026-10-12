import type { Step } from '@/api/types';
import type { TaskRuntimeState } from '@/api/normalize';

/**
 * Agent Trace：把同一份归一状态里的活动 / 思考 / 工具调用铺成一条时间序。
 * 只用既有字段（seq / ts），不新造数据；缺 elapsed_ms 时由帧 ts 差值兜底计算。
 */
export type TraceKind = 'thinking' | 'tool' | 'activity';

export interface TraceItem {
  id: string;
  kind: TraceKind;
  seq: number;
  ts: string;
  step?: string;
  /** 主文本：思考正文 / 活动描述 / 工具标签 */
  text: string;
  /** 仅工具条目：名称与状态（用于细节行） */
  toolName?: string;
  toolStatus?: string;
}

const num = (v: number | undefined) => (typeof v === 'number' ? v : 0);

/** 汇总为统一时间线（seq 升序；seq 相同退回 ts 升序，保证稳定） */
export function buildTrace(state: {
  activities: TaskRuntimeState['activities'];
  tools: TaskRuntimeState['tools'];
  thinkings: TaskRuntimeState['thinkings'];
}): TraceItem[] {
  const items: TraceItem[] = [];

  for (const t of state.thinkings) {
    items.push({
      id: t.id,
      kind: 'thinking',
      seq: num(t.seq),
      ts: t.ts,
      step: t.step,
      text: t.text,
    });
  }
  for (const t of state.tools) {
    items.push({
      id: t.id,
      kind: 'tool',
      seq: num(t.seq),
      ts: t.ts,
      step: t.step === '-' ? undefined : t.step,
      text: t.label || t.tool,
      toolName: t.tool,
      toolStatus: t.status,
    });
  }
  for (const a of state.activities) {
    items.push({
      id: a.id,
      kind: 'activity',
      seq: num(a.seq),
      ts: a.ts,
      step: a.step,
      text: a.human_message,
    });
  }

  return items.sort((a, b) => {
    if (a.seq !== b.seq) return a.seq - b.seq;
    return Date.parse(a.ts) - Date.parse(b.ts);
  });
}

/** 某一具体条目相对任务起点的耗时（ms）；起点取时间线首帧 ts */
export function elapsedSince(startTs: string, ts: string): number {
  const a = Date.parse(startTs);
  const b = Date.parse(ts);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return b - a;
}

/**
 * 单步耗时：优先用事件自带的 elapsed_ms；缺失时以该步在时间线里的帧 ts 差值兜底。
 * 纯前端计算，不改后端契约。
 */
export function stepElapsedMs(step: Step, items: TraceItem[]): number | undefined {
  if (typeof step.elapsed_ms === 'number' && step.elapsed_ms > 0) return step.elapsed_ms;
  const stamps = items
    .filter((it) => it.step === step.id)
    .map((it) => Date.parse(it.ts))
    .filter((n) => !Number.isNaN(n));
  if (stamps.length < 2) return undefined;
  const span = Math.max(...stamps) - Math.min(...stamps);
  return span > 0 ? span : undefined;
}

/** 任务总耗时：优先累加各步 elapsed_ms，缺失则回退整条时间线的 ts 跨度 */
export function totalElapsedMs(steps: Step[], items: TraceItem[]): number {
  const summed = steps.reduce((sum, s) => sum + (s.elapsed_ms ?? 0), 0);
  if (summed > 0) return summed;
  return elapsedSince(items[0]?.ts ?? '', items.at(-1)?.ts ?? '');
}
