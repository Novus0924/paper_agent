import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { EvidenceItem, TaskSnapshot } from '@/api/types';
import { Composer } from '@/components/business/Composer';
import { ReportView } from '@/components/business/ReportView';
import { formatApa, formatBibtex } from '@/lib/citation';
import { I18nProvider } from '@/i18n';
import { MemoryRouter } from 'react-router-dom';
import { renderApp, renderAt, resetStores, seedTask } from './harness';
import { snapshot } from './helpers';
import { useLiveBackend, type LiveBackend } from './liveEnv';
import { useToastStore } from '@/store/toastStore';
import { useTaskStore } from '@/store/taskStore';

/* ==========================================================================
   v2.2 迭代：Composer 终态可用 / 总览搜索 / 一键重跑 / 引用复制 / 加载骨架
   ========================================================================== */

let backend: LiveBackend;

beforeEach(() => {
  // v2.5：唯一数据通道是 LiveApiClient。用例内部用 spyOn 覆盖具体方法（spy 优先），
  // fake backend 提供 openTask 的 subscribe 底座与 renderApp 的列表数据
  backend = useLiveBackend();
  resetStores();
});

afterEach(() => {
  backend?.unstub();
  vi.restoreAllMocks();
});

/* ---------- 1. Composer 终态可用（P0） ---------- */

describe('v2.2 Composer 终态可用（P0）', () => {
  const TASK = 'run-20261011-term0000-don1';

  function renderComposer(runStatus: 'DONE' | 'FAILED') {
    seedTask(TASK, {
      snapshot: snapshot({ task_id: TASK, run_status: runStatus }),
    });
    return renderAt(<Composer taskId={TASK} running={false} />, { at: '/' });
  }

  it('终态任务的追问照常发送，不再被 UI 预判拒绝', async () => {
    const send = vi
      .spyOn(api, 'sendMessage')
      .mockResolvedValue({ queued: false, turn_id: 'srv-1' });
    renderComposer('DONE');

    const ta = screen.getByRole('textbox', { name: '追问或修订内容' });
    expect(ta).toBeEnabled();
    await userEvent.type(ta, '补充实验对比数据{Enter}');
    expect(send).toHaveBeenCalledWith(TASK, '补充实验对比数据', 'ask');
  });

  it('终态任务发送失败（旧 BFF 409）时内容保留并给出可读 Toast', async () => {
    vi.spyOn(api, 'sendMessage').mockRejectedValue(new ApiError('BAD_STATE'));
    renderComposer('FAILED');

    await userEvent.type(
      screen.getByRole('textbox', { name: '追问或修订内容' }),
      '这条会被旧后端拒绝{Enter}',
    );
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]?.key).toBe('errors.BAD_STATE'),
    );
  });

  it('终态下不再出现"任务已进入终态"的拒绝文案', async () => {
    renderComposer('DONE');
    expect(screen.queryByText(/409 BAD_STATE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/终态任务的产物与账本不可变/)).not.toBeInTheDocument();
  });
});

/* ---------- 2. 总览任务搜索（P1） ---------- */

