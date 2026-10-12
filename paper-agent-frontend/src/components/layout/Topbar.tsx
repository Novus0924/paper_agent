import { Link, useLocation } from 'react-router-dom';
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
import { LiveStatus } from './LiveStatus';

/**
 * 顶部栏（§4.2）：「品牌 | 页面标题 | 全局搜索占位 | 实时状态徽章」。
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
      <Link to="/" className={layout.brand} aria-label={`${t('app.name')} · ${t('nav.overview')}`}>
        <span className={layout.mark}>
          <Icon name="brand" size={15} />
        </span>
        <span className={layout.brandText}>
          <span className={layout.brandName}>{t('app.name')}</span>
          <span className={layout.brandSub}>{t('app.subtitle')}</span>
        </span>
      </Link>

      <span className={layout.tbDivider} aria-hidden />
      <h1 className={layout.tbTitle}>{t(meta.titleKey)}</h1>

      {/* 全局搜索占位：本波未接线，禁用态显式标注 Cmd+K 即将支持 */}
      <div className={layout.tbSearch} aria-hidden>
        <Icon name="search" size={13} />
        <span className={layout.tbSearchText}>{t('topbar.searchPlaceholder')}</span>
        <span className={layout.tbKbd}>{t('topbar.searchSoon')}</span>
      </div>

      <div className={layout.tbRight}>
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
        <LiveStatus />
      </div>

      {narrow && <NarrowNav />}
    </header>
  );
}
