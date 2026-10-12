import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import { visibleMessages } from '@/api/normalize';
import { useI18n } from '@/i18n';
import { isRunning } from '@/lib/status';
import { buildTrace, stepElapsedMs, totalElapsedMs } from '@/lib/trace';
import { formatDuration } from '@/lib/utils';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useTaskGoneRedirect } from '@/app/useTaskGoneRedirect';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { StepBar } from '@/components/business/StepBar';
import { ActivityFeed } from '@/components/business/ActivityFeed';
import { AgentTrace } from '@/components/business/AgentTrace';
import { ToolCard } from '@/components/business/ToolCard';
import { DegradedBanner } from '@/components/business/DegradedBanner';
import { MessageList } from '@/components/business/MessageList';
import { Composer } from '@/components/business/Composer';
import { RunStats } from '@/components/business/RunStats';
import { ArtifactList } from '@/components/business/ArtifactList';

/**
 * FE-05 运行监控 + FE-06 降级提示（P-01/P-03）
 * 订阅/快照走同一条归一路径：断线重连或刷新页面后看到的界面与实时一致。
 * 顶栏之下分两栏：左侧步骤状态列（含每步真实耗时），右侧 Agent Trace 时间线
 * （活动 / 思考 / 工具按时间序铺开）；工具明细与统计常驻右面板。
 */
