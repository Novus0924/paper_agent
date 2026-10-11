import type { RunStatus, StepStatus } from '@/api/types';

/** 状态语气（tone）→ 令牌色；降级永远是 warn（橙），绝不映射到 fail（铁律 1 / §5.3） */
export type Tone = 'ok' | 'run' | 'warn' | 'fail' | 'idle';

export const runStatusTone: Record<RunStatus, Tone> = {
  PLANNED: 'idle',
  RUNNING: 'run',
  DONE: 'ok',
  FAILED: 'fail',
};

export const stepStatusTone: Record<StepStatus, Tone> = {
  PENDING: 'idle',
  RUNNING: 'run',
  DONE: 'ok',
  SKIPPED: 'idle',
  FAILED: 'fail',
};

/** 展示文案由 i18n 的 status.run.* / status.step.* 提供（单一真源），此处只负责色语义 */
export function toneClass(styles: Record<string, string>, tone: Tone): string {
  return styles[tone] ?? styles.idle ?? '';
}

/** 任务是否处于可交互的终态（导出、追问的门禁依据） */
export const isTerminal = (s: RunStatus): boolean => s === 'DONE' || s === 'FAILED';
export const isRunning = (s: RunStatus): boolean => s === 'RUNNING' || s === 'PLANNED';
