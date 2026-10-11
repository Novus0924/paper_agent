import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { ArchiveResult, StopResult, TaskSnapshot } from '@/api/types';
import { App } from '@/app/App';
import { MonitorPage } from '@/pages/MonitorPage';
import { ExportPanel } from '@/components/business/ExportPanel';
import { I18nProvider } from '@/i18n';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { renderAt, resetStores, seedTask } from './harness';
import { snapshot } from './helpers';
import { useTaskStore } from '@/store/taskStore';
import { useToastStore } from '@/store/toastStore';
import { useHealthStore } from '@/store/healthStore';
import type { HealthInfo } from '@/api/types';

const HEALTH_OK: HealthInfo = {
  status: 'ok',
  mode: 'mock',
  task_count: 1,
  session_ready: true,
  bff_reachable: true,
  issues: [],
  checked_at: '2026-10-11T05:00:00.000Z',
};

const HEALTH_DEGRADED: HealthInfo = {
  status: 'degraded',
  mode: 'mock',
  task_count: 0,
  session_ready: false,
  bff_reachable: true,
  issues: [
    {
      id: 'agh-disconnected',
      title: 'AGH 会话服务未连接，任务无法执行',
      guidance: '请确认 AGH daemon 已启动。',
      blocking: true,
    },
  ],
  checked_at: '2026-10-11T05:00:00.000Z',
};

/** MemoryRouter 不写真实 window.location：渲染当前 query 以便断言 URL 同步 */
function LocationProbe() {
  const { search } = useLocation();
  return <div data-testid="location-probe">{search}</div>;
}

/* ==========================================================================
   v2.1 迭代 UI 层测试：停止控制 / 归档 / 状态过滤 / 健康首屏 / 消息恢复 / Markdown 下载
   ========================================================================== */

const TASK = 'run-20261011-v2100000-v21a';
const STOPPED: StopResult = {
  task_id: TASK,
  run_status: 'FAILED',
  stopped_at: '2026-10-11T05:00:00.000Z',
  final_state: 'CANCELLED',
};

function renderMonitor(runStatus: 'RUNNING' | 'DONE' | 'PLANNED' | 'FAILED') {
  vi.spyOn(api, 'getTask').mockResolvedValue(
    snapshot({ task_id: TASK, run_status: runStatus }),
  );
  // openTask 附带取报告与证据；这里只测停止控制，两个读取接口给无害桩
  vi.spyOn(api, 'getReport').mockResolvedValue({ status: 'generating' });
  vi.spyOn(api, 'getEvidence').mockResolvedValue({
    task_id: TASK,
    evidence: [],
    conclusions: [],
    trace: [],
  });
  seedTask(TASK, { snapshot: snapshot({ task_id: TASK, run_status: runStatus }) });
  return renderAt(<MonitorPage />, { at: `/monitor/${TASK}`, pattern: '/monitor/:id' });
}

describe('v2.1 停止控制（P0）', () => {
  beforeEach(() => {
    resetStores();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('运行中显示"停止"按钮：confirm 确认后调用 API 并刷新任务状态', async () => {
    const stop = vi.spyOn(api, 'stopTask').mockResolvedValue(STOPPED);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderMonitor('RUNNING');

    await userEvent.click(await screen.findByRole('button', { name: '停止' }));

    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(stop).toHaveBeenCalledWith(TASK));
    // 停止后走既有刷新路径重新取快照
    await waitFor(() =>
      expect(useTaskStore.getState().byId[TASK]?.loading).toBe(false),
    );
    expect(useTaskStore.getState().byId[TASK]?.error).toBeNull();
  });

  it('confirm 取消时不调用停止 API', async () => {
    const stop = vi.spyOn(api, 'stopTask').mockResolvedValue(STOPPED);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderMonitor('RUNNING');

    await userEvent.click(await screen.findByRole('button', { name: '停止' }));

    expect(stop).not.toHaveBeenCalled();
  });

  it('非运行中不显示停止按钮', async () => {
    renderMonitor('DONE');
    await screen.findByText('执行步骤');
    expect(screen.queryByRole('button', { name: '停止' })).not.toBeInTheDocument();
  });

  it('停止失败给出人类可读的错误 Toast，不静默', async () => {
    vi.spyOn(api, 'stopTask').mockRejectedValue(new ApiError('BUSY'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderMonitor('RUNNING');

    await userEvent.click(await screen.findByRole('button', { name: '停止' }));

    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]?.key).toBe('errors.BUSY'),
    );
    expect(
      await screen.findByText('该任务已有步骤在执行，请等待完成后再操作。'),
    ).toBeInTheDocument();
  });
});

