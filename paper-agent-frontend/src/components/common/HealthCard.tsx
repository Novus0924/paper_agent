import { useEffect } from 'react';
import ui from '@/styles/ui.module.css';
import layout from '@/styles/layout.module.css';
import { useI18n } from '@/i18n';
import { useHealthStore } from '@/store/healthStore';
import { Icon } from '@/components/ui/Icon';
import { errorCodeKey } from '@/lib/errors';

/** 侧栏连接卡（Demo conn-card）：AGH 连接状态 + 会话标识 + 模型（P-04/P-06/P-07） */
export function HealthCard({ sessionId }: { sessionId?: string | null }) {
  const { t } = useI18n();
  const health = useHealthStore((s) => s.health);
  const error = useHealthStore((s) => s.error);
  const refresh = useHealthStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reachable = !error && health && health.status !== 'down';
  const title = error
    ? t('health.degradedEnv')
    : health?.mode === 'mock'
      ? t('health.mockConnected')
      : t('health.connected');

  return (
    <div className={ui.panel}>
      <div className={`${layout.row} ${ui.connRow}`}>
        <span className={reachable ? ui.pulse : ui.pulseOff} aria-hidden />
        <span>{title}</span>
      </div>
      <p className={ui.connSub}>
        {t('health.session')} <b>{sessionId ?? '—'}</b>
        <br />
        {t('health.model')} <b>{health?.model ?? '—'}</b>
      </p>
      {error && (
        <p className={ui.connIssue}>
          <Icon name="warn" />
          {t(errorCodeKey(error))}
        </p>
      )}
    </div>
  );
}
