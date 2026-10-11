import report from '@/styles/report.module.css';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import md from '@/styles/md.module.css';
import type { EvidenceItem, Report } from '@/api/types';
import { useI18n } from '@/i18n';
import { cx, formatDateTime } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Markdown } from '@/components/ui/Markdown';
import { EvBadge } from './EvBadge';

export interface ReportViewProps {
  taskId: string;
  report: Report;
  evidence: EvidenceItem[];
  sessionId?: string;
}

/**
 * FE-07 报告中心（P-02/P-04）：报告正文 + 每条结论绑定证据 + 结果验证 + 降级声明。
 * 引用列表由证据账本回填（系统不伪造 DOI），哈希等审计信息不在本页展示。
 */
export function ReportView({
  taskId,
  report: doc,
  evidence,
  sessionId,
}: ReportViewProps) {
  const { t } = useI18n();
  const tierByEv = new Map(evidence.map((e) => [e.ev_id, e.tier] as const));
  const references = evidence
    .filter((e) => typeof e.cite_no === 'number')
    .sort((a, b) => (a.cite_no ?? 0) - (b.cite_no ?? 0));

  return (
    <article>
      <h2 className={report.rtTitle}>{doc.title}</h2>
      <div className={report.rtMeta}>
        {doc.generated_at && (
          <span>
            {t('report.metaGenerated')} <b>{formatDateTime(doc.generated_at)}</b>
          </span>
        )}
        {doc.meta?.model && (
          <span>
            {t('report.metaModel')} <b>{doc.meta.model}</b>
          </span>
        )}
        {(doc.meta?.session_id ?? sessionId) && (
          <span>
            {t('report.metaSession')} <b>{doc.meta?.session_id ?? sessionId}</b>
          </span>
        )}
        <span>
          {t('report.metaEvidence')} <b>{doc.meta?.evidence_count ?? evidence.length}</b>
        </span>
        <span>
          {t('report.metaCitations')}{' '}
          <b>{doc.meta?.citation_count ?? references.length}</b>
        </span>
      </div>

      {doc.abstract && (
        <p className={report.abstract}>
          <b>{t('report.abstract')}</b>
          {doc.abstract}
        </p>
      )}

      <div className={report.section}>
        <h3 className={report.sectionTitle}>{t('report.sections')}</h3>
        {doc.sections.map((section) => (
          <section key={section.id} className={layout.blockSm}>
            <h4 className={ui.leadText}>{section.title}</h4>
            <Markdown text={section.body} />
          </section>
        ))}
      </div>

      {doc.conclusions.length > 0 && (
        <div className={report.section}>
          <h3 className={report.sectionTitle}>{t('report.conclusions')}</h3>
          <div className={report.conclList}>
            {doc.conclusions.map((c, i) => (
              <div key={c.cid} className={report.conclLi}>
                <span className={report.conclNo}>{c.cite_no ?? i + 1}</span>
                <span className={report.conclBody}>
                  {c.text}
                  <span className={report.evRow}>
                    {c.evidence_ids.map((ev) => (
                      <EvBadge
                        key={ev}
                        taskId={taskId}
                        evId={ev}
                        tier={tierByEv.get(ev)}
                      />
                    ))}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {references.length > 0 && (
        <div className={report.section}>
          <h3 className={report.sectionTitle}>{t('report.references')}</h3>
          <ol className={md.md}>
            {references.map((e) => (
              <li key={e.ev_id}>
                {e.authors ? `${e.authors}：` : ''}
                {e.title}
                <span className={ui.monoInline}> {e.ref}</span>
                <span className={report.evRow}>
                  <EvBadge taskId={taskId} evId={e.ev_id} tier={e.tier} />
                </span>
              </li>
            ))}
          </ol>
          <p className={report.citeNote}>{t('report.citationNote')}</p>
        </div>
      )}

      {doc.verdict && (
        <div className={report.section}>
          <div
            className={cx(report.verdict, !doc.verdict.passed && report.verdictFail)}
            role="status"
          >
            <p className={report.verdictHead}>
              <Icon name={doc.verdict.passed ? 'check' : 'warn'} />
              {t('report.verdictTitle')}
            </p>
            {doc.verdict.text}
          </div>
        </div>
      )}

      {doc.degraded_statement && (
        <div className={report.section}>
          <div className={report.statement}>
            <p className={report.statementHead}>
              <Icon name="warn" />
              {t('report.degradedStatement')}
            </p>
            {doc.degraded_statement}
          </div>
        </div>
      )}
    </article>
  );
}
