import { useState, type KeyboardEvent } from 'react';
import composer from '@/styles/composer.module.css';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/utils';
import { useAutoGrow } from '@/lib/hooks';
import { queuedMessages } from '@/api/normalize';
import { api } from '@/api/client';
import { useTaskStore } from '@/store/taskStore';
import { Icon } from '@/components/ui/Icon';

export interface ComposerProps {
  taskId: string;
  running: boolean;
}

/**
 * FE-10 底部追问 / 修订输入区（P-05：必须真正可用）
 * 运行中发送进入排队（显示顺序，可"立即发送/删除"）；Enter 或 Cmd/Ctrl+Enter 发送。
 */
export function Composer({ taskId, running }: ComposerProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'ask' | 'revise'>('ask');
  const taRef = useAutoGrow<HTMLTextAreaElement>(text);

  const entry = useTaskStore((s) => s.byId[taskId]);
  const sendMessage = useTaskStore((s) => s.sendMessage);
  const sendNow = useTaskStore((s) => s.sendNow);
  const removeQueued = useTaskStore((s) => s.removeQueued);
  const queue = entry ? queuedMessages(entry) : [];
  const ready = text.trim().length > 0;
  const canSendNow = Boolean(api.sendNow);

  function submit() {
    const value = text.trim();
    if (!value) return;
    void sendMessage(taskId, value, mode);
    setText('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className={composer.wrap}>
      {queue.length > 0 && (
        <div className={composer.queue}>
          <p className={composer.queueHead}>
            <Icon name="clock" size={13} />
            {t('composer.queueTitle')}
          </p>
          {queue.map((m) => (
            <div key={m.id} className={composer.queueItem}>
              <span className={composer.queueOrder}>
                {t('composer.queueOrder', { order: m.queued_order ?? 0 })}
              </span>
              <span className={composer.queueText} title={m.text}>
                {m.text}
              </span>
              {/* live 后端无强制投递口（消息按序自动放行），不渲染假的「立即发送」按钮 */}
              {canSendNow && (
                <button
                  type="button"
                  className={composer.queueBtn}
                  onClick={() => void sendNow(taskId, m.turn_id)}
                >
                  {t('composer.queueSendNow')}
                </button>
              )}
              <button
                type="button"
                className={composer.queueBtn}
                onClick={() => void removeQueued(taskId, m.turn_id)}
              >
                <Icon name="trash" size={13} />
                {t('composer.queueRemove')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={composer.box}>
        <textarea
          id="composer-textarea"
          ref={taRef}
          className={composer.ta}
          rows={1}
          value={text}
          placeholder={
            running
              ? t('composer.placeholderRunning')
              : t('composer.placeholderIdle')
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={t('composer.inputLabel')}
        />
        <div className={composer.bar}>
          <div className={composer.modes} role="group" aria-label={t('composer.modeAsk')}>
            <button
              type="button"
              className={cx(composer.mode, mode === 'ask' && composer.modeActive)}
              aria-pressed={mode === 'ask'}
              onClick={() => setMode('ask')}
            >
              {t('composer.modeAsk')}
            </button>
            <button
              type="button"
              className={cx(composer.mode, mode === 'revise' && composer.modeActive)}
              aria-pressed={mode === 'revise'}
              onClick={() => setMode('revise')}
            >
              {t('composer.modeRevise')}
            </button>
          </div>
          <span className={composer.spacer} />
          {running && <span className={composer.queueHint}>{t('composer.queued')}</span>}
          <button
            type="button"
            className={cx(composer.send, ready && composer.sendReady)}
            onClick={submit}
            disabled={!ready}
            aria-label={t('composer.send')}
          >
            <Icon name="send" size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      <p className={composer.hint}>{t('composer.hint')}</p>
    </div>
  );
}
