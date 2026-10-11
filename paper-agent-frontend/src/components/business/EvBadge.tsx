import { Link } from 'react-router-dom';
import report from '@/styles/report.module.css';
import type { EvidenceTier } from '@/api/types';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/utils';

export interface EvBadgeProps {
  taskId: string;
  evId: string;
  tier?: EvidenceTier;
}

/** 结论上的证据徽章：点击直达溯源页并定位该条（P-02 结论必须可回查） */
export function EvBadge({ taskId, evId, tier }: EvBadgeProps) {
  const { t } = useI18n();
  return (
    <Link
      to={`/evidence/${taskId}?ev=${evId}`}
      title={t('report.evidenceBadgeTitle', { ev: evId })}
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
