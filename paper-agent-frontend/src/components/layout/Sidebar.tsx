import { NavLink, useLocation } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import { cx, relativeTime, truncate } from '@/lib/utils';
import { runStatusTone } from '@/lib/status';
import { NAV_ITEMS, routeForTask, routeMeta } from '@/app/nav';
import { useI18n, type MsgKey } from '@/i18n';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { Icon } from '@/components/ui/Icon';
import { Dot } from '@/components/ui/Badge';
import { HealthCard } from '@/components/common/HealthCard';

export function Sidebar() {
  const { t } = useI18n();
  const collapsed = useUiStore((s) => s.navCollapsed);
  const toggleNav = useUiStore((s) => s.toggleNav);
  const currentTaskId = useUiStore((s) => s.currentTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const { pathname } = useLocation();
  const meta = routeMeta(pathname);
  const sessionId =
    tasks.find((task) => task.task_id === currentTaskId)?.session_id ?? null;

  return (
    <aside
      className={cx(layout.sidebar, collapsed && layout.sidebarCollapsed)}
      aria-label={t('nav.workspace')}
    >
      <NavLink
        to="/new"
        className={layout.newTaskBtn}
        title={collapsed ? t('nav.newTask') : undefined}
      >
        <Icon name="plus" size={15} strokeWidth={2} />
        {!collapsed && t('nav.newTask')}
      </NavLink>

      <div className={layout.sideBody}>
        {!collapsed && <div className={layout.sideSection}>{t('nav.workspace')}</div>}
        <nav className={layout.nav}>
          {NAV_ITEMS.map((item) => {
            const to = item.to(currentTaskId);
            const label = t(item.key as MsgKey);
            const content = (
              <>
                <Icon name={item.icon} className={layout.navIcon} />
                {!collapsed && <span className={layout.navLabel}>{label}</span>}
              </>
            );
            return (
              <NavLink
                key={item.key}
                to={to}
                className={({ isActive }) =>
                  cx(
                    layout.navItem,
                    (isActive || isTaskRouteActive(to, pathname)) && layout.navItemActive,
                  )
                }
                title={collapsed ? label : undefined}
              >
                {content}
              </NavLink>
            );
          })}
        </nav>

        {!collapsed && <div className={layout.sideSection}>{t('nav.history')}</div>}
        {!collapsed && (
          <div className={layout.histList}>
            {tasks.slice(0, 6).map((task) => {
              const active = task.task_id === meta.taskId;
              const to = routeForTask(task.run_status, task.task_id);
              // 这一行的运行状态原本只有 6px 颜色点：读屏拿不到，色觉障碍也拿不到。
              // 点的颜色与位置照 Demo 不动，状态词进 aria-label（读屏）与行 tooltip（鼠标）。
              const status = t(`status.run.${task.run_status}` satisfies MsgKey);
              return (
                <NavLink
                  key={task.task_id}
                  to={to}
                  className={cx(layout.histItem, active && layout.histItemActive)}
                  title={`${task.title} · ${status} · ${relativeTime(task.updated_at)}`}
                >
                  <Icon name="doc" size={14} className={layout.histIcon} />
                  <span className={layout.histTitle}>{truncate(task.title, 22)}</span>
                  <Dot tone={runStatusTone[task.run_status]} label={status} />
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      <div className={layout.sideFoot}>
        {!collapsed && <HealthCard sessionId={sessionId} />}
        <button
          type="button"
          className={layout.collapseBtn}
          onClick={toggleNav}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        >
          <Icon name={collapsed ? 'chevRight' : 'chevLeft'} />
          {!collapsed && t('nav.collapse')}
        </button>
      </div>
    </aside>
  );
}

function isTaskRouteActive(to: string, pathname: string): boolean {
  return to !== '/' && pathname.startsWith(to.split('/').slice(0, 2).join('/'));
}