describe('v2.2 总览任务搜索（P1）', () => {
  const A: TaskSnapshot = snapshot({
    task_id: 'run-20261011-srch0000-aaa1',
    run_status: 'DONE',
    title: '固态电解质界面阻抗研究',
    goal: '检索并综述固态电解质界面阻抗的表征方法',
  });
  const B: TaskSnapshot = snapshot({
    task_id: 'run-20261011-srch0000-bbb2',
    run_status: 'RUNNING',
    title: '钙钛矿电池缺陷钝化研究',
    goal: '钙钛矿太阳能电池缺陷钝化主流策略',
  });

  it('关键词对 goal/title 过滤，300ms 防抖后生效', async () => {
    vi.spyOn(api, 'listTasks').mockResolvedValue([A, B]);
    renderApp('/');

    const box = await screen.findByRole('searchbox', { name: '搜索任务' });
    await userEvent.type(box, '钙钛矿');
    // 过滤后表格里只剩匹配任务（侧栏最近任务列表不受影响）
    const table = await screen.findByRole('table');
    await waitFor(() =>
      expect(within(table).queryByText('固态电解质界面阻抗研究')).not.toBeInTheDocument(),
    );
    expect(within(table).getByText('钙钛矿电池缺陷钝化研究')).toBeInTheDocument();
  });

  it('搜索无结果给空态与清空动作', async () => {
    vi.spyOn(api, 'listTasks').mockResolvedValue([A, B]);
    renderApp('/');

    const box = await screen.findByRole('searchbox', { name: '搜索任务' });
    await userEvent.type(box, '量子点');
    expect(await screen.findByText('没有匹配的任务')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(await screen.findByText('固态电解质界面阻抗研究')).toBeInTheDocument();
  });
});

/* ---------- 3. 一键重跑（P1） ---------- */

describe('v2.2 一键重跑（P1）', () => {
  const TASK = 'run-20261011-rerun000-rrr1';

  function stubTask() {
    vi.spyOn(api, 'getTask').mockResolvedValue(
      snapshot({
        task_id: TASK,
        run_status: 'DONE',
        goal: '检索并综述固态电解质界面阻抗的表征方法',
        workflow: 'materials',
        sources: ['crossref', 'openalex'],
      }),
    );
    vi.spyOn(api, 'getReport').mockResolvedValue({ status: 'generating' });
    vi.spyOn(api, 'getEvidence').mockResolvedValue({
      task_id: TASK,
      evidence: [],
      conclusions: [],
      trace: [],
    });
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      task_id: TASK,
      busy: false,
      pending: [],
      active: null,
      history: [],
    });
  }

  it('报告页"再次研究"跳转 /new 并预填 goal 与工作流', async () => {
    stubTask();
    renderApp(`/report/${TASK}`);

    await userEvent.click(await screen.findByRole('button', { name: '再次研究' }));
    const ta = await screen.findByRole('textbox', { name: /你想研究什么/ });
    expect(ta).toHaveValue('检索并综述固态电解质界面阻抗的表征方法');
    // workflow 预填为原任务的 materials，用户可改后提交
    expect(screen.getByRole('radio', { name: /材料体系分析/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('无预填 state 时新建页保持空白，不影响普通新建', async () => {
    renderApp('/new');
    const ta = await screen.findByRole('textbox', { name: /你想研究什么/ });
    expect(ta).toHaveValue('');
  });
});

/* ---------- 4. 引用一键复制（P1） ---------- */

const EV: EvidenceItem = {
  ev_id: 'EV-0001',
  tier: 'fact',
  kind: 'literature',
  title: '固态电解质界面阻抗 EIS 建模综述',
  ref: '10.1039/d2ee01234a',
  producer_step: 'R1',
  year: '2022',
  authors: 'Zhang, L.; Wang, H.',
};

const REPORT = {
  task_id: 'run-20261011-cite000-ccc1',
  title: '综述报告',
  abstract: '摘要文本',
  sections: [],
  conclusions: [
    {
      cid: 'C-0001',
      text: 'EIS 是基础手段。',
      evidence_ids: ['EV-0001'],
      cite_no: 1,
    },
  ],
};

describe('v2.2 引用一键复制（P1）', () => {
  function writeText() {
    return vi.fn().mockResolvedValue(undefined);
  }

  function renderReportView() {
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/']}>
          <ReportView
            taskId="run-20261011-cite000-ccc1"
            report={REPORT}
            evidence={[EV]}
          />
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  it('APA 格式化：作者（年份）+ 标题 + DOI；作者缺失用既有口径文案', () => {
    expect(formatApa(EV)).toBe(
      'Zhang, L.; Wang, H. (2022). 固态电解质界面阻抗 EIS 建模综述. 10.1039/d2ee01234a',
    );
    expect(
      formatApa({ ...EV, authors: undefined }),
    ).toContain('（作者信息缺失）');
  });

  it('BibTeX 格式化：key=第一作者姓+year，含 author/title/journal/doi', () => {
    const bib = formatBibtex(EV);
    expect(bib).toMatch(/^@article\{Zhang2022,/);
    expect(bib).toContain('author = {Zhang, L.; Wang, H.}');
    expect(bib).toContain('title = {固态电解质界面阻抗 EIS 建模综述}');
    expect(bib).toContain('doi = {10.1039/d2ee01234a}');
  });

  it('结论行点击 APA 复制：写入剪贴板并提示成功', async () => {
    const write = writeText();
    Object.assign(navigator, { clipboard: { writeText: write } });
    renderReportView();

    // v2.5：参考文献行派生自真实数据后也带复制按钮，结论行与文献行各一枚——取首枚（结论行）
    const apaButtons = screen.getAllByRole('button', { name: 'APA' });
    expect(apaButtons.length).toBeGreaterThanOrEqual(2);
    await userEvent.click(apaButtons[0] as HTMLElement);
    await waitFor(() => expect(write).toHaveBeenCalledOnce());
    expect(write.mock.calls[0]?.[0]).toContain('Zhang, L.; Wang, H. (2022)');
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]?.key).toBe('report.copiedApa'),
    );
  });

  it('证据卡提供 BibTeX 复制并提示成功', async () => {
    const write = writeText();
    Object.assign(navigator, { clipboard: { writeText: write } });
    renderReportView();

    const bibButtons = screen.getAllByRole('button', { name: 'BibTeX' });
    expect(bibButtons.length).toBeGreaterThanOrEqual(2);
    await userEvent.click(bibButtons[0] as HTMLElement);
    await waitFor(() => expect(write).toHaveBeenCalledOnce());
    expect(write.mock.calls[0]?.[0]).toMatch(/^@article\{Zhang2022,/);
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]?.key).toBe('report.copiedBibtex'),
    );
  });
});

/* ---------- 5. 加载骨架（P1） ---------- */

describe('v2.2 加载骨架（P1）', () => {
  it('报告页首载等待期间显示骨架屏，不留空白', async () => {
    vi.spyOn(api, 'getTask').mockReturnValue(new Promise(() => {}));
    seedTask('run-20261011-skel000-sss1');
    renderApp('/report/run-20261011-skel000-sss1');

    await waitFor(() =>
      expect(document.querySelector('[aria-busy="true"]')).not.toBeNull(),
    );
  });

  it('证据页首载等待期间同样显示骨架屏', async () => {
    vi.spyOn(api, 'getTask').mockReturnValue(new Promise(() => {}));
    seedTask('run-20261011-skel000-sss2');
    renderApp('/evidence/run-20261011-skel000-sss2');

    await waitFor(() =>
      expect(document.querySelector('[aria-busy="true"]')).not.toBeNull(),
    );
  });
});

/* ---------- 6. 正文证据角标（P1） ---------- */

describe('v2.2 正文证据角标（P1）', () => {
  const TASK = 'run-20261011-badge00-bbb1';
  const SECTION_REPORT = {
    task_id: TASK,
    title: '报告',
    abstract: '',
    sections: [
      {
        id: 'findings',
        title: '核心发现',
        body: 'EIS 是基础手段 [EV-0001]，配合 DRT 分析 [EV-0002] 可区分界面贡献。',
      },
    ],
    conclusions: [],
  };

  it('正文 [EV-xxxx] 渲染为上标徽章链接，hover 提示证据标题', async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/']}>
          <ReportView
            taskId={TASK}
            report={SECTION_REPORT}
            evidence={[EV, { ...EV, ev_id: 'EV-0002', title: 'DRT 应用研究' }]}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    const badges = await screen.findAllByRole('link', { name: /^EV-\d{4}$/ });
    const badge = badges[0] as HTMLAnchorElement;
    expect(badge.getAttribute('href')).toBe(`/evidence/${TASK}?ev=EV-0001`);
    expect(badge.getAttribute('title')).toBe('EV-0001 · 固态电解质界面阻抗 EIS 建模综述');
    expect(
      badges.find((b) => b.textContent === 'EV-0002')?.getAttribute('title'),
    ).toBe('EV-0002 · DRT 应用研究');
  });

  it('点击正文角标跳转到证据页并定位该条', async () => {
    vi.spyOn(api, 'getTask').mockResolvedValue(
      snapshot({ task_id: TASK, run_status: 'DONE' }),
    );
    vi.spyOn(api, 'getReport').mockResolvedValue({
      status: 'ready',
      report: SECTION_REPORT,
    });
    vi.spyOn(api, 'getEvidence').mockResolvedValue({
      task_id: TASK,
      evidence: [],
      conclusions: [],
      trace: [],
    });
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      task_id: TASK,
      busy: false,
      pending: [],
      active: null,
      history: [],
    });
    renderApp(`/report/${TASK}`);

    const badge = (await screen.findAllByRole('link', { name: /^EV-\d{4}$/ }))[0] as HTMLElement;
    await userEvent.click(badge);
    expect(
      await screen.findByRole('heading', { level: 1, name: '证据溯源' }),
    ).toBeInTheDocument();
  });
});

