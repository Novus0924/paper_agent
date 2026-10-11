import { expect, test } from '@playwright/test';
import { openAgentView, presetFastSpeed } from './helpers';

/**
 * 一条最小真旅程：新建 → 监控出进度 → 三个 agent 面板 → 产物深链回证据 → 已交付任务追问。
 * 只在 journey-1366x900 这一档跑（断点取证由 breakpoints.spec.ts 覆盖）。
 */
test.describe('科研 agent 最小旅程', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await presetFastSpeed(page);
  });

  test('新建任务后监控页出现真实推进的步骤', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();

    await page.goto('/new');
    await page
      .locator('#goal-input')
      .fill('固态电解质界面表征方法在近五年的文献中如何对比？请给出方法适用边界。');
    await page.getByRole('button', { name: '创建并开始执行' }).click();

    await expect(page).toHaveURL(/\/monitor\/run-/);
    const steps = page.getByRole('listitem');
    await expect(steps.first()).toBeVisible();
    // fast 档下也必须真的走完一步，否则"执行过程"只是静态装饰
    await expect(steps.filter({ hasText: '已完成' }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('FE-06 验收 4：只选本地/离线来源时全程不出现降级提示', async ({ page }) => {
    await page.goto('/new');
    await page
      .locator('#goal-input')
      .fill('只用本地语料库回答：固态电解质界面阻抗的表征方法有哪些？');

    for (const name of [/arXiv/, /Crossref/, /OpenAlex/, /Semantic Scholar/]) {
      await page.getByRole('checkbox', { name }).uncheck();
    }
    await page.getByRole('checkbox', { name: /本地语料库/ }).check();
    await expect(page.getByRole('checkbox', { name: /本地语料库/ })).toBeChecked();
    await expect(page.getByText('离线来源执行，不会判为降级')).toBeVisible();

    await page.getByRole('button', { name: '创建并开始执行' }).click();
    await expect(page).toHaveURL(/\/monitor\/run-/);

    // 进度文案必须点名本次真正选中的来源，而不是脚本里写死的全源清单
    await expect(page.getByText('本地语料库 已返回结果，正在合并去重…')).toBeVisible({
      timeout: 30_000,
    });
    // 等 R1 走完：可用性提示原本就在 R1 中段发出，走过这一步才有取证意义
    await expect(
      page.getByRole('listitem').filter({ hasText: '已完成' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('已降级 · 任务未中断')).toHaveCount(0);
    await expect(page.getByText('部分源不可用')).toHaveCount(0);
    await expect(page.getByText('Semantic Scholar')).toHaveCount(0);
  });

  test('已交付任务：agent 面板、产物深链、追问回写、报告入口', async ({ page }) => {
    const taskId = await openAgentView(page);

    await expect(page.getByText('运行统计')).toBeVisible();
    await expect(page.getByText('产物梳理')).toBeVisible();
    const panels = page.getByLabel('过程、统计与产物面板');
    await expect(panels).toBeVisible();

    // 已交付运行的工具调用面板不能是"0 次调用"的空壳
    const toolCount = panels.getByText(/\d+ 次调用/);
    await expect(toolCount).toBeVisible();
    expect((await toolCount.innerText()).trim()).not.toMatch(/^0\b/);

    // 产物 → 证据深链：核对来源与哈希的闭环
    const artifact = panels.locator('[class*="artifactItem"]').first();
    await expect(artifact).toBeVisible();
    const href = await artifact.getAttribute('href');
    const evId = new URL(href ?? '/', page.url()).searchParams.get('ev');
    expect(evId, `产物链接应带 ?ev= 深链参数（href=${href}）`).toMatch(/^EV-/);

    await artifact.click();
    await expect(page).toHaveURL(/\/evidence\/run-[a-z0-9-]+\?ev=EV-/);
    await expect(page.getByText(`已定位到 ${evId}`)).toBeVisible();
    await expect(page.locator('[class*="evCardHi"]')).toBeVisible();

    // 已交付任务追问：不得伪造终态，只演示回写链路
    await page.goto(`/monitor/${taskId}`);
    const ta = page.locator('#composer-textarea');
    await ta.fill('请补充近三年第一性原理计算对界面稳定性的结论。');
    await ta.press('Enter');
    await expect(page.getByText('（演示数据回放）已收到追问')).toBeVisible({
      timeout: 30_000,
    });
    expect(page.url()).toContain(`/monitor/${taskId}`);

    // 报告入口仍在任务内
    await page.goto(`/report/${taskId}`);
    await expect(
      page.getByRole('heading', { level: 2, name: '报告', exact: true }).first(),
    ).toBeVisible();
  });
});

/**
 * 用户第 6 点：总览是首页。
 * 失效任务地址（演示数据重置后旧深链）不能把人留在"会话不存在"的死页上。
 */
test.describe('总览是首页', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await presetFastSpeed(page);
  });

  test('§4.3 的 /overview 别名与 / 落到同一页', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('页面走丢了')).toHaveCount(0);
  });

  test('失效任务地址自动回总览，并说明是哪个任务找不到', async ({ page }) => {
    await page.goto('/monitor/run-19700101-000000-000000');
    const notice = page.getByText(/已回到总览/);
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('run-19700101-000000-000000');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();
    // 回落到首页后刷新：仍停在总览，不再出现"会话不存在"
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();
    await expect(page.getByText('没有找到这个任务')).toHaveCount(0);
  });

  /** 用户报的原症状：新建后刷新就说会话不存在。落盘必须在创建时同步完成 */
  test('新建后立刻刷新：仍停在同一个任务的监控页', async ({ page }) => {
    await page.goto('/new');
    await page
      .locator('#goal-input')
      .fill('刷新持久化验证：锂金属负极界面稳定性评估有哪些常用表征手段？');
    await page.getByRole('button', { name: '创建并开始执行' }).click();
    await expect(page).toHaveURL(/\/monitor\/run-/);
    const url = page.url();

    await page.reload();
    expect(page.url(), '刷新不应把任务页弹回总览').toBe(url);
    await expect(page.getByRole('heading', { level: 1, name: '运行监控' })).toBeVisible();
    await expect(page.getByText('已回到总览')).toHaveCount(0);
    await expect(page.getByText('没有找到这个任务')).toHaveCount(0);
    await expect(page.getByRole('listitem').first()).toBeVisible();
  });
});
