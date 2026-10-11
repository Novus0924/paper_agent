import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import type { RunStatus, TaskSnapshot } from '@/api/types';
import { useI18n } from '@/i18n';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { paginate } from '@/lib/paginate';
import { isRunning } from '@/lib/status';
import { cx, relativeTime } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks';
import { routeForTask } from '@/app/nav';
import { Button } from '@/components/ui/Button';
import { Pager } from '@/components/ui/Pager';
import { Badge, RunStatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { TextInput } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';

/** FE-03 总览：任务列表 + 状态 + 快速新建（P-04 历史可重开；v2.1 归档视图） */
export function OverviewPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.listLoading);
  const listError = useTaskStore((s) => s.listError);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const archiveTask = useTaskStore((s) => s.archiveTask);
  const listCounts = useTaskStore((s) => s.listCounts);
  const setCurrentTask = useUiStore((s) => s.setCurrentTask);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  // 视图状态落在 URL query 上（?status=&archived=），可刷新、可分享
  const statusParam = searchParams.get('status');
  const archivedView = searchParams.get('archived') === 'true';
  const statusFilter = (
    ['PLANNED', 'RUNNING', 'DONE', 'FAILED'] as const
  ).includes(statusParam as RunStatus)
    ? (statusParam as RunStatus)
    : undefined;
  // "已降级"后端 ?status= 不支持：走客户端过滤，URL 依旧可分享
  const degradedFilter = statusParam === 'degraded';

  useEffect(() => {
    void loadTasks({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(degradedFilter ? { degraded: true } : {}),
      ...(archivedView ? { archived: 'true' as const } : {}),
    });
    // 列表参数变化即重新拉取（首次挂载也拉）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTasks, statusParam, archivedView]);

  useEffect(() => {
    setPage(1);
  }, [statusParam, archivedView, debouncedQuery]);

  const ordered = useMemo(
    () =>
      tasks.slice().sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [tasks],
  );
  /** 关键词本地过滤（goal/title），与状态 chips、归档视图叠加生效；统计卡片仍按全量算 */
  const matched = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((task) =>
      [task.title, task.goal ?? ''].join(' ').toLowerCase().includes(q),
    );
  }, [ordered, debouncedQuery]);
  const view = useMemo(() => paginate(matched, page), [matched, page]);

  const stats = useMemo(() => {
    const running = ordered.filter((x) => isRunning(x.run_status));
    const done = ordered.filter((x) => x.run_status === 'DONE');
    const degraded = ordered.filter((x) => x.degraded);
    return [
      { label: t('overview.statsTasks'), value: ordered.length },
      { label: t('overview.statsRunning'), value: running.length },
      { label: t('overview.statsDone'), value: done.length },
      { label: t('overview.statsDegraded'), value: degraded.length },
    ];
  }, [ordered, t]);

  /** 状态 chips：计数徽章取最近一次全量活跃扫描（listCounts），不随过滤抖动 */
  const chips = useMemo(() => {
    const selected = degradedFilter ? 'degraded' : (statusFilter ?? null);
    return [
      { key: null, label: t('common.all'), count: listCounts?.all ?? ordered.length, selected: selected === null },
      { key: 'RUNNING', label: t('status.run.RUNNING'), count: listCounts?.running ?? 0, selected: selected === 'RUNNING' },
      { key: 'DONE', label: t('status.run.DONE'), count: listCounts?.done ?? 0, selected: selected === 'DONE' },
      { key: 'FAILED', label: t('status.run.FAILED'), count: listCounts?.failed ?? 0, selected: selected === 'FAILED' },
      { key: 'degraded', label: t('status.degraded'), count: listCounts?.degraded ?? 0, selected: selected === 'degraded' },
    ];
  }, [degradedFilter, statusFilter, listCounts, ordered.length, t]);

  function open(task: TaskSnapshot) {
    setCurrentTask(task.task_id);
    navigate(routeForTask(task.run_status, task.task_id));
  }

  function toggleArchivedView() {
    const next = new URLSearchParams(searchParams);
    if (archivedView) next.delete('archived');
    else next.set('archived', 'true');
    setSearchParams(next, { replace: true });
  }

  function setStatusFilter(next: string | null) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('status', next);
    else params.delete('status');
    setSearchParams(params, { replace: true });
  }

  async function onArchive(e: MouseEvent, task: TaskSnapshot, archived: boolean) {
    e.stopPropagation();
    await archiveTask(task.task_id, archived);
  }

  /** 一键重跑：携带 goal/workflow/lit_source/sources 跳新建页预填，用户可改后提交 */
  function rerun(task: TaskSnapshot) {
    navigate('/new', {
      state: {
        rerun: {
          goal: task.goal ?? task.title,
          workflow: task.workflow,
          lit_source: task.lit_source,
          sources: task.sources,
        },
      },
    });
  }

  return (
    <div className={layout.page}>
      <div className={layout.pageHead}>
        <div className={layout.headRow}>
          <div>
            <h2 className={layout.pageTitle}>{t('overview.title')}</h2>
            <p className={layout.pageLead}>{t('overview.lead')}</p>
          </div>
          <div className={layout.headActions}>
            <Button
              variant="chip"
              icon="panel"
              aria-pressed={archivedView}
              onClick={toggleArchivedView}
            >
              {t('overview.archivedView')}
            </Button>
            <Button variant="solid" icon="plus" onClick={() => navigate('/new')}>
              {t('overview.newTask')}
            </Button>
          </div>
        </div>
      </div>

      <div className={ui.statGrid}>
        {stats.map((s) => (
          <div key={s.label} className={ui.stat}>
            <div className={ui.statValue}>{s.value}</div>
            <div className={ui.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {listError && <ErrorState code={listError} onRetry={() => void loadTasks()} />}

      {!archivedView && (
        <div className={ui.srcRow} role="group" aria-label={t('overview.filterLabel')}>
          {chips.map((chip) => (
            <Button
              key={chip.key ?? 'all'}
              variant="chip"
              aria-pressed={chip.selected}
              onClick={() => setStatusFilter(chip.key)}
            >
              {chip.label} <span className={ui.badge}>{chip.count}</span>
            </Button>
          ))}
        </div>
      )}

      <div className={ui.searchRow}>
        <TextInput
          type="search"
          aria-label={t('overview.searchLabel')}
          placeholder={t('overview.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Card
        title={t(archivedView ? 'overview.archivedListTitle' : 'overview.listTitle')}
        icon="panel"
        flush
      >
        {loading ? (
          <SkeletonList rows={4} />
        ) : ordered.length === 0 ? (
          archivedView ? (
            <EmptyState
              icon="panel"
              title={t('overview.archivedEmptyTitle')}
              lead={t('overview.archivedEmptyLead')}
            />
          ) : (
            <EmptyState
              icon="bulb"
              title={t('overview.emptyTitle')}
              lead={t('overview.emptyLead')}
              action={
                <Button variant="solid" icon="plus" onClick={() => navigate('/new')}>
                  {t('overview.newTask')}
                </Button>
              }
            />
          )
        ) : matched.length === 0 ? (
          <EmptyState
            icon="search"
            title={t('overview.searchEmptyTitle')}
            lead={t('overview.searchEmptyLead')}
            action={
              <Button size="sm" icon="refresh" onClick={() => setQuery('')}>
                {t('common.clear')}
              </Button>
            }
          />
        ) : (
          <>
            <div
              className={ui.tableScroll}
              role="region"
              tabIndex={0}
              aria-label={t('overview.listTitle')}
            >
              <table className={cx(ui.table, ui.tableCenter)}>
                <caption className="sr-only">{t('overview.listTitle')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('overview.colGoal')}</th>
                    <th scope="col" className={ui.colStatus}>
                      {t('overview.colStatus')}
                    </th>
                    <th scope="col" className={ui.colTime}>
                      {t('overview.colUpdated')}
                    </th>
                    <th scope="col" className={ui.colAction}>
                      {t('overview.colAction')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.items.map((task) => {
                    const done = task.run_status === 'DONE';
                    return (
                      <tr
                        key={task.task_id}
                        data-task-id={task.task_id}
                        className={ui.rowClick}
                        onClick={() => open(task)}
                      >
                        <td>
                          {/* 机器标识（run-…/sess-…）不再默认铺在文案里：默认只给人话标题，
                            标识收进可复制徽章的 tooltip/无障碍名，兼顾 P-02 渐进披露与 P-04 留痕 */}
                          <span className={ui.cellTitle}>{task.title}</span>
                        </td>
                        <td>
                          {/* 降级是状态，不是目标的一部分；徽章统一三字，列宽才不 ragged */}
                          <span className={ui.cellStack}>
                            <RunStatusBadge status={task.run_status} />
                            {task.degraded && (
                              <Badge tone="warn">{t('status.degraded')}</Badge>
                            )}
                          </span>
                        </td>
                        <td className={cx(ui.monoInline, ui.colTime)}>
                          {relativeTime(task.updated_at)}
                        </td>
                        <td>
                          <span className={ui.cellStack}>
                            <Button
                              size="sm"
                              icon={done ? 'doc' : 'monitor'}
                              onClick={(e) => {
                                e.stopPropagation();
                                open(task);
                              }}
                            >
                              {t(done ? 'overview.openReport' : 'overview.openMonitor')}
                            </Button>
                            <Button
                              size="sm"
                              variant="chip"
                              icon="refresh"
                              title={t('overview.rerunHint')}
                              onClick={(e) => {
                                e.stopPropagation();
                                rerun(task);
                              }}
                            >
                              {t('overview.rerun')}
                            </Button>
                            {archivedView ? (
                              <Button
                                size="sm"
                                variant="chip"
                                icon="refresh"
                                title={t('overview.restoreHint')}
                                onClick={(e) => void onArchive(e, task, false)}
                              >
                                {t('overview.restore')}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="chip"
                                icon="panel"
                                disabled={isRunning(task.run_status)}
                                title={
                                  isRunning(task.run_status)
                                    ? t('overview.archiveRunningHint')
                                    : t('overview.archiveHint')
                                }
                                onClick={(e) => void onArchive(e, task, true)}
                              >
                                {t('overview.archive')}
                              </Button>
                            )}
                            {/* 会话留痕是状态不是操作：中性徽章替代原"AGH 已记录"按钮，
                              会话标识等机器 ID 收进报告页的审计信息折叠（P-02 渐进披露） */}
                            <span className={ui.badge} aria-label={t('agh.recordedAria')}>
                              <Icon name="chain" size={12} />
                              {task.agh_recorded === false
                                ? t('agh.notRecorded')
                                : t('agh.recorded')}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
        <div className={ui.cardBody}>
          <p className={ui.hint}>
            <Icon name="chain" size={13} />
            {t('overview.sessionNote')}
          </p>
        </div>
      </Card>
    </div>
  );
}
