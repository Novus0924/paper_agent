import { useState } from 'react';
import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import layout from '@/styles/layout.module.css';
import type { DegradedInfo } from '@/api/types';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';

export interface DegradedBannerProps {
  info: DegradedInfo;
  onRetry?: () => void;
  onChangeSource?: () => void;
}

/**
 * FE-06 两级提示（P-01）：
 * level=info → 中性"部分源不可用（覆盖充足）"；
 * level=degraded → 橙色横幅 + 任务未中断 + 原因/影响 + 重试/改源。绝不用红色。
 */
export function DegradedBanner({ info, onRetry, onChangeSource }: DegradedBannerProps) {
  const { t } = useI18n();
  const [explain, setExplain] = useState(false);

  if (info.level === 'info') {
    return (
      <p className={ui.note}>
        <Icon name="info" className={ui.noteIc} />
        <span>
          <b>{t('degraded.infoTitle')}</b>{' '}
          {t('degraded.infoLead', { source: info.source })}
          {info.impact && <em className={ui.muted}> · {info.impact}</em>}
        </span>
      </p>
    );
  }

  return (
    <div className={monitor.banner} role="status" aria-live="polite">
      <div className={monitor.bannerHead}>
        <Icon name="warn" className={monitor.bannerIcon} />
        {t('degraded.bannerTitle')}
        <span className={ui.muted}>
          {info.step ? `${t('common.step')} ${info.step}` : ''}
        </span>
      </div>
      <p className={monitor.bannerLead}>
        {t('degraded.bannerLead', { action: info.action ?? t('common.none') })}
      </p>
      <div className={monitor.bannerFields}>
        <span>
          <b>{t('degraded.reasonLabel')}</b>：{info.reason}
        </span>
        <span>
          <b>{t('degraded.impactLabel')}</b>：{info.impact}
        </span>
      </div>
      <div className={monitor.bannerActions}>
        <Button size="sm" icon="info" onClick={() => setExplain(true)}>
          {t('common.whatIsThis')}
        </Button>
        {info.resumable && onRetry && (
          <Button size="sm" icon="refresh" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )}
        {onChangeSource && (
          <Button size="sm" icon="evidence" onClick={onChangeSource}>
            {t('monitor.changeSource')}
          </Button>
        )}
      </div>

      <Modal
        open={explain}
        onClose={() => setExplain(false)}
        title={t('degraded.explainTitle')}
      >
        <p className={cx(ui.leadText, layout.row)}>{t('degraded.explainBody')}</p>
      </Modal>
    </div>
  );
}
