import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepBar } from '@/components/business/StepBar';
import { DegradedBanner } from '@/components/business/DegradedBanner';
import { Composer } from '@/components/business/Composer';
import { EvidenceCard } from '@/components/business/EvidenceCard';
import { ArtifactList } from '@/components/business/ArtifactList';
import { api } from '@/api/client';
import { useTaskStore } from '@/store/taskStore';
import { renderAt, resetStores, seedTask } from './harness';
import { step } from './helpers';
import type { ChatMessage, DegradedInfo, EvidenceBundle, EvidenceItem } from '@/api/types';

beforeEach(() => {
  resetStores();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FE-05 步骤条', () => {
  const steps = [
    step('R1', 'DONE'),
    {
      ...step('R2', 'FAILED'),
      attempts: 2,
      error: '检索来源连续超时，未能建立完整对比维度',
    },
    step('R3'),
  ];

  it('逐步展示状态文案，失败步骤给出原因与重试入口', () => {
    renderAt(<StepBar steps={steps} running onRetry={() => undefined} />, { at: '/' });
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('未通过')).toBeInTheDocument();
    expect(screen.getByText('待执行')).toBeInTheDocument();
    expect(screen.getByText(/检索来源连续超时/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试该步骤' })).toBeEnabled();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('任务已停止时重试按钮禁用，避免给出无效动作', async () => {
    const onRetry = vi.fn();
    renderAt(<StepBar steps={steps} running={false} onRetry={onRetry} />, { at: '/' });
    const retry = screen.getByRole('button', { name: '重试该步骤' });
    expect(retry).toBeDisabled();
    await userEvent.click(retry);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('点击重试点亮具体步骤 id，供断点续跑使用', async () => {
    const onRetry = vi.fn();
    renderAt(<StepBar steps={steps} running onRetry={onRetry} />, { at: '/' });
    await userEvent.click(screen.getByRole('button', { name: '重试该步骤' }));
    expect(onRetry).toHaveBeenCalledWith('R2');
  });
});

describe('FE-06 降级两级提示（P-01）', () => {
  const base: Omit<DegradedInfo, 'level'> = {
    id: 'deg-1',
    source: 'crossref',
    reason: '接口限速 429',
    impact: '交叉验证减少一路',
    resumable: true,
    step: 'R1',
    action: '切换到 openalex',
    ts: '2026-10-09T10:00:00.000Z',
  };

  it('info 级别只做中性说明，不渲染成横幅', () => {
    renderAt(<DegradedBanner info={{ ...base, level: 'info' }} />, { at: '/' });
    expect(screen.getByText('部分源不可用（覆盖充足）')).toBeInTheDocument();
    expect(screen.queryByText(/已降级 · 任务未中断/)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('info 级别带原因时直显原因原文，不套用"数据源不可用"模板', () => {
    renderAt(
      <DegradedBanner
        info={{ ...base, level: 'info', source: 'user', reason: '用户请求停止执行' }}
      />,
      { at: '/' },
    );
    expect(screen.getByText('用户请求停止执行')).toBeInTheDocument();
    expect(screen.queryByText(/user 当前不可用/)).not.toBeInTheDocument();
  });

  it('degraded 级别说明"任务未中断"，并给出原因、影响与下一步动作', async () => {
    const onRetry = vi.fn();
    renderAt(<DegradedBanner info={{ ...base, level: 'degraded' }} onRetry={onRetry} />, {
      at: '/',
    });
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('已降级 · 任务未中断');
    expect(banner).toHaveTextContent('系统自动调整了执行路径（切换到 openalex）');
    expect(banner).toHaveTextContent('原因');
    expect(banner).toHaveTextContent('接口限速 429');
    expect(banner).toHaveTextContent('交叉验证减少一路');
    await userEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('不可续跑的降级不显示重试按钮', () => {
    renderAt(
      <DegradedBanner
        info={{ ...base, level: 'degraded', resumable: false }}
        onRetry={() => undefined}
      />,
      {
        at: '/',
      },
    );
    expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();
  });

  it('「这是什么」弹窗解释降级不等于失败', async () => {
    renderAt(<DegradedBanner info={{ ...base, level: 'degraded' }} />, { at: '/' });
    await userEvent.click(screen.getByRole('button', { name: '这是什么' }));
    expect(await screen.findByText(/它不是失败/)).toBeInTheDocument();
  });

  it('弹窗能用键盘打开、困在内部、关掉后焦点回到触发按钮', async () => {
    renderAt(<DegradedBanner info={{ ...base, level: 'degraded' }} />, { at: '/' });
    const opener = screen.getByRole('button', { name: '这是什么' });
    opener.focus();
    await userEvent.click(opener);
    const dialog = await screen.findByRole('dialog');
    // aria-modal 只对外 announce"这是模态"，标题必须真的挂上去，否则读屏只会念"对话框"
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId as string)?.textContent).toContain('这是什么');
    expect(document.activeElement).toBe(dialog);

    const closeBtn = within(dialog).getByRole('button', { name: '关闭' });
    for (const key of [{ key: 'Tab' }, { key: 'Tab' }, { key: 'Tab', shiftKey: true }]) {
      fireEvent.keyDown(document, key);
      expect(dialog.contains(document.activeElement as Node)).toBe(true);
    }
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });
});

describe('FE-10 Composer 与消息排队（P-05）', () => {
  const taskId = 'run-20261009-100000-abcdef';

  const queued = (turnId: string, order: number, text: string): ChatMessage => ({
    id: `${turnId}-user`,
    turn_id: turnId,
    role: 'user',
    text,
    status: 'queued',
    queued_order: order,
    ts: '2026-10-09T10:00:00.000Z',
    seq: order,
  });

  it('空内容不给发送，输入后 Enter 立即提交为追问', async () => {
    const send = vi
      .spyOn(api, 'sendMessage')
      .mockResolvedValue({ queued: false, turn_id: 'srv-1' });
    seedTask(taskId);
    renderAt(<Composer taskId={taskId} running={false} />, { at: '/' });
    const ta = screen.getByRole('textbox', { name: '追问或修订内容' });
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled();

    await userEvent.type(ta, '补充对比 DSC 与原位 XRD{Enter}');
    expect(send).toHaveBeenCalledWith(taskId, '补充对比 DSC 与原位 XRD', 'ask');
    await waitFor(() => expect(ta).toHaveValue(''));
  });

  it('切到修订模式后按修订语义发送', async () => {
    const send = vi
      .spyOn(api, 'sendMessage')
      .mockResolvedValue({ queued: false, turn_id: 'srv-2' });
    seedTask(taskId);
    renderAt(<Composer taskId={taskId} running />, { at: '/' });
    await userEvent.click(screen.getByRole('button', { name: '修订' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: '追问或修订内容' }),
      '把结论 3 拆成两段{Enter}',
    );
    expect(send).toHaveBeenCalledWith(taskId, '把结论 3 拆成两段', 'revise');
  });

  it('运行中发送进入排队：给出排队提示并保留内容', async () => {
    vi.spyOn(api, 'sendMessage').mockResolvedValue({
      queued: true,
      turn_id: 'srv-3',
      order: 2,
    });
    seedTask(taskId);
    renderAt(<Composer taskId={taskId} running />, { at: '/' });
    await userEvent.type(
      screen.getByRole('textbox', { name: '追问或修订内容' }),
      '再加上 XPS 数据{Enter}',
    );
    expect(await screen.findByText('第 2 位')).toBeInTheDocument();
    // 排队说明同时出现在队列条目与全局 Toast（FE-15 每个异步结果都要有反馈）
    expect(screen.getAllByText('已排队，当前任务结束后按序执行。')).toHaveLength(2);
  });

  it('排队消息按顺序展示、可删除；live 后端无强制投递口，不渲染"立即发送"', async () => {
    const removeQueued = vi.spyOn(api, 'removeQueued').mockResolvedValue(undefined);
    seedTask(taskId, {
      messages: [queued('t2', 2, '第二条提问'), queued('t1', 1, '第一条提问')],
    });
    renderAt(<Composer taskId={taskId} running />, { at: '/' });

    expect(screen.getByText('排队中的消息')).toBeInTheDocument();
    const items = screen.getAllByText(/第 \d 位/);
    expect(items.map((el) => el.textContent)).toEqual(['第 1 位', '第 2 位']);
    expect(
      screen
        .getByText('第一条提问')
        .compareDocumentPosition(screen.getByText('第二条提问')),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    // v2.5：live 后端的消息契约只有 ask|revise（validateAction 白名单），没有 flush
    // 强制投递口——组件不得渲染"立即发送"这类必然 400 的伪动作；运行中消息按序
    // 排队、回合结束由 onTurnSettled 自动放行
    expect(screen.queryByRole('button', { name: '立即发送' })).toBeNull();

    await userEvent.click(
      screen.getAllByRole('button', { name: /删除/ })[0] as HTMLElement,
    );
    expect(removeQueued).toHaveBeenCalledWith(taskId, 't1');
    await waitFor(() =>
      expect(
        useTaskStore
          .getState()
          .byId[taskId]?.messages.filter((m) => m.status === 'queued'),
      ).toHaveLength(1),
    );
  });

  it('发送失败时保留原文并标为失败，供用户重试', async () => {
    vi.spyOn(api, 'sendMessage').mockRejectedValue(new Error('NETWORK'));
    seedTask(taskId);
    renderAt(<Composer taskId={taskId} running={false} />, { at: '/' });
    const ta = screen.getByRole('textbox', { name: '追问或修订内容' });
    await userEvent.type(ta, '这条会失败{Enter}');
    // 乐观消息保留内容，状态转为 failed（发送按钮重新可用，文本已清空由用户决定是否重发）
    await waitFor(() =>
      expect(
        useTaskStore.getState().byId[taskId]?.messages.some((m) => m.status === 'failed'),
      ).toBe(true),
    );
    const failed = useTaskStore
      .getState()
      .byId[taskId]?.messages.find((m) => m.status === 'failed');
    expect(failed?.text).toBe('这条会失败');
    expect(ta).toHaveValue('');
  });
});

/**
 * QA 终验回归：内核 S1 综合回答产出 kind='synthesis' / 未来可能再新增 kind，
 * 前端组件绝不能因为文案表查不到而 t(undefined) 崩溃——必须退化为原值。
 */
describe('FE-08 证据 kind 文案兜底', () => {
  const synthesisItem: EvidenceItem = {
    ev_id: 'EV-0010',
    tier: 'artifact',
    kind: 'synthesis',
    title: '综合回答：固态电解质界面阻抗表征方法总览',
    ref: 'artifacts/S1/synthesis.md',
    producer_step: 'S1',
    summary: '模型综合生成的回答，已绑定有效证据角标。',
  };

  it('EvidenceCard 渲染 synthesis 证据给出「综合回答」标签', () => {
    renderAt(<EvidenceCard taskId="run-1" item={synthesisItem} bound={[]} />, { at: '/' });
    expect(screen.getByText('综合回答')).toBeInTheDocument();
    expect(screen.getByText('产物（artifact）')).toBeInTheDocument();
  });

  it('EvidenceCard 遇未知 kind 退化为原值字符串而不崩溃', () => {
    const mystery: EvidenceItem = { ...synthesisItem, kind: 'mystery' as never };
    renderAt(<EvidenceCard taskId="run-1" item={mystery} bound={[]} />, { at: '/' });
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });

  it('ArtifactList 渲染 synthesis 产物给出「综合回答」标签', () => {
    const bundle: EvidenceBundle = {
      task_id: 'run-1',
      evidence: [synthesisItem],
      conclusions: [],
      trace: [],
    };
    renderAt(
      <ArtifactList taskId="run-1" steps={[step('S1', 'DONE')]} bundle={bundle} />,
      { at: '/' },
    );
    expect(screen.getByText('综合回答')).toBeInTheDocument();
  });
});
