import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import type { Step } from '@/api/types';
import { useI18n, type MsgKey } from '@/i18n';
import { stepStatusTone } from '@/lib/status';
import { cx, formatDuration } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Dot } from '@/components/ui/Badge';

const STATE_ICON: Record<string, IconName | undefined> = {
  DONE: 'check',
  FAILED: 'fail',
  SKIPPED: 'chevRight',
};

export interface StepBarProps {
  steps: Step[];
  running: boolean;
  onRetry?: (stepId: string) => void;
  onChangeSource?: () => void;
}

/** FE-05 步骤条：待执行 → 运行中（强调）→ 完成（绿）/ 未通过（红，含重试动作） */
export function StepBar({ steps, running, onRetry, onChangeSource }: StepBarProps) {
  const { t } = useI18n();
  return (
    <div className={monitor.stepBar} role="list">
      {steps.map((step) => {
        const tone = stepStatusTone[step.status];
        const stateIcon = STATE_ICON[step.status];
        const key = `status.step.${step.status}` satisfies MsgKey;
        const showSpinner = step.status === 'RUNNING';
        return (
          <div
            key={step.id}
            role="listitem"
            className={cx(
              monitor.stepItem,
              step.status === 'RUNNING' && monitor.stepRunning,
              step.status === 'DONE' && monitor.stepDone,
              step.status === 'FAILED' && monitor.stepFailed,
              step.status === 'SKIPPED' && monitor.stepSkipped,
              step.is_current === true && monitor.stepActive,
            )}
          >
            <span className={monitor.ck}>
              {showSpinner ? (
                <span className={ui.spinnerSm} />
              ) : stateIcon ? (
                <Icon name={stateIcon} size={11} strokeWidth={2.4} />
              ) : null}
            </span>

            <div className={monitor.stepMain}>
              <span>
                <span className={monitor.stepId}>{step.id}</span>
                {step.label}
              </span>
              {step.status === 'FAILED' && step.error && (
                <p className={monitor.stepError}>{step.error}</p>
              )}
              {step.status === 'FAILED' && (
                <div className={monitor.stepActions}>
                  <Button
                    size="sm"
                    icon="refresh"
                    disabled={!running}
                    onClick={() => onRetry?.(step.id)}
                  >
                    {t('monitor.retryStep')}
                  </Button>
                  {onChangeSource && (
                    <Button size="sm" icon="evidence" onClick={onChangeSource}>
                      {t('monitor.changeSource')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className={monitor.stepMeta}>
              <Dot tone={tone} />
              <span>{t(key)}</span>
              {step.attempts > 1 && (
                <span className={ui.monoInline}>×{step.attempts}</span>
              )}
              {step.elapsed_ms ? (
                <span className={ui.monoInline}>{formatDuration(step.elapsed_ms)}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
