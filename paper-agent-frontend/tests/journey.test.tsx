import {
  afterEach,
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportPanel } from '@/components/business/ExportPanel';
import { api } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { HealthInfo, TaskSnapshot } from '@/api/types';
import { PAGE_SIZE } from '@/lib/paginate';
import { isTerminal } from '@/lib/status';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useHealthStore } from '@/store/healthStore';
import { renderApp, renderAt, resetStores } from './harness';

/**
 * 主旅程（Mock 运行时 + 真 store + 真订阅补发）：
 * 总览 → 新建 → 运行监控 → 报告 → 证据 → 导出 → 健康自检，覆盖 FE-03/04/05/06/07/08/09/10/14 与 P-01…P-07。
 */
let seeded: TaskSnapshot[] = [];
let doneTask: TaskSnapshot;
let degradedTask: TaskSnapshot;
let failedTask: TaskSnapshot;
let runningTask: TaskSnapshot;

const reportTitle = '固态电解质界面阻抗表征方法研究综述（2021–2026）';

/** 任务行用 data-task-id 定位：标识不再默认铺进文案，标题也会互相包含 */
function rowOf(taskId: string): HTMLElement {
  const row = within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .find((r) => r.dataset.taskId === taskId);
  if (!(row instanceof HTMLElement)) throw new Error('任务条目缺少可点击的行');
  return row;
}

beforeEach(async () => {
  resetStores();
  useHealthStore.setState({ health: null, error: null, loading: false });
  seeded = await api.listTasks();
  doneTask = seeded.find((t) => t.run_status === 'DONE' && !t.degraded) as TaskSnapshot;
  degradedTask = seeded.find((t) => t.degraded) as TaskSnapshot;
  failedTask = seeded.find((t) => t.run_status === 'FAILED') as TaskSnapshot;
  runningTask = seeded.find((t) => t.run_status === 'RUNNING') as TaskSnapshot;
});

beforeAll(() => {
  api.demo?.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  resetStores();
  api.demo?.reset();
  vi.restoreAllMocks();
});

describe('FE-03 总览（P-04 历史任务可重开）', () => {
  it('列出全部历史任务、状态与统计口径', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: '总览' }),
    ).toBeInTheDocument();
    // 侧栏历史与任务表用的是同一份快照，标题必须一致
    await waitFor(() =>
      expect(screen.getAllByText(/固态电解质界面阻抗/)).toHaveLength(2),
    );
    expect(screen.getByText('任务总数')).toBeInTheDocument();
    // 状态徽章统一三字后，「执行中」既是统计口径也是运行中任务的状态文案
    expect(screen.getAllByText('执行中').length).toBeGreaterThan(1);
    // '已降级'既是统计口径也是任务状态徽章
    expect(screen.getAllByText('已降级').length).toBeGreaterThan(0);
    expect(screen.getByText('已交付报告')).toBeInTheDocument();
    expect(seeded).toHaveLength(4);
  });

  it('状态徽章统一三字，降级归到状态列而不是研究目标下', async () => {
    renderApp('/');
    await screen.findByRole('table');
    const table = screen.getByRole('table');
    for (const row of within(table).getAllByRole('row').slice(1)) {
      const cells = within(row).getAllByRole('cell');
      // 状态列只能是 1~2 个三字短标签，不能再挂「· 报告已交付」这类长尾
      expect(cells[1]?.textContent).toMatch(/^(待开始|执行中|已完成|未完成)(已降级)?$/);
      expect(cells[0]?.textContent).not.toContain('已降级');
    }
    expect(screen.queryByText(/报告已交付/)).not.toBeInTheDocument();

    const deg = rowOf(degradedTask.task_id);
    const statusCell = within(deg).getByText('已完成').closest('td');
    expect(statusCell).toContainElement(within(deg).getByText('已降级'));
  });

  it('机器标识收进复制徽章：默认视图无 run-/sess- 噪声，但仍可取到', async () => {
    renderApp('/');
    const table = await screen.findByRole('table');
    expect(table.textContent).not.toMatch(/run-\d/);
    expect(table.textContent).not.toMatch(/sess-/);

    const row = rowOf(doneTask.task_id);
    const chip = within(row).getByRole('button', {
      name: `复制 AGH 会话标识 ${doneTask.session_id}`,
    });
    expect(chip).toHaveTextContent('AGH 已记录');
    // P-04 留痕：hover 说明给出任务与会话标识
    expect(chip).toHaveAttribute(
      'title',
      `任务 ${doneTask.task_id} · AGH 会话 ${doneTask.session_id}`,
    );
  });

  it('已完成任务点击后进报告页', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: '总览' });
    await userEvent.click(rowOf(doneTask.task_id));
    expect(
      await screen.findByRole('heading', { level: 1, name: '报告' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: reportTitle })).toBeInTheDocument();
  });

  it('失败任务点击后进监控页拿重跑入口，而不是空报告页', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: '总览' });
    const row = rowOf(failedTask.task_id);
    expect(within(row).getByRole('button', { name: '查看运行监控' })).toBeInTheDocument();
    await userEvent.click(row);
    expect(
      await screen.findByRole('heading', { level: 1, name: '运行监控' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('执行未能完成')).toBeInTheDocument();
    // 步骤条、错误态与卡片动作三处都给续跑入口，任一可点
    for (const btn of screen.getAllByRole('button', { name: '断点续跑' })) {
      expect(btn).toBeEnabled();
    }
    // 任务级视图入口在任务内：失败任务没有报告，但已产出的证据必须还能查（不再依赖全局导航）
    expect(screen.getByRole('button', { name: '证据溯源' })).toBeInTheDocument();
  });
});

