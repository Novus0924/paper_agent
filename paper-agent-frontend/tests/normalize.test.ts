import { describe, expect, it } from 'vitest';
import {
  applyEnvelope,
  currentActivity,
  emptyRuntime,
  queuedMessages,
  rebuildRuntime,
  visibleMessages,
  type TaskRuntimeState,
} from '@/api/normalize';
import type { SseEnvelope } from '@/api/types';
import { envelope, snapshot, step, TS } from './helpers';

const feed = (state: TaskRuntimeState, events: SseEnvelope[]) =>
  events.reduce(applyEnvelope, state);

describe('SSE 归一层：幂等与保序（§5.2）', () => {
  it('重复帧与低序号帧被丢弃，状态引用不变', () => {
    const a1 = envelope('activity', 5, {
      step: 'R2',
      human_message: '正在精读第 2 篇文献',
      ts: TS,
    });
    const once = applyEnvelope(emptyRuntime(snapshot()), a1);
    expect(applyEnvelope(once, a1)).toBe(once);
    expect(
      applyEnvelope(
        once,
        envelope('activity', 3, { step: 'R1', human_message: '旧帧', ts: TS }),
      ),
    ).toBe(once);
    expect(once.activities).toHaveLength(1);
  });

  it('展示顺序只由 seq 决定，重放的低序号旧帧不会回退最新进展', () => {
    const state = feed(emptyRuntime(snapshot()), [
      envelope('activity', 6, { step: 'R2', human_message: '精读高相关论文', ts: TS }),
      envelope('activity', 8, { step: 'R3', human_message: '建立对比维度', ts: TS }),
    ]);
    // 快照重建时历史活动可能以任意数组顺序入库，展示始终按 seq 排
    const reordered: TaskRuntimeState = {
      ...state,
      activities: [...state.activities].reverse(),
    };
    const next = applyEnvelope(
      reordered,
      envelope('activity', 9, { step: 'R3', human_message: '撰写结论', ts: TS }),
    );
    expect(next.activities.map((a) => a.seq)).toEqual([6, 8, 9]);
    expect(currentActivity(next)?.human_message).toBe('撰写结论');
    expect(currentActivity(emptyRuntime())).toBeNull();
    // 断线重连后服务重放的旧进度（seq 已推进过）直接丢弃
    expect(
      applyEnvelope(
        next,
        envelope('activity', 7, { step: 'R2', human_message: '旧帧', ts: TS }),
      ),
    ).toBe(next);
  });

  it('ping 帧只推进 lastSeq，不动业务数据', () => {
    const state = feed(emptyRuntime(snapshot()), [
      envelope('activity', 1, { step: 'R1', human_message: '检索完成', ts: TS }),
      envelope('ping', 2, { ts: TS }),
    ]);
    expect(state.lastSeq).toBe(2);
    expect(state.activities).toHaveLength(1);
  });
});

