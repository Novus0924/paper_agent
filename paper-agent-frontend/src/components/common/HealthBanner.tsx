import { useEffect, useState } from 'react';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Button, LinkButton } from '@/components/ui/Button';
import { Dot } from '@/components/ui/Badge';
import { useHealthStore } from '@/store/healthStore';

/**
 * FE-14 环境自检横幅（P-07）：首屏把"连不上/缺依赖"讲成人话并给出下一步，
 * 只提示不拦截——已有任务的报告与证据仍然可看（§2.2 铁律 5）。
 * v2.1：degraded（含 agh 未连接）与请求失败都落在本条；琥珀警示色、可关闭，
 * 新一轮检查（checked_at 变化）后自动恢复显示。
 */
export function HealthBanner() {
  const { t } = useI18n();
  const health = useHealthStore((s) => s.health);
  const error = useHealthStore((s) => s.error);
  const refresh = useHealthStore((s) => s.refresh);
  const [dismissed, setDismissed] = useState(false);

  // 侧栏连接卡可能尚未触发过自检，这里保证首屏一定拿到结果
  useEffect(() => {
    if (!health && !error) void refresh();
  }, [health, error, refresh]);

  // 关闭只对当前这一次检查结果生效：重新检查后问题仍在就再次提示
  const checkedAt = health?.checked_at ?? error ?? null;
  useEffect(() => {
    setDismissed(false);
  }, [checkedAt]);

  if (dismissed) return null;

  if (error && !health) {
    // 请求失败也是"环境异常"而不是页面事故：给一条可读的降级提示，不弹错误堆栈
    return (
      <div className={cx(layout.block, layout.bannerSlot, ui.noteWarn)} role="status">
        <p className={layout.headRow}>
          <Icon name="warn" className={ui.noteIc} />
          <b>{t('health.unreachableTitle')}</b>
          <span className={ui.muted}>{t('health.unreachableLead')}</span>
          <span className={layout.tbSpacer} />
          <Button size="sm" icon="refresh" onClick={() => void refresh()}>
            {t('common.refresh')}
          </Button>
          <Button
            size="sm"
            variant="icon"
            icon="close"
            aria-label={t('common.close')}
            onClick={() => setDismissed(true)}
          />
        </p>
      </div>
    );
  }

  const issues = health?.issues ?? [];
  if (health && health.status === 'ok' && issues.length === 0) return null;

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
        <Button
          size="sm"
          variant="icon"
          icon="close"
          aria-label={t('common.close')}
          onClick={() => setDismissed(true)}
        />
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
