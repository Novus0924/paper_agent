import { NavLink, useNavigate } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import { NAV_ITEMS, routeForTask } from '@/app/nav';
import { useI18n, type MsgKey } from '@/i18n';
import { truncate, cx } from '@/lib/utils';
import { useTaskStore } from '@/store/taskStore';
import { Icon } from '@/components/ui/Icon';
import { SelectInput } from '@/components/ui/Fields';

/**
 * ≤900px 的替代导航（DR-13）：侧栏整体隐藏后，新建 / 总览 / 设置与最近任务必须仍然够得着。
 * 跳任务用原生 select 而不是自造浮层：焦点、滚动锁、Escape 都由浏览器负责，
 * 触屏上也是系统原生选择器，比在顶栏下面悬一个面板更稳。
 */
export function NarrowNav() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const tasks = useTaskStore((s) => s.tasks);

  return (
    <nav className={layout.narrowNav} aria-label={t('nav.narrow')}>
      <NavLink to="/new" className={layout.narrowItem} title={t('nav.newTask')}>
        <Icon name="plus" size={15} strokeWidth={2} />
        {t('nav.newTask')}
      </NavLink>
      {NAV_ITEMS.map((item) => {
        const label = t(item.key as MsgKey);
        return (
          <NavLink
            key={item.key}
            to={item.to(null)}
            className={({ isActive }) =>
              cx(layout.narrowItem, isActive && layout.narrowItemActive)
            }
            title={label}
          >
            <Icon name={item.icon} size={15} />
            {label}
          </NavLink>
        );
      })}
      <SelectInput
        className={layout.narrowSelect}
        aria-label={t('nav.history')}
        value=""
        onChange={(e) => {
          const task = tasks.find((x) => x.task_id === e.target.value);
          if (task) navigate(routeForTask(task.run_status, task.task_id));
        }}
        options={[
          { value: '', label: t('nav.jumpTask') },
          ...tasks.slice(0, 8).map((task) => ({
            value: task.task_id,
            // <option> 只能带文字，侧栏那颗状态点在这里不存在，所以状态必须写进文案；
            // 否则窄屏用户只看到一串标题，分不清哪条还在跑（§10 / WCAG 1.4.1 不单靠颜色）
            label: `${truncate(task.title, 16)} · ${t(`status.run.${task.run_status}` satisfies MsgKey)}`,
          })),
        ]}
      />
    </nav>
  );
}
