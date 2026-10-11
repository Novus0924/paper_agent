import { useLocation } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import { NARROW_QUERY, routeMeta } from '@/app/nav';
import { useMediaQuery } from '@/lib/hooks';
import { useI18n } from '@/i18n';
import { copyText } from '@/lib/utils';
import { useTaskStore } from '@/store/taskStore';
import { useToastStore } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';
import { Icon } from '@/components/ui/Icon';
import { RunStatusBadge } from '@/components/ui/Badge';
import { NarrowNav } from './NarrowNav';

/**
 * 顶部上下文栏（§4.2）：标题 | 当前任务标识（可复制）| 状态徽章。
 * 不放全局动作：新建任务的唯一入口在侧栏（评审后收敛），导出只在任务报告页真触发。
 * 唯一的例外是窄屏：侧栏整体隐藏后，这里必须补上主导航（DR-13）。
 */
export function Topbar() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const narrow = useMediaQuery(NARROW_QUERY);
  const meta = routeMeta(pathname);
  const currentTaskId = useUiStore((s) => s.currentTaskId);
  const toast = useToastStore((s) => s.push);
  const snapshot = useTaskStore((s) =>
    currentTaskId ? s.byId[currentTaskId]?.snapshot : undefined,
  );

  const taskId = meta.taskId ?? currentTaskId;

  async function copyTaskId() {
    if (!taskId) return;
    const ok = await copyText(taskId);
    toast(ok ? 'topbar.copied' : 'topbar.copyFailed', ok ? 'ok' : 'warn');
  }

  return (
    <header className={layout.topbar}>
      <h1 className={layout.tbTitle}>{t(meta.titleKey)}</h1>

      {taskId && (
        <button
          type="button"
          className={layout.taskIdChip}
          onClick={copyTaskId}
          title={t('topbar.copyId')}
        >
          <span className={layout.taskIdText}>{taskId}</span>
          <Icon name="copy" size={12} />
        </button>
      )}

      {snapshot && <RunStatusBadge status={snapshot.run_status} />}

      {narrow && <NarrowNav />}
    </header>
  );
}