describe('FE-04 新建任务向导', () => {
  it('目标为空时不提交，字段旁给人话原因', async () => {
    const create = vi.spyOn(api, 'createTask');
    renderApp('/new');
    expect(await screen.findByText(/描述得越具体/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '创建并开始执行' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('请先填写研究目标。');
    expect(create).not.toHaveBeenCalled();
  });

  it('目标超长时给出上限，而不是静默截断', async () => {
    renderApp('/new');
    const ta = await screen.findByRole('textbox', { name: /你想研究什么/ });
    fireEvent.change(ta, { target: { value: '固'.repeat(401) } });
    await userEvent.click(screen.getByRole('button', { name: '创建并开始执行' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/请精简到 400 字以内/);
  });

  it('取消全部来源后不静默失败，提示参数不合法', async () => {
    renderApp('/new');
    await userEvent.type(
      await screen.findByRole('textbox', { name: /你想研究什么/ }),
      '综述近五年固态电解质界面阻抗的表征方法',
    );
    const boxes = await screen.findAllByRole('checkbox');
    for (const box of boxes) {
      if ((box as HTMLInputElement).checked) await userEvent.click(box);
    }
    await userEvent.click(screen.getByRole('button', { name: '创建并开始执行' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('参数不合法');
    expect(screen.getByText('已填内容已保留，可直接重试。')).toBeInTheDocument();
  });

  it('填写目标后创建任务并自动进入运行监控', async () => {
    const runAll = vi.spyOn(api, 'runAll').mockResolvedValue(undefined);
    renderApp('/new');
    await userEvent.type(
      await screen.findByRole('textbox', { name: /你想研究什么/ }),
      '综述近五年钠离子电池硬碳负极孔径调控对首次库伦效率的影响',
    );
    await userEvent.click(screen.getByRole('button', { name: '创建并开始执行' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: '运行监控' }),
    ).toBeInTheDocument();
    expect(runAll).toHaveBeenCalled();
    expect(useTaskStore.getState().tasks.some((t) => t.goal.includes('硬碳负极'))).toBe(
      true,
    );
  });

  it('切换工作流同步步骤链与摘要', async () => {
    renderApp('/new');
    await userEvent.click(await screen.findByRole('radio', { name: /材料体系分析/ }));
    expect(await screen.findByText(/P1 → P2 → P3 → P4 → P5/)).toBeInTheDocument();
  });

  it('连通性预检把不可用来源讲清影响，且不保留勾选（P-01）', async () => {
    vi.spyOn(api, 'preflight').mockResolvedValue([
      { source: 'arxiv', ok: true, latency_ms: 120 },
      { source: 'crossref', ok: false, detail: 'unavailable:429', latency_ms: 0 },
      { source: 'openalex', ok: true, latency_ms: 90 },
      { source: 'semantic_scholar', ok: true, latency_ms: 300 },
      { source: 'local', ok: true, latency_ms: 5 },
    ]);
    renderApp('/new');
    await userEvent.click(await screen.findByRole('button', { name: '检测连通性' }));
    expect(await screen.findByText(/该来源当前不可用/)).toBeInTheDocument();
    expect(screen.getByText('连通性预检完成。')).toBeInTheDocument();
    const crossref = screen
      .getByLabelText(/Crossref 正式出版/)
      .closest('div') as HTMLElement;
    expect(within(crossref).getByRole('checkbox')).not.toBeChecked();
  });
});

describe('FE-05/06 运行监控（P-01/P-03）', () => {
  it('重进页面由快照 + 事件补发恢复进度，与实时路径同形', async () => {
    renderApp(`/monitor/${runningTask.task_id}`);
    expect(
      await screen.findByRole('heading', { level: 1, name: '运行监控' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      const entry = useTaskStore.getState().byId[runningTask.task_id];
      expect(entry?.snapshot).toBeTruthy();
      expect(entry?.activities.length ?? 0).toBeGreaterThan(0);
    });
    const entry = useTaskStore.getState().byId[runningTask.task_id];
    const steps = entry?.snapshot?.steps.length ?? 0;
    expect(steps).toBeGreaterThan(0);
    expect(entry?.lastSeq).toBeGreaterThan(0);
    expect(screen.getAllByRole('listitem')).toHaveLength(steps);
  });

  it('演示断线说明进度暂停，重连后恢复在线', async () => {
    renderApp(`/monitor/${runningTask.task_id}`);
    await screen.findByRole('heading', { level: 1, name: '运行监控' });
    await userEvent.click(await screen.findByRole('button', { name: '模拟断线' }));
    expect(await screen.findByText(/与执行服务的连接已断开/)).toBeInTheDocument();
    const banner = screen
      .getByText(/与执行服务的连接已断开/)
      .closest('[role="status"]') as HTMLElement;
    await userEvent.click(within(banner).getByRole('button', { name: '重连' }));
    await waitFor(() =>
      expect(useTaskStore.getState().byId[runningTask.task_id]?.connection).toBe(
        'online',
      ),
    );
    expect(screen.queryByText(/与执行服务的连接已断开/)).not.toBeInTheDocument();
  });

  it('失败任务给出未通过原因、重试与改源入口', async () => {
    renderApp(`/monitor/${failedTask.task_id}`);
    expect(await screen.findByText('执行未能完成')).toBeInTheDocument();
    expect(screen.getByText('未通过')).toBeInTheDocument();
    // 步骤条、错误态与卡片动作都提供续跑入口，任一都能点
    const resumes = screen.getAllByRole('button', { name: '断点续跑' });
    expect(resumes.length).toBeGreaterThan(0);
    for (const btn of resumes) expect(btn).toBeEnabled();
    expect(
      screen.getAllByRole('button', { name: '修改数据源后重跑' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/检索来源连续超时/)).toBeInTheDocument();
    expect(useTaskStore.getState().byId[failedTask.task_id]?.snapshot?.run_status).toBe(
      'FAILED',
    );
  });

  it('终态运行的步骤不会停在「进行中」：机械摘要照实读数，种子数据必须先自洽', () => {
    const stale = seeded
      .filter((t) => isTerminal(t.run_status))
      .flatMap((t) =>
        t.steps
          .filter((s) => s.status === 'RUNNING')
          .map((s) => `${t.run_status} 任务 ${t.task_id} 的步骤 ${s.id} 仍是 RUNNING`),
      );
    expect(stale).toEqual([]);
  });

  it('降级任务显示"任务未中断"的说明，而不是失败态', async () => {
    renderApp(`/monitor/${degradedTask.task_id}`);
    expect(await screen.findByText(/已降级 · 任务未中断/)).toBeInTheDocument();
    expect(screen.queryByText('执行未能完成')).not.toBeInTheDocument();
    expect(useTaskStore.getState().byId[degradedTask.task_id]?.snapshot?.degraded).toBe(
      true,
    );
  });
});

describe('FE-07 报告中心（P-02/P-03 报告必达）', () => {
  it('打开报告页即可看到正文、结论、参考文献与诚实声明', async () => {
    renderApp(`/report/${doneTask.task_id}`);
    expect(await screen.findByRole('heading', { name: reportTitle })).toBeInTheDocument();
    expect(screen.getByText('摘要')).toBeInTheDocument();
    expect(screen.getByText('三、核心发现：表征方法对比')).toBeInTheDocument();
    expect(screen.getByText('结论')).toBeInTheDocument();
    expect(screen.getByText('参考文献')).toBeInTheDocument();
    expect(screen.getByText(/系统不会伪造引用/)).toBeInTheDocument();
  });

  it('每条结论都带证据锚点，点击跳到溯源页并定位', async () => {
    renderApp(`/report/${doneTask.task_id}`);
    await screen.findByRole('heading', { name: reportTitle });
    // 徽章的可读名称是 EV 编号，说明性文字放在 title 里
    const badge = screen.getAllByRole('link', {
      name: /^EV-\d{4}$/,
    })[0] as HTMLAnchorElement;
    expect(badge.getAttribute('title')).toMatch(/^查看支撑证据 EV-\d{4}$/);
    expect(badge.getAttribute('href')).toMatch(/^\/evidence\/.+ev=EV-\d{4}$/);
    await userEvent.click(badge);
    expect(
      await screen.findByRole('heading', { level: 1, name: '证据溯源' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/已定位到 EV-\d{4}/)).toBeInTheDocument();
  });

  it('未完成任务不报错，明确说明报告尚未产出', async () => {
    renderApp(`/report/${failedTask.task_id}`);
    expect(await screen.findByText('执行未能完成')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '去看运行进度' })).toBeInTheDocument();
    expect(screen.queryByText('摘要')).not.toBeInTheDocument();
  });

  it('降级任务的报告里带降级声明', async () => {
    renderApp(`/report/${degradedTask.task_id}`);
    expect(await screen.findByText('降级声明')).toBeInTheDocument();
  });
});

describe('FE-08 证据溯源（P-02 渐进披露）', () => {
  it('证据可搜索、可按层级与类型筛选，空结果给清空动作', async () => {
    renderApp(`/evidence/${doneTask.task_id}`);
    await screen.findByRole('heading', { level: 1, name: '证据溯源' });
    await waitFor(() => expect(screen.queryAllByText('EV-0001')).toHaveLength(1));
    expect(screen.queryByText('EV-0012')).not.toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '按层级' }),
      'artifact',
    );
    await waitFor(() => expect(screen.queryByText('EV-0001')).not.toBeInTheDocument());
    expect(screen.getByText('EV-0007')).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '按类型' }),
      'analysis',
    );
    await waitFor(() => expect(screen.queryByText('EV-0007')).not.toBeInTheDocument());
    expect(screen.getByText('EV-0008')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: '搜索' }), '不存在的关键词');
    expect(await screen.findByText('没有符合条件的证据')).toBeInTheDocument();
    expect(screen.getByText('调整层级、类型或清空搜索词试试。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(await screen.findByText('EV-0001')).toBeInTheDocument();
  });

  it('长列表分页：一页装不下时翻页，筛选后回到第一页', async () => {
    renderApp(`/evidence/${doneTask.task_id}`);
    await screen.findByRole('heading', { level: 1, name: '证据溯源' });

    // 12 条按每页 10 条分页：第一页只应看到前 10 条
    await waitFor(() => expect(screen.getByText(/共 12 条/)).toBeInTheDocument());
    expect(screen.getByText('EV-0001')).toBeInTheDocument();
    expect(screen.queryByText('EV-0011')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(await screen.findByText('EV-0012')).toBeInTheDocument();
    expect(screen.queryByText('EV-0001')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();

    // 翻页后改筛选条件要回到第 1 页，否则可能停在空白页
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '按层级' }),
      'artifact',
    );
    expect(await screen.findByText('EV-0007')).toBeInTheDocument();
    expect(screen.queryByText(/共 \d+ 条/)).not.toBeInTheDocument();
  });

  it('深链的证据在后一页时自动跳到那一页', async () => {
    renderApp(`/evidence/${doneTask.task_id}?ev=EV-0012`);
    const card = await waitFor(() => {
      const el = document.getElementById('EV-0012');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(card.textContent).toContain('EV-0012');
  });

  it('哈希只在展开的审计细节里，主视图不贴原始哈希', async () => {
    renderApp(`/evidence/${doneTask.task_id}?ev=EV-0005`);
    const card = await waitFor(() => {
      const el = document.getElementById('EV-0005');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    expect(screen.getByText(/已定位到 EV-0005/)).toBeInTheDocument();
    expect(
      within(card).getByText('原位 XPS 研究界面化学态与空间电荷层'),
    ).toBeInTheDocument();
    expect(within(card).getByText('事实（fact）')).toBeInTheDocument();
    expect(within(card).getByText('文献')).toBeInTheDocument();
    expect(within(card).getByText('C-0002')).toBeInTheDocument();

    const audit = within(card).getByRole('button', { name: /审计细节/ });
    expect(audit).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(audit);
    expect(within(card).getByText('内容哈希 SHA-256')).toBeInTheDocument();
  });

  it('DOI 才给外链，产物路径不伪造成链接', async () => {
    renderApp(`/evidence/${doneTask.task_id}`);
    await screen.findByRole('heading', { level: 1, name: '证据溯源' });
    const doiLinks = screen.getAllByRole('link', { name: 'DOI' });
    expect(doiLinks.length).toBeGreaterThan(0);
    for (const link of doiLinks) {
      expect(link.getAttribute('href')).toContain('doi.org');
    }
    await waitFor(() => expect(document.getElementById('EV-0007')).toBeTruthy());
    expect(document.getElementById('EV-0007')?.querySelector('a')).toBeNull();
  });

  it('引用回查取回来源信息（藏在审计细节里，展开才给原始标识）', async () => {
    renderApp(`/evidence/${doneTask.task_id}`);
    const card = await waitFor(() => {
      const el = document.getElementById('EV-0001');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    await userEvent.click(within(card).getByRole('button', { name: /审计细节/ }));
    await userEvent.click(within(card).getByRole('button', { name: '引用回查' }));
    const line = await within(card).findByText(/｜/);
    expect(line.textContent).toContain('10.1039/d2ee01234a');
    expect(line.textContent).toContain('固态电解质界面阻抗 EIS 建模综述');
  });
});

describe('FE-09 导出交付（P-04）', () => {
  it('任务未完成时报告与审计包标注"待任务完成"，会话轨迹仍可导出', async () => {
    renderAt(<ExportPanel taskId={runningTask.task_id} taskDone={false} />, { at: '/' });
    expect(screen.getByText(/当前还不能导出全部内容/)).toBeInTheDocument();
    expect(screen.getAllByText('待任务完成')).toHaveLength(2);
    const buttons = screen.getAllByRole('button', { name: '导出' });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0] as HTMLElement);
    expect(await screen.findByText('会话轨迹已开始下载')).toBeInTheDocument();
  });

  it('完成后可导出报告，并给出内容清单与校验状态', async () => {
    renderApp(`/report/${doneTask.task_id}`);
    await screen.findByRole('heading', { name: reportTitle });
    const panel = screen.getByText('导出与交付').closest('section') as HTMLElement;
    const buttons = within(panel).getAllByRole('button', { name: '导出' });
    expect(buttons).toHaveLength(3);
    await userEvent.click(buttons[0] as HTMLElement);
    expect(await screen.findByText('报告 Markdown 已开始下载')).toBeInTheDocument();
    expect(within(panel).getByText('导出内容清单')).toBeInTheDocument();
    expect(within(panel).getByText('evidence-ledger.json')).toBeInTheDocument();
    expect(within(panel).getAllByText('已校验').length).toBeGreaterThan(0);
  });

  it('导出失败给出原因和重试，不静默', async () => {
    vi.spyOn(api, 'exportArtifact').mockRejectedValue(new Error('EXPORT_ERROR'));
    renderApp(`/report/${doneTask.task_id}`);
    await screen.findByRole('heading', { name: reportTitle });
    const panel = screen.getByText('导出与交付').closest('section') as HTMLElement;
    await userEvent.click(
      within(panel).getAllByRole('button', { name: '导出' })[0] as HTMLElement,
    );
    expect(await within(panel).findByText(/导出失败：/)).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '重试' })).toBeEnabled();
  });
});

describe('FE-14 环境自检（P-07）', () => {
  const degradedHealth = (): HealthInfo => ({
    status: 'degraded',
    mode: 'live',
    task_count: 2,
    session_ready: false,
    bff_reachable: true,
    checked_at: new Date().toISOString(),
    issues: [
      {
        id: 'agh',
        title: 'AGH 会话未连接',
        guidance: '请启动一键启动器后刷新本页；已有任务的报告仍可正常查看。',
        blocking: true,
        action_label: '打开设置',
        action_href: '/settings',
      },
    ],
  });

  it('自检无问题时不留占位容器：内容必须紧贴滚动区顶部', async () => {
    // 回归：横幅曾经套了一层页面容器（min-height:100%），健康时留下一个撑满首屏的空 div，
    // 真正的内容被推到第二屏 —— 用户看到的就是"白屏，往下滑才有东西"。
    renderApp('/');
    const main = await screen.findByRole('main');
    await screen.findByRole('heading', { level: 2, name: '总览' });
    expect(main.children).toHaveLength(1);
    expect(main.firstElementChild?.textContent).toContain('任务列表');
  });

  it('自检横幅直接排在滚动区首行，不套整页容器', async () => {
    vi.spyOn(api, 'health').mockResolvedValue(degradedHealth());
    renderApp('/');
    const main = await screen.findByRole('main');
    const banner = await screen.findByRole('status');
    expect(banner.parentElement).toBe(main);
    expect(main.children[0]).toBe(banner);
    expect(main.children[1]?.textContent).toContain('任务列表');
  });

  it('有问题时给可读指引与入口，但不拦截内容浏览', async () => {
    vi.spyOn(api, 'health').mockResolvedValue(degradedHealth());
    renderApp(`/report/${doneTask.task_id}`);
    expect(await screen.findByText('环境有问题需要处理')).toBeInTheDocument();
    expect(screen.getByText('AGH 会话未连接')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开设置' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(await screen.findByRole('heading', { name: reportTitle })).toBeInTheDocument();
  });

  it('自检连不上也不空白页：说明原因并提供刷新', async () => {
    vi.spyOn(api, 'health').mockRejectedValue(new TypeError('Failed to fetch'));
    renderApp('/');
    // 首屏横幅与侧栏连接卡都要讲清同一件人话，不能只有一处
    const hits = await screen.findAllByText(/无法连接后端服务/);
    expect(hits.length).toBeGreaterThan(1);
    expect(screen.getAllByRole('button', { name: '刷新' }).length).toBeGreaterThan(0);
    expect(
      await screen.findByRole('heading', { level: 1, name: '总览' }),
    ).toBeInTheDocument();
  });
});

describe('FE-10 报告页多轮追问（P-05）', () => {
  it('报告页可直接追问，问答轮次显示在报告下方', async () => {
    const send = vi.spyOn(api, 'sendMessage');
    renderApp(`/report/${doneTask.task_id}`);
    const ta = await screen.findByRole('textbox', { name: '追问或修订内容' });
    await userEvent.type(ta, '把方法对比做成表格{Enter}');
    expect(send).toHaveBeenCalledWith(doneTask.task_id, '把方法对比做成表格', 'ask');
    expect(await screen.findByText('把方法对比做成表格')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/演示数据回放/)).toBeInTheDocument(), {
      timeout: 8000,
    });
    const entry = useTaskStore.getState().byId[doneTask.task_id];
    expect(entry?.messages.some((m) => m.role === 'agent')).toBe(true);
  });
});

describe('FE-10 对话轮次不得伪造运行终态（用户实测发现）', () => {
  /** 失败任务上提一个与科研无关的问题：答复照常回放，但任务状态不能被改写 */
  it('在失败任务上追问，任务仍是未完成，也不长出报告入口', async () => {
    renderApp(`/monitor/${failedTask.task_id}`);
    await screen.findByRole('heading', { level: 1, name: '运行监控' });
    const ta = await screen.findByRole('textbox', { name: '追问或修订内容' });
    await userEvent.type(ta, '帮我写一首关于下雨的诗{Enter}');
    await waitFor(() => expect(screen.getByText(/演示数据回放/)).toBeInTheDocument(), {
      timeout: 8000,
    });

    expect(useTaskStore.getState().byId[failedTask.task_id]?.snapshot?.run_status).toBe(
      'FAILED',
    );
    expect(screen.getByText('未完成')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看报告' })).toBeNull();
  });

  it('演示回放置换为诚实文案，不再声称已绑定本任务证据', async () => {
    renderApp(`/monitor/${failedTask.task_id}`);
    const ta = await screen.findByRole('textbox', { name: '追问或修订内容' });
    await userEvent.type(ta, '今天天气怎么样{Enter}');
    await waitFor(() => expect(screen.getByText(/演示数据回放/)).toBeInTheDocument(), {
      timeout: 8000,
    });
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/已登记的证据/);
    expect(text).not.toMatch(/EV-0001\s*~/);
  });

  /** 修订确实要能改报告：这一条守住"去掉伪造 done 帧"之后闭环仍然成立 */
  it('已完成任务请求修订，报告并入修订附录且状态保持已完成', async () => {
    renderApp(`/report/${doneTask.task_id}`);
    const ta = await screen.findByRole('textbox', { name: '追问或修订内容' });
    await userEvent.click(screen.getByRole('button', { name: '修订' }));
    await userEvent.type(ta, '把第三节的方法对比表补上测试温度{Enter}');
    expect(
      await screen.findByRole(
        'heading',
        { name: /附录：第 1 轮修订/ },
        { timeout: 9000 },
      ),
    ).toBeInTheDocument();
    expect(useTaskStore.getState().byId[doneTask.task_id]?.snapshot?.run_status).toBe(
      'DONE',
    );
    // 演示数据时间线按真实毫秒回放：report 帧在发送后约 4.4s，默认 5s 会用例只是被测慢
  }, 15000);
});

describe('FE-11 失效任务地址回总览（用户第 6 点：总览是首页，刷新不该停在"会话不存在"）', () => {
  it('监控页的任务标识已失效：回到总览，并把找不到的标识说清楚', async () => {
    renderApp('/monitor/run-not-a-real-task');
    expect(
      await screen.findByRole('heading', { level: 1, name: '总览' }),
    ).toBeInTheDocument();
    const notice = await screen.findByText(/已回到总览/);
    expect(notice).toHaveTextContent('run-not-a-real-task');
    // 数据重置后总览仍列出当前存在的演示任务，用户可以直接重选
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('证据深链的标识已失效：同样回总览，不停在错误页', async () => {
    renderApp('/evidence/run-not-a-real-task?ev=EV-0001');
    expect(
      await screen.findByRole('heading', { level: 1, name: '总览' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /** 回总览不能只换页面：失效标识也不能再冒充"当前任务" */
  it('失效任务不再挂在顶栏上当当前任务', async () => {
    renderApp('/monitor/run-not-a-real-task');
    await screen.findByRole('heading', { level: 1, name: '总览' });
    expect(useUiStore.getState().currentTaskId).toBeNull();
    expect(screen.queryByText('run-not-a-real-task')).not.toBeInTheDocument();
  });

  /** 回总览只针对"这个任务确实不在了"；瞬时错误必须留在原页并给出重试 */
  it('超时类错误不回总览：仍在监控页说明原因并可重试', async () => {
    vi.spyOn(api, 'getTask').mockRejectedValue(new ApiError('TIMEOUT'));
    renderApp(`/monitor/${doneTask.task_id}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('等待响应超时');
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: '总览' }),
    ).not.toBeInTheDocument();
  });
});

describe('FE-05 agent 常驻面板（用户评审：工作台要配得上"科研 agent"）', () => {
  /** 统计块用 data-stat 定位：数值都来自真实状态，不能靠文案猜 */
  function statOf(key: string): HTMLElement {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (!(el instanceof HTMLElement)) throw new Error(`缺少统计项：${key}`);
    return el;
  }
  const stateOf = () => useTaskStore.getState().byId[doneTask.task_id];

  it('工具调用监控常驻：不点任何折叠就能看到工具名与状态', async () => {
    renderApp(`/monitor/${doneTask.task_id}`);
    expect(await screen.findByText('工具调用监控')).toBeInTheDocument();
    // 列表由"快照 + 事件补发"重建，展开与否都能拿到同样的帧
    await waitFor(() =>
      expect(screen.getByText('sciret_search_literature')).toBeInTheDocument(),
    );
    // 旧的"过程细节"折叠标题已不存在：常驻面板不需要先点开
    expect(
      screen.queryByRole('button', { name: /过程细节（工具调用与入参出参）/ }),
    ).toBeNull();
  });

  it('运行统计只给可核对的机械数值，并声明不做生成式摘要', async () => {
    renderApp(`/monitor/${doneTask.task_id}`);
    expect(await screen.findByText('运行统计')).toBeInTheDocument();
    await waitFor(() => expect(stateOf()?.evidence).not.toBeNull());
    expect(screen.getByText(/机械统计/)).toBeInTheDocument();

    const steps = stateOf()?.snapshot?.steps ?? [];
    expect(
      within(statOf('steps')).getByText(
        `${steps.filter((s) => s.status === 'DONE').length}/${steps.length}`,
      ),
    ).toBeInTheDocument();
    expect(
      within(statOf('tools')).getByText(String(stateOf()?.tools.length ?? -1)),
    ).toBeInTheDocument();
    expect(
      within(statOf('evidence')).getByText(
        String(stateOf()?.evidence?.evidence.length ?? -1),
      ),
    ).toBeInTheDocument();
    expect(
      within(statOf('trace')).getByText(String(stateOf()?.evidence?.trace.length ?? -1)),
    ).toBeInTheDocument();
  });

  it('产物梳理按证据登记列出 artifact 条目，链接直达证据页对应锚点', async () => {
    renderApp(`/monitor/${doneTask.task_id}`);
    const title = await screen.findByText('产物梳理');
    const panel = title.closest('section');
    expect(panel).not.toBeNull();
    await waitFor(() => expect(stateOf()?.evidence).not.toBeNull());

    const all = stateOf()?.evidence?.evidence ?? [];
    const hrefFor = (evId: string) => `/evidence/${doneTask.task_id}?ev=${evId}`;
    const artifacts = all.filter((e) => e.tier === 'artifact');
    expect(artifacts.length).toBeGreaterThan(0);
    const links = Array.from(panel!.querySelectorAll('a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(links.sort()).toEqual(artifacts.map((a) => hrefFor(a.ev_id)).sort());
    // 事实层不进产物面板：两个面板口径不同
    for (const item of all.filter((e) => e.tier === 'fact')) {
      expect(links).not.toContain(hrefFor(item.ev_id));
    }
  });
});

describe('长列表分页（§10）', () => {
  // 放在最后：这些占位任务会改变任务总数，不能污染前面按 4 条种子断言的用例
  it('任务表超过一页才出现分页条，翻页后区间与行数同步', async () => {
    for (let i = seeded.length + 1; i <= PAGE_SIZE + 1; i += 1) {
      await api.createTask({
        goal: `分页占位任务 ${i}`,
        workflow: 'research',
        lit_source: 'auto',
        sources: ['crossref'],
      });
    }
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: '总览' });
    const table = screen.getByRole('table');
    const pager = screen.getByRole('navigation', { name: '列表分页' });
    // 表头 + 10 行
    expect(within(table).getAllByRole('row')).toHaveLength(PAGE_SIZE + 1);
    expect(within(pager).getByText('第 1–10 条 / 共 11 条')).toBeInTheDocument();
    expect(within(pager).getByRole('button', { name: '上一页' })).toBeDisabled();

    await userEvent.click(within(pager).getByRole('button', { name: '下一页' }));
    expect(await within(pager).findByText('第 11–11 条 / 共 11 条')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(pager).getByRole('button', { name: '下一页' })).toBeDisabled();
  });
});
