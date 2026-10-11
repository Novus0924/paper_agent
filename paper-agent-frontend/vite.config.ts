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
    // 联调用同源代理：后端 SSE 路由 reply.hijack() 后直写响应头，不含
    // Access-Control-Allow-Origin（events.ts），跨源 EventSource 会被浏览器拦死。
    // 生产形态本就是 BFF 托管构建产物（scripts/start.mjs）= 同源，dev 以代理对齐，
    // 顺带免去为每个前端端口配 PAPER_AGENT_CORS_ORIGINS。
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
