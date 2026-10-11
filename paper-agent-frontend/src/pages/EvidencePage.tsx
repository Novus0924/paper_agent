import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import report from '@/styles/report.module.css';
import ui from '@/styles/ui.module.css';
import type { Conclusion, EvidenceKind, EvidenceTier } from '@/api/types';
import { useI18n } from '@/i18n';
import { KIND_LABEL, KIND_ORDER, TIER_LABEL, TIER_ORDER } from '@/lib/labels';
import { pageOf, paginate } from '@/lib/paginate';
import { timeOf } from '@/lib/utils';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useTaskGoneRedirect } from '@/app/useTaskGoneRedirect';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextInput } from '@/components/ui/Fields';
import { Collapse } from '@/components/ui/Collapse';
import { Pager } from '@/components/ui/Pager';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { EvidenceCard } from '@/components/business/EvidenceCard';

/** 过程轨迹默认只展开前若干条，长会话不把整条轨迹一次性堆满页面 */
const TRACE_PREVIEW = 20;

/**
 * FE-08 证据溯源（P-02）：证据可筛选可搜索，每条能看到支撑了哪些结论、产生于哪一步；
 * 哈希与链信息收进「审计细节」，主视图不贴原始哈希。
 */
export function EvidencePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const taskId = useParams().id ?? '';
  useTaskGoneRedirect(taskId);
  const [params] = useSearchParams();
  const highlight = params.get('ev');

  const entry = useTaskStore((s) => (taskId ? s.byId[taskId] : undefined));
  const openTask = useTaskStore((s) => s.openTask);
  const closeTask = useTaskStore((s) => s.closeTask);
  const setCurrentTask = useUiStore((s) => s.setCurrentTask);

  const [tier, setTier] = useState<EvidenceTier | 'all'>('all');
  const [kind, setKind] = useState<EvidenceKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [traceAll, setTraceAll] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setCurrentTask(taskId);
    void openTask(taskId);
    return () => {
      closeTask(taskId);
    };
  }, [taskId, openTask, closeTask, setCurrentTask]);

  const bundle = entry?.evidence;
  const filtered = useMemo(() => {
    const list = bundle?.evidence ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((e) => {
      if (tier !== 'all' && e.tier !== tier) return false;
      if (kind !== 'all' && e.kind !== kind) return false;
      if (!q) return true;
      return [e.title, e.ref, e.summary ?? '', e.authors ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [bundle, tier, kind, query]);

  const view = useMemo(() => paginate(filtered, page), [filtered, page]);

  // 筛选条件一变就回到第 1 页，否则会停在一个已经不存在（或空白）的页码上
  useEffect(() => {
    setPage(1);
  }, [tier, kind, query]);

  // 深链 ?ev= 的目标可能在后一页：先算出它所在页，否则锚点滚动落在当前页找不到卡片
  const jumpedFor = useRef('');
  useEffect(() => {
    const list = bundle?.evidence;
    if (!highlight || !list) return;
    const key = `${taskId}:${highlight}:${list.length}`;
    if (jumpedFor.current === key) return;
    jumpedFor.current = key;
    setPage(pageOf(list, (e) => e.ev_id === highlight));
  }, [highlight, bundle, taskId]);

  const boundByEv = useMemo(() => {
    const map = new Map<string, Conclusion[]>();
    (bundle?.conclusions ?? []).forEach((c) => {
      c.evidence_ids.forEach((ev) => {
        const cur = map.get(ev) ?? [];
        map.set(ev, [...cur, c]);
      });
    });
    return map;
  }, [bundle]);

  const trace = bundle?.trace ?? [];

  if (!entry || entry.loading) {
    return (
      <div className={layout.page}>
        <Card title={t('evidence.title')} icon="evidence">
          <SkeletonList rows={4} />
        </Card>
      </div>
    );
  }

  if (entry.error && !entry.snapshot) {
    return (
      <div className={layout.page}>
        <Card title={t('evidence.title')} icon="evidence">
          <ErrorState
            code={entry.error}
            onRetry={entry.notFound ? undefined : () => void openTask(taskId)}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className={layout.page}>
      <header className={layout.pageHead}>
        <div>
          <h2 className={layout.pageTitle}>{t('evidence.title')}</h2>
          <p className={layout.pageLead}>{t('evidence.lead')}</p>
        </div>
        <div className={layout.headActions}>
          <Button size="sm" icon="doc" onClick={() => navigate(`/report/${taskId}`)}>
            {t('evidence.viewReport')}
          </Button>
        </div>
      </header>

      {highlight && (
        <p className={ui.note}>
          <span>{t('evidence.highlightHint', { ev: highlight })}</span>
        </p>
      )}

      <Card className={layout.block} title={t('evidence.listTitle')} icon="evidence">
        <div className={report.filterBar}>
          {/* 层级只有两档且高频切换：chips 比 Select 少一次点开 */}
          <div
            className={ui.srcRow}
            role="group"
            aria-label={t('evidence.filterTier')}
          >
            {(['all', ...TIER_ORDER] as const).map((v) => (
              <Button
                key={v}
                variant="chip"
                aria-pressed={tier === v}
                onClick={() => setTier(v)}
              >
                {v === 'all' ? t('common.all') : t(TIER_LABEL[v])}
              </Button>
            ))}
          </div>
          {/* 类型下拉按实际数据去重生成：数据里没出现过的类型不摆空选项 */}
          <Field label={t('evidence.filterKind')} className={report.filterItem}>
            <SelectInput
              aria-label={t('evidence.filterKind')}
              value={kind}
              onChange={(e) => setKind(e.target.value as EvidenceKind | 'all')}
              options={[
                { value: 'all', label: t('common.all') },
                ...KIND_ORDER.filter((v) => (bundle?.evidence ?? []).some((e) => e.kind === v)).map(
                  (v) => ({ value: v, label: t(KIND_LABEL[v]) }),
                ),
              ]}
            />
          </Field>
          <Field label={t('common.search')} className={layout.grow}>
            <TextInput
              aria-label={t('common.search')}
              value={query}
              placeholder={t('evidence.searchPlaceholder')}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
        </div>
        {/* 结果计数只在筛选激活时出现，避免与分页条的"共 N 条"重复 */}
        {(tier !== 'all' || kind !== 'all' || query.trim() !== '') && (
          <p className={ui.muted} aria-live="polite">
            {t('evidence.resultCount', { n: filtered.length })}
          </p>
        )}

        <div className={layout.block}>
          {filtered.length === 0 ? (
            <EmptyState
              icon="evidence"
              title={
                (bundle?.evidence.length ?? 0) > 0
                  ? t('evidence.noMatch')
                  : t('evidence.emptyTitle')
              }
              lead={
                (bundle?.evidence.length ?? 0) > 0
                  ? t('evidence.noMatchLead')
                  : t('evidence.emptyLead')
              }
              action={
                (bundle?.evidence.length ?? 0) > 0 ? (
                  <Button
                    size="sm"
                    icon="refresh"
                    onClick={() => {
                      setTier('all');
                      setKind('all');
                      setQuery('');
                    }}
                  >
                    {t('common.clear')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className={report.evList}>
              {view.items.map((item) => (
                <EvidenceCard
                  key={item.ev_id}
                  taskId={taskId}
                  item={item}
                  highlighted={highlight === item.ev_id}
                  bound={boundByEv.get(item.ev_id) ?? []}
                />
              ))}
            </div>
          )}
          <Pager
            page={view.page}
            pages={view.pages}
            from={view.from}
            to={view.to}
            total={view.total}
            onChange={setPage}
          />
        </div>
      </Card>

      <Collapse
        className={layout.block}
        title={t('evidence.traceTitle')}
        titleLevel={3}
        icon="chain"
        hint={t('monitor.detailHint')}
      >
        {trace.length === 0 ? (
          <p className={ui.muted}>{t('monitor.noActivity')}</p>
        ) : (
          <>
            <div className={report.traceList}>
              {(traceAll ? trace : trace.slice(0, TRACE_PREVIEW)).map((tr) => (
                <div key={tr.id} className={report.traceItem}>
                  <span className={report.traceTime}>{timeOf(tr.ts)}</span>
                  <span className={report.traceType}>{tr.type}</span>
                  <span className={layout.grow}>{tr.label}</span>
                </div>
              ))}
            </div>
            {!traceAll && trace.length > TRACE_PREVIEW && (
              <div className={ui.pagerMore}>
                <Button size="sm" icon="chevDown" onClick={() => setTraceAll(true)}>
                  {t('pager.showMore', { count: trace.length - TRACE_PREVIEW })}
                </Button>
              </div>
            )}
          </>
        )}
      </Collapse>
    </div>
  );
}