/* ==========================================================================
   v2.1 归档 UI（P1）
   ========================================================================== */

describe('v2.1 归档 UI（P1）', () => {
  const DONE_A = 'run-20261011-arch000-aaa1';
  const RUNNING_B = 'run-20261011-arch000-bbb2';
  const ARCHIVED_C = 'run-20261011-arch000-ccc3';

  const active: TaskSnapshot = snapshot({
    task_id: DONE_A,
    run_status: 'DONE',
    title: '已完成任务甲',
  });
  const running: TaskSnapshot = snapshot({
    task_id: RUNNING_B,
    run_status: 'RUNNING',
    title: '执行中任务乙',
  });
  const archived: TaskSnapshot = snapshot({
    task_id: ARCHIVED_C,
    run_status: 'DONE',
    title: '已归档任务丙',
    archived: true,
    archived_at: '2026-10-11T05:00:00.000Z',
  });

  function renderOverview(at = '/') {
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={[at]}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  beforeEach(() => {
    resetStores();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('每行提供"归档"动作：运行中行禁用并说明原因；点击归档调用 API 后刷新列表', async () => {
    const archive = vi
      .spyOn(api, 'archiveTask')
      .mockResolvedValue({ task_id: DONE_A, archived: true, archived_at: '2026-10-11T05:00:00.000Z' } as ArchiveResult);
    const list = vi
      .spyOn(api, 'listTasks')
      .mockResolvedValue([active, running]);
    renderOverview();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    const rowA = rows.find((r) => r.dataset.taskId === DONE_A) as HTMLElement;
    const rowB = rows.find((r) => r.dataset.taskId === RUNNING_B) as HTMLElement;

    const btnA = within(rowA).getByRole('button', { name: '归档' });
    expect(within(rowB).getByRole('button', { name: '归档' })).toBeDisabled();
    expect(within(rowB).getByRole('button', { name: '归档' })).toHaveAccessibleDescription(
      /运行中/,
    );

    await userEvent.click(btnA);
    expect(archive).toHaveBeenCalledWith(DONE_A, true);
    // 归档后按当前视图刷新列表
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(1));
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]?.key).toBe('overview.archivedDone'),
    );
  });

  it('顶部"已归档"切换进入归档视图：只显示归档任务，行内提供"恢复"', async () => {
    const archive = vi
      .spyOn(api, 'archiveTask')
      .mockResolvedValue({ task_id: ARCHIVED_C, archived: false, archived_at: null } as ArchiveResult);
    const list = vi
      .spyOn(api, 'listTasks')
      .mockImplementation(async (params) =>
        params?.archived === 'true' ? [archived] : [active, running],
      );
    renderOverview();

    await userEvent.click(await screen.findByRole('button', { name: '已归档' }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ archived: 'true' })),
    );

    const table = await screen.findByRole('table');
    expect(within(table).getByText('已归档任务丙')).toBeInTheDocument();
    expect(within(table).queryByText('已完成任务甲')).not.toBeInTheDocument();

    await userEvent.click(within(table).getByRole('button', { name: '恢复' }));
    expect(archive).toHaveBeenCalledWith(ARCHIVED_C, false);
  });

  it('归档视图没有任务时给空态说明，不白屏', async () => {
    vi.spyOn(api, 'listTasks').mockImplementation(async (params) =>
      params?.archived === 'true' ? [] : [active],
    );
    renderOverview();

    await userEvent.click(await screen.findByRole('button', { name: '已归档' }));
    expect(await screen.findByText(/还没有已归档的任务/)).toBeInTheDocument();
  });

  it('归档失败时给出人类可读的错误 Toast', async () => {
    vi.spyOn(api, 'archiveTask').mockRejectedValue(new ApiError('BAD_STATE'));
    vi.spyOn(api, 'listTasks').mockResolvedValue([active]);
    renderOverview();

    await userEvent.click(await screen.findByRole('button', { name: '归档' }));

    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]?.key).toBe('errors.BAD_STATE'),
    );
  });
});

