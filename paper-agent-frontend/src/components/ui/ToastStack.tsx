import ui from '@/styles/ui.module.css';
import { cx } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useToastStore, type ToastTone } from '@/store/toastStore';
import { Icon, type IconName } from './Icon';

const ICON: Record<ToastTone, IconName> = {
  info: 'info',
  ok: 'check',
  warn: 'warn',
  fail: 'fail',
};

const CLS: Record<ToastTone, string | undefined> = {
  info: undefined,
  ok: ui.tOk,
  warn: ui.tWarn,
  fail: ui.tFail,
};

/** 全局 Toast 出口（§8.10）：每个异步结果都有成功/失败/排队反馈 */
export function ToastStack() {
  const { t } = useI18n();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;
  return (
    <div
      className={ui.toastStack}
      role="region"
      aria-live="polite"
      aria-label={t('app.name')}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className={cx(ui.toast, CLS[toast.tone])}>
          <Icon name={ICON[toast.tone]} className={ui.tIcon} />
          <span>{t(toast.key, toast.vars)}</span>
          <div className={ui.toastActions}>
            {toast.action && (
              <button
                type="button"
                className={ui.textBtn}
                onClick={() => {
                  toast.action?.run();
                  dismiss(toast.id);
                }}
              >
                {t(toast.action.labelKey)}
              </button>
            )}
            <button
              type="button"
              className={cx(ui.iconBtn, ui.toastClose)}
              onClick={() => dismiss(toast.id)}
              aria-label={t('common.close')}
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
