import { metaEnv } from './meta';

export const flags = {
  /** 仅 mock 模式生效：监控页提供「模拟断线 / 重新演示 / 快进」等演示与验证控件 */
  demoTools: metaEnv.VITE_FLAG_DEMO_TOOLS !== 'off',
};