/* ---------- 7. 消息 id 竞态去重（duplicate key 修复） ---------- */

describe('v2.2 消息 id 竞态去重', () => {
  it('SSE user 帧先到时，POST 回包不再插入重复的 turn-user 消息', async () => {
    const TASK = 'run-20261011-racedup-01';
    seedTask(TASK, { snapshot: snapshot({ task_id: TASK, run_status: 'DONE' }) });
    vi.spyOn(api, 'sendMessage').mockResolvedValue({
      queued: false,
      turn_id: 'turn-9',
      status: 'running',
    });

    const store = useTaskStore.getState();
    // 真实时序：服务端投递一开始就广播 user running（SSE 先于 HTTP 回包到达）
    store.applyEvent(TASK, {
      event: 'message',
      seq: 1,
      ts: '2026-10-11T15:00:00.000Z',
      data: {
        turn_id: 'turn-9',
        role: 'user',
        status: 'running',
        text: '这份报告的局限是什么？',
      },
    } as never);

    await useTaskStore.getState().sendMessage(TASK, '这份报告的局限是什么？', 'ask');

    const entry = useTaskStore.getState().byId[TASK];
    const messages = entry?.messages ?? [];
    const dup = messages.filter((m) => m.id === 'turn-9-user');
    expect(dup).toHaveLength(1);
    expect(dup[0]?.text).toBe('这份报告的局限是什么？');
  });
});
