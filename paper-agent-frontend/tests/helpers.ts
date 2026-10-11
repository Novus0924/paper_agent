import type { SseEnvelope, Step, TaskSnapshot } from '@/api/types';

export const TS = '2026-10-09T10:00:00.000Z';

export function envelope<K extends SseEnvelope['event']>(
  event: K,
  seq: number,
  data: Extract<SseEnvelope, { event: K }>['data'],
): Extract<SseEnvelope, { event: K }> {
  return { seq, ts: TS, task_id: 'run-20261009-100000-abcdef', event, data } as Extract<
    SseEnvelope,
    { event: K }
  >;
}

export function step(id: string, status: Step['status'] = 'PENDING'): Step {
  return {
    id,
    label: `${id} 步骤`,
    status,
    attempts: status === 'PENDING' ? 0 : 1,
    is_current: false,
  };
}

export function snapshot(patch: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    task_id: 'run-20261009-100000-abcdef',
    title: '固态电解质界面阻抗的表征方法',
    goal: '固态电解质界面阻抗的主要表征方法有哪些？',
    workflow: 'research',
    lit_source: 'auto',
    sources: ['arxiv', 'crossref'],
    run_status: 'RUNNING',
    steps: [step('R1', 'DONE'), step('R2', 'RUNNING'), step('R3')],
    degraded: false,
    session_id: 'sess-abcdef',
    created_at: TS,
    updated_at: TS,
    ...patch,
  };
}

/** 从 zh-CN 文案表按点路径取值，用于断言「键真的存在」 */
export function lookupText(source: unknown, path: string): string | undefined {
  let cur: unknown = source;
  for (const seg of path.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return typeof cur === 'string' ? cur : undefined;
}
