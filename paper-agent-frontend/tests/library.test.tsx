import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/api/client';
import { LiveApiClient } from '@/api/httpClient';
import type { LibraryEvidenceResponse } from '@/api/types';
import { renderApp, resetStores } from './harness';

/**
 * FE-14 文献库：跨任务证据汇总。
 * 契约（冻结）：GET /api/v1/library/evidence
 *   ?q=&kind=&tier=&source=&task_id=&dedupe=on&limit=50&offset=0
 *   → { total, tasks_scanned, items:[{ev_id,task_id,task_goal,tier,kind,title,
 *        ref:{doi,title,authors,year,venue,source},producer_step,duplicates_count}],
 *        offset, limit }
 */

const UI_KEY = 'paper-agent-frontend.ui';
const LOCALE_KEY = 'paper-agent-frontend.locale';

beforeEach(() => {
  resetStores();
  localStorage.removeItem(UI_KEY);
  localStorage.removeItem(LOCALE_KEY);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ============================================================ mock 契约 */

describe('文献库 mock 契约同形', () => {
  it('默认按 DOI 去重：合并同 DOI 记录并累加 duplicates_count', async () => {
    const res = await api.listLibraryEvidence();
    expect(res.tasks_scanned).toBe(3);
    // 23 条原始证据 → 去重后 19 条（同一 DOI 被多个任务/同任务多次检索到；synthesis 无 DOI 独立成条）
    expect(res.total).toBe(19);

    const merged = res.items.find(
      (it) => it.ref.doi === '10.1039/d2ee01234a',
    );
    expect(merged, '同一 DOI 应只保留一条代表项').toBeTruthy();
    expect(merged?.duplicates_count).toBe(2);
  });

  it('dedupe=false 时不做合并，条数回到原始 23 条', async () => {
    const res = await api.listLibraryEvidence({ dedupe: false });
    expect(res.total).toBe(23);
    expect(res.items.every((it) => it.duplicates_count === 0)).toBe(true);
    expect(
      res.items.filter((it) => it.ref.doi === '10.1039/d2ee01234a'),
    ).toHaveLength(3);
  });

  it('跨任务同 DOI 合并（回归）：三条副本来自多个任务，合并为一条', async () => {
    const raw = await api.listLibraryEvidence({ dedupe: false, limit: 100 });
    const copies = raw.items.filter((it) => it.ref.doi === '10.1039/d2ee01234a');
    expect(copies).toHaveLength(3);
    expect(new Set(copies.map((c) => c.task_id)).size).toBeGreaterThan(1);
    const merged = (await api.listLibraryEvidence({ limit: 100 })).items.find(
      (it) => it.ref.doi === '10.1039/d2ee01234a',
    );
    expect(merged?.duplicates_count).toBe(2);
  });

  it('同任务同 DOI 合并：同任务两条副本合并为一条', async () => {
    const DOI = '10.1038/s41578-023-00601-x';
    const raw = await api.listLibraryEvidence({ dedupe: false, limit: 100 });
    const copies = raw.items.filter((it) => it.ref.doi === DOI);
    expect(copies, '同任务同 DOI 应有两条原始副本').toHaveLength(2);
    expect(new Set(copies.map((c) => c.task_id)).size, '两条应属同一任务').toBe(1);

    const merged = (await api.listLibraryEvidence({ limit: 100 })).items.find(
      (it) => it.ref.doi === DOI,
    );
    expect(merged?.duplicates_count).toBe(1);
  });

  /**
   * 无 DOI（产物）不聚合的回归：真实后端 ev_id（EV-0001…）每个任务从 1 起编、跨任务会重复，
   * 若分组键只用 ev_id，不同任务里的无 DOI 证据会被错误合并。这里构造 ev_id 冲突场景，
   * 断言两条都保留、duplicates_count 恒为 0。
   */
  it('无 DOI 证据跨任务不聚合：ev_id 冲突也各自保留、duplicates_count=0', async () => {
    const res = await api.listLibraryEvidence({ limit: 100 });
    const noDoi = res.items.filter((it) => it.ref.doi === '');
    expect(noDoi).toHaveLength(11);
    expect(noDoi.every((it) => it.duplicates_count === 0)).toBe(true);

    // 每个 ev_id 归属到哪些任务：必须存在"同一 ev_id 横跨多个任务"的情形（否则该用例失去意义）
    const tasksByEv = new Map<string, Set<string>>();
    for (const it of noDoi) {
      const set = tasksByEv.get(it.ev_id) ?? new Set<string>();
      set.add(it.task_id);
      tasksByEv.set(it.ev_id, set);
    }
    const colliding = [...tasksByEv.entries()].filter(([, tasks]) => tasks.size >= 2);
    expect(colliding.length, '种子应包含跨任务重复 ev_id 的无 DOI 证据').toBeGreaterThan(0);
    // 冲突 ev_id 的每一条都必须保留且未被合并
    for (const it of noDoi) {
      if ((tasksByEv.get(it.ev_id)?.size ?? 0) >= 2) {
        expect(it.duplicates_count, `${it.ev_id} 跨任务被误合并`).toBe(0);
      }
    }
  });

  it('task_id 映射回真实任务，报告跳转可落地', async () => {
    const res = await api.listLibraryEvidence({ limit: 1 });
    expect(res.items[0]?.task_id).toMatch(/^run-/);
  });

  it('代表项取最新任务的那条（排序对齐后端：任务时间降序）', async () => {
    const res = await api.listLibraryEvidence({ q: '10.1039/d2ee01234a' });
    expect(res.items).toHaveLength(1);
    // 该 DOI 同时出现在 3 个任务里；代表项应为最新任务（运行中的硬碳任务）
    expect(res.items[0]?.task_goal).toContain('硬碳');
    expect(res.items[0]?.duplicates_count).toBe(2);
  });

  it('无 DOI 的产物永不合并（键带 task_id，跨任务重名也不吃）', async () => {
    const res = await api.listLibraryEvidence({ limit: 100 });
    const artifacts = res.items.filter((it) => it.ref.doi === '');
    expect(artifacts).toHaveLength(11);
    expect(artifacts.every((it) => it.duplicates_count === 0)).toBe(true);
  });

  it('kind / tier / source / q 过滤各自生效', async () => {
    const lit = await api.listLibraryEvidence({ kind: 'literature', limit: 100 });
    expect(lit.items.every((it) => it.kind === 'literature')).toBe(true);
    expect(lit.items.length).toBeGreaterThan(0);

    const artifact = await api.listLibraryEvidence({ tier: 'artifact', limit: 100 });
    expect(artifact.items.every((it) => it.tier === 'artifact')).toBe(true);

    const arxiv = await api.listLibraryEvidence({ source: 'arxiv', limit: 100 });
    expect(arxiv.items.every((it) => it.ref.source === 'arxiv')).toBe(true);
    expect(arxiv.items.length).toBeGreaterThan(0);

    const byDoi = await api.listLibraryEvidence({ q: '10.1039/d2ee01234a' });
    expect(byDoi.total).toBe(1);
  });

  it('limit / offset 分页：offset 前移返回不同条目', async () => {
    const first = await api.listLibraryEvidence({ limit: 5, offset: 0 });
    const second = await api.listLibraryEvidence({ limit: 5, offset: 5 });
    expect(first.items).toHaveLength(5);
    expect(second.items).toHaveLength(5);
    expect(first.items[0]?.ev_id).not.toBe(second.items[0]?.ev_id);
    expect(first.total).toBe(19);
  });
});

/* ======================================================== Live 查询串 */

describe('文献库 Live 契约（GET /library/evidence）', () => {
  const BASE = 'http://127.0.0.1:8787';
  const EMPTY: LibraryEvidenceResponse = {
    total: 0,
    tasks_scanned: 0,
    items: [],
    offset: 0,
    limit: 50,
  };

  function stubFetch() {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : String(input);
        calls.push(url);
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => EMPTY,
        } as unknown as Response;
      }),
    );
    return calls;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('按契约下发 q/kind/tier/source/dedupe/limit/offset', async () => {
    const calls = stubFetch();
    await new LiveApiClient(BASE).listLibraryEvidence({
      q: '固态',
      kind: 'literature',
      tier: 'fact',
      source: 'arxiv',
      dedupe: false,
      limit: 20,
      offset: 40,
    });
    const url = calls[0] ?? '';
    expect(url.startsWith(`${BASE}/api/v1/library/evidence?`)).toBe(true);
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.get('q')).toBe('固态');
    expect(qs.get('kind')).toBe('literature');
    expect(qs.get('tier')).toBe('fact');
    expect(qs.get('source')).toBe('arxiv');
    expect(qs.get('dedupe')).toBe('off');
    expect(qs.get('limit')).toBe('20');
    expect(qs.get('offset')).toBe('40');
  });
});

