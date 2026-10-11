import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import type { TaskSnapshot } from '@/api/types';
import { useI18n } from '@/i18n';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { paginate } from '@/lib/paginate';
import { isRunning } from '@/lib/status';
import { copyText, cx, relativeTime } from '@/lib/utils';
import { routeForTask } from '@/app/nav';
import { useToastStore } from '@/store/toastStore';
import { Button } from '@/components/ui/Button';
import { Pager } from '@/components/ui/Pager';
import { Badge, RunStatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';

/** FE-03 总览：任务列表 + 状态 + 快速新建（P-04 历史可重开） */
export function OverviewPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.listLoading);
  const listError = useTaskStore((s) => s.listError);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const setCurrentTask = useUiStore((s) => s.setCurrentTask);
  const toast = useToastStore((s) => s.push);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const ordered = useMemo(
    () =>
      tasks.slice().sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [tasks],
  );
  const view = useMemo(() => paginate(ordered, page), [ordered, page]);

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

  function open(task: TaskSnapshot) {
    setCurrentTask(task.task_id);
    navigate(routeForTask(task.run_status, task.task_id));
  }

  async function copySession(e: MouseEvent, sessionId: string) {
    e.stopPropagation();
    const ok = await copyText(sessionId);
    toast(ok ? 'overview.sessionCopied' : 'topbar.copyFailed', ok ? 'ok' : 'warn');
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

      <Card title={t('overview.listTitle')} icon="panel" flush>
        {loading ? (
          <SkeletonList rows={4} />
        ) : ordered.length === 0 ? (
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
                              icon="chain"
                              title={t('overview.idsHint', {
                                taskId: task.task_id,
                                sessionId: task.session_id,
                              })}
                              aria-label={t('overview.copySession', {
                                sessionId: task.session_id,
                              })}
                              onClick={(e) => void copySession(e, task.session_id)}
                            >
                              {task.agh_recorded === false
                                ? t('agh.notRecorded')
                                : t('agh.recorded')}
                            </Button>
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
