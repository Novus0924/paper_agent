import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import report from '@/styles/report.module.css';
import ui from '@/styles/ui.module.css';import { useI18n } from '@/i18n';
import { isRunning } from '@/lib/status';
import { visibleMessages } from '@/api/normalize';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useTaskGoneRedirect } from '@/app/useTaskGoneRedirect';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { ReportView } from '@/components/business/ReportView';
import { ExportPanel } from '@/components/business/ExportPanel';
import { MessageList } from '@/components/business/MessageList';
import { Composer } from '@/components/business/Composer';

/**
 * FE-07 报告中心 + FE-09 导出交付（P-02/P-04）
 * 报告"必达"：打开本页即取报告与证据快照，不依赖是否收到过 SSE report 事件。
 */
export function ReportPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const taskId = useParams().id ?? '';
  useTaskGoneRedirect(taskId);

  const entry = useTaskStore((s) => (taskId ? s.byId[taskId] : undefined));
  const openTask = useTaskStore((s) => s.openTask);
  const closeTask = useTaskStore((s) => s.closeTask);
  const setCurrentTask = useUiStore((s) => s.setCurrentTask);

  useEffect(() => {
    if (!taskId) return;
    setCurrentTask(taskId);
    void openTask(taskId);
    return () => {
      closeTask(taskId);
    };
  }, [taskId, openTask, closeTask, setCurrentTask]);

  if (!entry || entry.loading) {
    return (
      <div className={layout.page}>
        <Card title={t('report.title')} icon="doc">
          <SkeletonList rows={5} />
        </Card>
      </div>
    );
  }

  const doc = entry.report?.report;
  const messages = visibleMessages(entry);
  const taskDone = entry.snapshot?.run_status === 'DONE';
  // 未完成（需重试/改源）不能显示"生成中"的空转，要如实说明还缺什么
  const failed = entry.snapshot?.run_status === 'FAILED';
  const generating =
    !failed &&
    (entry.reportStatus === 'generating' || entry.report?.status === 'generating');

  /** 一键重跑：携带 goal/workflow/lit_source/sources 到新建页预填 */
  function rerun() {
    const snap = entry?.snapshot;
    if (!snap) return;
    navigate('/new', {
      state: {
        rerun: {
          goal: snap.goal ?? snap.title,
          workflow: snap.workflow,
          lit_source: snap.lit_source,
          sources: snap.sources,
        },
      },
    });
  }

  return (
    <div className={layout.page}>
      <header className={layout.pageHead}>
        <div>
          {/* 任务目标作为主标题（页面标题与卡片标题不再重复"报告"二字） */}
          <p className={report.docKind}>{t('report.subtitle')}</p>
          <h2 className={layout.pageTitle}>
            {entry.snapshot?.goal ?? entry.snapshot?.title ?? t('report.subtitle')}
          </h2>
        </div>
        <div className={layout.headActions}>
          <Button size="sm" icon="refresh" onClick={rerun} title={t('overview.rerunHint')}>
            {t('report.rerun')}
          </Button>
          <Button size="sm" icon="monitor" onClick={() => navigate(`/monitor/${taskId}`)}>
            {t('nav.monitor')}
          </Button>
          <Button
            size="sm"
            icon="evidence"
            onClick={() => navigate(`/evidence/${taskId}`)}
          >
            {t('nav.evidence')}
          </Button>
        </div>
      </header>

      {entry.error && !entry.snapshot && (
        <Card className={layout.block} title={t('report.title')} icon="doc">
          <ErrorState
            code={entry.error}
            onRetry={entry.notFound ? undefined : () => void openTask(taskId)}
          />
        </Card>
      )}

      {doc ? (
        <>
          <Card className={layout.block} flush>
            <div className={ui.cardBody}>
              <ReportView
                taskId={taskId}
                report={doc}
                evidence={entry.evidence?.evidence ?? []}
                sessionId={entry.snapshot?.session_id}
              />
            </div>
          </Card>

          <Card className={layout.block} title={t('report.exportTitle')} icon="download">
            <ExportPanel taskId={taskId} taskDone={taskDone} />
          </Card>
        </>
      ) : generating ? (
        <Card className={layout.block} title={t('report.generating')} icon="doc">
          <div className={report.pending}>
            <span className={ui.spinner} />
            <div className={report.pendingMain}>
              <p className={ui.leadText}>{t('report.generating')}</p>
              <p className={ui.muted}>{t('report.generatingLead')}</p>
              <div className={layout.row}>
                <Button
                  size="sm"
                  icon="monitor"
                  onClick={() => navigate(`/monitor/${taskId}`)}
                >
                  {t('report.notReadyAction')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        !entry.loading && (
          <Card className={layout.block} title={t('report.title')} icon="doc">
            <EmptyState
              icon="doc"
              title={t('report.notReadyTitle')}
              lead={
                entry.snapshot?.run_status === 'FAILED'
                  ? t('monitor.failed')
                  : (entry.report?.pending_note ?? t('report.notReadyLead'))
              }
              action={
                <>
                  <Button
                    size="sm"
                    icon="monitor"
                    onClick={() => navigate(`/monitor/${taskId}`)}
                  >
                    {t('report.notReadyAction')}
                  </Button>
                  {isRunning(entry.snapshot?.run_status ?? 'PLANNED') && (
                    <span className={ui.muted}>
                      <Icon name="info" /> {t('report.generatingLead')}
                    </span>
                  )}
                </>
              }
            />
          </Card>
        )
      )}

      {/* FE-10：报告页的追问要有落点，问答与修订记录留在同一会话里 */}
      {messages.length > 0 && (
        <Card className={layout.block} title={t('composer.ask')} icon="doc">
          <MessageList
            messages={messages}
            onRetry={(m) =>
              void useTaskStore.getState().sendMessage(taskId, m.text, 'ask')
            }
          />
        </Card>
      )}

      {doc && (
        <Composer
          taskId={taskId}
          running={isRunning(entry.snapshot?.run_status ?? 'PLANNED')}
        />
      )}
    </div>
  );
}
