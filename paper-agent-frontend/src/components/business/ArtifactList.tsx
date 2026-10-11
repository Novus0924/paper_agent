import layout from '@/styles/layout.module.css';
import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import { Link } from 'react-router-dom';
import type { EvidenceBundle, EvidenceItem, Step } from '@/api/types';
import { useI18n } from '@/i18n';
import { KIND_LABEL } from '@/lib/labels';
import { cx } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

interface ArtifactListProps {
  taskId: string;
  steps: Step[];
  bundle: EvidenceBundle | null;
}

/**
 * FE-05/08 产物梳理：证据登记里 tier='artifact' 的条目按产出步骤归组。
 * 口径与证据页一致（同一份 DTO），只列真实登记过的产物，链接回到证据条目核对来源与哈希。
 */
export function ArtifactList({ taskId, steps, bundle }: ArtifactListProps) {
  const { t } = useI18n();
  const artifacts = (bundle?.evidence ?? []).filter((e) => e.tier === 'artifact');

  const groups: Array<{ step: Step | undefined; items: EvidenceItem[] }> = [];
  for (const step of steps) {
    const items = artifacts.filter((e) => e.producer_step === step.id);
    if (items.length > 0) groups.push({ step, items });
  }
  // 归不到已知步骤的条目仍然列出，避免静默丢数据
  const known = new Set(steps.map((s) => s.id));
  const rest = artifacts.filter((e) => !known.has(e.producer_step));
  if (rest.length > 0) groups.push({ step: undefined, items: rest });

  return (
    <Card
      title={t('monitor.artifactsTitle')}
      icon="doc"
      className={layout.block}
      bodyClassName={layout.block}
      actions={
        bundle ? (
          <span className={ui.badge}>
            {t('monitor.artifactsCount', { n: artifacts.length })}
          </span>
        ) : undefined
      }
    >
      {bundle === null ? (
        <p className={ui.muted}>{t('monitor.artifactsPending')}</p>
      ) : artifacts.length === 0 ? (
        <p className={ui.muted}>{t('monitor.artifactsEmpty')}</p>
      ) : (
        groups.map((group) => (
          <div key={group.step?.id ?? 'other'} className={monitor.artifactGroup}>
            <p className={monitor.artifactGroupHead}>
              <Icon name="list" size={12} />
              {group.step
                ? `${group.step.id} · ${group.step.label}`
                : t('monitor.artifactsOtherStep')}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.ev_id}
                className={monitor.artifactItem}
                to={`/evidence/${taskId}?ev=${item.ev_id}`}
              >
                <span className={cx(ui.tag, monitor.artifactKind)}>
                  {/* 兜底：未知 kind 退化为原值，避免 t(undefined) 抛错 */}
                  {KIND_LABEL[item.kind] ? t(KIND_LABEL[item.kind]) : item.kind}
                </span>
                <span className={monitor.artifactMain}>
                  <span className={monitor.artifactTitle}>{item.title}</span>
                  <span className={monitor.artifactRef}>{item.ref}</span>
                </span>
                <Icon name="chevRight" size={13} className={monitor.artifactChev} />
              </Link>
            ))}
          </div>
        ))
      )}
      <p className={ui.hint}>{t('monitor.artifactsHint')}</p>
    </Card>
  );
}
