import { Link } from 'react-router-dom';
import report from '@/styles/report.module.css';
import type { EvidenceTier } from '@/api/types';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/utils';

export interface EvBadgeProps {
  taskId: string;
  evId: string;
  tier?: EvidenceTier;
  /** hover 提示（一般传"EV-xxx · 证据标题"），缺省回退到通用说明 */
  title?: string;
}

/** 结论上的证据徽章：点击直达溯源页并定位该条（P-02 结论必须可回查） */
export function EvBadge({ taskId, evId, tier, title }: EvBadgeProps) {
  const { t } = useI18n();
  return (
    <Link
      to={`/evidence/${taskId}?ev=${evId}`}
      title={title ?? t('report.evidenceBadgeTitle', { ev: evId })}
      className={cx(
        report.evBadge,
        tier === 'fact' && report.evBadgeFact,
        tier === 'artifact' && report.evBadgeArtifact,
      )}
    >
      {evId}
    </Link>
  );
}
