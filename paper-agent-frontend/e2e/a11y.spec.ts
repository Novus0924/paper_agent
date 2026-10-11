import { expect, test, type Page } from '@playwright/test';
import { FOCUSABLE, openAgentView, presetFastSpeed, researchTaskId } from './helpers';

/**
 * 无障碍的浏览器侧证据（用户第 4 点）。
 * 单元测试能证明 DOM 结构，但标题大纲要连着 CSS 一起看、Tab 序要真键盘、
 * 对比度要真算颜色——这三件事只在真浏览器里量得到。
 */

async function headingOutline(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
      Number(h.tagName.slice(1)),
    ),
  );
}

function skipped(levels: number[]): string[] {
  const bad: string[] = [];
  let prev = 0;
  for (const level of levels) {
    if (level > prev + 1) bad.push(`h${prev || '0'} → h${level}`);
    prev = level;
  }
  return bad;
}

test.describe('无障碍：结构与可聚焦性', () => {
  test.beforeEach(async ({ page }) => {
    await presetFastSpeed(page);
  });

  test('四个视图在真浏览器里的标题大纲：唯一 h1，不跳级，html 有语言', async ({
    page,
  }) => {
    const taskId = await openAgentView(page);
    await page.goto('/');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang))
      .toBeTruthy();

    const views = [
      { label: '总览', at: '/', h1: '总览' },
      { label: '新建向导', at: '/new', h1: '新建科研任务' },
      { label: '设置', at: '/settings', h1: '设置' },
      { label: '运行监控', at: `/monitor/${taskId}`, h1: '运行监控' },
    ];

    for (const view of views) {
      await page.goto(view.at);
      await expect(page.getByRole('heading', { level: 1, name: view.h1 })).toBeVisible();
      const levels = await headingOutline(page);
      expect(levels.length, `${view.label} 应有分区标题`).toBeGreaterThan(1);
      expect(skipped(levels), `${view.label} 大纲 h${levels.join(' > h')}`).toEqual([]);
      expect(await page.locator('h1').count(), `${view.label} 的 h1 数量`).toBe(1);
    }
  });

  test('卡片标题走的是卡片头部的排版，不因为变成 h3 就变大', async ({ page }) => {
    await page.goto('/');
    const head = page.getByRole('heading', { level: 3, name: '任务列表' });
    await expect(head).toBeVisible();
    const style = await head.evaluate((el) => {
      const cs = getComputedStyle(el);
      const parent = getComputedStyle(el.parentElement as Element);
      return {
        size: cs.fontSize,
        weight: cs.fontWeight,
        parentSize: parent.fontSize,
        parentWeight: parent.fontWeight,
        margin: cs.marginTop,
      };
    });
    expect(style.size).toBe(style.parentSize);
    expect(style.weight).toBe(style.parentWeight);
    expect(Number(style.margin.replace(/[^0-9.]/g, ''))).toBe(0);
  });

  test('第一次 Tab 落在「跳到主内容」，回车后焦点进入 main', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '总览' })).toBeVisible();

    await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el
        ? { text: el.textContent?.trim() ?? '', href: el.getAttribute('href') }
        : null;
    });
    expect(skip?.text).toBe('跳到主内容');
    expect(skip?.href).toBe('#main');

    await page.keyboard.press('Enter');
    await expect
      .poll(() =>
        page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? ''),
      )
      .toBe('main');
  });

  /**
   * 原生 <button> 上的真 Enter 激活。此前回车只在两处验过：跳转链接（上面那条）与 Composer 输入框
   * （journey.spec.ts）。总览行内的动作是全站数量最多的一类按钮，一旦 `Button` 从 `<button>`
   * 换成 `<div role="button">`，鼠标照点、键盘就废了——只有真按键走一遍才测得出来。
   */
  test('总览行内动作：真 Tab 走到「查看报告」，真 Enter 跳进报告页', async ({ page }) => {
    await researchTaskId(page); // 停在总览
    const target = page.getByRole('button', { name: '查看报告' }).first();
    await expect(target).toBeVisible();

    // 上限跟着页面实际可聚焦元素数走，理由同 breakpoints.spec.ts 的 Composer 那条
    const focusables = await page.evaluate(
      (sel) => document.querySelectorAll(sel).length,
      FOCUSABLE,
    );
    const hops = focusables + 10;
    let reached = false;
    for (let hop = 0; hop < hops && !reached; hop += 1) {
      await page.keyboard.press('Tab');
      reached = await target.evaluate((el) => el === document.activeElement);
    }
    expect(reached, `真键盘 ${hops} 跳内没走到「查看报告」`).toBe(true);

    const activated = await target.evaluate((el) => ({
      tag: el.tagName,
      taskId: (el.closest('tr') as HTMLTableRowElement).dataset.taskId ?? '',
    }));
    expect(activated.tag, 'Enter 只对原生可激活元素负责，先确认它真是 <button>').toBe(
      'BUTTON',
    );
    expect(activated.taskId).toBeTruthy();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/report/${activated.taskId}$`));
    await expect(page.getByRole('heading', { level: 1, name: '报告' })).toBeVisible();
  });

  test('收起的折叠区不在 Tab 序里；展开后其中的动作可以聚焦', async ({ page }) => {
    const taskId = await openAgentView(page);
    await page.goto(`/evidence/${taskId}`);

    // 用「审计细节」：它的正文里确实有动作（引用回查），否则这条断言是空的
    const audit = page.getByRole('button', { name: '审计细节' }).first();
    await expect(audit).toBeVisible();
    const collapsed = await audit.evaluate((btn, sel) => {
      const body = document.getElementById(
        btn.getAttribute('aria-controls') ?? '',
      ) as HTMLElement;
      const focusables = Array.from(body.querySelectorAll(sel)) as HTMLElement[];
      focusables[0]?.focus();
      return {
        hidden: body.hasAttribute('hidden'),
        focusableCount: focusables.length,
        landedInside: focusables.length > 0 && document.activeElement === focusables[0],
      };
    }, FOCUSABLE);
    expect(collapsed.focusableCount, '折叠正文里要有可聚焦元素').toBeGreaterThan(0);
    expect(collapsed.hidden, '收起时应带 hidden，而不是只靠 CSS 藏起来').toBe(true);
    expect(collapsed.landedInside, '收起正文里的元素不该接受焦点').toBe(false);

    await audit.click();
    const opened = await audit.evaluate((btn) => {
      const body = document.getElementById(
        btn.getAttribute('aria-controls') ?? '',
      ) as HTMLElement;
      const focusables = Array.from(
        body.querySelectorAll('a[href],button,input,select,textarea'),
      ) as HTMLElement[];
      focusables[0]?.focus();
      return {
        hidden: body.hasAttribute('hidden'),
        height: body.getBoundingClientRect().height,
        landedInside: focusables.length > 0 && document.activeElement === focusables[0],
      };
    });
    expect(opened.hidden).toBe(false);
    expect(opened.height, 'hidden 属性必须真的展开出高度').toBeGreaterThan(0);
    expect(opened.landedInside).toBe(true);
  });

  test('侧栏最近任务的运行状态不只靠颜色：链接名里带状态词', async ({ page }) => {
    // ≤900px 侧栏整体隐藏，最近任务由顶栏下拉承接，这里量不到 hist 行
    const narrow = await page.evaluate(
      () => window.matchMedia('(max-width: 900px)').matches,
    );
    test.skip(narrow, '窄档没有侧栏');

    await page.goto('/');
    const rows = page.locator('a[class*="histItem"]');
    await expect(rows.first()).toBeVisible();
    const total = await rows.count();
    // 只认可以访问名：点若仍是无名的 6px 色块，这一句就回落到 0
    const spoken = await page
      .getByRole('link', { name: /已完成|执行中|待开始|未完成/ })
      .count();
    expect(spoken, `${total} 行最近任务里有 ${total - spoken} 行只靠颜色表达状态`).toBe(
      total,
    );
  });
});

test.describe('无障碍：文字对比度', () => {
  test('正文与卡片标题达到 AA 的 4.5:1', async ({ page }) => {
    await presetFastSpeed(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 3, name: '任务列表' })).toBeVisible();

    const ratios = await page.evaluate(() => {
      const channel = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const parse = (color: string) => {
        const m = color.match(/[\d.]+/g);
        if (!m) return null;
        const [r = 0, g = 0, b = 0, a = 1] = m.map(Number);
        return { r, g, b, a };
      };
      const lum = (c: { r: number; g: number; b: number }) =>
        0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
      const bgOf = (el: Element): { r: number; g: number; b: number } => {
        let node: Element | null = el;
        while (node) {
          const bg = parse(getComputedStyle(node).backgroundColor);
          if (bg && bg.a > 0.9) return bg;
          node = node.parentElement;
        }
        return { r: 255, g: 255, b: 255 };
      };
      const ratio = (
        fg: { r: number; g: number; b: number },
        bg: { r: number; g: number; b: number },
      ) => {
        const a = lum(fg);
        const b = lum(bg);
        return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
      };
      const sample = (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return null;
        const cs = getComputedStyle(el);
        const fg = parse(cs.color);
        if (!fg) return null;
        return {
          text: el.textContent?.trim().slice(0, 12) ?? '',
          ratio: ratio(fg, bgOf(el)),
        };
      };
      return [
        sample('h1'),
        sample('[class*="pageTitle"]'),
        sample('[class*="cardTitle"]'),
        sample('[class*="cellTitle"]'),
        sample('[class*="statLabel"]'),
        sample('[class*="muted"]'),
        sample('[class*="badge"]'),
      ].filter((v): v is NonNullable<typeof v> => v !== null);
    });

    // 至少要真量到 5 类文字，否则"全过"可能只是选择器没命中
    expect(ratios.length, '对比度样本数').toBeGreaterThanOrEqual(5);
    for (const r of ratios) {
      expect(r.ratio, `"${r.text}" 的对比度 ${r.ratio}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

test.describe('无障碍：状态点相对承载面达到非文本 3:1（§10 / WCAG 1.4.11）', () => {
  /**
   * 扫真实渲染出来的状态点，而不是拿令牌名推断。底面要把祖先链上的半透明层
   * （badge 的 --*-soft 就是 8~10% 的 tint）按 alpha 合成出来——文字那条只取最近的
   * 不透明祖先，照搬到这里会把 tint 忽略掉，让"过了"变成假的。
   * 不折叠 blink 带来的元素 opacity：1.4.11 量的是构件的静态呈现，动效深度是另一件事，
   * 现状与后果写在 README §5 未验证项里，不在这里冒充已达标。
   */
  // 非文本对比度门槛：WCAG 1.4.11 对"识别状态所需的视觉信息"要求 3:1
  const MIN_RATIO = 3;
  type Sample = { page: string; tone: string; colors: string; ratio: number };
  const sweep = (): Sample[] => {
    type Rgb = { r: number; g: number; b: number };
    type RGBA = Rgb & { a: number };
    const parse = (color: string): RGBA | null => {
      // computed color 在 Edge/Chromium 恒为 rgb()/rgba()。这里逐通道按位取，
      // 不用 /[\d.]+/g 通配：alpha 会跟着错位成第 4 位之后的噪声，透明度一错，
      // 合成出的承载面就偏亮，对比度会被算高——那正是这条用例最不该犯的错。
      const m = /^rgba?\(([^)]+)\)$/.exec(color);
      if (!m) return null;
      const nums = (m[1] ?? '')
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));
      const [r = 0, g = 0, b = 0, a = 1] = nums;
      return { r, g, b, a };
    };
    const chan = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const lum = (c: Rgb) => 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
    const ratio = (f: Rgb, b: Rgb) => {
      const x = lum(f);
      const y = lum(b);
      return Number(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2));
    };
    const over = (fg: RGBA, base: Rgb): Rgb => ({
      r: fg.r * fg.a + base.r * (1 - fg.a),
      g: fg.g * fg.a + base.g * (1 - fg.a),
      b: fg.b * fg.a + base.b * (1 - fg.a),
    });
    const surfaceOf = (el: Element): Rgb => {
      const tints: RGBA[] = [];
      let base: Rgb = { r: 255, g: 255, b: 255 };
      let node: Element | null = el.parentElement;
      while (node) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c.a > 0) {
          if (c.a >= 0.99) {
            base = c;
            break;
          }
          tints.push(c);
        }
        node = node.parentElement;
      }
      let out = base;
      // 最靠近底的那一层先合成
      for (let i = tints.length - 1; i >= 0; i -= 1) {
        const t = tints[i];
        if (t) out = over(t, out);
      }
      return out;
    };
    // 实现自检：先证伪自己，再证伪页面。黑白 21:1、同色 1:1、
    // #767676 on 白 = 4.54（AA 的公认边界值）。任一不符就是这套算术错了，
    // 那时"全过"没有任何意义。
    const selfCheck = [
      [ratio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }), 21],
      [ratio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21],
      [ratio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }), 1],
      [ratio({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 }), 4.54],
      // 半透明必须真的参与合成：50% 的黑压在白上得到 #7f7f7f 那级中灰，实测 3.98:1。
      // 这条常数一开始被我写成 4.54（那是 #767676 的值），自检当场就红了——它挡得住算错。
      [
        ratio(over({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255 }), {
          r: 255,
          g: 255,
          b: 255,
        }),
        3.98,
      ],
    ] as const;
    for (const [got, want] of selfCheck) {
      if (Math.abs(got - want) > 0.01) {
        throw new Error(`对比度算术自检失败：期望 ${want}:1，实得 ${got}:1`);
      }
    }
    // 点的身份按"实测颜色对令牌"命名，而不是按类名：徽章里那颗 .dot 的颜料来自
    // .warn .dot 这类父级规则，类名只会一律报成 dot，四条档位并行时认不出是谁。
    const hex = (value: string): Rgb | null => {
      const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
      const h = m?.[1];
      if (!h) return null;
      const full =
        h.length === 3
          ? h
              .split('')
              .map((c) => c + c)
              .join('')
          : h;
      return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16),
      };
    };
    const rootStyle = getComputedStyle(document.documentElement);
    const tokens = (
      [
        ['ok', '--ok'],
        ['run', '--run'],
        ['warn', '--warn'],
        ['fail', '--fail'],
        ['idle', '--idle'],
      ] as const
    ).flatMap(([name, varName]) => {
      const rgb = hex(rootStyle.getPropertyValue(varName));
      return rgb ? [{ name, rgb }] : [];
    });
    // 读不到令牌就让整条用例作废：那说明下面每一颗点都会被打成 '?'，"量到了"是假象
    if (tokens.length < 5)
      throw new Error(`状态色令牌只读到 ${tokens.length}/5，无法给点定身份`);
    const toneOf = (c: Rgb) =>
      tokens.find(
        (t) =>
          Math.abs(t.rgb.r - c.r) < 1 &&
          Math.abs(t.rgb.g - c.g) < 1 &&
          Math.abs(t.rgb.b - c.b) < 1,
      )?.name ?? '?';
    const rgbText = (c: Rgb) =>
      `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;

    return Array.from(
      document.querySelectorAll<HTMLElement>('span[class*="dot"], span[class*="Dot"]'),
    ).flatMap((el) => {
      const fg = parse(getComputedStyle(el).backgroundColor);
      if (!fg || fg.a === 0) return [];
      const surface = surfaceOf(el);
      const painted = over(fg, surface);
      return [
        {
          page: location.pathname,
          tone: toneOf(painted),
          // 颜色一起带出来：不达时要能看出是点太浅还是底太浅
          colors: `${rgbText(painted)} on ${rgbText(surface)}`,
          ratio: ratio(painted, surface),
        },
      ];
    });
  };

  test('总览/新建/监控/报告/证据五页里每一颗状态点都比它身后的底够清楚', async ({
    page,
  }) => {
    await presetFastSpeed(page);
    const samples: Sample[] = [];
    await openAgentView(page);
    samples.push(...(await page.evaluate(sweep)));
    const id = await researchTaskId(page);
    for (const path of ['/', '/new', `/report/${id}`, `/evidence/${id}`]) {
      await page.goto(path);
      samples.push(...(await page.evaluate(sweep)));
    }

    // 防空跑：真量到的点数与"能对上令牌的颜色种类"都要够，否则"全过"可能只是选择器没命中。
    // 不要求某一颗特定的点出现：种子里没有待开始（PLANNED）的任务，idle 那颗在页面上不渲染，
    // 它的对比度由 tests/tokens.test.ts 的"令牌 × 实心浅底"矩阵兜住，这一层只量真实渲染出来的。
    expect(samples.length, '量到的状态点数').toBeGreaterThanOrEqual(20);
    const tones = [...new Set(samples.map((s) => s.tone))];
    expect(
      tones.filter((x) => x !== '?').length,
      `只认出 ${tones.filter((x) => x !== '?').length} 种状态色档位，样本：${tones.join(' / ')}`,
    ).toBeGreaterThanOrEqual(4);
    const unknown = samples.filter((s) => s.tone === '?');
    expect(
      unknown,
      `${unknown.length} 颗点的颜色对不上任何状态令牌，说明扫描抓到了别的东西：\n${unknown
        .map((u) => `${u.page} ${u.colors} → ${u.ratio}:1`)
        .join('\n')}`,
    ).toEqual([]);

    const weak = samples.filter((s) => s.ratio < MIN_RATIO);
    expect(
      weak,
      `${weak.length}/${samples.length} 颗状态点相对承载面不达非文本 ${MIN_RATIO}:1\n${weak
        .map((w) => `${w.page} ${w.tone} ${w.colors} → ${w.ratio}:1`)
        .join('\n')}`,
    ).toEqual([]);
  });
});