/* ==========================================================================
   v2.1 状态过滤 chips（P1）：单选 + 计数徽章，?status= 落 URL 可分享；
   "已降级"后端 ?status= 不支持，走客户端过滤但 URL 依旧同步。
   ========================================================================== */

describe('v2.1 状态过滤 chips（P1）', () => {
  const DEGRADED_ID = 'run-20261011-chip0000-deg4';
  const data: TaskSnapshot[] = [
    snapshot({
      task_id: 'run-20261011-chip0000-don1',
      run_status: 'DONE',
      title: '已完成任务甲',
    }),
    snapshot({
      task_id: 'run-20261011-chip0000-run2',
      run_status: 'RUNNING',
      title: '执行中任务乙',
    }),
    snapshot({
      task_id: DEGRADED_ID,
      run_status: 'DONE',
      degraded: true,
      title: '降级完成任务丙',
    }),
  ];

  function renderOverview(at = '/') {
    // LocationProbe：MemoryRouter 不写真实 window.location，用它断言 URL query 同步
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={[at]}>
          <LocationProbe />
          <App />
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  beforeEach(() => {
    resetStores();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('五个单选 chips 带计数徽章，默认选中"全部"', async () => {
    vi.spyOn(api, 'listTasks').mockResolvedValue(data);
    renderOverview();

    const group = await screen.findByRole('group', { name: '按状态筛选' });
    const chips = within(group).getAllByRole('button');
    expect(chips.map((c) => c.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '全部 3',
      '执行中 1',
      '已完成 2',
      '未完成 0',
      '已降级 1',
    ]);
    expect(within(group).getByText('全部')).toHaveAttribute('aria-pressed', 'true');
  });

  it('点"已完成"：URL 同步 ?status=DONE，列表请求携带 status 且只剩已完成', async () => {
    const list = vi
      .spyOn(api, 'listTasks')
      .mockImplementation(async (params) =>
        params?.status === 'DONE' ? data.filter((d) => d.run_status === 'DONE') : data,
      );
    renderOverview();

    const group = await screen.findByRole('group', { name: '按状态筛选' });
    await userEvent.click(within(group).getByRole('button', { name: /已完成/ }));

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'DONE' }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('?status=DONE'),
    );
    const table = await screen.findByRole('table');
    expect(within(table).getByText('已完成任务甲')).toBeInTheDocument();
    expect(within(table).queryByText('执行中任务乙')).not.toBeInTheDocument();
  });

  it('点"已降级"：请求不带 status（后端不支持），客户端过滤且 URL 同步 status=degraded', async () => {
    const list = vi.spyOn(api, 'listTasks').mockResolvedValue(data);
    renderOverview();

    const group = await screen.findByRole('group', { name: '按状态筛选' });
    await userEvent.click(within(group).getByRole('button', { name: /已降级/ }));

    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe(
        '?status=degraded',
      ),
    );
    // 后端 status 词表没有 degraded：请求参数不携带 status，由前端过滤
    expect(list).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ status: expect.anything() }),
    );
    const table = await screen.findByRole('table');
    expect(within(table).getByText('降级完成任务丙')).toBeInTheDocument();
    expect(within(table).queryByText('已完成任务甲')).not.toBeInTheDocument();
  });

  it('URL 直达 /?status=RUNNING 与选中 chip 等效（可分享）', async () => {
    // 后端按 ?status= 过滤：mock 同形
    vi.spyOn(api, 'listTasks').mockImplementation(async (params) =>
      params?.status ? data.filter((d) => d.run_status === params.status) : data,
    );
    renderOverview('/?status=RUNNING');

    const group = await screen.findByRole('group', { name: '按状态筛选' });
    expect(within(group).getByText('执行中')).toHaveAttribute('aria-pressed', 'true');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('执行中任务乙')).toBeInTheDocument();
    expect(within(table).queryByText('已完成任务甲')).not.toBeInTheDocument();
  });

  it('切回"全部"清掉 URL 参数，恢复完整列表', async () => {
    vi.spyOn(api, 'listTasks').mockResolvedValue(data);
    renderOverview('/?status=DONE');

    const group = await screen.findByRole('group', { name: '按状态筛选' });
    await userEvent.click(within(group).getByRole('button', { name: /全部/ }));
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe(''),
    );
    const table = await screen.findByRole('table');
    expect(within(table).getByText('执行中任务乙')).toBeInTheDocument();
  });

  it('归档视图下隐藏状态 chips（归档列表不做状态过滤）', async () => {
    vi.spyOn(api, 'listTasks').mockResolvedValue([]);
    renderOverview('/?archived=true');

    await screen.findByText('还没有已归档的任务');
    expect(
      screen.queryByRole('group', { name: '按状态筛选' }),
    ).not.toBeInTheDocument();
  });
});

