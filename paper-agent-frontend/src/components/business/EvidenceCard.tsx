import { useEffect, useRef, useState } from 'react';
import report from '@/styles/report.module.css';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import { api } from '@/api/client';
import type { Conclusion, EvidenceItem } from '@/api/types';
import { useI18n } from '@/i18n';
import { KIND_LABEL, TIER_LABEL } from '@/lib/labels';
import { formatApa, formatBibtex } from '@/lib/citation';
import { copyText, cx, externalRef } from '@/lib/utils';
import { useToastStore } from '@/store/toastStore';
import { toApiError } from '@/api/errors';
import { Button, LinkButton } from '@/components/ui/Button';
import { Collapse } from '@/components/ui/Collapse';
import { Tag } from '@/components/ui/Badge';

export interface EvidenceCardProps {
  taskId: string;
  item: EvidenceItem;
  /** 反向索引：这条证据支撑了哪些结论 */
  bound: Conclusion[];
  highlighted?: boolean;
}

/**
 * FE-08 证据溯源卡片：来源、产生步骤、支撑结论可读展示，APA/BibTeX 引用一键复制；
 * SHA-256 与账本哈希链收在「审计细节」里（P-02：不在主视图贴哈希）。
 */
export function EvidenceCard({ taskId, item, bound, highlighted }: EvidenceCardProps) {
  const { t } = useI18n();
  const [cite, setCite] = useState<string | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const link = externalRef(item.ref);

  // 从报告页带 ?ev= 跳过来时，定位并高亮这一条
  useEffect(() => {
    if (highlighted) nodeRef.current?.scrollIntoView({ block: 'center' });
  }, [highlighted]);

  async function onCiteBack() {
    try {
      const res = await api.cite(taskId, item.ev_id);
      setCite(`${res.ref}｜${res.detail}`);
    } catch (err) {
      useToastStore.getState().pushError(toApiError(err));
    }
  }

  async function copyCitation(style: 'apa' | 'bibtex') {
    const text = style === 'apa' ? formatApa(item) : formatBibtex(item);
    const ok = await copyText(text);
    useToastStore.getState().push(
      ok
        ? style === 'apa'
          ? 'report.copiedApa'
          : 'report.copiedBibtex'
        : 'topbar.copyFailed',
      ok ? 'ok' : 'warn',
    );
  }

  return (
    <div
      id={item.ev_id}
      ref={nodeRef}
      className={cx(report.evCard, highlighted && report.evCardHi)}
    >
      <div className={report.evHead}>
        <span className={report.evId}>{item.ev_id}</span>
        <span className={report.evTitle}>{item.title}</span>
        <Tag>{t(TIER_LABEL[item.tier])}</Tag>
        {/* 兜底：未知 kind 退化为原值，避免 t(undefined) 抛错 */}
        <Tag>{KIND_LABEL[item.kind] ? t(KIND_LABEL[item.kind]) : item.kind}</Tag>
      </div>

      {item.summary && <p className={report.evSummary}>{item.summary}</p>}

      <div className={report.evMeta}>
        {item.ref && (
          <span>
            {t('evidence.ref')}：<span className={ui.monoInline}>{item.ref}</span>
          </span>
        )}
        {item.year && <span>{item.year}</span>}
        {item.authors && <span>{item.authors}</span>}
        <span>
          {t('evidence.producerStep')}{' '}
          <b className={layout.strongText}>{item.producer_step}</b>
        </span>
        {link && (
          <LinkButton href={link} external size="sm" icon="external">
            DOI
          </LinkButton>
        )}
        <span className={report.evRow}>
          <Button
            size="sm"
            variant="chip"
            icon="copy"
            title={t('report.copyCiteApa')}
            onClick={() => void copyCitation('apa')}
          >
            APA
          </Button>
          <Button
            size="sm"
            variant="chip"
            icon="copy"
            title={t('report.copyCiteBibtex')}
            onClick={() => void copyCitation('bibtex')}
          >
            BibTeX
          </Button>
        </span>
      </div>

      {bound.length > 0 && (
        <div className={report.evBound}>
          <span>{t('evidence.boundConclusions')}：</span>
          {bound.map((c) => (
            <Tag key={c.cid}>{c.cid}</Tag>
          ))}
        </div>
      )}

      <Collapse
        className={layout.blockSm}
        title={t('evidence.auditTitle')}
        icon="shield"
        hint={t('evidence.auditLead')}
      >
        <div className={report.auditGrid}>
          <div>
            <p className={ui.kvLabel}>{t('evidence.sha')}</p>
            <p className={report.auditValue}>
              {item.sha256 ?? t('common.notApplicable')}
            </p>
          </div>
          <div>
            <p className={ui.kvLabel}>{t('evidence.chain')}</p>
            <p className={report.auditValue}>
              {item.chain_hash ?? t('common.notApplicable')}
            </p>
          </div>
          <div className={layout.row}>
            <Button size="sm" icon="search" onClick={() => void onCiteBack()}>
              {t('evidence.citeBack')}
            </Button>
            {cite && <span className={ui.muted}>{cite}</span>}
          </div>
        </div>
      </Collapse>
    </div>
  );
}
