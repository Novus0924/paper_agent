import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 文档 §5.1 / FE-01 的铁律：颜色只有一个真源（tokens.css），组件样式不许硬编码。
 * 这条锁的是"漂移"：CSS 里没有编译期检查，写死一个 rgba() 当场看不出问题，
 * 到深色主题才现形（主题只覆盖令牌，覆盖不到字面量）。
 */
const STYLES_DIR = join(process.cwd(), 'src/styles');

const cssFiles = () =>
  readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith('.css'))
    .map((name) => ({
      name,
      // 注释里出现的 var(--x) 不该被当成引用，颜色示例也不该被当成字面量
      text: readFileSync(join(STYLES_DIR, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
    }));

const tokenSource = () =>
  readFileSync(join(STYLES_DIR, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** :root 默认块：第一个 [data-theme= 之前的一切（默认即深色控制台） */
const baseBlock = (): string => {
  const raw = tokenSource();
  const i = raw.indexOf('[data-theme=');
  return i === -1 ? raw : raw.slice(0, i);
};

/** 具名主题块的声明体：[data-theme='light'] { … } 里的内容 */
const themeBlock = (theme: 'light' | 'dark'): string =>
  new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([\\s\\S]*?)\\}`).exec(tokenSource())?.[1] ??
  '';

/** 声明段：:root 默认块与各主题覆盖块 */
const splitTokenBlocks = () => {
  const names = (text: string) =>
    [...text.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)].map((m) => m[1] as string);
  return {
    base: names(baseBlock()),
    light: names(themeBlock('light')),
    dark: names(themeBlock('dark')),
  };
};

describe('设计令牌唯一真源（§5.1）', () => {
  it('除 tokens.css 外的样式里不许出现颜色字面量', () => {
    // 关键字只认"独立成词"的：white-space / pre-wrap 这类属性名与值不算颜色
    const literal =
      /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|(?<![-\w])(?:white|black|red|blue|green|orange|gray|grey|yellow|purple|pink|brown|cyan|magenta)(?![-\w])/g;
    const offenders: string[] = [];
    for (const file of cssFiles()) {
      if (file.name === 'tokens.css') continue;
      for (const m of file.text.matchAll(literal)) {
        const line = file.text.slice(0, m.index).split('\n').length;
        offenders.push(`${file.name}:${line} ${m[0]}`);
      }
    }
    expect(offenders, `硬编码颜色：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('每一个 var(--x) 引用都能在 tokens.css 里找到声明', () => {
    const declared = new Set(splitTokenBlocks().base);
    const missing: string[] = [];
    for (const file of cssFiles()) {
      for (const m of file.text.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)) {
        if (!declared.has(m[1] as string)) {
          const line = file.text.slice(0, m.index).split('\n').length;
          missing.push(`${file.name}:${line} ${m[1]}`);
        }
      }
    }
    expect(missing, `引用了未声明的令牌：\n${missing.join('\n')}`).toEqual([]);
  });

  it('主题覆盖块只覆盖默认已声明的令牌，不新增', () => {
    const { base, light, dark } = splitTokenBlocks();
    const known = new Set(base);
    // 主题块里出现新名字 = 默认下该令牌根本没值，组件在某主题会静默拿到空值
    const offenders = [...light, ...dark].filter((n) => !known.has(n));
    expect(offenders, `主题块新增了未声明令牌：${offenders.join(', ')}`).toEqual([]);
  });
});

/** 把一段 CSS 里的 `--x: value;` 收成 Map；先剥注释，免得把注释里的冒号当声明 */
const valuesIn = (text: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const name = m[1];
    const value = m[2];
    if (name && value) out.set(name, value.trim());
  }
  return out;
};

/** 默认（深色控制台）解析后的表：这一条锁的是取值，不是"页面上看着还行" */
const baseValues = (): Map<string, string> => valuesIn(baseBlock());

/** 指定主题解析后的表：主题块覆盖同名令牌，没覆盖的沿用默认值 */
const themeValues = (theme: 'light' | 'dark'): Map<string, string> =>
  new Map([...baseValues(), ...valuesIn(themeBlock(theme))]);

type Rgb = { r: number; g: number; b: number; a: number };

