import { useEffect, useMemo, useRef, useState } from 'react';
import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import { useI18n, type MsgKey } from '@/i18n';
import { cx, formatDuration, timeOf } from '@/lib/utils';
import { buildTrace, elapsedSince, type TraceKind } from '@/lib/trace';
import { Icon } from '@/components/ui/Icon';
import type { Activity, ToolCall } from '@/api/types';
import type { ThinkingEntry } from '@/api/normalize';

export interface AgentTraceProps {
  activities: Activity[];
  tools: ToolCall[];
  thinkings: ThinkingEntry[];
  running: boolean;
  /** 当前运行中的步骤 id；用于给思考条目挂"思考中"呼吸点 */
  currentStepId?: string | null;
  /** 自动滚动跟随（监控页默认开；报告页嵌入时不显示控件） */
  withControls?: boolean;
  className?: string;
}

const TOOL_STATUS_KEY: Record<string, MsgKey> = {
  running: 'monitor.toolRunning',
  done: 'monitor.toolDone',
  warn: 'monitor.toolWarn',
  failed: 'monitor.toolFailed',
};

const KIND_ICON: Record<TraceKind, 'brain' | 'chain' | 'list'> = {
  thinking: 'brain',
  tool: 'chain',
  activity: 'list',
};

/**
 * Agent Trace 时间线：把活动 / 思考 / 工具按时间序铺开。
 * 刻意不用 role=list/listitem —— 监控页另有步骤列表按 listitem 计数（FE-05），
 * 这里用普通容器承载，避免两类"条目"在无障碍语义上互相干扰。
 */
export function AgentTrace({
  activities,
  tools,
  thinkings,
  running,
  currentStepId,
  withControls = true,
  className,
}: AgentTraceProps) {
  const { t } = useI18n();
  const items = useMemo(
    () => buildTrace({ activities, tools, thinkings }),
    [activities, tools, thinkings],
  );
  const [follow, setFollow] = useState(true);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const start = items[0]?.ts ?? '';

  useEffect(() => {
    if (!follow) return;
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [items.length, follow]);

  const lastThinkingId = [...items].reverse().find((i) => i.kind === 'thinking')?.id;

  return (
    <div className={cx(monitor.traceWrap, className)}>
      {withControls && (
        <div className={monitor.traceBar}>
          <span className={ui.muted}>{t('monitor.traceLead')}</span>
          <button
            type="button"
            className={cx(ui.button, ui.sm)}
            aria-pressed={follow}
            onClick={() => setFollow((v) => !v)}
          >
            <Icon name="clock" size={12} />
            {follow ? t('monitor.tracePause') : t('monitor.traceResume')}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className={ui.muted}>{t('monitor.traceEmpty')}</p>
      ) : (
        <div className={monitor.trace} ref={boxRef}>
          {items.map((it) => {
            const at = elapsedSince(start, it.ts);
            const thinkingLive =
              it.kind === 'thinking' &&
              running &&
              it.step != null &&
              it.step === currentStepId &&
              it.id === lastThinkingId;
            const tag =
              it.kind === 'thinking'
                ? t('monitor.traceTagThinking')
                : it.kind === 'tool'
                  ? t('monitor.traceTagTool')
                  : t('monitor.traceTagActivity');
            return (
              <div
                key={it.id}
                className={cx(
                  monitor.traceItem,
                  it.kind === 'thinking' && monitor.traceThinking,
                  it.kind === 'tool' && monitor.traceTool,
                  it.kind === 'activity' && monitor.traceActivity,
                )}
              >
                <span className={monitor.traceTime}>{timeOf(it.ts)}</span>
                <span className={monitor.traceOffset}>
                  {at > 0 ? `+${formatDuration(at)}` : '·'}
                </span>
                <span className={monitor.traceKind}>
                  <Icon name={KIND_ICON[it.kind]} size={11} />
                  {tag}
                </span>
                <div className={monitor.traceBody}>
                  {it.step && <span className={monitor.traceStep}>{it.step}</span>}
                  <span className={monitor.traceText}>
                    {it.kind === 'thinking' ? (
                      <span className={monitor.traceThinkText}>{it.text}</span>
                    ) : (
                      it.text
                    )}
                  </span>
                  {/* 工具名（sciret_*）只在右侧工具面板展示，时间线这里给人类标签 + 状态，
                      避免同一名字在页面上出现两处（读屏与查询都会拿到重复项） */}
                  {it.kind === 'tool' && it.toolStatus && (
                    <span className={monitor.traceToolMeta}>
                      <span>{t(TOOL_STATUS_KEY[it.toolStatus] ?? 'monitor.toolRunning')}</span>
                    </span>
                  )}
                  {thinkingLive && (
                    <span className={monitor.traceLive}>
                      <span className={monitor.traceLiveDot} aria-hidden />
                      {t('monitor.thinkingRunning')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
