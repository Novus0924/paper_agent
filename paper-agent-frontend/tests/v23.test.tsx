/**
 * tests/v23.test.tsx —— v2.3 迭代回归（v2.5 语义下保留的部分）。
 *
 * v2.3 的「默认 Live + 演示模式显式化」与「Mock 演示脚本」用例随 mock 适配器
 * 一并移除：v2.5 起唯一数据通道是 LiveApiClient，不再有模式切换器/水印/演示脚本，
 * 思考流帧的端到端覆盖已由 tests/liveEnv.test.ts 承担。
 * 本文件保留三个仍有效的回归面：
 *   1. SSE thinking 帧的归一链路（按 step 聚合、整段去重、刷新重建同形）；
 *   2. 步骤耗时与 Trace 时间线的机械统计口径；
 *   3. 刷新后消息恢复的角色与 id 与 SSE 路径同键（P1 阻断回归）。
 */

import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { appendThinking, applyEnvelope, emptyRuntime } from '@/api/normalize';
import { buildTrace, stepElapsedMs, totalElapsedMs } from '@/lib/trace';
import { AgentTrace } from '@/components/business/AgentTrace';
import { MessageList } from '@/components/business/MessageList';
import { I18nProvider } from '@/i18n';
import { api } from '@/api/client';
import { useTaskStore } from '@/store/taskStore';
import { renderAt, resetStores, seedTask } from './harness';
import { envelope, snapshot, step, TS } from './helpers';
import type { ChatMessage, MessageQueueEntry, SseEnvelope } from '@/api/types';