const toRgb = (token: string, value: string): Rgb => {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  const h = hex?.[1];
  if (h) {
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(value);
  const nums = (fn?.[1] ?? '')
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (nums.length >= 3 && nums.every((n) => !Number.isNaN(n))) {
    const [r = 0, g = 0, b = 0, a = 1] = nums;
    return { r, g, b, a };
  }
  throw new Error(`${token} 的值 "${value}" 不是十六进制或 rgb()/rgba()，对比度没法算`);
};

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (c: Rgb) =>
  0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
const contrast = (f: Rgb, b: Rgb) => {
  const x = luminance(f);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** fg 以自身 alpha 压在 base 上得到的颜色 */
const composite = (fg: Rgb, base: Rgb): Rgb => ({
  r: fg.r * fg.a + base.r * (1 - fg.a),
  g: fg.g * fg.a + base.g * (1 - fg.a),
  b: fg.b * fg.a + base.b * (1 - fg.a),
  a: 1,
});

describe('状态语义色作为视觉标记时达到非文本 3:1（§10 / WCAG 1.4.11）', () => {
  const TONES = ['--ok', '--run', '--warn', '--fail', '--idle'] as const;
  const SURFACES = ['--bg', '--side', '--surface', '--surface-2', '--raised'] as const;

  const assertToneMatrix = (table: Map<string, string>, label: string) => {
    const bad: string[] = [];
    for (const tone of TONES) {
      const raw = table.get(tone);
      if (!raw) throw new Error(`tokens.css 里没有 ${tone}`);
      const fg = toRgb(tone, raw);
      for (const surfaceName of SURFACES) {
        const rawBg = table.get(surfaceName);
        if (!rawBg) throw new Error(`tokens.css 里没有 ${surfaceName}`);
        const plain = contrast(fg, toRgb(surfaceName, rawBg));
        if (plain < 3) {
          bad.push(`${tone} (${raw}) on ${surfaceName} (${rawBg}) → ${plain.toFixed(2)}:1`);
        }
      }
    }
    expect(bad, `${label} 下状态标记不达非文本 3:1：\n${bad.join('\n')}`).toEqual([]);
  };

  it('对比度算术先过自检，再拿去量令牌', () => {
    // 证伪自己：黑白 21:1、同色 1:1、#767676 on 白 = 4.54（AA 公认边界）、
    // 50% 黑压白 = #7f7f7f 那级中灰 3.98:1。算术错了，后面的"过了"全是假的。
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const cases: Array<[number, number]> = [
      [contrast(white, { r: 0, g: 0, b: 0, a: 1 }), 21],
      [contrast({ r: 0, g: 0, b: 0, a: 1 }, white), 21],
      [contrast(white, white), 1],
      [contrast({ r: 118, g: 118, b: 118, a: 1 }, white), 4.54],
      [contrast(composite({ r: 0, g: 0, b: 0, a: 0.5 }, white), white), 3.98],
    ];
    for (const [got, want] of cases) {
      expect(Math.abs(got - want)).toBeLessThan(0.01);
    }
  });

  it('每一个状态色在每一种实心底上都 ≥3:1（默认深色）', () => {
    // 只量"令牌 × 实心面"：描边、3px 左条、裸点都可能直接落在任意一档面上，
    // 这个笛卡尔积结构上一定够得着，所以必须全过。
    // 半透明 tint（--*-soft）不进矩阵——徽章只落在卡片/侧栏那种底上，
    // "tint 压在 --raised 上"那一格在产品里不存在，拿它当门只会把配色逼得没必要地深。
    // 真实合成底由 e2e/a11y.spec.ts 的状态点扫描在浏览器里量。
    assertToneMatrix(baseValues(), '默认深色');
  });

  it('切到浅色主题后同一批状态色在每一种实心底上仍 ≥3:1', () => {
    // 浅色主题是现成功能：主题块只覆盖颜色令牌，漏覆盖一个就会在这里红。
    assertToneMatrix(themeValues('light'), '浅色主题');
  });
});

describe('弱化文字 --ink-3 达 WCAG AA 4.5:1（§10）', () => {
  const SURFACES = ['--bg', '--side', '--surface', '--surface-2', '--raised'] as const;

  const assertInk3 = (table: Map<string, string>, label: string) => {
    const raw = table.get('--ink-3');
    if (!raw) throw new Error('tokens.css 里没有 --ink-3');
    const fg = toRgb('--ink-3', raw);
    const bad: string[] = [];
    for (const surfaceName of SURFACES) {
      const rawBg = table.get(surfaceName);
      if (!rawBg) throw new Error(`tokens.css 里没有 ${surfaceName}`);
      const ratio = contrast(fg, toRgb(surfaceName, rawBg));
      if (ratio < 4.5) bad.push(`--ink-3 (${raw}) on ${surfaceName} → ${ratio.toFixed(2)}:1`);
    }
    expect(bad, `${label} 下弱化文字不达 AA 4.5:1：\n${bad.join('\n')}`).toEqual([]);
  };

  it('默认（控制台深色）每一档实心底上都 ≥4.5:1', () => {
    assertInk3(baseValues(), '默认深色');
  });

  it('切到浅色主题后仍 ≥4.5:1', () => {
    assertInk3(themeValues('light'), '浅色主题');
  });
});

describe('浅色主题关键前景/背景对比达 AA 4.5:1（FE-16 双主题）', () => {
  const PAIRS: Array<[string, string]> = [
    ['--ink', '--bg'],
    ['--ink', '--side'],
    ['--ink', '--surface'],
    ['--ink-2', '--surface'],
    ['--ink-2', '--surface-2'],
    // 主按钮文字压在主色上：浅色主题的强调色换成更深的蓝，白字必须仍然读得清
    ['--accent-fg', '--accent'],
    ['--link', '--surface'],
  ];

  it('浅色主题下正文 / 次要文字 / 按钮与链接都 ≥4.5:1', () => {
    const table = themeValues('light');
    const bad: string[] = [];
    for (const [fgName, bgName] of PAIRS) {
      const rawFg = table.get(fgName);
      const rawBg = table.get(bgName);
      if (!rawFg) throw new Error(`tokens.css 里没有 ${fgName}`);
      if (!rawBg) throw new Error(`tokens.css 里没有 ${bgName}`);
      const ratio = contrast(toRgb(fgName, rawFg), toRgb(bgName, rawBg));
      if (ratio < 4.5) {
        bad.push(`${fgName} (${rawFg}) on ${bgName} (${rawBg}) → ${ratio.toFixed(2)}:1`);
      }
    }
    expect(bad, `浅色主题下对比不足：\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('圆角只用令牌档位（§5.1「组件中禁止硬编码圆角」）', () => {
  it('除 tokens.css 外的样式里，border-radius 不出现字面 px', () => {
    const offenders: string[] = [];
    for (const file of cssFiles()) {
      if (file.name === 'tokens.css') continue;
      for (const m of file.text.matchAll(/border-radius\s*:[^;]+/g)) {
        const decl = m[0];
        // 只禁字面 px：0（刻意抹平的一角）、百分比（正圆/胶囊）与 var() 都不算写死
        if (!/\d+(?:\.\d+)?px/.test(decl)) continue;
        const line = file.text.slice(0, m.index).split('\n').length;
        offenders.push(`${file.name}:${line} ${decl.replace(/\s+/g, ' ').trim()}`);
      }
    }
    expect(offenders, `写死的圆角：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('圆角档位本身是成体系的：每一档都被用到', () => {
    const table = baseValues();
    // 按名字通配，不写死档位清单：写死了就等于"我声明了哪几档就只检查那几档"，
    // 新增一档却没人用会逃过这条锁。
    const steps = [...table.keys()].filter((k) => /^--r(?:-[a-z0-9]+)?$/.test(k));
    expect(steps.length, `圆角档位表：${steps.join(', ')}`).toBeGreaterThanOrEqual(4);
    const used = new Set<string>();
    for (const file of cssFiles()) {
      for (const m of file.text.matchAll(/var\(\s*(--r(?:-[a-z0-9]+)?)\s*\)/g)) {
        const name = m[1];
        if (name) used.add(name);
      }
    }
    const dead = steps.filter((s) => !used.has(s));
    expect(dead, `声明了却没人用的圆角档位：${dead.join(', ')}`).toEqual([]);
  });
});