/* ================================================================ 界面 */

describe('FE-14 文献库界面', () => {
  it('侧栏新增「文献库」，落在 /library 且标记为当前页', async () => {
    renderApp('/library');
    // 侧栏导航包在 aria-label="工作台" 的 aside 里（nav 元素本身无名）
    const nav = await screen.findByRole('complementary', { name: '工作台' });
    const link = within(nav).getByRole('link', { name: '文献库' });
    expect(link).toHaveAttribute('href', '/library');
    expect(link).toHaveAttribute('aria-current', 'page');
    // 顶部上下文栏标题也是文献库（唯一 h1）
    expect(
      screen.getByRole('heading', { level: 1, name: '文献库' }),
    ).toBeInTheDocument();
  });

  it('列表渲染跨任务证据，统计条给出收录 / 覆盖任务 / 去重合并', async () => {
    const { container } = renderApp('/library');
    expect(
      await screen.findByText('固态电解质界面阻抗 EIS 建模综述'),
    ).toBeInTheDocument();

    const stats = container.querySelector('[class*="stats"]') as HTMLElement;
    expect(stats.textContent).toContain('收录文献');
    expect(stats.textContent).toContain('覆盖任务');
    expect(stats.textContent).toContain('去重合并');
    expect(stats.textContent).toContain('19');
    expect(stats.textContent).toContain('3');

    // 首屏作者 / 年份 / 来源徽标可读
    expect(screen.getByText('N. Kumar 等 · 2022 · Energy & Environmental Science')).toBeInTheDocument();
    expect(screen.getAllByText('Crossref').length).toBeGreaterThan(0);
  });

  it('同 DOI 记录带「合并 N 条」徽标，来源任务链接指向 /report/:task_id', async () => {
    renderApp('/library');
    await screen.findByText('固态电解质界面阻抗 EIS 建模综述');

    expect(screen.getByText('合并 2 条')).toBeInTheDocument();
    expect(screen.getByText('合并 1 条')).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: /来源任务/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.getAttribute('href')).toMatch(/^\/report\/run-/);
  });

  it('搜索 300ms 防抖后过滤列表', async () => {
    renderApp('/library');
    await screen.findByText('固态电解质界面阻抗 EIS 建模综述');
    expect(screen.getByText('硬碳负极孔径分布与钠储存机理')).toBeInTheDocument();

    const box = screen.getByRole('searchbox', { name: '搜索文献' });
    fireEvent.change(box, { target: { value: '10.1039/d2ee01234a' } });

    await waitFor(() =>
      expect(
        screen.queryByText('硬碳负极孔径分布与钠储存机理'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText('固态电解质界面阻抗 EIS 建模综述')).toBeInTheDocument();
  });

  it('按类型筛选：只留选定 kind', async () => {
    renderApp('/library');
    await screen.findByText('固态电解质界面阻抗 EIS 建模综述');

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '按类型' }),
      'literature',
    );
    await waitFor(() =>
      expect(screen.queryByText('孔径调控术语与表征口径笔记')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('固态电解质界面阻抗 EIS 建模综述')).toBeInTheDocument();
  });

  it('关闭「按 DOI 去重」后不再合并同 DOI 记录', async () => {
    renderApp('/library');
    await screen.findByText('合并 2 条');

    await userEvent.click(screen.getByRole('checkbox', { name: /按 DOI 去重/ }));
    await waitFor(() => expect(screen.queryByText(/合并 \d+ 条/)).not.toBeInTheDocument());
  });

  it('客户端分页：翻到第二页给出后一半条目', async () => {
    renderApp('/library');
    await screen.findByText('固态电解质界面阻抗 EIS 建模综述');
    // 首屏分页信息（19 条 / 每页 10）
    expect(screen.getByText('第 1–10 条 / 共 19 条')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() =>
      expect(screen.getByText('分子钝化剂对钙钛矿界面缺陷的钝化机理')).toBeInTheDocument(),
    );
    expect(
      screen.queryByText('固态电解质界面阻抗 EIS 建模综述'),
    ).not.toBeInTheDocument();
  });

  /**
   * QA 终验回归：内核 S1 综合回答产出 kind='synthesis'，前端若未登记文案会在
   * t(undefined) 上抛 TypeError 导致整页白屏。synthesis 排在各任务组末尾，正是第 2 页。
   */
  it('S1 综合回答（synthesis）在第 2 页以「综合回答」徽标渲染，翻页不再白屏', async () => {
    renderApp('/library');
    await screen.findByText('固态电解质界面阻抗 EIS 建模综述');

    await userEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(await screen.findByText('综合回答')).toBeInTheDocument();
    expect(
      screen.queryByText('固态电解质界面阻抗 EIS 建模综述'),
    ).not.toBeInTheDocument();
  });

  // 防御兜底：后端/内核将来新增 kind，前端即便未及登记文案也必须降级为原值，而不是崩溃
  it('未知 kind 退化为原值字符串，不再整页崩溃', async () => {
    vi.spyOn(api, 'listLibraryEvidence').mockResolvedValue({
      total: 1,
      tasks_scanned: 1,
      items: [
        {
          ev_id: 'EV-0001',
          task_id: 'run-20261009-100000-abcdef',
          task_goal: '某研究任务',
          tier: 'artifact',
          kind: 'mystery' as never,
          title: '未来新增类型的证据',
          ref: {
            doi: '',
            title: '未来新增类型的证据',
            authors: '',
            year: '',
            venue: '',
            source: 'local',
          },
          producer_step: 'S9',
          duplicates_count: 0,
        },
      ],
      offset: 0,
      limit: 200,
    });
    renderApp('/library');

    expect(await screen.findByText('未来新增类型的证据')).toBeInTheDocument();
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });

  it('筛选无结果给出 noMatch 与清空动作', async () => {
    renderApp('/library');
    await screen.findByText('固态电解质界面阻抗 EIS 建模综述');

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索文献' }), {
      target: { value: 'zzz-不存在的关键词-zzz' },
    });
    expect(await screen.findByText('没有匹配的文献')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(
      await screen.findByText('固态电解质界面阻抗 EIS 建模综述'),
    ).toBeInTheDocument();
  });

  it('库里没有任何证据时给出引导新建任务', async () => {
    vi.spyOn(api, 'listLibraryEvidence').mockResolvedValue({
      total: 0,
      tasks_scanned: 0,
      items: [],
      offset: 0,
      limit: 200,
    });
    renderApp('/library');
    expect(await screen.findByText('文献库还没有证据')).toBeInTheDocument();
    expect(
      screen.getByText('先完成一个研究任务，系统登记的证据会在这里跨任务汇总。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /去新建任务/ })).toBeInTheDocument();
  });
});
