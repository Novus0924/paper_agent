import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from '@/components/ui/Card';
import { Collapse } from '@/components/ui/Collapse';
import { api } from '@/api/client';
import type { TaskSnapshot } from '@/api/types';
import { renderApp, renderAt, resetStores } from './harness';
import { useLiveBackend, type LiveBackend } from './liveEnv';

/**
 * 无障碍结构基线（用户第 4 点：由我设计并落实）。
 * 只断言读屏与键盘真实感知的东西：标题大纲、可访问名、控件关联、焦点顺序、收起内容不可达。
 * 对比度这类依赖 CSS 计算树的规则不在单元测试里假称覆盖，交给 e2e。
 */

function textOf(node: Element | null | undefined): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** 只走可访问名规范里真实生效的几条路径：aria-label → aria-labelledby → label 关联 → 内容文本 */
function accessibleName(el: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel?.trim()) return ariaLabel.trim();

  const ids = el.getAttribute('aria-labelledby');
  if (ids) {
    const byIds = ids
      .split(/\s+/)
      .map((id) => textOf(document.getElementById(id)))
      .join(' ')
      .trim();
    if (byIds) return byIds;
  }

  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  ) {
    const linked = el.id
      ? Array.from(document.querySelectorAll('label')).find((l) => l.htmlFor === el.id)
      : undefined;
    if (linked) return textOf(linked);
    const wrapping = el.closest('label');
    if (wrapping) return textOf(wrapping);
  }
  if (el instanceof HTMLInputElement && ['submit', 'button', 'reset'].includes(el.type)) {
    return el.value.trim();
  }
  return textOf(el);
}

function headingLevels(root: Element): number[] {
  return Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) =>
    Number(h.tagName.slice(1)),
  );
}

/** 大纲允许平级与回到上级，不允许向下跳级：读屏按 H 键逐级跳，跳级等于跳进空气 */
function skippedLevels(levels: number[]): string[] {
  const bad: string[] = [];
  let prev = 0;
  for (const level of levels) {
    if (level > prev + 1) bad.push(`h${prev || '0'} → h${level}`);
    prev = level;
  }
  return bad;
}

let doneTask: TaskSnapshot;
let activeTask: TaskSnapshot;
let backend: LiveBackend;

beforeEach(async () => {
  // v2.5：唯一数据通道是 LiveApiClient，走契约级 fake backend（spyOn 用例优先）
  backend = useLiveBackend();
  resetStores();
  const seeded = await api.listTasks();
  doneTask = seeded.find((t) => t.run_status === 'DONE') as TaskSnapshot;
  activeTask = seeded.find((t) => t.run_status !== 'DONE') as TaskSnapshot;
});

afterEach(() => {
  backend?.unstub();
  vi.restoreAllMocks();
});

interface View {
  label: string;
  /** 延迟求值：任务标识要到 beforeEach 之后才拿得到 */
  at: () => string;
  /** settled 一律等「异步数据落地后才出现」的元素，否则走查抓到的是半渲染页面 */
  settled: () => Promise<unknown>;
  /** 该页需要可访问名的可操作元素选择器 */
  interactive: (root: HTMLElement) => HTMLElement[];
  /**
   * 落地后必须抓到的元素数量下限。
   * 走查不能因为「这一页根本没渲染」而通过：先把量到了什么钉住，无名断言才有意义。
   */
  minInteractive: number;
}

const all = (sel: string) => (root: HTMLElement) =>
  Array.from(root.querySelectorAll(sel)) as HTMLElement[];

