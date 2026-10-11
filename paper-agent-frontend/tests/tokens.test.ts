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

/** 声明段：tokens.css 的 :root 与深色块 */
const splitTokenBlocks = () => {
  const raw = readFileSync(join(STYLES_DIR, 'tokens.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const [light = '', dark = ''] = raw.split(/\[data-theme='dark'\]/);
  const names = (text: string) =>
    [...text.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)].map((m) => m[1] as string);
  return { light: names(light), dark: names(dark) };
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
    const declared = new Set(splitTokenBlocks().light);
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

  it('深色主题只覆盖浅色已声明的令牌，不新增', () => {
    const { light, dark } = splitTokenBlocks();
    const known = new Set(light);
    // 深色块里出现新名字 = 浅色下该令牌根本没值，组件在浅色主题会静默拿到空值
    expect(dark.filter((n) => !known.has(n))).toEqual([]);
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

const tokenSource = () =>
  readFileSync(join(STYLES_DIR, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** tokens.css 浅色块的字面量表：这一条锁的是取值，不是"页面上看着还行" */
const lightValues = (): Map<string, string> =>
  valuesIn(tokenSource().split(/\[data-theme='dark'\]/)[0] ?? '');

/** 深色主题解析后的表：暗色块覆盖同名令牌，没覆盖的（--idle、--*-soft）沿用浅色值 */
const darkValues = (): Map<string, string> => {
  const raw = tokenSource();
  const [light, dark = ''] = raw.split(/\[data-theme='dark'\]/);
  return new Map([...valuesIn(light ?? ''), ...valuesIn(dark.slice(dark.indexOf('{')))]);
};

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

  it('每一个状态色在每一种浅色实心底上都 ≥3:1', () => {
    // 只量"令牌 × 实心面"：描边、3px 左条、裸点都可能直接落在任意一档浅色上，
    // 这个笛卡尔积结构上一定够得着，所以必须全过。
    // 半透明 tint（--*-soft）不进矩阵——徽章只落在卡片/侧栏那种浅底上，
    // "tint 压在 --raised 上"那一格在产品里不存在，拿它当门只会把配色逼得没必要地深。
    // 真实合成底由 e2e/a11y.spec.ts 的状态点扫描在浏览器里量（旧 --warn #d97706 那颗 2.83:1 就是它查出来的）。
    const table = lightValues();
    const bad: string[] = [];
    for (const tone of TONES) {
      const raw = table.get(tone);
      if (!raw) throw new Error(`tokens.css 浅色块里没有 ${tone}`);
      const fg = toRgb(tone, raw);
      for (const surfaceName of SURFACES) {
        const rawBg = table.get(surfaceName);
        if (!rawBg) throw new Error(`tokens.css 浅色块里没有 ${surfaceName}`);
        const plain = contrast(fg, toRgb(surfaceName, rawBg));
        if (plain < 3) {
          bad.push(
            `${tone} (${raw}) on ${surfaceName} (${rawBg}) → ${plain.toFixed(2)}:1`,
          );
        }
      }
    }
    expect(bad, `状态标记不达非文本 3:1：\n${bad.join('\n')}`).toEqual([]);
  });

  it('切到深色主题后同一批状态色在每一种实心底上仍 ≥3:1', () => {
    // 主题开关是现成功能，不是预留：暗色块只覆盖了颜色令牌，--idle 与 --*-soft 沿用浅色值，
    // 所以这张表量的是"暗色覆盖之后浏览器实际会拿到的值"，暗色块漏改一个就会在这里红。
    const table = darkValues();
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
          bad.push(
            `${tone} (${raw}) on ${surfaceName} (${rawBg}) → ${plain.toFixed(2)}:1`,
          );
        }
      }
    }
    expect(bad, `深色主题下状态标记不达非文本 3:1：\n${bad.join('\n')}`).toEqual([]);
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
    const table = lightValues();
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
