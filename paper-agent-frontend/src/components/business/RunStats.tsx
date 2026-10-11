import layout from '@/styles/layout.module.css';
import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import type {
  ChatMessage,
  Conclusion,
  DegradedInfo,
  EvidenceBundle,
  Step,
  StepStatus,
  ToolCall,
} from '@/api/types';
import type { MsgKey } from '@/i18n';
import { useI18n } from '@/i18n';
import { STEP_STATE_LABEL, TIER_LABEL, TOOL_STATE_LABEL } from '@/lib/labels';
import { formatDuration } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface RunStatsProps {
  steps: Step[];
  tools: ToolCall[];
  degraded: DegradedInfo[];
  messages: ChatMessage[];
  conclusions: Conclusion[];
  /** 证据与轨迹要单独取数，未取到时为 null（统计块显示为 —，不猜数） */
  bundle: EvidenceBundle | null;
}

function tally<T>(list: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of list) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * FE-05 运行统计（机械摘要口径）：只列可从快照与事件逐项核对的计数与耗时。
 * 后端契约里没有摘要字段，因此这里不产出任何生成式文本。
 */
export function RunStats({
  steps,
  tools,
  degraded,
  messages,
  conclusions,
  bundle,
}: RunStatsProps) {
  const { t } = useI18n();
  const na = t('common.notApplicable');

  const stepStates = tally(steps, (s) => s.status);
  const toolStates = tally(tools, (x) => x.status);
  const tierStates = tally(bundle?.evidence ?? [], (e) => e.tier);
  const rounds = new Set(messages.map((m) => m.turn_id)).size;
  const elapsed = steps.reduce((sum, s) => sum + (s.elapsed_ms ?? 0), 0);
  const doneSteps = stepStates['DONE'] ?? 0;
  const bundleConclusions = bundle?.conclusions ?? [];

  const tiles: Array<{ key: string; value: string; label: string }> = [
    {
      key: 'steps',
      value: `${doneSteps}/${steps.length}`,
      label: t('monitor.statSteps'),
    },
    { key: 'tools', value: String(tools.length), label: t('monitor.statTools') },
    {
      key: 'evidence',
      value: bundle ? String(bundle.evidence.length) : na,
      label: t('monitor.statEvidence'),
    },
    {
      key: 'conclusions',
      value: String(bundle ? bundleConclusions.length : conclusions.length),
      label: t('monitor.statConclusions'),
    },
    {
      key: 'trace',
      value: bundle ? String(bundle.trace.length) : na,
      label: t('monitor.statTrace'),
    },
    { key: 'rounds', value: String(rounds), label: t('monitor.statRounds') },
  ];

  function line(pairs: Array<[MsgKey, number | undefined]>): string {
    const hits = pairs.filter((p): p is [MsgKey, number] => (p[1] ?? 0) > 0);
    return hits.length
      ? hits.map(([k, n]) => `${t(k)} ${n}`).join(' · ')
      : t('common.none');
  }

  const stepOrder: StepStatus[] = ['RUNNING', 'PENDING', 'SKIPPED', 'FAILED'];
  const toolOrder: Array<ToolCall['status']> = ['running', 'warn', 'failed'];

  const rows: Array<{ label: string; value: string }> = [
    {
      label: t('monitor.statStepStates'),
      value: line(
        stepOrder.map((s): [MsgKey, number | undefined] => [
          STEP_STATE_LABEL[s],
          stepStates[s],
        ]),
      ),
    },
    {
      label: t('monitor.statToolStates'),
      value: line(
        toolOrder.map((s): [MsgKey, number | undefined] => [
          TOOL_STATE_LABEL[s],
          toolStates[s],
        ]),
      ),
    },
    {
      label: t('monitor.statDegraded'),
      value: line([
        ['status.degraded', degraded.filter((d) => d.level === 'degraded').length],
        ['monitor.statInfoEvents', degraded.filter((d) => d.level === 'info').length],
      ]),
    },
    {
      label: t('monitor.statTierStates'),
      value: bundle
        ? line([
            [TIER_LABEL.fact, tierStates['fact']],
            [TIER_LABEL.artifact, tierStates['artifact']],
          ])
        : na,
    },
  ];

  return (
    <Card
      title={t('monitor.statsTitle')}
      icon="bolt"
      className={layout.block}
      bodyClassName={layout.block}
    >
      <div className={ui.statGrid}>
        {tiles.map((tile) => (
          <div key={tile.key} className={ui.stat} data-stat={tile.key}>
            <p className={ui.statValue}>{tile.value}</p>
            <p className={ui.statLabel}>{tile.label}</p>
          </div>
        ))}
      </div>
      <dl className={monitor.statList}>
        {rows.map((row) => (
          <div key={row.label} className={monitor.statRow}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
        <div className={monitor.statRow}>
          <dt>{t('monitor.statElapsed')}</dt>
          <dd>{elapsed > 0 ? formatDuration(elapsed) : na}</dd>
        </div>
      </dl>
      <p className={ui.hint}>{t('monitor.statsHint')}</p>
    </Card>
  );
}
