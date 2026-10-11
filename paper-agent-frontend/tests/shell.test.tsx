import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/api/client';
import { zhCN } from '@/i18n/zh-CN';
import { useUiStore } from '@/store/uiStore';
import { renderApp, resetStores } from './harness';

const UI_KEY = 'paper-agent-frontend.ui';
const LOCALE_KEY = 'paper-agent-frontend.locale';

beforeEach(() => {
  resetStores();
  localStorage.removeItem(UI_KEY);
  localStorage.removeItem(LOCALE_KEY);
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.restoreAllMocks();
  useUiStore.setState({
    navCollapsed: false,
    speed: 'normal',
    theme: 'light',
    currentTaskId: null,
  });
  useUiStore.getState().setTheme('light');
});

describe('FE-02 应用外壳（§4.2 文档页面结构 + Demo 视觉）', () => {
  it('左侧持久导航 + 顶部上下文栏 + 主内容区，并提供跳转主内容链接', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: '总览' }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    // 全局导航只留工作区级入口；任务级视图（监控/报告/证据）改为任务内点击
    for (const label of ['总览', '设置']) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    for (const label of ['运行监控', '报告', '证据溯源']) {
      expect(within(nav).queryByText(label)).not.toBeInTheDocument();
    }
    // 新建任务全站唯一的全局入口是侧栏主按钮
    expect(screen.getByRole('link', { name: '新建科研任务' })).toHaveAttribute(
      'href',
      '/new',
    );
    const skip = screen.getByRole('link', { name: '跳到主内容' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.getElementById('main')).toBeInTheDocument();
  });

  it('顶栏不挂全局动作：新建/导出/演示节奏都不再重复出现', async () => {
    renderApp('/settings');
    expect(
      await screen.findByRole('heading', { level: 1, name: '设置' }),
    ).toBeInTheDocument();
    // 新建任务的全局入口只有侧栏那一个链接；导出只在任务报告页真触发
    expect(screen.queryByRole('button', { name: /新建/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导出' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /快进|正常速度/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重新演示' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '新建科研任务' })).toHaveAttribute(
      'href',
      '/new',
    );
  });

  it('任务级入口在具体任务里：报告页头部给出运行监控与证据溯源', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: '总览' });
    const table = screen.getByRole('table');
    const doneRow = within(table)
      .getAllByRole('row')
      .slice(1)
      .find((row) => within(row).getAllByRole('cell')[1]?.textContent === '已完成');
    expect(doneRow).toBeDefined();
    await userEvent.click(doneRow as HTMLElement);
    expect(
      await screen.findByRole('heading', { level: 1, name: '报告' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '运行监控' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '证据溯源' })).toBeInTheDocument();
    // 真导出入口在报告页内（FE-09），不再是顶栏的伪动作
    expect(await screen.findByText('导出与交付')).toBeInTheDocument();
  });

  it('收起/展开导航栏（220 → 64px）偏好落盘，刷新后保持', async () => {
    renderApp('/');
    const toggle = await screen.findByRole('button', { name: '收起导航栏' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    await waitFor(() => expect(useUiStore.getState().navCollapsed).toBe(true));
    expect(screen.getByRole('button', { name: '展开导航栏' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').navCollapsed).toBe(true);
    expect(screen.queryByText('设置')).not.toBeInTheDocument();
  });

  it('侧栏连接卡的「会话」是 AGH 会话标识，不拿任务标识顶替', async () => {
    const [first] = await api.listTasks();
    renderApp('/');
    const table = await screen.findByRole('table');
    const row = within(table)
      .getAllByRole('row')
      .slice(1)
      .find((r) => r.dataset.taskId === first?.task_id) as HTMLElement;
    await userEvent.click(row);
    expect(
      await screen.findByRole('heading', { level: 1, name: /报告|运行监控/ }),
    ).toBeInTheDocument();
    // 监控页右侧也有一个 complementary 面板，这里要的是侧栏那一个
    const aside = screen.getByRole('complementary', { name: '工作台' });
    expect(aside.textContent).toContain(`会话 ${first?.session_id}`);
    expect(aside.textContent).not.toMatch(/会话 run-/);
  });

  it('未知路由不白屏，给出返回总览', async () => {
    renderApp('/nonsense');
    expect(
      await screen.findByRole('heading', { level: 3, name: '页面走丢了' }),
    ).toBeInTheDocument();
    expect(screen.getByText('地址可能拼错了，或这个任务已被移除。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回总览' })).toBeInTheDocument();
  });

  /** 用户第 6 点：总览是首页。§4.3 的 /overview 别名必须与 / 同页，且高亮语义一致 */
  it('/overview 别名与 / 都落到总览，并标为当前页', async () => {
    renderApp('/overview');
    expect(
      await screen.findByRole('heading', { level: 1, name: '总览' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('页面走丢了')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation')).getByRole('link', { name: '总览' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('当前页高亮不越界：别名为 "/" 的总览不能在设置页也亮着', async () => {
    renderApp('/settings');
    expect(
      await screen.findByRole('heading', { level: 1, name: '设置' }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: '设置' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: '总览' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});

describe('FE-11 设置与 FE-13 语言（P-06 不重复实现 AGH 配置）', () => {
  it('主题切换写入 data-theme 并持久化（暗色令牌块生效）', async () => {
    renderApp('/settings');
    const theme = await screen.findByRole('combobox', { name: '主题' });
    await userEvent.selectOptions(theme, 'dark');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').theme).toBe('dark');
    await userEvent.selectOptions(theme, 'light');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
  });

  it('模式选择只说明切换方式，不伪装成即时开关', async () => {
    renderApp('/settings');
    expect(await screen.findByText(/当前模式：演示数据（未接后端）/)).toBeInTheDocument();
    expect(screen.getByText(/URL 加 \?mode=live 切换，视图代码不变/)).toBeInTheDocument();
    expect(screen.getByText(/API 基址/)).toBeInTheDocument();
  });

  it('AGH 深度设置入口缺失时直说不必重复配置（P-06）', async () => {
    renderApp('/settings');
    expect(await screen.findByText(/未配置 AGH 设置入口地址/)).toBeInTheDocument();
  });

  it('切到英文：已覆盖文案变英文，缺项自动回退简体中文', async () => {
    renderApp('/settings');
    const language = await screen.findByRole('combobox', { name: '语言' });
    await userEvent.selectOptions(language, 'en');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation')).getByText('Settings'),
    ).toBeInTheDocument();
    // en 未覆盖 settings.dataMode / settings.languageHint，应回退简体中文
    expect(screen.getByRole('combobox', { name: '数据来源模式' })).toBeInTheDocument();
    expect(screen.getByText(/英文为部分翻译/)).toBeInTheDocument();
    expect(localStorage.getItem(LOCALE_KEY)).toBe('en');
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '语言' }),
      'zh-CN',
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: '设置' }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('navigation')).getByText('设置')).toBeInTheDocument();
  });

  it('快进只压缩演示时间线：写入速度并调用 demo.setSpeed，不宣称能加速真实运行', async () => {
    const demo = api.demo;
    if (!demo) throw new Error('mock 模式应提供演示接口');
    const setSpeed = vi.spyOn(demo, 'setSpeed');
    renderApp('/settings');
    const fast = await screen.findByRole('checkbox', { name: '快进演示时间线' });
    expect(fast).not.toBeChecked();
    await userEvent.click(fast);
    await waitFor(() => expect(useUiStore.getState().speed).toBe('fast'));
    expect(setSpeed).toHaveBeenCalledWith(20);
    expect(JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').speed).toBe('fast');
    // 诚实说明：真实运行的耗时由 AGH 思考与工具调用决定，前端不能加速
    expect(screen.getByText(/无法加速|不改变真实任务/)).toBeInTheDocument();
  });

  it('重置演示数据说明本地任务数量，动作可点', async () => {
    renderApp('/settings');
    expect(await screen.findByText(/本地现有 4 个演示任务/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置演示数据' })).toBeInTheDocument();
  });
});

/**
 * 用户第 1 点：本项目不需要"离线模式"这个产品概念。
 * Mock 只是后端接入前的演示适配器，跑通 Live 后整体移除；
 * 所以文案里不许再出现把它当成产品功能的说法（统一叫"演示数据"）。
 * （数据源注册表里的"本地/离线来源"是真的产品概念，不在此列。）
 */
describe('文案口径：Mock 不是产品里的离线模式', () => {
  const banned = /离线演示|离线模式|Mock 离线/;

  function collectStrings(node: unknown, out: string[] = []): string[] {
    if (typeof node === 'string') out.push(node);
    else if (node && typeof node === 'object') {
      for (const value of Object.values(node)) collectStrings(value, out);
    }
    return out;
  }

  it('简体中文文案表里没有把 Mock 说成离线模式的说法', () => {
    expect(collectStrings(zhCN).filter((s) => banned.test(s))).toEqual([]);
  });

  it('总览与设置页面上读不到"离线模式"字样（含侧栏的模型与健康状态）', async () => {
    for (const at of ['/', '/settings']) {
      const { container, unmount } = renderApp(at);
      await screen.findByRole('heading', {
        level: 1,
        name: at === '/' ? '总览' : '设置',
      });
      expect(container.textContent, at).not.toMatch(banned);
      // 同一个文档里留着上一份应用，下一轮的查询就会串台
      unmount();
    }
  });
});
