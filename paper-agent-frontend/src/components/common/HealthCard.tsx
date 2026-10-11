import { useEffect } from 'react';
import ui from '@/styles/ui.module.css';
import layout from '@/styles/layout.module.css';
import { useI18n } from '@/i18n';
import { useHealthStore } from '@/store/healthStore';
import { Icon } from '@/components/ui/Icon';
import { Collapse } from '@/components/ui/Collapse';
import { errorCodeKey } from '@/lib/errors';

/**
 * 侧栏连接卡：默认只给人话状态（连接状态点 + 一句说明）；
 * 会话标识、模型等机器细节收进「详情」折叠（P-02 渐进披露），空值不摆占位行。
 */
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
  const model = health?.model ?? '';

  return (
    <div className={ui.panel}>
      <div className={`${layout.row} ${ui.connRow}`}>
        <span className={reachable ? ui.pulse : ui.pulseOff} aria-hidden />
        <span>{title}</span>
      </div>
      {(sessionId || model || error) && (
        <Collapse className={layout.blockSm} title={t('health.details')}>
          <p className={ui.connSub}>
            {sessionId && (
              <>
                {t('health.session')} <b>{sessionId}</b>
                <br />
              </>
            )}
            {model && (
              <>
                {t('health.model')} <b>{model}</b>
              </>
            )}
          </p>
        </Collapse>
      )}
      {error && (
        <p className={ui.connIssue}>
          <Icon name="warn" />
          {t(errorCodeKey(error))}
        </p>
      )}
    </div>
  );
}