const wrap = (ui: ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('功能2 思考流：SSE thinking 归一', () => {
  const feed = (events: SseEnvelope[]) => events.reduce(applyEnvelope, emptyRuntime(snapshot()));

  it('同一步的多帧思考按 step 聚合并逐帧累加', () => {
    const state = feed([
      envelope('thinking', 1, { step: 'R2', text: '先按界面类型分组。' }),
      envelope('thinking', 2, { step: 'R2', text: '再比较表征手段的敏感度。' }),
      envelope('thinking', 3, { step: 'R4', text: '核验 DOI 与数值一致性。' }),
    ]);
    expect(state.thinkings).toHaveLength(2);
    expect(state.thinkings[0]).toMatchObject({
      id: 'think-R2',
      step: 'R2',
      text: '先按界面类型分组。\n再比较表征手段的敏感度。',
    });
    expect(state.thinkings[1]?.id).toBe('think-R4');
  });

  it('整段重复与更完整的整段：去重 / 覆盖，不产生重复行', () => {
    expect(appendThinking('甲', '甲')).toBe('甲');
    expect(appendThinking('甲\n乙', '甲\n乙')).toBe('甲\n乙');
    expect(appendThinking('前', '前段更完整')).toBe('前段更完整');
    expect(appendThinking('', '  ')).toBe('');
  });

  it('刷新重建与实时同形：thinking 不重复登记', () => {
    const events = [
      envelope('thinking', 1, { step: 'R2', text: '甲' }),
      envelope('thinking', 2, { step: 'R2', text: '乙' }),
    ];
    const once = feed(events);
    const rebuilt = events.reduce(applyEnvelope, emptyRuntime(snapshot()));
    expect(rebuilt.thinkings).toEqual(once.thinkings);
  });
});

describe('功能3 步骤耗时与 Trace 时间线', () => {
  it('buildTrace 按 seq 铺开活动 / 思考 / 工具', () => {
    const items = buildTrace({
      thinkings: [{ id: 'think-R1', step: 'R1', text: '思考', ts: TS, seq: 2 }],
      tools: [
        {
          id: 'tool-R1-x',
          step: 'R1',
          tool: 'sciret_search_literature',
          label: '多源文献检索',
          status: 'done',
          ts: TS,
          seq: 3,
        },
      ],
      activities: [{ id: 'act-1', step: 'R1', human_message: '检索中', ts: TS, seq: 1 }],
    });
    expect(items.map((i) => i.kind)).toEqual(['activity', 'thinking', 'tool']);
  });

  it('步骤耗时：有 elapsed_ms 用原值；缺失则用帧 ts 差值兜底', () => {
    const withField: Parameters<typeof stepElapsedMs>[0] = {
      ...step('R1', 'DONE'),
      elapsed_ms: 4200,
    };
    expect(stepElapsedMs(withField, [])).toBe(4200);

    const noField = step('R2', 'DONE');
    const items = [
      { id: 'a', kind: 'activity' as const, seq: 1, ts: '2026-10-09T10:00:00.000Z', text: '', step: 'R2' },
      { id: 'b', kind: 'activity' as const, seq: 2, ts: '2026-10-09T10:00:03.000Z', text: '', step: 'R2' },
    ];
    expect(stepElapsedMs(noField, items)).toBe(3000);
  });

  it('任务总耗时：优先累加各步 elapsed_ms', () => {
    const steps = [
      { ...step('R1', 'DONE'), elapsed_ms: 5200 },
      { ...step('R2', 'DONE'), elapsed_ms: 4400 },
    ];
    expect(totalElapsedMs(steps, [])).toBe(9600);
  });

  it('AgentTrace 混合渲染思考 / 工具 / 进展，空态给可读文案', () => {
    const { unmount } = wrap(
      <AgentTrace
        running
        currentStepId="R2"
        activities={[{ id: 'act-1', step: 'R1', human_message: '检索完成', ts: TS, seq: 1 }]}
        tools={[
          {
            id: 'tool-1',
            step: 'R1',
            tool: 'sciret_search_literature',
            label: '多源文献检索',
            status: 'done',
            ts: TS,
            seq: 2,
          },
        ]}
        thinkings={[{ id: 'think-R2', step: 'R2', text: '正在推理界面阻抗', ts: TS, seq: 3 }]}
      />,
    );
    expect(screen.getByText('检索完成')).toBeInTheDocument();
    expect(screen.getByText('多源文献检索')).toBeInTheDocument();
    expect(screen.getByText('正在推理界面阻抗')).toBeInTheDocument();
    expect(screen.getByText('思考中')).toBeInTheDocument();
    unmount();

    wrap(
      <AgentTrace running={false} activities={[]} tools={[]} thinkings={[]} />,
    );
    expect(screen.getByText('暂无过程记录。')).toBeInTheDocument();
  });
});

/* --------------------------------------------------------------------------
   P1 阻断回归：刷新后助手回复渲染到用户侧 + React duplicate key
   恢复路径曾把 history 一律当 user 且 id 硬编码 `turn-user`，与 SSE 路径
   `${turn}-${role}`（role=agent）不一致 → 角色错位 + 重复 key。
   -------------------------------------------------------------------------- */
describe('刷新后消息恢复：角色与 id 与 SSE 路径同键', () => {
  const TASK = 'run-20261011-restore-01';

  const entry = (
    role: 'user' | 'assistant',
    text: string,
    turn = 'turn-1',
  ): MessageQueueEntry => ({
    turn_id: turn,
    task_id: TASK,
    action: 'ask',
    role,
    text,
    order: 1,
    queued_at: TS,
    status: 'done',
  });

  it('history 里的 assistant 恢复为 agent 且 id 用 turn-agent（与 SSE 同键）', async () => {
    resetStores();
    seedTask(TASK, { snapshot: snapshot({ task_id: TASK, run_status: 'DONE' }) });
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      task_id: TASK,
      busy: false,
      pending: [],
      active: null,
      history: [entry('user', '这份报告引用了多少篇文献？'), entry('assistant', '6 篇真实文献')],
    });

    await useTaskStore.getState().restoreMessages(TASK);
    const msgs = useTaskStore.getState().byId[TASK]?.messages ?? [];
    // 同 turn 的 user 与 assistant 是两条，id 不同、角色不同
    expect(msgs.map((m) => m.id)).toEqual(['turn-1-user', 'turn-1-agent']);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'agent']);
    // 无重复 id（React duplicate key 的结构性等价断言）
    expect(new Set(msgs.map((m) => m.id)).size).toBe(msgs.length);
  });

  it('恢复的 assistant 渲染在助手侧（article），user 渲染在用户气泡', async () => {
    const messages: ChatMessage[] = [
      {
        id: 'turn-1-user',
        turn_id: 'turn-1',
        role: 'user',
        text: '这份报告引用了多少篇文献？',
        status: 'done',
        ts: TS,
        seq: 1,
      },
      {
        id: 'turn-1-agent',
        turn_id: 'turn-1',
        role: 'agent',
        text: '6 篇真实文献',
        status: 'done',
        ts: TS,
        seq: 2,
      },
    ];
    // MessageList 里的 Markdown 依赖 Router 上下文，用 renderAt 提供
    renderAt(<MessageList messages={messages} />, { at: '/' });
    const agent = document.querySelector('[class*="msgAgent"]');
    const user = document.querySelector('[class*="msgUser"]');
    expect(agent?.tagName).toBe('ARTICLE');
    expect(agent?.textContent).toContain('6 篇真实文献');
    expect(user?.textContent).toContain('这份报告引用了多少篇文献？');
    expect(user?.textContent).not.toContain('6 篇真实文献');
  });

  it('SSE 已落库的同一 turn-agent 不会被恢复路径再插一条', async () => {
    resetStores();
    seedTask(TASK, {
      snapshot: snapshot({ task_id: TASK, run_status: 'RUNNING' }),
      messages: [
        {
          id: 'turn-1-agent',
          turn_id: 'turn-1',
          role: 'agent',
          text: '流式已到',
          status: 'streaming',
          ts: TS,
          seq: 1,
        },
      ],
    });
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      task_id: TASK,
      busy: false,
      pending: [],
      active: null,
      history: [entry('assistant', '6 篇真实文献')],
    });

    await useTaskStore.getState().restoreMessages(TASK);
    const msgs = useTaskStore.getState().byId[TASK]?.messages ?? [];
    expect(msgs.filter((m) => m.id === 'turn-1-agent')).toHaveLength(1);
  });
});
