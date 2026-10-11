/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    // 联调用同源代理：生产形态本就是 BFF 托管构建产物（scripts/start.mjs）= 同源，
    // dev 以代理对齐，顺带免去为每个前端端口配 PAPER_AGENT_CORS_ORIGINS。
    // （历史上这里还写着"SSE 跨源必挂，因为 events.ts 的 hijack 响应没有
    //  Access-Control-Allow-Origin"——那是真缺陷，后端已修：cors.ts 单一白名单
    //  同时供 app 级钩子与 SSE writeHead 使用。代理仍是默认路径，直连 8787
    //  只在显式设置 VITE_API_BASE_URL 时使用。）
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
    // 启动即落到总览（§4.2 首页），不让人对着上一次的深链找入口
    open: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    css: false,
  },
});