export function MonitorPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const taskId = useParams().id ?? '';
  useTaskGoneRedirect(taskId);

  const entry = useTaskStore((s) => (taskId ? s.byId[taskId] : undefined));
  const openTask = useTaskStore((s) => s.openTask);
  const closeTask = useTaskStore((s) => s.closeTask);
  const resumeTask = useTaskStore((s) => s.resumeTask);
  const stopTask = useTaskStore((s) => s.stopTask);
  const reloadEvidence = useTaskStore((s) => s.reloadEvidence);
  const setCurrentTask = useUiStore((s) => s.setCurrentTask);

  useEffect(() => {
    if (!taskId) return;
    setCurrentTask(taskId);
    void openTask(taskId);
    // 产物面板与统计块要读证据登记：监控页自己取一次，不依赖事件顺带刷新
    void reloadEvidence(taskId);
    return () => {
      closeTask(taskId);
    };
  }, [taskId, openTask, closeTask, reloadEvidence, setCurrentTask]);

  if (!taskId) {
    return (
      <div className={layout.page}>
        <ErrorState code="BAD_ID" />
      </div>
    );
  }

  if (!entry || entry.loading) {
    return (
      <div className={layout.page}>
        <Card title={t('monitor.title')} icon="monitor">
          <SkeletonList rows={4} />
        </Card>
      </div>
    );
  }

  if (entry.error && !entry.snapshot) {
    return (
      <div className={layout.page}>
        <Card title={t('monitor.title')} icon="monitor">
          <ErrorState
            code={entry.error}
            onRetry={entry.notFound ? undefined : () => void openTask(taskId)}
            retryLabel={t('common.retry')}
          />
          <div className={layout.row}>
            <Button size="sm" icon="chevLeft" onClick={() => navigate('/')}>
              {t('common.backToOverview')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const snapshot = entry.snapshot;
  const runStatus = snapshot?.run_status ?? 'PLANNED';
  const running = isRunning(runStatus);
  const reportReady = entry.reportStatus === 'ready' || snapshot?.report_ready === true;
  const tools = entry.tools;
  const messages = visibleMessages(entry);

  // 时间线是步骤耗时兜底计算的来源，也是 Trace 面板的数据源
  const traceItems = buildTrace(entry);
  const steps = snapshot?.steps ?? [];
  const enrichedSteps = steps.map((s) => {
    const ms = stepElapsedMs(s, traceItems);
    return ms && ms !== s.elapsed_ms ? { ...s, elapsed_ms: ms } : s;
  });
  const totalMs = totalElapsedMs(steps, traceItems);
  const doneCount = steps.filter((s) => s.status === 'DONE').length;
  const progressPct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const currentStepId = steps.find((s) => s.is_current)?.id ?? null;

  function reconnect() {
    // 断线只可能是真实网络/SSE 中断：重新打开任务会重取快照并续接事件流
    void openTask(taskId);
  }

  /** 运行中主动停止：confirm 把后果讲清楚（剩余步骤保留、可断点续跑）再动手 */
  function confirmStop() {
    if (window.confirm(t('monitor.stopConfirm'))) void stopTask(taskId);
  }

  return (
    <div className={`${layout.page} ${layout.pageAgent}`}>
      <header className={layout.pageHead}>
        <div>
          <h2 className={layout.pageTitle}>{t('monitor.title')}</h2>
          {/* live 视图 DTO 只有 title（无 goal）：goal 缺失时退回 title，
              两边都能显示完整目标；直接 ?? t('monitor.lead') 会把真实目标吞成占位文案 */}
          <p className={layout.pageLead}>{snapshot?.goal ?? snapshot?.title ?? t('monitor.lead')}</p>
        </div>
        {/* 证据在运行中/失败时同样要看，所以这一入口不受"报告是否就绪"门禁；
            报告页的入口由下方"报告已生成"提示条给出，避免同一目标两个按钮 */}
        <div className={layout.headActions}>
          {running && (
            <Button size="sm" icon="stop" onClick={confirmStop}>
              {t('monitor.stop')}
            </Button>
          )}
          <Button
            size="sm"
            icon="evidence"
            onClick={() => navigate(`/evidence/${taskId}`)}
          >
            {t('nav.evidence')}
          </Button>
        </div>
      </header>

      {entry.connection !== 'online' && (
        <div className={`${layout.block} ${monitor.disconnect}`} role="status">
          <Icon name="warn" />
          <span className={monitor.disconnectText}>
            {entry.connection === 'reconnecting'
              ? t('monitor.reconnecting')
              : `${t('monitor.disconnected')} ${t('monitor.disconnectedHint')}`}
          </span>
          <Button size="sm" icon="refresh" onClick={reconnect}>
            {t('monitor.reconnect')}
          </Button>
        </div>
      )}

      <div className={layout.agentGrid}>
        <div className={layout.agentCol}>
          {/* 降级横幅属于正文：它解释的就是下面这段执行过程。 */}
          {entry.degraded.map((info) => (
            <DegradedBanner
              key={info.id}
              info={info}
              onRetry={
                info.resumable ? () => void resumeTask(taskId, info.step) : undefined
              }
              onChangeSource={() => navigate('/new')}
            />
          ))}

          {/* 顶部当前活动大卡：一眼看到系统此刻在做什么 */}
          <Card
            className={layout.block}
            title={t('monitor.currentActivity')}
            icon="brain"
          >
            <ActivityFeed activities={entry.activities} running={running} />
          </Card>

          {/* 双栏：左步骤状态列（含每步耗时），右 Agent Trace 时间线 */}
          <div className={monitor.traceGrid}>
            <Card
              className={layout.block}
              title={t('monitor.stepsTitle')}
              icon="list"
              actions={
                runStatus === 'FAILED' ? (
                  <Button
                    size="sm"
                    variant="solid"
                    icon="play"
                    onClick={() => void resumeTask(taskId)}
                  >
                    {t('monitor.resume')}
                  </Button>
                ) : undefined
              }
            >
              <div className={monitor.stepHead}>
                <span className={monitor.stepCount}>
                  {t('monitor.stepsDone', { done: doneCount, total: steps.length })}
                </span>
                <div className={`${ui.progressTrack} ${monitor.stepHeadBar}`}>
                  <div className={ui.progressFill} style={{ width: `${progressPct}%` }} />
                </div>
                {totalMs > 0 && (
                  <span className={monitor.totalElapsed}>
                    <Icon name="clock" size={12} />
                    {t('monitor.totalElapsed')} {formatDuration(totalMs)}
                  </span>
                )}
              </div>
              {snapshot ? (
                <StepBar
                  steps={enrichedSteps}
                  running={running}
                  onRetry={(stepId) => void resumeTask(taskId, stepId)}
                  onChangeSource={() => navigate('/new')}
                />
              ) : (
                <p className={ui.muted}>{t('monitor.noActivity')}</p>
              )}
              {runStatus === 'FAILED' && (
                <ErrorState
                  message={t('monitor.failed')}
                  onRetry={() => void resumeTask(taskId)}
                  retryLabel={t('monitor.resume')}
                />
              )}
            </Card>

            <Card className={layout.block} title={t('monitor.traceTitle')} icon="agent">
              <AgentTrace
                activities={entry.activities}
                tools={tools}
                thinkings={entry.thinkings}
                running={running}
                currentStepId={currentStepId}
              />
            </Card>
          </div>

          {reportReady && (
            <div className={`${layout.block} ${monitor.readyBar}`}>
              <Icon name="check" />
              <span className={monitor.readyText}>{t('monitor.reportReady')}</span>
              <Button
                size="sm"
                variant="solid"
                icon="doc"
                onClick={() => navigate(`/report/${taskId}`)}
              >
                {t('monitor.goReport')}
              </Button>
            </div>
          )}

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

          <Composer taskId={taskId} running={running} />
        </div>

        <aside className={layout.agentCol} aria-label={t('monitor.agentPanels')}>
          <Card
            className={layout.block}
            title={t('monitor.toolSection')}
            icon="chain"
            bodyClassName={layout.block}
            actions={
              <span className={ui.badge}>
                {t('monitor.toolCount', { n: tools.length })}
              </span>
            }
          >
            {tools.length === 0 ? (
              <p className={ui.muted}>{t('monitor.noActivity')}</p>
            ) : (
              <div className={monitor.blocks}>
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            )}
            <p className={ui.hint}>{t('monitor.toolSectionHint')}</p>
          </Card>

          <RunStats
            steps={snapshot?.steps ?? []}
            tools={tools}
            degraded={entry.degraded}
            messages={entry.messages}
            conclusions={entry.conclusions}
            bundle={entry.evidence}
          />

          <ArtifactList
            taskId={taskId}
            steps={snapshot?.steps ?? []}
            bundle={entry.evidence}
          />
        </aside>
      </div>
    </div>
  );
}
