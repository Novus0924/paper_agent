import { expect, test } from '@playwright/test';
import {
  FOCUSABLE,
  openAgentView,
  presetFastSpeed,
  readAgentGrid,
  viewportWidth,
} from './helpers';

/**
 * 断点实测：这些数值此前只有 724×772 的手工读数和"≥1280 应当出两轨"的推断，
 * 本套件把它变成真实渲染下的回归断言（1366 / 1280 / 1024 / 820 四档各跑一遍）。
 */
test.describe('监控页断点与无裁切', () => {
  test.beforeEach(async ({ page }) => {
    // 走 CSS 自带的 prefers-reduced-motion 分支，读数不受过渡中间态影响
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await presetFastSpeed(page);
    await openAgentView(page);
  });

  test('≥1280 才出两轨，且右栏固定 330px', async ({ page }) => {
    const width = viewportWidth(page);
    const mq = await page.evaluate(
      () => window.matchMedia('(min-width: 1280px)').matches,
    );
    // 阈值口径：媒体查询必须与文档声明的 1280 一致（含滚动条等渲染细节）
    expect(mq, `视口 ${width}px 的媒体查询判定`).toBe(width >= 1280);

    const grid = await readAgentGrid(page);
    expect(grid.tracks, `grid-template-columns = ${grid.cols}`).toHaveLength(mq ? 2 : 1);
    if (mq) {
      expect(grid.tracks[1]).toBe('330px');
      expect(grid.width).toBeLessThanOrEqual(1160);
      // 两轨 + 一个 gap 必须铺满容器，右侧不留空洞
      const [main = 0, rail = 0] = grid.tracks.map((v) => parseFloat(v));
      expect(Math.round(main + rail + parseFloat(grid.gap))).toBe(grid.width);
    }
  });

  /**
   * 用户口径「怎么好看怎么来」落在这里：降级横幅原先飘在两列正中（1366 下实测内容宽 706、左右各空 196），
   * 与它正在解释的「执行步骤」卡左沿对不上，看起来像浮着。这条锁的是"横幅属于正文列"这个形状，
   * 不是某个像素宽——所以四档视口各自跟同档的卡片比，改断点也不会误红。
   */
  test('降级横幅跟正文列对齐：与「执行步骤」卡同左沿、同宽', async ({ page }) => {
    const banner = page.locator('[class*="_banner_"]').first();
    await expect(banner).toBeVisible();

    const geo = await page.evaluate(() => {
      const b = document.querySelector('[class*="_banner_"]') as HTMLElement | null;
      const head = Array.from(document.querySelectorAll('h2,h3')).find((h) =>
        h.textContent?.includes('执行步骤'),
      );
      const card = head?.closest('section') as HTMLElement | null;
      if (!b || !card) return null;
      const rb = b.getBoundingClientRect();
      const rc = card.getBoundingClientRect();
      return {
        bannerLeft: Math.round(rb.left),
        bannerWidth: Math.round(rb.width),
        cardLeft: Math.round(rc.left),
        cardWidth: Math.round(rc.width),
        cardCls: String(card.className),
      };
    });
    if (!geo) throw new Error('找不到降级横幅或「执行步骤」卡，用例失去意义');

    expect(
      Math.abs(geo.bannerLeft - geo.cardLeft),
      `横幅左沿 ${geo.bannerLeft} 与正文卡左沿 ${geo.cardLeft} 不齐（卡是 ${geo.cardCls}）`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(geo.bannerWidth - geo.cardWidth),
      `横幅宽 ${geo.bannerWidth} 与正文卡宽 ${geo.cardWidth} 不同`,
    ).toBeLessThanOrEqual(1);
  });

  /**
   * Toast 不许盖住可点的东西。≤900 这一档顶栏里装的是**唯一**的导航（侧栏已隐藏），
   * 右上角那叠提示原先正好压住「总览 / 设置 / 最近任务」（实测重叠 43×25、62×25、166×29），
   * 4.2s 自动消失前用户点不到自己的主导航。这条把"遮罩不吃控件"变成断言，四档都跑。
   */
  test('Toast 出现时不遮挡任何可交互控件（≤900 的顶栏导航尤其）', async ({ page }) => {
    const stack = page.locator('[class*="toastStack"]');
    await expect(stack).toBeVisible();

    const hit = await stack.evaluate((el) => {
      const s = el.getBoundingClientRect();
      const out: { label: string; overlap: string }[] = [];
      for (const node of document.querySelectorAll(
        'button,a,select,input,[role="button"]',
      )) {
        if (el.contains(node)) continue; // 自己那两枚「关闭」不算被遮
        const r = node.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const ox = Math.min(s.right, r.right) - Math.max(s.left, r.left);
        const oy = Math.min(s.bottom, r.bottom) - Math.max(s.top, r.top);
        if (ox > 1 && oy > 1) {
          out.push({
            label: (node.getAttribute('aria-label') || node.textContent || node.tagName)
              .trim()
              .slice(0, 12),
            overlap: `${Math.round(ox)}×${Math.round(oy)}`,
          });
        }
      }
      return {
        rect: [
          Math.round(s.left),
          Math.round(s.top),
          Math.round(s.width),
          Math.round(s.height),
        ],
        out,
      };
    });
    expect(
      hit.out,
      `Toast 叠在控件上：${JSON.stringify(hit.out)}（栈 ${hit.rect.join(',')}）`,
    ).toEqual([]);
  });

  test('任何档位都没有横向溢出', async ({ page }) => {
    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(doc.scrollWidth, `视口 ${viewportWidth(page)}px`).toBeLessThanOrEqual(
      doc.clientWidth,
    );
  });

  test('产物梳理条目在 330px 栏宽下换行不裁字', async ({ page }) => {
    const items = page.locator('[class*="artifactItem"]');
    await expect(items.first()).toBeVisible();

    const clipped = await items.evaluateAll((els) =>
      els.flatMap((el) =>
        Array.from(
          el.querySelectorAll<HTMLElement>(
            '[class*="artifactTitle"], [class*="artifactRef"]',
          ),
        )
          .filter((s) => s.scrollWidth > s.clientWidth + 1)
          .map(
            (s) =>
              `${s.className} "${(s.textContent ?? '').slice(0, 16)}" scrollWidth=${s.scrollWidth} clientWidth=${s.clientWidth}`,
          ),
      ),
    );
    expect(clipped).toEqual([]);
  });

  test('侧栏只在 >900px 可见；≤900px 由顶栏窄屏导航接管（DR-13 关闭）', async ({
    page,
  }) => {
    const width = viewportWidth(page);
    const sidebar = page.locator('aside[class*="sidebar"]');
    await expect(sidebar).toHaveCount(1);
    await expect(sidebar).toBeVisible({ visible: width > 900 });

    const narrow = page.getByRole('navigation', { name: '窄屏导航' });
    await expect(narrow).toHaveCount(width > 900 ? 0 : 1);
    if (width > 900) return;

    // 侧栏隐藏后，工作区入口一个都不能少
    for (const label of ['新建科研任务', '总览', '设置']) {
      await expect(narrow.getByRole('link', { name: label })).toBeVisible();
    }
    // 最近任务用原生 select 跳转：不造浮层，键盘与触屏都够得着
    // 先量几何：任何一只控件被顶栏裁掉一半都说明这一档挤了（窄屏最常见的破法）
    const poked = await page.evaluate(() => {
      const bar = document.querySelector('header[class*="topbar"]');
      if (!(bar instanceof HTMLElement)) throw new Error('找不到顶栏');
      const box = bar.getBoundingClientRect();
      return Array.from(bar.querySelectorAll<HTMLElement>('nav a, nav select')).flatMap(
        (el) => {
          const b = el.getBoundingClientRect();
          const out =
            b.top < box.top - 0.5 ||
            b.bottom > box.bottom + 0.5 ||
            b.right > box.right + 0.5;
          return out
            ? [`${el.tagName} "${(el.textContent ?? '').trim().slice(0, 8)}"`]
            : [];
        },
      );
    });
    expect(poked, '有控件超出顶栏边界').toEqual([]);

    await narrow.getByLabel('最近任务').selectOption({ index: 1 });
    await expect(page).toHaveURL(/\/(monitor|report)\/run-/);
    await expect(
      page.getByRole('heading', { level: 1, name: /运行监控|报告/ }),
    ).toBeVisible();
  });

  test('窄屏「最近任务」下拉每项都带运行状态，不只报标题（§10 / WCAG 1.4.1）', async ({
    page,
  }) => {
    // >900px 这一档最近任务在侧栏，由行内的状态点（带可读名）承接；窄档只剩这个 select
    test.skip(viewportWidth(page) > 900, '该档位有侧栏，窄屏下拉不渲染');
    await page.goto('/');
    // 只认 select 的真选项文本：这是读屏与触屏在这个档位能拿到的全部信息，没有颜色可借
    const labels = await page.getByLabel('最近任务').evaluate((sel) =>
      Array.from(sel.querySelectorAll('option'))
        .slice(1)
        .map((o) => (o.textContent ?? '').trim()),
    );
    expect(
      labels.length,
      '下拉里没有渲染出最近任务，用例失去意义',
    ).toBeGreaterThanOrEqual(2);
    const bare = labels.filter((l) => !/已完成|执行中|待开始|未完成/.test(l));
    expect(bare, `这些选项只有标题、看不出运行状态：\n${bare.join('\n')}`).toEqual([]);
  });

  test('Composer 真键盘聚焦：容器单层环，输入框自身无双环', async ({ page }) => {
    const ta = page.locator('#composer-textarea');
    await ta.evaluate((el) => el.scrollIntoView({ block: 'center' }));

    // 上限跟着页面实际可聚焦元素数走：写死 60 时，窄档（可聚焦元素本来就更多一排）会在并行负载下偶发跑不满
    const focusables = await page.evaluate(
      (sel) => document.querySelectorAll(sel).length,
      FOCUSABLE,
    );
    const hops = focusables + 10;
    let reached = false;
    for (let hop = 0; hop < hops && !reached; hop += 1) {
      await page.keyboard.press('Tab');
      reached =
        (await page.evaluate(() => document.activeElement?.id ?? '')) ===
        'composer-textarea';
    }
    expect(
      reached,
      `真键盘 ${hops} 跳内没走到输入框（可聚焦元素 ${focusables} 个）`,
    ).toBe(true);

    const box = ta.locator('xpath=..');
    // 过渡即使被 reduced-motion 压到 0.01ms，也仍要等一帧才落到终值：同步 getComputedStyle 会读到上一帧。
    // 这条用例在窄档并行负载下偶发失败就是这个原因，所以样式断言一律轮询到终值再取其余读数。
    await expect(box).toHaveCSS('border-color', 'rgb(17, 17, 17)');
    await expect
      .poll(async () => box.evaluate((el) => window.getComputedStyle(el).boxShadow), {
        message: '聚焦环没有出现',
      })
      .toContain('0px 0px 0px 3px');

    const focused = await ta.evaluate((el) => {
      const box = el.parentElement as HTMLElement;
      return {
        focusVisible: el.matches(':focus-visible'),
        focusWithin: box.matches(':focus-within'),
        boxShadow: window.getComputedStyle(box).boxShadow,
        taShadow: window.getComputedStyle(el).boxShadow,
        taOutline: window.getComputedStyle(el).outlineStyle,
        taRadius: window.getComputedStyle(el).borderRadius,
      };
    });
    expect(focused.focusVisible).toBe(true);
    expect(focused.focusWithin).toBe(true);
    // 双层 ring 是本轮修掉的缺陷：环只允许出现在容器上
    expect(focused.taShadow).toBe('none');
    expect(focused.taOutline).toBe('none');
    const layers = focused.boxShadow.split(/,(?![^(]*\))/);
    expect(layers, `聚焦环层数：${focused.boxShadow}`).toHaveLength(2);

    await ta.evaluate((el) => el.blur());
    await expect(box).toHaveCSS('box-shadow', 'none');
    await expect(box).toHaveCSS('border-color', 'rgba(16, 16, 16, 0.15)');
  });
});

