import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import { api } from '@/api/client';
import { visibleMessages } from '@/api/normalize';
import { useI18n } from '@/i18n';
import { isRunning } from '@/lib/status';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useTaskGoneRedirect } from '@/app/useTaskGoneRedirect';
import { flags } from '@/config/flags';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { StepBar } from '@/components/business/StepBar';
import { ActivityFeed } from '@/components/business/ActivityFeed';
import { ToolCard } from '@/components/business/ToolCard';
import { DegradedBanner } from '@/components/business/DegradedBanner';
import { MessageList } from '@/components/business/MessageList';
import { Composer } from '@/components/business/Composer';
import { RunStats } from '@/components/business/RunStats';
import { ArtifactList } from '@/components/business/ArtifactList';

/**
 * FE-05 运行监控 + FE-06 降级提示（P-01/P-03）
 * 订阅/快照走同一条归一路径：断线重连或刷新页面后看到的界面与实时一致。
 * 右侧面板常驻：工具调用、机械统计、产物梳理都来自同一份归一状态。
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
  const reloadEvidence = useTaskStore((s) => s.reloadEvidence);
  const dropConnection = useTaskStore((s) => s.dropConnection);
  const restoreConnection = useTaskStore((s) => s.restoreConnection);
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

  function reconnect() {
    // 演示模式的"断线"是人为暂停时间线，恢复后要重新取快照再续接事件
    if (api.mode === 'mock') restoreConnection(taskId);
    void openTask(taskId);
  }

  return (
    <div className={`${layout.page} ${layout.pageAgent}`}>
      <header className={layout.pageHead}>
        <div>
          <h2 className={layout.pageTitle}>{t('monitor.title')}</h2>
          <p className={layout.pageLead}>{snapshot?.goal ?? t('monitor.lead')}</p>
        </div>
        {/* 证据在运行中/失败时同样要看，所以这一入口不受"报告是否就绪"门禁；
            报告页的入口由下方"报告已生成"提示条给出，避免同一目标两个按钮 */}
        <div className={layout.headActions}>
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
          {/* 降级横幅属于正文：它解释的就是下面这段执行过程。
              原先挂在栅格上方那一整行里（外层 .rowBetween 的 align-items:center 把它收成内容宽居中），
              于是飘在两列正中、左沿对不上正文卡。放进正文列后宽度自然跟随列宽，各断点都不用写死数值。 */}
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
            {snapshot ? (
              <StepBar
                steps={snapshot.steps}
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

          <Card
            className={layout.block}
            title={t('monitor.currentActivity')}
            icon="brain"
          >
            <ActivityFeed activities={entry.activities} running={running} />
          </Card>

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

          {flags.demoTools && api.mode === 'mock' && (
            <div className={`${layout.block} ${layout.headRow}`}>
              <span className={ui.muted}>{t('monitor.demoTools')}</span>
              <Button
                size="sm"
                icon="stop"
                disabled={entry.connection === 'offline'}
                onClick={() => dropConnection(taskId)}
              >
                {t('monitor.simulateDrop')}
              </Button>
              <Button size="sm" icon="refresh" onClick={reconnect}>
                {t('monitor.reconnect')}
              </Button>
              <Button
                size="sm"
                icon="refresh"
                onClick={() => {
                  api.demo?.reset();
                  void openTask(taskId);
                }}
              >
                {t('monitor.redo')}
              </Button>
            </div>
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
