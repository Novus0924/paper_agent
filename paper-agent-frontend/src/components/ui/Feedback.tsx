import type { ReactNode } from 'react';
import ui from '@/styles/ui.module.css';
import { cx } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { errorCodeKey } from '@/lib/errors';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      className={cx(ui.spinner, small && ui.spinnerSm)}
      role="status"
      aria-label="loading"
    />
  );
}

export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={ui.progressTrack}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={ui.progressFill} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 加载骨架（§8.10）：异步进行中用骨架，不留空白 */
export function Skeleton({
  height = 16,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return <div className={cx(ui.skeleton, className)} style={{ height }} aria-hidden />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={i === 0 ? 22 : 14} className={ui.skeletonGap} />
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  lead?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'doc', title, lead, action }: EmptyStateProps) {
  return (
    <div className={ui.empty}>
      <Icon name={icon} size={26} className={ui.emptyIcon} />
      <h3>{title}</h3>
      {lead && <p>{lead}</p>}
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  code?: string;
  /** 已由上层拼好的文案（如导出失败原因）；优先于 code */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** 错误态：必须给出人类可读说明 + 下一步动作，绝不展示堆栈（§2.2 铁律 5） */
export function ErrorState({ code, message, onRetry, retryLabel }: ErrorStateProps) {
  const { t } = useI18n();
  const text = message ?? (code ? t(errorCodeKey(code)) : t('errors.UNKNOWN'));
  return (
    <div className={ui.errorState} role="alert">
      <Icon name="fail" className={ui.tIcon} />
      <div className={ui.errorBody}>
        <span>{text}</span>
        {onRetry && (
          <div className={ui.toastActions}>
            <Button size="sm" icon="refresh" onClick={onRetry}>
              {retryLabel ?? t('common.retry')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <p className={ui.kvLabel}>{label}</p>
      <div className={ui.code}>{children}</div>
    </>
  );
}
