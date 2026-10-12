import layout from '@/styles/layout.module.css';
import { useI18n } from '@/i18n';
import { useHealthStore } from '@/store/healthStore';

/**
 * 顶部栏实时状态徽章（v2.5）：唯一数据通道就是真实 AGH 研究平台，
 * 因此只如实呈现连接状态——绿=已连接 / 黄=已降级 / 红=不可用 / 灰=未连接。
 * 历史上的 Live/Demo 双态切换器随 mock 适配器一并移除：不再需要"切到演示"。
 */
export function LiveStatus() {
  const { t } = useI18n();
  const health = useHealthStore((s) => s.health);
  const error = useHealthStore((s) => s.error);

  const dotClass = (() => {
    if (error || health?.status === 'down') return `${layout.modeDot} ${layout.modeDotFail}`;
    if (health?.status === 'degraded') return `${layout.modeDot} ${layout.modeDotWarn}`;
    if (health?.status === 'ok') return `${layout.modeDot} ${layout.modeDotOk}`;
    return layout.modeDot;
  })();

  const statusWord = (() => {
    if (error || health?.status === 'down') return t('mode.statusDown');
    if (health?.status === 'degraded') return t('mode.statusDegraded');
    if (health?.status === 'ok') return t('mode.statusOk');
    return t('mode.statusUnknown');
  })();

  return (
    <div className={layout.modeSwitch} role="status" aria-label={t('mode.label')}>
      <span className={dotClass} aria-hidden />
      <span className={layout.modeStatusText}>{statusWord}</span>
    </div>
  );
}
