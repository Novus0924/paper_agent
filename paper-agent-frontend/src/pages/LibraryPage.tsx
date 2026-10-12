import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import lib from '@/styles/library.module.css';
import { api } from '@/api/client';
import { ApiError } from '@/api/errors';
import type {
  EvidenceKind,
  EvidenceTier,
  LibraryEvidenceResponse,
} from '@/api/types';
import { useI18n } from '@/i18n';
import { KIND_LABEL, KIND_ORDER, TIER_LABEL, TIER_ORDER, sourceLabel } from '@/lib/labels';
import { SOURCES } from '@/config/registry';
import { paginate } from '@/lib/paginate';
import { truncate } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, Tag } from '@/components/ui/Badge';
import { Pager } from '@/components/ui/Pager';
import { CheckRow, Field, SelectInput, TextInput } from '@/components/ui/Fields';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';

/**
 * 一次取回过滤后的全量（上限 200），统计条与分页都在这一份数据上做；
 * 文献库规模在这个量级，避免统计随分页跳变。超出上限时仍以后端分页为准。
 */
const LIBRARY_FETCH_LIMIT = 200;

type KindFilter = EvidenceKind | 'all';
type TierFilter = EvidenceTier | 'all';
type SourceFilter = string; // 来源名或 'all'

/**
 * FE-14 文献库：跨任务汇总证据，支持关键词 / 类型 / 层级 / 来源检索与按 DOI 去重。
 * 每条都能回到来源任务（/report/:task_id），把"任务内证据"提升为"工作区文献"。
 */
