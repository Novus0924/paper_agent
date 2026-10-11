import { useEffect } from 'react';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/utils';
import { ErrorState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { Button, LinkButton } from '@/components/ui/Button';
import { Dot } from '@/components/ui/Badge';
import { useHealthStore } from '@/store/healthStore';

/**
 * FE-14 环境自检横幅（P-07）：首屏把"连不上/缺依赖"讲成人话并给出下一步，
 * 只提示不拦截——已有任务的报告与证据仍然可看（§2.2 铁律 5）。
 */
export function HealthBanner() {
  const { t } = useI18n();
  const health = useHealthStore((s) => s.health);
  const error = useHealthStore((s) => s.error);
  const refresh = useHealthStore((s) => s.refresh);

  // 侧栏连接卡可能尚未触发过自检，这里保证首屏一定拿到结果
  useEffect(() => {
    if (!health && !error) void refresh();
  }, [health, error, refresh]);

  if (error && !health) {
    return (
      <div className={cx(layout.block, layout.bannerSlot)}>
        <ErrorState
          code={error}
          onRetry={() => void refresh()}
          retryLabel={t('common.refresh')}
        />
      </div>
    );
  }

  const issues = health?.issues ?? [];
  if (issues.length === 0) return null;

  return (
    <div className={cx(layout.block, layout.bannerSlot, ui.noteWarn)} role="status">
      <p className={layout.headRow}>
        <Icon name="warn" className={ui.noteIc} />
        <b>{t('health.issuesTitle')}</b>
        <span className={ui.muted}>{t('health.issueLead')}</span>
        <span className={layout.tbSpacer} />
        <Button size="sm" icon="refresh" onClick={() => void refresh()}>
          {t('common.refresh')}
        </Button>
      </p>
      <div className={layout.blockSm}>
        {issues.map((issue) => (
          <div key={issue.id} className={layout.rowBetween}>
            <span className={layout.row}>
              <Dot tone={issue.blocking ? 'fail' : 'warn'} />
              <b>{issue.title}</b>
            </span>
            <span className={cx(layout.grow, ui.muted)}>{issue.guidance}</span>
            {issue.action_href && (
              <LinkButton href={issue.action_href} external size="sm" icon="external">
                {issue.action_label ?? t('common.details')}
              </LinkButton>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