const VIEWS: View[] = [
  {
    label: '总览',
    at: () => '/',
    settled: async () => {
      await screen.findAllByRole('button', { name: /查看运行监控|查看报告/ });
    },
    interactive: all('button, a'),
    minInteractive: 8,
  },
  {
    label: '新建向导',
    at: () => '/new',
    settled: () => screen.findByRole('textbox', { name: /你想研究什么/ }),
    interactive: (root) => [
      ...all('input, select, textarea')(root),
      ...all('button, a')(root),
    ],
    minInteractive: 8,
  },
  {
    label: '设置',
    at: () => '/settings',
    settled: async () => {
      // v2.5：数据来源说明改为 live 唯一通道文案（"数据来源模式"选择器已随 mock 移除）
      await screen.findAllByText(/当前唯一数据来源为真实 AGH 研究平台/);
    },
    interactive: all('button, a, input, select'),
    minInteractive: 6,
  },
  {
    label: '运行监控',
    at: () => `/monitor/${activeTask.task_id}`,
    settled: async () => {
      await screen.findAllByText('工具调用监控');
    },
    interactive: all('button, a, input, textarea, select'),
    minInteractive: 6,
  },
  {
    label: '报告',
    at: () => `/report/${doneTask.task_id}`,
    settled: async () => {
      await screen.findByRole('heading', { level: 1, name: '报告' });
      await screen.findAllByText('导出与交付');
    },
    interactive: all('button, a, input, textarea, select'),
    minInteractive: 6,
  },
  {
    label: '证据溯源',
    at: () => `/evidence/${doneTask.task_id}`,
    settled: async () => {
      await screen.findAllByRole('button', { name: '审计细节' });
    },
    interactive: all('button, a, input, select'),
    minInteractive: 8,
  },
  {
    label: '文献库',
    at: () => '/library',
    // settled 用文献库专属文案：其它页面残留的 app 也在 document 里，
    // 标题类的查询会跨应用命中多份；统计标签与这一分页串只此一处。
    settled: async () => {
      await screen.findByText('去重合并');
      await screen.findByText('第 1–10 条 / 共 24 条');
    },
    interactive: all('button, a, input, select'),
    minInteractive: 10,
  },
];

