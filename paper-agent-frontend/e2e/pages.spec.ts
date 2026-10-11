import { expect, test } from '@playwright/test';
import { researchTaskId } from './helpers';

/**
 * 任务级页面（总览 / 报告 / 证据）在四档真实视口下的取证。
 * 这一组补的是此前只在 530 CSS px 窄视口里手工看过分页的口径缺口：
 * 分页的数据切换、深链跨页定位、列对齐与状态文案统一，现在都由真浏览器断言。
 */

test.describe('任务级页面取证', () => {
  test('总览表格：列与值都居中，状态只用三字词，更新时间不折行', async ({ page }) => {
    await page.goto('/');
    const table = page.locator('table');
    await expect(table).toBeVisible();

    const align = await table.evaluate((el) =>
      Array.from(el.querySelectorAll('thead th, tbody td')).map(
        (c) => getComputedStyle(c).textAlign,
      ),
    );
    expect(align.length, '表格里没量到单元格').toBeGreaterThan(0);
    expect([...new Set(align)], `出现非居中对齐：${align.join(',')}`).toEqual(['center']);

    // 铁律：状态列只写人话短词，长度统一；降级是状态不是目标文案
    const words = await table.evaluate((el) =>
      Array.from(el.querySelectorAll('tbody tr')).map(
        (r) => (r.querySelectorAll('td')[1] as HTMLElement).innerText,
      ),
    );
    const allowed = new Set(['已完成', '未完成', '已降级', '待开始', '执行中']);
    for (const cell of words) {
      const tokens = cell.split('\n').filter(Boolean);
      expect(
        tokens.length,
        `状态列堆了 ${tokens.length} 项：${cell}`,
      ).toBeLessThanOrEqual(2);
      for (const token of tokens) {
        expect(allowed.has(token), `状态列出现未登记文案：「${token}」`).toBe(true);
        expect(token.length, `状态文案长度不统一：「${token}」`).toBe(3);
      }
    }

    // 「更新时间列应该宽一点，不然分行很丑」：折行会多出第二个 line box
    const lineBoxes = await table.evaluate((el) =>
      Array.from(el.querySelectorAll('tbody tr')).map((r) => {
        const td = r.querySelectorAll('td')[2] as HTMLElement;
        const range = document.createRange();
        range.selectNodeContents(td);
        return range.getClientRects().length;
      }),
    );
    expect(lineBoxes, `更新时间列折行：${lineBoxes.join(',')}`).toEqual(
      lineBoxes.map(() => 1),
    );
  });

  test('EV 徽章与跨页深链：进证据页并真的定位到那一条', async ({ page }) => {
    const taskId = await researchTaskId(page);
    await page.goto(`/report/${taskId}`);
    await expect(page.getByRole('heading', { name: '结论' }).first()).toBeVisible();

    const badge = page
      .locator('a[href*="/evidence/"]')
      .filter({ hasText: /^EV-\d+$/ })
      .first();
    await expect(badge).toBeVisible();
    const evId = (await badge.getAttribute('href'))?.split('ev=')[1];
    expect(evId, 'EV 徽章的深链里没有 ev 参数').toBeTruthy();

    await badge.click();
    await expect(page).toHaveURL(new RegExp(`/evidence/${taskId}\\?ev=${evId}`));
    await expect(page.getByText(`已定位到 ${evId}`)).toBeVisible();

    // 高亮卡片必须就是那一条且已在视口内
    const highlighted = page.locator('[class*="evCardHi"]');
    await expect(highlighted).toHaveCount(1);
    expect(await highlighted.getAttribute('id')).toBe(evId);
    await expect(highlighted).toBeInViewport();

    // 结论只绑到 EV-0001…EV-0008（都在第 1 页），徽章这条路量不到跨页深链；
    // 而第 2 页的条目必须有真实证据说明页面会"先跳页再滚动"，否则 ?ev=EV-0012 会落在当前页找不到卡片。
    await page.goto(`/evidence/${taskId}?ev=EV-0012`);
    await expect(page.getByText('已定位到 EV-0012')).toBeVisible();
    await expect(page.getByRole('navigation', { name: '列表分页' })).toContainText(
      '第 11–12 条',
    );
    const onSecondPage = page.locator('[class*="evCardHi"]');
    await expect(onSecondPage).toHaveCount(1);
    expect(await onSecondPage.getAttribute('id')).toBe('EV-0012');
    await expect(onSecondPage).toBeInViewport();
  });

  test('证据列表分页：翻页换数据，任何档位都无横向溢出', async ({ page }) => {
    const taskId = await researchTaskId(page);
    await page.goto(`/evidence/${taskId}`);

    const pager = page.getByRole('navigation', { name: '列表分页' });
    await expect(pager).toBeVisible();
    await expect(pager).toContainText('第 1–10 条 / 共 12 条');
    // 第一页的边界禁用要写明原因，不是"点了没反应"的假按钮
    const prev = pager.getByRole('button', { name: '上一页' });
    await expect(prev).toBeDisabled();
    await expect(prev).toHaveAttribute('title', '已是第一页');

    const firstPage = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[class*="evCard"] [class*="evId"]')).map(
        (n) => n.textContent,
      ),
    );
    expect(firstPage).toHaveLength(10);

    await pager.getByRole('button', { name: '下一页' }).click();
    await expect(pager).toContainText('第 11–12 条 / 共 12 条');
    const secondPage = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[class*="evCard"] [class*="evId"]')).map(
        (n) => n.textContent,
      ),
    );
    expect(secondPage).toHaveLength(2);
    expect(
      secondPage.filter((id) => firstPage.includes(id as string)),
      '翻页后仍有第一页的条目',
    ).toEqual([]);

    const next = pager.getByRole('button', { name: '下一页' });
    await expect(next).toBeDisabled();
    await expect(next).toHaveAttribute('title', '已是最后一页');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `横向溢出 ${overflow}px`).toBeLessThanOrEqual(0);
  });

  test('Composer 停靠区是不透明层：滚到一半的正文不从遮罩里露出半行字', async ({ page }) => {
    const taskId = await researchTaskId(page);
    await page.goto(`/monitor/${taskId}`);
    await expect(page.getByText('工具调用监控')).toBeVisible();

    const dock = await page.locator('#composer-textarea').evaluate((ta) => {
      const wrap = ta.closest('[class*="wrap"]') as HTMLElement;
      const cs = getComputedStyle(wrap);
      return {
        position: cs.position,
        bottom: cs.bottom,
        image: cs.backgroundImage,
        bg: cs.backgroundColor,
      };
    });
    // 常驻可达是对的（sticky bottom:0），但底必须整块不透明：
    // 半透明渐变会把正文横切在半行字上（截图实测到的就是这个）
    expect(dock.position).toBe('sticky');
    expect(dock.bottom).toBe('0px');
    expect(dock.image, `停靠区还留着渐变遮罩：${dock.image}`).toBe('none');
    expect(dock.bg).toMatch(/^rgb\([^)]+\)$/);
  });
});
