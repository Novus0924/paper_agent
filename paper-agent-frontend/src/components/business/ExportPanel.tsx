import { useState } from 'react';
import report from '@/styles/report.module.css';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import type { ExportKind, ExportManifestItem, ExportResult } from '@/api/types';
import { useI18n, type MsgKey } from '@/i18n';
import { download, downloadUrl } from '@/lib/utils';
import { useTaskStore } from '@/store/taskStore';
import { useToastStore } from '@/store/toastStore';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Dot } from '@/components/ui/Badge';

const ITEMS: Array<{
  kind: ExportKind;
  nameKey: MsgKey;
  leadKey: MsgKey;
  okKey: MsgKey;
}> = [
  {
    kind: 'report',
    nameKey: 'export.reportMd',
    leadKey: 'export.leadReport',
    okKey: 'export.doneReport',
  },
  {
    kind: 'audit',
    nameKey: 'export.auditPack',
    leadKey: 'export.leadAudit',
    okKey: 'export.doneAudit',
  },
  {
    kind: 'session',
    nameKey: 'export.sessionTrace',
    leadKey: 'export.leadSession',
    okKey: 'export.doneTrace',
  },
];

export interface ExportPanelProps {
  taskId: string;
  /** 未完成时报告与审计包尚不存在，只开放会话轨迹（P-04） */
  taskDone: boolean;
}

/** FE-09 导出与交付：文件、内容清单与校验状态一并给出，失败可重试且不丢内容 */
export function ExportPanel({ taskId, taskDone }: ExportPanelProps) {
  const { t } = useI18n();
  const exportArtifact = useTaskStore((s) => s.exportArtifact);
  const downloadReportMd = useTaskStore((s) => s.downloadReportMd);
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);

  /** 保存结果：二进制走 blobUrl（ZIP），文本内容直接下载 */
  function save(res: ExportResult) {
    if (res.blobUrl) {
      downloadUrl(res.filename ?? `${taskId}-export`, res.blobUrl);
      window.setTimeout(() => URL.revokeObjectURL(res.blobUrl as string), 1500);
    } else if (res.filename && res.content) {
      download(res.filename, res.mime ?? 'text/plain;charset=utf-8', res.content);
    }
  }

  async function run(kind: ExportKind, okKey: MsgKey) {
    setPending(kind);
    setResult(null);
    const res = await exportArtifact(taskId, kind);
    setPending(null);
    setResult(res);
    if (!res.ok) {
      useToastStore.getState().push('export.failed', 'fail', { reason: res.error ?? '' });
      return;
    }
    save(res);
    useToastStore.getState().push(okKey, 'ok');
  }

  /** 报告 Markdown 原始文件直下：GET /tasks/{id}/report.md，文件名 {task_id}.md */
  async function runMd() {
    setPending('md');
    const res = await downloadReportMd(taskId);
    setPending(null);
    if (!res.ok) {
      useToastStore.getState().push('export.failed', 'fail', { reason: res.error ?? '' });
      return;
    }
    save(res);
    useToastStore.getState().push('export.doneReport', 'ok');
  }

  return (
    <div>
      {!taskDone && (
        <p className={ui.note}>
          <Icon name="info" className={ui.noteIc} />
          <span>
            <b>{t('export.notReadyTitle')}</b> {t('export.notReadyLead')}
          </span>
        </p>
      )}

      <div className={report.expList}>
        <div className={report.expRow}>
          <div className={report.expMain}>
            <p className={report.expName}>{t('export.reportMdDirect')}</p>
            <p className={report.expLead}>{t('export.reportMdDirectLead')}</p>
          </div>
          <Button
            size="sm"
            icon="download"
            aria-label={t('export.reportMdDirect')}
            loading={pending === 'md'}
            disabled={pending !== null}
            onClick={() => void runMd()}
          >
            {pending === 'md' ? t('export.running') : t('export.start')}
          </Button>
        </div>
        {ITEMS.map((item) => {
          const locked = item.kind !== 'session' && !taskDone;
          return (
            <div key={item.kind} className={report.expRow}>
              <div className={report.expMain}>
                <p className={report.expName}>{t(item.nameKey)}</p>
                <p className={report.expLead}>{t(item.leadKey)}</p>
              </div>
              {locked ? (
                <span className={report.expLocked}>{t('export.locked')}</span>
              ) : (
                <Button
                  size="sm"
                  icon="download"
                  loading={pending === item.kind}
                  disabled={pending !== null}
                  onClick={() => void run(item.kind, item.okKey)}
                >
                  {pending === item.kind ? t('export.running') : t('export.start')}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {result?.manifest && <Manifest manifest={result.manifest} />}

      {result && !result.ok && (
        <div className={layout.row}>
          <span className={ui.errorInline}>
            {t('export.failed', { reason: result.error ?? '' })}
          </span>
          <Button
            size="sm"
            icon="refresh"
            onClick={() =>
              void run(
                result.kind,
                ITEMS.find((i) => i.kind === result.kind)?.okKey ?? 'export.doneReport',
              )
            }
          >
            {t('common.retry')}
          </Button>
        </div>
      )}
    </div>
  );
}

function Manifest({ manifest }: { manifest: ExportManifestItem[] }) {
  const { t } = useI18n();
  return (
    <div className={report.manifest}>
      <p className={ui.kvLabel}>{t('export.manifestTitle')}</p>
      {manifest.map((m) => (
        <div key={m.name} className={report.manifestRow}>
          <span className={report.manifestName}>
            {m.name}
            <span className={ui.muted}> · {m.kind}</span>
          </span>
          <span className={layout.headRow}>
            <Dot tone={m.verified ? 'ok' : 'warn'} />
            <span className={ui.muted}>
              {m.verified ? t('export.verified') : t('export.unverified')}
            </span>
          </span>
          {m.note && <span className={ui.muted}>{m.note}</span>}
        </div>
      ))}
    </div>
  );
}