describe('SSE 归一层：按 id 合并', () => {
  it('tool 的 running → done 保留先前入参', () => {
    const state = feed(emptyRuntime(snapshot()), [
      envelope('tool', 1, {
        step: 'R1',
        tool: 'search_arxiv',
        label: 'arXiv 检索',
        status: 'running',
        input: 'query=solid electrolyte interphase',
      }),
      envelope('tool', 2, {
        step: 'R1',
        tool: 'search_arxiv',
        status: 'done',
        output: '命中 12 条',
      }),
    ]);
    expect(state.tools).toHaveLength(1);
    expect(state.tools[0]).toMatchObject({
      label: 'arXiv 检索',
      status: 'done',
      input: 'query=solid electrolyte interphase',
      output: '命中 12 条',
    });
  });

  it('message 的 delta 逐帧累加，同 turn/role 只有一条', () => {
    const state = feed(emptyRuntime(snapshot()), [
      envelope('message', 1, {
        turn_id: 't1',
        role: 'agent',
        status: 'streaming',
        delta: '界面',
      }),
      envelope('message', 2, {
        turn_id: 't1',
        role: 'agent',
        status: 'streaming',
        delta: '阻抗',
      }),
      envelope('message', 3, {
        turn_id: 't1',
        role: 'agent',
        status: 'done',
        text: '界面阻抗',
      }),
    ]);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]?.text).toBe('界面阻抗');
  });

  it('degraded 同一步同一源同一级别只登记一条，且 info 级别不改写任务降级标记', () => {
    const base = emptyRuntime(snapshot());
    const dup = [
      envelope('degraded', 1, {
        level: 'info',
        source: 'crossref',
        reason: '限速 429',
        impact: '覆盖仍充足',
        resumable: false,
      }),
      envelope('degraded', 2, {
        level: 'info',
        source: 'crossref',
        reason: '限速 429',
        impact: '覆盖仍充足（重试后跳过）',
        resumable: false,
      }),
    ];
    const state = feed(base, dup);
    expect(state.degraded).toHaveLength(1);
    expect(state.degraded[0]?.reason).toBe('限速 429');
    expect(state.snapshot?.degraded).toBe(false);

    const real = feed(base, [
      envelope('degraded', 3, {
        level: 'degraded',
        source: 'semantic_scholar',
        reason: '接口 5xx',
        impact: '少一路交叉验证',
        resumable: true,
        step: 'R1',
        action: '切换到 openalex',
      }),
    ]);
    expect(real.degraded).toHaveLength(1);
    expect(real.snapshot?.degraded).toBe(true);
  });

  it('conclusion 按 cid 覆盖，不重复追加', () => {
    const state = feed(emptyRuntime(snapshot()), [
      envelope('conclusion', 1, { cid: 'C1', text: '结论初稿', evidence_ids: [] }),
      envelope('conclusion', 2, {
        cid: 'C1',
        text: '结论定稿',
        evidence_ids: ['EV-0001'],
      }),
    ]);
    expect(state.conclusions).toEqual([
      { cid: 'C1', text: '结论定稿', evidence_ids: ['EV-0001'] },
    ]);
  });
});

describe('SSE 归一层：步骤与终态语义', () => {
  it('步骤推进：is_current 唯一，未完成步骤保持 RUNNING 语义', () => {
    const snap = snapshot({ steps: [step('R1', 'DONE'), step('R2'), step('R3')] });
    const running = applyEnvelope(
      emptyRuntime(snap),
      envelope('step', 1, { step: 'R2', status: 'RUNNING' }),
    );
    expect(running.snapshot?.steps.map((s) => Boolean(s.is_current))).toEqual([
      false,
      true,
      false,
    ]);
    expect(running.snapshot?.run_status).toBe('RUNNING');

    const done = applyEnvelope(
      running,
      envelope('step', 2, { step: 'R2', status: 'DONE', elapsed_ms: 4200 }),
    );
    expect(done.snapshot?.steps[1]).toMatchObject({
      status: 'DONE',
      elapsed_ms: 4200,
      is_current: false,
    });
    expect(done.snapshot?.run_status).toBe('RUNNING');
  });

  it('步骤 FAILED 保留错误原因，并把任务收敛为未完成', () => {
    const snap = snapshot({
      steps: [step('R1', 'DONE'), step('R2', 'RUNNING'), step('R3')],
    });
    const failed = applyEnvelope(
      emptyRuntime(snap),
      envelope('step', 1, { step: 'R2', status: 'FAILED', error: '来源连续超时' }),
    );
    expect(failed.snapshot?.steps[1]).toMatchObject({
      status: 'FAILED',
      error: '来源连续超时',
    });
    expect(failed.snapshot?.run_status).toBe('FAILED');

    // 断点续跑后重新推进，未完成状态要让位给执行中
    const resumed = applyEnvelope(
      failed,
      envelope('step', 2, { step: 'R2', status: 'RUNNING' }),
    );
    expect(resumed.snapshot?.run_status).toBe('RUNNING');
  });

  it('report/done 事件收敛报告状态并写入终态', () => {
    const state = feed(emptyRuntime(snapshot()), [
      envelope('report', 1, {
        task_id: 'run-20261009-100000-abcdef',
        status: 'generating',
      }),
      envelope('report', 2, { task_id: 'run-20261009-100000-abcdef', status: 'ready' }),
      envelope('done', 3, { run_status: 'DONE', report_ready: true }),
    ]);
    expect(state.reportStatus).toBe('ready');
    expect(state.done?.run_status).toBe('DONE');
    expect(state.snapshot?.run_status).toBe('DONE');
    expect(state.snapshot?.report_ready).toBe(true);
  });

  it('空快照下的事件不抛错，只登记数据本身', () => {
    const state = feed(emptyRuntime(null), [
      envelope('step', 1, { step: 'R1', status: 'DONE' }),
      envelope('activity', 2, { step: 'R1', human_message: '检索完成', ts: TS }),
    ]);
    expect(state.snapshot).toBeNull();
    expect(state.activities).toHaveLength(1);
  });
});

