import { defineConfig } from '@playwright/test';

/**
 * 默认打 dev server（5174 是 strictPort 固定端口）。
 * 取 §10 性能数字时用 E2E_BASE_URL 指向预览构建，别把 dev 的按模块加载当成"真实首屏"。
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5174';

/** 断点取证视口：≥1280 两栏分支、单列、侧栏隐藏边界（DR-13 取证） */
const VIEWPORTS: Array<{ name: string; width: number; height: number }> = [
  { name: 'desktop-1366x768', width: 1366, height: 768 },
  { name: 'edge-1280x800', width: 1280, height: 800 },
  { name: 'tablet-1024x800', width: 1024, height: 800 },
  { name: 'narrow-820x900', width: 820, height: 900 },
];

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // 本机缓存的是 chromium build 1243，@playwright/test 1.64 需要 1248。
    // 用系统 Edge 跑，避免为了跑通断点检查再下载 ~170MB 浏览器二进制。
    channel: 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    ...VIEWPORTS.map((v) => ({
      name: v.name,
      use: { viewport: { width: v.width, height: v.height } },
      testIgnore: /journey\.spec\.ts/,
    })),
    {
      name: 'journey-1366x900',
      use: { viewport: { width: 1366, height: 900 } },
      testMatch: /journey\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    // 5174 是 strictPort 的固定开发端口：已在跑就复用，不再起第二个
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