function offender(el: HTMLElement): string {
  const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
  return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}「${textOf(el).slice(0, 24)}」`;
}

describe('FE-01 Card / Collapse 的标题语义', () => {
  it('Card 标题是标题元素，默认三级：读屏按标题就能跳到分区', () => {
    renderAt(
      <Card title="任务列表">
        <p>正文</p>
      </Card>,
      { at: '/' },
    );
    expect(
      screen.getByRole('heading', { level: 3, name: '任务列表' }),
    ).toBeInTheDocument();
  });

  it('卡片套卡片时标题层级由调用方降级，大纲不串位', () => {
    renderAt(
      <Card title="内层" titleLevel={4}>
        <p>正文</p>
      </Card>,
      { at: '/' },
    );
    expect(screen.getByRole('heading', { level: 4, name: '内层' })).toBeInTheDocument();
  });

  it('页面级折叠区显式声明层级后，标题里就是那个展开控件', () => {
    renderAt(
      <Collapse title="过程轨迹" titleLevel={3}>
        <p>细节</p>
      </Collapse>,
      { at: '/' },
    );
    const heading = screen.getByRole('heading', { level: 3, name: '过程轨迹' });
    expect(within(heading).getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('重复条目（工具卡、证据审计）保持纯展开控件，不刷进标题大纲', () => {
    renderAt(
      <Collapse title="审计细节">
        <p>细节</p>
      </Collapse>,
      { at: '/' },
    );
    expect(screen.queryByRole('heading', { name: '审计细节' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '审计细节' })).toBeInTheDocument();
  });
});

describe('全站标题大纲', () => {
  for (const view of VIEWS) {
    it(`${view.label}：唯一的 h1，标题层级不跳级，主内容区是 main 地标`, async () => {
      const { container } = renderApp(view.at());
      await view.settled();
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      // 「跳到主内容」要把焦点交给 main：没有 tabindex=-1 的 main 是接不住焦点的死目标
      expect(main).toHaveAttribute('tabindex', '-1');
      expect(container.querySelectorAll('h1')).toHaveLength(1);

      const levels = headingLevels(container);
      expect(levels.length, `${view.label} 页应有分区标题`).toBeGreaterThan(1);
      expect(skippedLevels(levels), `${view.label} 大纲 h${levels.join(' > h')}`).toEqual(
        [],
      );
    });
  }
});

describe('全站可访问名与焦点顺序', () => {
  for (const view of VIEWS) {
    it(`${view.label}：每个可操作元素都有可读名字，控件都有 label 关联`, async () => {
      const { container } = renderApp(view.at());
      await view.settled();
      const items = view.interactive(container);
      expect(
        items.length,
        `${view.label} 只抓到 ${items.length} 个可操作元素（基线要求 ≥ ${view.minInteractive}）`,
      ).toBeGreaterThanOrEqual(view.minInteractive);
      expect(
        items.filter((el) => accessibleName(el) === '').map(offender),
        `${view.label} 存在无名元素`,
      ).toEqual([]);
    });
  }

  it('Composer 的输入框说的是"在这里写什么"，不是抄发送键的名字', async () => {
    // 读屏进到这个框会念出它的可访问名。名字若与旁边的发送键同为「发送」，
    // 用户分不清自己站在输入区还是按钮上（WCAG 4.1.2 名称/角色、2.4.6 名称与指令）。
    renderApp(`/report/${doneTask.task_id}`);
    const boxes = await screen.findAllByRole('textbox');
    expect(boxes, '报告页的 Composer 应当只有一个输入框').toHaveLength(1);
    const box = boxes[0] as HTMLElement;
    const send = await screen.findByRole('button', { name: '发送' });
    const name = accessibleName(box);
    expect(name, '输入框与发送键同名，读屏里两个「发送」分不开').not.toBe(
      accessibleName(send),
    );
    expect(name, '输入框的名字要看得出这里写的是追问/修订内容').toMatch(/追问|修订/);
  });

  it('全站不使用正 tabindex：-1/0 只用于既定用途，不许插队', async () => {
    for (const view of VIEWS) {
      const { container, unmount } = renderApp(view.at());
      await view.settled();
      const positive = Array.from(
        container.querySelectorAll<HTMLElement>('[tabindex]'),
      ).filter((el) => Number(el.getAttribute('tabindex')) > 0);
      expect(positive.map(offender), `${view.label} 有正 tabindex`).toEqual([]);
      // 不留上一份应用：否则下一轮的 screen.* 会同时看到两个页面
      unmount();
    }
  });

  it('数据表格有 caption，读屏才知道在读哪张表', async () => {
    renderApp('/');
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('caption')).toHaveTextContent('任务列表');
  });

  it('折叠内容收起时用 hidden 真正摘出可达性树，展开后重新可达', async () => {
    const { container } = renderAt(
      <Collapse title="过程轨迹" titleLevel={3}>
        <button type="button">轨迹里的动作</button>
      </Collapse>,
      { at: '/' },
    );
    const body = container.querySelector('[id$="-body"]') as HTMLElement;
    expect(body).toHaveAttribute('hidden');
    // 只靠 CSS 隐藏的话，读屏与 Tab 仍会撞进去：这里要求 DOM 层面真正不可达
    expect(within(body).queryByRole('button')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '过程轨迹' }));
    expect(body).not.toHaveAttribute('hidden');
    expect(within(body).getByRole('button')).toBeInTheDocument();
  });
});

describe('运行状态不只靠颜色（需求文档 §10 / WCAG 1.4.1）', () => {
  const STATUS_WORDS = /已完成|执行中|待开始|未完成/;

  it('侧栏每一行最近任务都把运行状态说进可访问名里', async () => {
    renderApp('/');
    await screen.findAllByRole('button', { name: /查看运行监控|查看报告/ });

    const rows = Array.from(document.querySelectorAll('a[class*="histItem"]'));
    // 先把"确实渲染了"钉住，否则下面的计数会因为空列表而假绿
    expect(rows.length, '侧栏没有渲染出最近任务，用例失去意义').toBeGreaterThanOrEqual(2);

    const spoken = screen.queryAllByRole('link', { name: STATUS_WORDS });
    expect(
      spoken.length,
      `${rows.length} 行最近任务里只有 ${spoken.length} 行把运行状态说出口——` +
        `其余行仅靠颜色点表达状态，读屏用户完全拿不到`,
    ).toBe(rows.length);
  });
});