describe('实时路径与刷新重建同形（P-03）', () => {
  const events: SseEnvelope[] = [
    envelope('activity', 1, { step: 'R1', human_message: '检索到 12 篇文献', ts: TS }),
    envelope('tool', 2, {
      step: 'R1',
      tool: 'search_arxiv',
      status: 'running',
      input: 'q=sei',
    }),
    envelope('tool', 3, {
      step: 'R1',
      tool: 'search_arxiv',
      status: 'done',
      output: '12 条',
    }),
    envelope('degraded', 4, {
      level: 'degraded',
      source: 'crossref',
      reason: '429 限速',
      impact: '交叉验证减少',
      resumable: true,
      step: 'R1',
      action: '切换到 openalex',
    }),
    envelope('conclusion', 5, {
      cid: 'C1',
      text: 'AFM 与 EIS 互补',
      evidence_ids: ['EV-0001'],
    }),
    envelope('message', 6, { turn_id: 't1', role: 'user', status: 'done', text: '继续' }),
    envelope('report', 7, { task_id: 'run-20261009-100000-abcdef', status: 'ready' }),
    envelope('done', 8, { run_status: 'DONE', report_ready: true }),
  ];

  it('逐步 apply 与 rebuildRuntime 结果一致', () => {
    const live = feed(emptyRuntime(snapshot()), events);
    const refreshed = rebuildRuntime(live.snapshot ?? snapshot(), events);
    expect(refreshed).toEqual(live);
  });

  it('重复补发（重连后全量重放）不会产生重复条目', () => {
    const once = rebuildRuntime(snapshot(), events);
    const replayed = rebuildRuntime(once.snapshot ?? snapshot(), [...events, ...events]);
    expect(replayed.activities).toHaveLength(once.activities.length);
    expect(replayed.tools).toHaveLength(once.tools.length);
    expect(replayed.degraded).toHaveLength(once.degraded.length);
    expect(replayed.conclusions).toHaveLength(once.conclusions.length);
  });
});

describe('消息队列选择器（FE-10）', () => {
  const state = feed(emptyRuntime(snapshot()), [
    envelope('message', 1, {
      turn_id: 'u1',
      role: 'user',
      status: 'queued',
      text: '第二条',
      queued_order: 2,
    }),
    envelope('message', 2, {
      turn_id: 'u2',
      role: 'user',
      status: 'queued',
      text: '第一条',
      queued_order: 1,
    }),
    envelope('message', 3, {
      turn_id: 'a1',
      role: 'agent',
      status: 'streaming',
      text: '回答中',
    }),
  ]);

  it('queuedMessages 按 queued_order 升序，visibleMessages 只留非排队消息', () => {
    expect(queuedMessages(state).map((m) => m.text)).toEqual(['第一条', '第二条']);
    expect(visibleMessages(state).map((m) => m.turn_id)).toEqual(['a1']);
  });
});
