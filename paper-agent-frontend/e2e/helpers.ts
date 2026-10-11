import { expect, type Page } from '@playwright/test';

/**
 * 页面上"能 Tab 到"的元素集合。Tab 走查的跳数上限按它自缩放：
 * 监控页的控件数会随时间线推进增长（每多一次工具调用就多一个展开按钮），写死的数字迟早不够。
 */
export const FOCUSABLE =
  'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';

/** 演示节奏调到 fast：追问/新建的回放链路否则要等真实时间线 */
export async function presetFastSpeed(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'paper-agent-frontend.ui',
      JSON.stringify({ navCollapsed: false, speed: 'fast', theme: 'light' }),
    );
  });
}

/**
 * 打开一个"已交付"任务的运行监控页。
 * 任务 id 每次播种都不同，所以从总览表格的 data-task-id 现取，不写死。
 */
export async function openAgentView(page: Page): Promise<string> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();

  const openReport = page.getByRole('button', { name: '查看报告' }).first();
  await expect(openReport).toBeVisible();
  const taskId = await openReport
    .locator('xpath=ancestor::tr')
    .getAttribute('data-task-id');
  if (!taskId) throw new Error('总览表格里找不到已交付任务的 data-task-id');

  await page.goto(`/monitor/${taskId}`);
  await expect(page.getByText('工具调用监控')).toBeVisible();
  return taskId;
}

/**
 * 总览表格里任务标题就是研究目标的截断形式（`固态电解质界面阻抗表征方法研究综述` 是报告里的名字，不是行文案），
 * 所以这里按行上真实渲染出来的那段目标取任务。
 * 选它的理由要具体：这一条种子的证据有 12 条，超过 PAGE_SIZE(10)，分页用例才有第二页可翻。
 */
const RESEARCH_TASK = '固态电解质界面阻抗的主要表征方法有哪些';

export async function researchTaskId(page: Page): Promise<string> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();
  const row = page.locator('tbody tr').filter({ hasText: RESEARCH_TASK }).first();
  await expect(row).toBeVisible();
  const id = await row.getAttribute('data-task-id');
  if (!id) throw new Error(`总览里找不到标题含「${RESEARCH_TASK}」的任务行`);
  return id;
}

export interface GridTracks {
  cols: string;
  tracks: string[];
  gap: string;
  width: number;
}

/** 读取监控页两栏容器实际解析出来的 grid-template-columns（computed，非声明值） */
export async function readAgentGrid(page: Page): Promise<GridTracks> {
  const grid = page.locator('[class*="agentGrid"]');
  await expect(grid).toHaveCount(1);
  const raw = await grid.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      cols: cs.gridTemplateColumns,
      gap: cs.gap,
      width: el.clientWidth,
    };
  });
  return { ...raw, tracks: raw.cols.split(' ').filter(Boolean) };
}

export function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}