export function LibraryPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [kind, setKind] = useState<KindFilter>('all');
  const [tier, setTier] = useState<TierFilter>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [dedupe, setDedupe] = useState(true);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<LibraryEvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .listLibraryEvidence({
        ...(debouncedQuery.trim() ? { q: debouncedQuery.trim() } : {}),
        ...(kind !== 'all' ? { kind } : {}),
        ...(tier !== 'all' ? { tier } : {}),
        ...(source !== 'all' ? { source } : {}),
        dedupe,
        limit: LIBRARY_FETCH_LIMIT,
        offset: 0,
      })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof ApiError ? err.code : 'UNKNOWN');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debouncedQuery, kind, tier, source, dedupe, reloadKey]);

  // 筛选条件一变就回到第 1 页，否则会停在一个已经不存在（或空白）的页码上
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, kind, tier, source, dedupe]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const view = useMemo(() => paginate(items, page), [items, page]);
  const deduped = useMemo(
    () => items.reduce((n, it) => n + it.duplicates_count, 0),
    [items],
  );

  const filtering =
    debouncedQuery.trim() !== '' || kind !== 'all' || tier !== 'all' || source !== 'all';

  function clearFilters() {
    setQuery('');
    setKind('all');
    setTier('all');
    setSource('all');
  }

  return (
    <div className={layout.page}>
      <header className={layout.pageHead}>
        <div>
          <h2 className={layout.pageTitle}>{t('library.title')}</h2>
          <p className={layout.pageLead}>{t('library.lead')}</p>
        </div>
      </header>

      <div className={lib.stats} aria-live="polite">
        <Stat value={data?.total ?? 0} unit={t('library.unitItems')} label={t('library.statItems')} />
        <Stat
          value={data?.tasks_scanned ?? 0}
          unit={t('library.unitTasks')}
          label={t('library.statTasks')}
        />
        <Stat value={deduped} unit={t('library.unitDeduped')} label={t('library.statDeduped')} />
      </div>

      <Card title={t('library.listTitle')} icon="evidence">
        <div className={lib.filterBar}>
          {/* 层级只有两档：chips 比下拉少一次点开（与证据页一致） */}
          <div className={ui.srcRow} role="group" aria-label={t('library.filterTier')}>
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
          <Field label={t('library.filterKind')} className={lib.filterField}>
            <SelectInput
              aria-label={t('library.filterKind')}
              value={kind}
              onChange={(e) => setKind(e.target.value as KindFilter)}
              options={[
                { value: 'all', label: t('common.all') },
                ...KIND_ORDER.map((v) => ({ value: v, label: t(KIND_LABEL[v]) })),
              ]}
            />
          </Field>
          <Field label={t('library.filterSource')} className={lib.filterField}>
            <SelectInput
              aria-label={t('library.filterSource')}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              options={[
                { value: 'all', label: t('common.all') },
                ...SOURCES.map((s) => ({ value: s.name, label: s.label })),
              ]}
            />
          </Field>
          <Field label={t('common.search')} className={layout.grow}>
            <TextInput
              type="search"
              aria-label={t('library.searchLabel')}
              placeholder={t('library.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <div className={lib.dedupeField}>
            <CheckRow
              checked={dedupe}
              onChange={setDedupe}
              title={t('library.dedupe')}
              note={t('library.dedupeHint')}
            />
          </div>
        </div>

        {filtering && !loading && (
          <p className={ui.muted} aria-live="polite">
            {t('library.resultCount', { n: data?.total ?? 0 })}
          </p>
        )}

        {error ? (
          <ErrorState code={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : loading && !data ? (
          <SkeletonList rows={4} />
        ) : items.length === 0 ? (
          filtering ? (
            <EmptyState
              icon="search"
              title={t('library.noMatch')}
              lead={t('library.noMatchLead')}
              action={
                <Button size="sm" icon="refresh" onClick={clearFilters}>
                  {t('common.clear')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="evidence"
              title={t('library.emptyTitle')}
              lead={t('library.emptyLead')}
              action={
                <Button variant="solid" icon="plus" onClick={() => navigate('/new')}>
                  {t('library.emptyAction')}
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className={lib.rowList}>
              {view.items.map((item) => {
                // byline 三段都可能缺：产物条目 authors 归一后为空串、year 为 null（后端契约），
                // venue 空串——只过滤空串不够，null 会渲染成 "null" 或留下游离分隔符。
                const byline = [item.ref.authors, item.ref.year, item.ref.venue]
                  .filter((s) => s !== '' && s !== null && s !== undefined)
                  .join(' · ');
                return (
                  <li key={`${item.task_id}:${item.ev_id}`} className={lib.row}>
                    <div className={lib.rowHead}>
                      <span className={lib.rowTitle}>{item.title}</span>
                      <span className={lib.rowBadges}>
                        {item.ref.source && (
                          <Tag>{sourceLabel(item.ref.source)}</Tag>
                        )}
                        <Badge tone="idle" dot={false}>
                          {/* 兜底：后端/内核未来新增 kind 时，退化为原值而不是 t(undefined) 崩溃 */}
                          {KIND_LABEL[item.kind] ? t(KIND_LABEL[item.kind]) : item.kind}
                        </Badge>
                        {item.duplicates_count > 0 && (
                          <span className={lib.dup}>
                            {t('library.duplicates', { n: item.duplicates_count })}
                          </span>
                        )}
                      </span>
                    </div>
                    {byline && <p className={lib.rowMeta}>{byline}</p>}
                    <div className={lib.rowMeta}>
                      {item.ref.doi && (
                        <span className={lib.refMono}>DOI {item.ref.doi}</span>
                      )}
                      <Link
                        to={`/report/${item.task_id}`}
                        className={lib.rowTask}
                        title={t('library.openReport')}
                      >
                        <Icon name="doc" size={12} />
                        <span>{t('library.sourceTask')}</span>
                        <span className={lib.taskText}>
                          {truncate(item.task_goal || item.task_id, 40)}
                        </span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager
              page={view.page}
              pages={view.pages}
              from={view.from}
              to={view.to}
              total={view.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function Stat({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <div className={lib.stat}>
      <div className={ui.statValue}>
        {value}
        <span className={lib.statUnit}>{unit}</span>
      </div>
      <div className={ui.statLabel}>{label}</div>
    </div>
  );
}
