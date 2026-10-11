import { expect, test, type Page } from '@playwright/test';

/**
 * 主题令牌的真实生效路径：设置页选择器 → uiStore.applyTheme → documentElement.dataset.theme
 * → tokens.css 的 `:root[data-theme='dark']` 覆盖。
 * 这条用例存在的原因很具体：遮罩色和滚动条色此前是写死在 base.css / ui.module.css 里的 rgba()，
 * 深色主题根本覆盖不到它们（滚动条在深底上是墨色 = 看不见）。令牌化之后必须有浏览器证据说明覆盖真的落地了。
 */

const tokenOf = (page: Page, name: string) =>
  page.evaluate(
    (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
    name,
  );

test.describe('主题令牌随主题切换生效', () => {
  test('浅色用墨色档，深色换成浅色墨档', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { level: 1, name: '设置' })).toBeVisible();

    const light = {
      scrim: await tokenOf(page, '--scrim'),
      thumb: await tokenOf(page, '--scroll-thumb'),
      thumbHover: await tokenOf(page, '--scroll-thumb-hover'),
      bg: await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    };
    expect(light.scrim, '浅色遮罩应保持原先的墨色 28%（令牌化不该改变浅色观感）').toBe(
      'rgba(16, 16, 16, 0.28)',
    );
    expect(light.thumb).toBe('rgba(16, 16, 16, 0.16)');
    expect(light.thumbHover).toBe('rgba(16, 16, 16, 0.28)');

    await page.getByRole('combobox', { name: '主题' }).selectOption('dark');
    await expect
      .poll(() => tokenOf(page, '--scrim'), { message: '深色遮罩令牌没落地' })
      .toBe('rgba(0, 0, 0, 0.55)');

    const dark = {
      thumb: await tokenOf(page, '--scroll-thumb'),
      thumbHover: await tokenOf(page, '--scroll-thumb-hover'),
      bg: await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    };
    // 深底上必须是浅色墨，否则滚动条滑块和底同色
    expect(dark.thumb).toBe('rgba(232, 232, 230, 0.16)');
    expect(dark.thumbHover).toBe('rgba(232, 232, 230, 0.28)');
    expect(dark.bg, '深色主题的页面底色没变').not.toBe(light.bg);

    // 主题偏好要能撑过刷新（持久化在 paper-agent-frontend.ui 里）
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: '设置' })).toBeVisible();
    await expect
      .poll(() => tokenOf(page, '--scrim'), { message: '刷新后深色令牌没恢复' })
      .toBe('rgba(0, 0, 0, 0.55)');
  });
});
