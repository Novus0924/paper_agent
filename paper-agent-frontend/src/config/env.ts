import { metaEnv } from './meta';

export type ApiMode = 'mock' | 'live';

/** URL 参数 ?mode=live|mock 优先，便于现场演示无需重启即可切换（§6.3） */
function modeFromUrl(): ApiMode | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('mode');
  return raw === 'live' || raw === 'mock' ? raw : null;
}

export const env = {
  apiMode: modeFromUrl() ?? (metaEnv.VITE_API_MODE === 'live' ? 'live' : 'mock'),
  apiBaseUrl: (metaEnv.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, ''),
  aghSettingsUrl: metaEnv.VITE_AGH_SETTINGS_URL ?? '',
  /** Mock 运行时的本地持久化前缀：刷新/重开后同一份报告与轨迹仍可达（P-03/P-04） */
  storagePrefix: 'paper-agent-frontend',
};

export const isLive = env.apiMode === 'live';
