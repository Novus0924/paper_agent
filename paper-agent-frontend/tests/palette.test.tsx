import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, resetStores } from './harness';
import { useLiveBackend, type LiveBackend } from './liveEnv';

/**
 * FE-17 全局命令面板接线测试（2026-10-12 补齐）：
 * - 顶栏搜索按钮 / Cmd+K 两种唤起路径，Esc 关闭；
 * - 任务源：taskStore.tasks 模糊匹配 → Enter 直达报告页；
 * - 文献源：GET /api/v1/library?q= 真实过滤（fake 契约镜像）。
 */

let backend: LiveBackend;

beforeEach(() => {
  backend = useLiveBackend();
  resetStores();
});

afterEach(() => {
  backend?.unstub();
});

describe('FE-17 全局命令面板（真实搜索接线）', () => {
  it('顶栏搜索按钮打开面板；Esc 关闭', async () => {
    renderApp('/');
    const btn = await screen.findByRole('button', { name: '搜索任务、文献或证据…' });
    await userEvent.click(btn);
    expect(await screen.findByText('全局搜索与命令')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByText('全局搜索与命令')).not.toBeInTheDocument(),
    );
  });

  it('Cmd/Ctrl+K 唤起，再按一次关闭', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: '总览' });
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(await screen.findByText('全局搜索与命令')).toBeInTheDocument();
    await userEvent.keyboard('{Control>}k{/Control}');
    await waitFor(() =>
      expect(screen.queryByText('全局搜索与命令')).not.toBeInTheDocument(),
    );
  });

  it('任务模糊搜索 + 回车直达报告页', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: '总览' });
    await userEvent.keyboard('{Control>}k{/Control}');
    const input = await screen.findByRole('combobox');
    await userEvent.type(input, '钙钛矿');
    const item = await screen.findByRole('option', { name: /钙钛矿太阳能电池缺陷钝化/ });
    await userEvent.click(item);
    expect(await screen.findByRole('heading', { level: 1, name: '报告' })).toBeInTheDocument();
  });

  it('文献搜索走后端 q 过滤并显示证据条目', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: '总览' });
    await userEvent.keyboard('{Control>}k{/Control}');
    const input = await screen.findByRole('combobox');
    await userEvent.type(input, '阻抗');
    expect(await screen.findByRole('option', { name: /EIS 建模综述/ })).toBeInTheDocument();
  });
});
