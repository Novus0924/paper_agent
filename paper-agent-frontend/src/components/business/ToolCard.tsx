import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import type { ToolCall } from '@/api/types';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Collapse } from '@/components/ui/Collapse';

const STATE: Record<ToolCall['status'], { icon: IconName; cls: string | undefined }> = {
  running: { icon: 'clock', cls: monitor.toolStateRun },
  done: { icon: 'check', cls: monitor.toolStateOk },
  warn: { icon: 'warn', cls: monitor.toolStateWarn },
  failed: { icon: 'fail', cls: monitor.toolStateFail },
};

/** 工具卡（过程细节区）：默认收起，展开后可见入参 / 出参 / 数据源状态（§8.4 验收） */
export function ToolCard({ tool }: { tool: ToolCall }) {
  const { t } = useI18n();
  const state = STATE[tool.status];
  return (
    <Collapse
      title={
        <>
          <span className={cx(monitor.toolState, state.cls)}>
            <Icon name={state.icon} size={13} strokeWidth={2.2} />
          </span>
          <span className={monitor.toolName}>{tool.tool}</span>
          <span className={monitor.toolLabel}>{tool.label}</span>
        </>
      }
      defaultOpen={tool.status === 'running'}
    >
      {tool.input && (
        <>
          <p className={ui.kvLabel}>{t('monitor.toolInput')}</p>
          <pre className={ui.code}>{tool.input}</pre>
        </>
      )}
      {tool.sources_status && tool.sources_status.length > 0 && (
        <>
          <p className={ui.kvLabel}>{t('monitor.toolSources')}</p>
          <div className={ui.srcRow}>
            {tool.sources_status.map((s) => (
              <span
                key={s.source}
                className={cx(ui.src, s.status !== 'ok' && ui.srcSkip)}
              >
                {s.source}
                <b>{s.note ?? s.status}</b>
              </span>
            ))}
          </div>
        </>
      )}
      {tool.output && (
        <>
          <p className={ui.kvLabel}>{t('monitor.toolOutput')}</p>
          <pre className={ui.code}>{tool.output}</pre>
        </>
      )}
    </Collapse>
  );
}
