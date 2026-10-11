import report from '@/styles/report.module.css';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import { useMemo } from 'react';
import type { EvidenceItem, Report } from '@/api/types';
import { useI18n } from '@/i18n';
import { formatApa, formatBibtex } from '@/lib/citation';
import { copyText, cx, formatDateTime } from '@/lib/utils';
import { useToastStore } from '@/store/toastStore';
import { Icon } from '@/components/ui/Icon';
import { Markdown } from '@/components/ui/Markdown';
import { Button } from '@/components/ui/Button';
import { Collapse } from '@/components/ui/Collapse';
import md from '@/styles/md.module.css';
import { EvBadge } from './EvBadge';

export interface ReportViewProps {
  taskId: string;
  report: Report;
  evidence: EvidenceItem[];
  sessionId?: string;
}

/**
 * FE-07 报告中心（P-02/P-04）：元信息 chips + 章节目录 + 每条结论绑定证据与引用复制
 * + 结果验证 + 降级声明。会话标识与账本链等机器细节收进「审计信息」折叠，
 * 引用列表由证据账本回填（系统不伪造 DOI）。
 */
export function ReportView({ taskId, report: doc, evidence, sessionId }: ReportViewProps) {
  const { t } = useI18n();
  const toast = useToastStore((s) => s.push);
  const evidenceByEv = new Map(evidence.map((e) => [e.ev_id, e] as const));
  const tierByEv = new Map(evidence.map((e) => [e.ev_id, e.tier] as const));
  const references = evidence
    .filter((e) => typeof e.cite_no === 'number')
    .sort((a, b) => (a.cite_no ?? 0) - (b.cite_no ?? 0));

  const ledger = evidence.filter((e) => e.chain_hash);

  /** 证据标题 tooltip：hover 徽章直接看到支撑证据是什么 */
  const evTitle = (evId: string) => {
    const item = evidenceByEv.get(evId);
    return item ? `${evId} · ${item.title}` : t('report.evidenceBadgeTitle', { ev: evId });
  };

  // 引用稳定（Markdown 已 memo）：正文随 store 更新重渲染会重建角标 DOM，点击会落空
  const evBadge = useMemo(
    () => ({
      href: (ev: string) => `/evidence/${taskId}?ev=${ev}`,
      title: (ev: string) => {
        const item = evidenceByEv.get(ev);
        return item
          ? `${ev} · ${item.title}`
          : t('report.evidenceBadgeTitle', { ev });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskId, evidence],
  );

  async function copyCitation(item: EvidenceItem, style: 'apa' | 'bibtex') {
    const text = style === 'apa' ? formatApa(item) : formatBibtex(item);
    const ok = await copyText(text);
    toast(
      ok
        ? style === 'apa'
          ? 'report.copiedApa'
          : 'report.copiedBibtex'
        : 'topbar.copyFailed',
      ok ? 'ok' : 'warn',
    );
  }

  function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <article>
      {/* 元信息改为 chips 组：只留用户关心的计数，会话 ID 等机器细节收进审计折叠 */}
      <div className={report.rtMeta}>
        {doc.generated_at && (
          <span className={ui.badge}>
            <Icon name="clock" size={12} />
            {t('report.metaGenerated')} {formatDateTime(doc.generated_at)}
          </span>
        )}
        <span className={ui.badge}>
          <Icon name="evidence" size={12} />
          {t('report.metaEvidenceCount', {
            n: doc.meta?.evidence_count ?? evidence.length,
          })}
        </span>
        <span className={ui.badge}>
          <Icon name="check" size={12} />
          {t('report.metaConclusionsCount', { n: doc.conclusions.length })}
        </span>
      </div>

      {doc.abstract && (
        <p className={report.abstract}>
          <b>{t('report.abstract')}</b>
          {doc.abstract}
        </p>
      )}

      {/* 章节目录：点击平滑滚动到对应章节（§2.1 P-02 长文可导航） */}
      {doc.sections.length > 0 && (
        <nav className={report.toc} aria-label={t('report.toc')}>
          <p className={ui.kvLabel}>{t('report.toc')}</p>
          <ol className={report.tocList}>
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => scrollToSection(e, section.id)}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* 章节正文：限宽居中提升可读性；不再重复"正文"节标题 */}
      {doc.sections.map((section) => (
        <section key={section.id} id={section.id} className={cx(report.prose, layout.blockSm)}>
          <h3 className={report.docHeading}>{section.title}</h3>
          <Markdown text={section.body} evBadge={evBadge} />
        </section>
      ))}

      {doc.conclusions.length > 0 && (
        <div className={report.section}>
          <h3 className={report.sectionTitle}>{t('report.conclusions')}</h3>
          <div className={report.conclList}>
            {doc.conclusions.map((c, i) => {
              const cited = c.evidence_ids
                .map((ev) => evidenceByEv.get(ev))
                .find((e): e is EvidenceItem => Boolean(e));
              return (
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
                          title={evTitle(ev)}
                        />
                      ))}
                      {cited && (
                        <>
                          <Button
                            size="sm"
                            variant="chip"
                            icon="copy"
                            title={t('report.copyCiteApa')}
                            onClick={() => void copyCitation(cited, 'apa')}
                          >
                            APA
                          </Button>
                          <Button
                            size="sm"
                            variant="chip"
                            icon="copy"
                            title={t('report.copyCiteBibtex')}
                            onClick={() => void copyCitation(cited, 'bibtex')}
                          >
                            BibTeX
                          </Button>
                        </>
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {references.length > 0 && (
        <div className={report.section}>
          <h3 className={report.sectionTitle}>{t('report.references')}</h3>
          <ol className={cx(md.md, report.prose)}>
            {references.map((e) => (
              <li key={e.ev_id}>
                {e.authors ? `${e.authors}：` : ''}
                {e.title}
                <span className={ui.monoInline}> {e.ref}</span>
                <span className={report.evRow}>
                  <EvBadge
                    taskId={taskId}
                    evId={e.ev_id}
                    tier={e.tier}
                    title={evTitle(e.ev_id)}
                  />
                  <Button
                    size="sm"
                    variant="chip"
                    icon="copy"
                    title={t('report.copyCiteApa')}
                    onClick={() => void copyCitation(e, 'apa')}
                  >
                    APA
                  </Button>
                  <Button
                    size="sm"
                    variant="chip"
                    icon="copy"
                    title={t('report.copyCiteBibtex')}
                    onClick={() => void copyCitation(e, 'bibtex')}
                  >
                    BibTeX
                  </Button>
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

      {/* 审计信息折叠：会话标识与账本链只留给需要核对的人（P-02 渐进披露） */}
      <Collapse
        className={report.auditBlock}
        title={t('report.auditTitle')}
        titleLevel={3}
        icon="shield"
        hint={t('report.auditLead')}
      >
        <div className={report.auditGrid}>
          {(doc.meta?.session_id ?? sessionId) && (
            <div>
              <p className={ui.kvLabel}>{t('report.auditSession')}</p>
              <p className={report.auditValue}>
                {doc.meta?.session_id ?? sessionId}
              </p>
            </div>
          )}
          {ledger.length > 0 && (
            <div>
              <p className={ui.kvLabel}>{t('report.auditLedger')}</p>
              {ledger.map((e) => (
                <p key={e.ev_id} className={report.auditValue}>
                  {e.ev_id} · {e.chain_hash}
                </p>
              ))}
            </div>
          )}
        </div>
      </Collapse>
    </article>
  );
}
