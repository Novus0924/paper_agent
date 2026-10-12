import { metaEnv } from './meta';

/**
 * v2.5 起前端只保留一条数据通道：真实 AGH 研究平台（BFF）。
 * 历史上的 Mock/Live 双模式与 `?mode=mock` 演示适配器已整体移除——
 * "秒回结果是演示脚本"的疑点靠真实联调取证回应，不靠保留一个假数据源。
 * 测试不启真实后端：tests/liveEnv.ts 在 fetch + EventSource 层按后端契约造假后端。
 */
export const env = {
  apiBaseUrl: (metaEnv.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, ''),
  aghSettingsUrl: metaEnv.VITE_AGH_SETTINGS_URL ?? '',
};