/**
 * 用户第 3 点：侧栏收起后图标不对齐。
 * 收起态只剩 64px 轨道，整列内容必须落在这条中轴上——用真实渲染的几何读数判定，
 * 不看 CSS 声明值（声明里 gap/padding 叠加后到底偏多少，只有布局算完才知道）。
 */
test.describe('收起态侧栏对齐', () => {
  test.beforeEach(async ({ page }) => {
    // ≤900px 侧栏整体隐藏（DR-13），收起按钮那一刻就不存在了，先跳过再点
    test.skip(viewportWidth(page) <= 900, '该档位侧栏隐藏，收起态不适用');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await presetFastSpeed(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();
    // 真点收起按钮：顺带证明这个动作在收起态前一步是可达的
    await page.getByRole('button', { name: '收起导航栏' }).click();
  });

  test('标识、导航、新建、收起四个图标都贴住轨道中轴（误差 ≤1px）', async ({ page }) => {
    const read = await page.locator('aside[class*="sidebar"]').evaluate((el) => {
      const rail = el.getBoundingClientRect();
      const off = (sel: string): number => {
        const svg = el.querySelector<HTMLElement>(sel)?.querySelector('svg');
        if (!svg) throw new Error(`找不到图标：${sel}`);
        const b = svg.getBoundingClientRect();
        return +(b.left + b.width / 2 - (rail.left + rail.width / 2)).toFixed(2);
      };
      return {
        railWidth: +rail.width.toFixed(1),
        brandMark: off('[class*="mark"]'),
        newTask: off('[class*="newTaskBtn"]'),
        nav: off('[class*="navItem"]'),
        collapse: off('[class*="collapseBtn"]'),
      };
    });

    expect(read.railWidth).toBe(64);
    for (const [name, px] of Object.entries(read)) {
      if (name === 'railWidth') continue;
      expect(Math.abs(px), `${name} 图标偏离轨道中线 ${px}px`).toBeLessThanOrEqual(1);
    }
  });
});
