import type { ReactNode } from 'react';
import ui from '@/styles/ui.module.css';
import { cx } from '@/lib/utils';
import { runStatusTone, stepStatusTone, type Tone } from '@/lib/status';
import type { RunStatus, StepStatus } from '@/api/types';
import { useI18n, type MsgKey } from '@/i18n';

export interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

/** 状态徽章：色语义严格遵循 §5.3（降级只用 warn，绝不 fail） */
export function Badge({ tone = 'idle', dot = true, className, children }: BadgeProps) {
  return (
    <span className={cx(ui.badge, ui[tone], className)}>
      {dot && <span className={ui.dot} />}
      {children}
    </span>
  );
}

export function RunStatusBadge({
  status,
  className,
}: {
  status: RunStatus;
  className?: string;
}) {
  const { t } = useI18n();
  const key = `status.run.${status}` satisfies MsgKey;
  return (
    <Badge tone={runStatusTone[status]} className={className}>
      {t(key)}
    </Badge>
  );
}

export function StepStatusBadge({ status }: { status: StepStatus }) {
  const { t } = useI18n();
  const key = `status.step.${status}` satisfies MsgKey;
  return <Badge tone={stepStatusTone[status]}>{t(key)}</Badge>;
}

export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx(ui.tag, className)}>{children}</span>;
}

const DOT_CLASS: Record<Tone, string | undefined> = {
  ok: ui.dotOk,
  run: ui.dotRun,
  warn: ui.dotWarn,
  fail: ui.dotFail,
  idle: ui.dotIdle,
};

export function Dot({ tone = 'idle', label }: { tone: Tone; label?: string }) {
  // 旁边的文字已经在讲状态时，点是纯装饰，不给名字（否则读屏把同一句念两遍）。
  // 只有点形字段（如侧栏最近任务）必须传 label：需求文档 §10 不许只靠颜色传达信息。
  if (!label) return <span className={DOT_CLASS[tone]} />;
  return <span className={DOT_CLASS[tone]} role="img" aria-label={label} />;
}
