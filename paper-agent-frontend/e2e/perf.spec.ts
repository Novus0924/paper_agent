import { expect, test, type Page } from '@playwright/test';

/**
 * 文档 §10 的性能口径：首屏可交互 ≤3s、路由切换 ≤300ms。
 * 这两个数必须在真实浏览器里量出来，不能推算；SSE「事件到 UI」那一档要等真实后端，这里不假装量过。
 */

/** addInitScript 里的初始化钩子：paint 计时是 buffered 条目，晚挂 observer 就取不到 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __paint: Record<string, number> };
    w.__paint = {};
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__paint[e.name] = e.startTime;
    }).observe({ type: 'paint', buffered: true });
  });
});

const readFcp = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __paint?: Record<string, number> }).__paint?.[
        'first-contentful-paint'
      ] ?? -1,
  );

test.describe('性能取数（文档 §10）', () => {
  /** 这组用例的产物就是数字本身：既打到 stdout，也挂成 annotation 进报告 */
  const record = (label: string, detail: string) => {
    test.info().annotations.push({ type: 'perf', description: `${label} ${detail}` });
    process.stdout.write(`PERF ${label} ${detail}\n`);
  };

  test('首屏：从导航开始到总览表格首行动作可用', async ({ page }) => {
    await page.goto('/');
    const tti = await page.evaluate(async () => {
      const ready = () => {
        const h1 = document.querySelector('h1');
        return (
          !!h1 && h1.textContent === '总览' && !!document.querySelector('tbody tr button')
        );
      };
      const deadline = performance.now() + 8000;
      while (!ready() && performance.now() < deadline) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return performance.now();
    });
    // FCP 比"内容可用"晚一帧落账（要真画出来才记），所以单独轮询，不拿它当就绪条件
    await expect
      .poll(() => readFcp(page), {
        message: '没有量到 FCP（paint observer 没收到计时项）',
      })
      .toBeGreaterThan(0);
    const fcp = await readFcp(page);

    record('firstscreen', `tti=${tti.toFixed(0)}ms fcp=${fcp.toFixed(0)}ms`);
    expect(tti, `首屏可交互 ${tti.toFixed(0)}ms 超过 3000ms 预算`).toBeLessThanOrEqual(
      3000,
    );
  });

  test('路由切换：点导航到目标页标题渲染 ≤300ms', async ({ page }) => {
    // 预热：dev server 按需编译模块，首次进某条路由的编译耗时不该算进"用户感知的切换延迟"
    for (const to of ['/settings', '/new']) {
      await page.goto(to);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    }
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();

    await page.evaluate(() => {
      const w = window as unknown as { __clickAt: number; __paintAt: number };
      w.__clickAt = 0;
      w.__paintAt = 0;
      // 起点在页面内取（捕获阶段的 click 时间戳），避免把 CDP 往返算进延迟
      document.addEventListener(
        'click',
        (e) => {
          if ((e.target as Element).closest?.('nav a')) w.__clickAt = performance.now();
        },
        true,
      );
      const check = () => {
        const h1 = document.querySelector('h1');
        if (w.__clickAt && h1?.textContent === '设置') {
          w.__paintAt = performance.now();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });

    await page.getByRole('link', { name: '设置' }).click();
    await expect(page.getByRole('heading', { level: 1, name: '设置' })).toBeVisible();

    const switchMs = await page.evaluate(() => {
      const w = window as unknown as { __clickAt: number; __paintAt: number };
      return w.__paintAt > 0 ? w.__paintAt - w.__clickAt : -1;
    });
    record('routeSwitch', `${switchMs.toFixed(1)}ms`);
    expect(switchMs, '没量到切换终点（rAF 没跑或目标标题没渲染）').toBeGreaterThanOrEqual(
      0,
    );
    expect(
      switchMs,
      `路由切换 ${switchMs.toFixed(0)}ms 超过 300ms 预算`,
    ).toBeLessThanOrEqual(300);
  });
});