/* ==========================================================================
   v2.1 健康首屏（FE-14）：degraded / agh 未连接 → 可关闭的琥珀警示条 + 重试；
   请求失败同样给降级提示（讲人话，不弹错误堆栈）；ok 不显示。
   ========================================================================== */

describe('v2.1 健康首屏（FE-14）', () => {
  function renderShell(at = '/') {
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={[at]}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  beforeEach(() => {
    resetStores();
    useHealthStore.setState({ health: null, loading: false, error: null });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    useHealthStore.setState({ health: null, loading: false, error: null });
  });

  it('health ok 时不显示任何提示条', async () => {
    vi.spyOn(api, 'health').mockResolvedValue(HEALTH_OK);
    renderShell('/');

    await screen.findByRole('heading', { level: 1, name: '总览' });
    await waitFor(() => expect(useHealthStore.getState().health).not.toBeNull());
    expect(screen.queryByText('环境有问题需要处理')).not.toBeInTheDocument();
    expect(screen.queryByText('后端连接不可用')).not.toBeInTheDocument();
  });

  it('degraded（AGH 未连接）显示琥珀警示条：含指引与重试，可关闭', async () => {
    // checked_at 每次检查都变（真实后端如此），关闭状态据此按轮次重置
    vi.spyOn(api, 'health').mockImplementation(async () => ({
      ...HEALTH_DEGRADED,
      checked_at: new Date().toISOString(),
    }));
    const refresh = vi.spyOn(api, 'health');
    renderShell('/');

    const banner = await screen.findByText('AGH 会话服务未连接，任务无法执行');
    expect(banner).toBeInTheDocument();
    const close = screen.getByRole('button', { name: '关闭' });
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();

    // 关闭后提示条消失，不打扰后续浏览
    await userEvent.click(close);
    await waitFor(() =>
      expect(screen.queryByText('环境有问题需要处理')).not.toBeInTheDocument(),
    );
    // 新一轮检查（checked_at 变化）后关闭状态重置：问题仍在就重新提示
    await useHealthStore.getState().refresh();
    expect(await screen.findByText('环境有问题需要处理')).toBeInTheDocument();
    expect(refresh.mock.calls.length).toBeGreaterThan(1);
  });

  it('健康检查请求失败：显示降级提示与重试按钮，不弹错误堆栈', async () => {
    vi.spyOn(api, 'health').mockRejectedValue(new TypeError('fetch failed'));
    renderShell('/');

    expect(await screen.findByText('后端连接不可用')).toBeInTheDocument();
    expect(screen.getByText(/请检查 daemon 与 BFF/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
    // 不把原始错误暴露给用户
    expect(screen.queryByText(/fetch failed/)).not.toBeInTheDocument();
  });

  it('失败提示条可关闭', async () => {
    vi.spyOn(api, 'health').mockRejectedValue(new TypeError('fetch failed'));
    renderShell('/');

    await userEvent.click(await screen.findByRole('button', { name: '关闭' }));
    await waitFor(() =>
      expect(screen.queryByText('后端连接不可用')).not.toBeInTheDocument(),
    );
  });
});

/* ==========================================================================
   v2.1 消息队列持久化恢复（P1）：刷新/重连后从 GET /tasks/{id}/messages
   恢复排队消息（Composer 排队列表对齐后端），已发送历史不重复显示。
   ========================================================================== */

describe('v2.1 消息队列持久化恢复（P1）', () => {
  const TASK2 = 'run-20261011-queue000-qqq1';

  function renderMonitor() {
    vi.spyOn(api, 'getTask').mockResolvedValue(
      snapshot({ task_id: TASK2, run_status: 'RUNNING' }),
    );
    vi.spyOn(api, 'getReport').mockResolvedValue({ status: 'generating' });
    vi.spyOn(api, 'getEvidence').mockResolvedValue({
      task_id: TASK2,
      evidence: [],
      conclusions: [],
      trace: [],
    });
    seedTask(TASK2, {
      snapshot: snapshot({ task_id: TASK2, run_status: 'RUNNING' }),
    });
    return renderAt(<MonitorPage />, {
      at: `/monitor/${TASK2}`,
      pattern: '/monitor/:id',
    });
  }

  beforeEach(() => {
    resetStores();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('openTask 时拉取消息队列：排队消息恢复为 queued，历史恢复为 done，不重复', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      task_id: TASK2,
      busy: true,
      pending: [
        {
          turn_id: 'turn-p1',
          task_id: TASK2,
          action: 'ask',
          text: '排队中的第一条',
          order: 1,
          queued_at: '2026-10-11T05:00:00.000Z',
          status: 'queued',
        },
        {
          turn_id: 'turn-p2',
          task_id: TASK2,
          action: 'ask',
          text: '排队中的第二条',
          order: 2,
          queued_at: '2026-10-11T05:00:10.000Z',
          status: 'queued',
        },
      ],
      active: null,
      history: [
        {
          turn_id: 'turn-h1',
          task_id: TASK2,
          action: 'revise',
          text: '已发送的修订请求',
          order: 1,
          queued_at: '2026-10-11T04:50:00.000Z',
          status: 'done',
        },
      ],
    });
    renderMonitor();

    await waitFor(() => {
      const entry = useTaskStore.getState().byId[TASK2];
      expect(
        entry?.messages.filter((m) => m.status === 'queued').map((m) => m.turn_id),
      ).toEqual(['turn-p1', 'turn-p2']);
    });
    const entry = useTaskStore.getState().byId[TASK2];
    const history = entry?.messages.filter((m) => m.status === 'done') ?? [];
    expect(history.map((m) => m.turn_id)).toEqual(['turn-h1']);
    // 排队顺序恢复给 Composer 的"第 N 位"
    expect(
      entry?.messages.find((m) => m.turn_id === 'turn-p2')?.queued_order,
    ).toBe(2);
  });

  it('本地乐观消息与后端队列同在时不重复：同 turn_id 只保留一条', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      task_id: TASK2,
      busy: false,
      pending: [
        {
          turn_id: 'turn-same',
          task_id: TASK2,
          action: 'ask',
          text: '同一条消息',
          order: 1,
          queued_at: '2026-10-11T05:00:00.000Z',
          status: 'queued',
        },
      ],
      active: null,
      history: [],
    });
    // 模拟实时路径已经收到过这条消息（SSE message 帧的落库形状）
    seedTask(TASK2, {
      snapshot: snapshot({ task_id: TASK2, run_status: 'RUNNING' }),
      messages: [
        {
          id: 'turn-same-user',
          turn_id: 'turn-same',
          role: 'user',
          text: '同一条消息',
          status: 'queued',
          queued_order: 1,
          ts: '2026-10-11T05:00:00.000Z',
          seq: 5,
        },
      ],
    });
    renderMonitor();

    await waitFor(() =>
      expect(
        useTaskStore
          .getState()
          .byId[TASK2]?.messages.filter((m) => m.turn_id === 'turn-same'),
      ).toHaveLength(1),
    );
  });

  it('队列查询失败不影响任务页打开（静默降级，不弹错误）', async () => {
    vi.spyOn(api, 'listMessages').mockRejectedValue(new ApiError('NETWORK'));
    renderMonitor();

    await waitFor(() => {
      const entry = useTaskStore.getState().byId[TASK2];
      expect(entry?.snapshot?.run_status).toBe('RUNNING');
    });
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

/* ==========================================================================
   v2.1 报告页 Markdown 下载（P2）
   ========================================================================== */

describe('v2.1 报告页 Markdown 下载（P2）', () => {
  const TASK3 = 'run-20261011-mdown00-mm1';

  beforeEach(() => {
    resetStores();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('导出区提供"下载 Markdown"按钮：点击调用直下接口并给成功 Toast', async () => {
    vi.spyOn(api, 'getTask').mockResolvedValue(
      snapshot({ task_id: TASK3, run_status: 'DONE' }),
    );
    vi.spyOn(api, 'getReport').mockResolvedValue({ status: 'ready' });
    vi.spyOn(api, 'getEvidence').mockResolvedValue({
      task_id: TASK3,
      evidence: [],
      conclusions: [],
      trace: [],
    });
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      task_id: TASK3,
      busy: false,
      pending: [],
      active: null,
      history: [],
    });
    const download = vi.spyOn(api, 'downloadReportMd').mockResolvedValue({
      ok: true,
      kind: 'report',
      filename: `${TASK3}.md`,
      mime: 'text/markdown;charset=utf-8',
      content: '# 报告',
    });
    seedTask(TASK3, {
      snapshot: snapshot({ task_id: TASK3, run_status: 'DONE' }),
      reportStatus: 'ready',
    });
    renderAt(<ExportPanel taskId={TASK3} taskDone />, { at: '/report/x' });

    await userEvent.click(
      await screen.findByRole('button', { name: /报告 Markdown（原始文件）/ }),
    );

    await waitFor(() => expect(download).toHaveBeenCalledWith(TASK3));
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]?.key).toBe('export.doneReport'),
    );
  });

  it('报告未就绪时下载失败给可读 Toast，不抛栈', async () => {
    vi.spyOn(api, 'getTask').mockResolvedValue(
      snapshot({ task_id: TASK3, run_status: 'RUNNING' }),
    );
    vi.spyOn(api, 'getReport').mockResolvedValue({ status: 'generating' });
    vi.spyOn(api, 'getEvidence').mockResolvedValue({
      task_id: TASK3,
      evidence: [],
      conclusions: [],
      trace: [],
    });
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      task_id: TASK3,
      busy: false,
      pending: [],
      active: null,
      history: [],
    });
    vi.spyOn(api, 'downloadReportMd').mockResolvedValue({
      ok: false,
      kind: 'report',
      code: 'NOT_READY',
      error: '报告尚未生成。',
    });
    seedTask(TASK3, {
      snapshot: snapshot({ task_id: TASK3, run_status: 'RUNNING' }),
    });
    renderAt(<ExportPanel taskId={TASK3} taskDone={false} />, { at: '/report/x' });

    await userEvent.click(
      await screen.findByRole('button', { name: /报告 Markdown（原始文件）/ }),
    );

    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]?.key).toBe('export.failed'),
    );
  });
});
