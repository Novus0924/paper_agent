import type { IconName } from '@/components/ui/Icon';
import type { MsgKey } from '@/i18n';
import type { RunStatus } from '@/api/types';

export const ROUTES = {
  overview: '/',
  new: '/new',
  library: '/library',
  monitor: (taskId: string) => `/monitor/${taskId}`,
  report: (taskId: string) => `/report/${taskId}`,
  evidence: (taskId: string) => `/evidence/${taskId}`,
  settings: '/settings',
} as const;

/**
 * 侧栏在 ≤900px 整体隐藏（layout.module.css 的同名媒体查询），
 * 这一档改由顶栏的 NarrowNav 承担主导航——断点只在这里登记一份，页面与测试都用它。
 */
export const NARROW_QUERY = '(max-width: 900px)';

/** 任务条目的默认落点：已交付报告进报告页，其余（含失败待重跑）进监控页 */
export function routeForTask(status: RunStatus, taskId: string): string {
  return status === 'DONE' ? ROUTES.report(taskId) : ROUTES.monitor(taskId);
}

export interface NavItem {
  key: MsgKey;
  icon: IconName;
  to: (taskId: string | null) => string;
}

/**
 * 全局导航只保留与工作区无关的入口（§4.2 调整：用户评审后收敛）。
 * 运行监控 / 报告 / 证据溯源是"某个任务"的视图，改由任务行与任务页内的动作进入，
 * 避免在没有当前任务时出现禁用项或跳错任务。
 * 文献库是跨任务的全局视图（本次迭代新增），因此与总览、设置并列。
 */
export const NAV_ITEMS: NavItem[] = [
  { key: 'nav.overview', icon: 'panel', to: () => ROUTES.overview },
  { key: 'nav.library', icon: 'evidence', to: () => ROUTES.library },
  { key: 'nav.settings', icon: 'settings', to: () => ROUTES.settings },
];

/** 顶部上下文栏标题与当前任务标识：由路由前缀推导，避免每页手动登记 */
export function routeMeta(pathname: string): { titleKey: MsgKey; taskId: string | null } {
  const seg = pathname.split('/').filter(Boolean);
  const first = seg[0] ?? '';
  const taskId = seg[1] ?? null;
  switch (first) {
    // "/" 是首页；/overview 只是别名（落地即归一到 "/"），归一前那一帧标题也得是总览
    case '':
    case 'overview':
      return { titleKey: 'overview.title', taskId: null };
    case 'new':
      return { titleKey: 'newTask.title', taskId: null };
    case 'library':
      return { titleKey: 'library.title', taskId: null };
    case 'monitor':
      return { titleKey: 'monitor.title', taskId };
    case 'report':
      return { titleKey: 'report.title', taskId };
    case 'evidence':
      return { titleKey: 'evidence.title', taskId };
    case 'settings':
      return { titleKey: 'settings.title', taskId: null };
    default:
      return { titleKey: 'notFound.title', taskId: null };
  }
}
