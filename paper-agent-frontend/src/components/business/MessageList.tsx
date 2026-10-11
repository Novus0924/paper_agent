import composer from '@/styles/composer.module.css';
import ui from '@/styles/ui.module.css';
import type { ChatMessage } from '@/api/types';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/utils';
import { errorCodeKey } from '@/lib/errors';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Markdown } from '@/components/ui/Markdown';

export interface MessageListProps {
  messages: ChatMessage[];
  onRetry?: (message: ChatMessage) => void;
}

/** FE-10 会话区：追问与修订的多轮往来，同一会话留痕 */
export function MessageList({ messages, onRetry }: MessageListProps) {
  const { t } = useI18n();
  if (messages.length === 0) return null;
  return (
    <div>
      {messages.map((m) => {
        if (m.role === 'user') {
          return (
            <div key={m.id} className={composer.msgUser}>
              <div className={composer.bubble}>
                {m.text}
                {m.status === 'sending' && (
                  <span className={composer.sending}>
                    <span className={ui.spinnerSm} /> {t('composer.sending')}
                  </span>
                )}
                {m.status === 'failed' && (
                  <div className={composer.failed}>
                    <span className={ui.errorInline}>
                      {t(errorCodeKey(m.error ?? 'UNKNOWN'))}
                    </span>
                    {onRetry && (
                      <Button size="sm" icon="refresh" onClick={() => onRetry(m)}>
                        {t('common.resend')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }
        return (
          <article key={m.id} className={composer.msgAgent}>
            <header className={composer.who}>
              <span className={composer.whoMark}>
                <Icon name="agent" size={13} strokeWidth={1.9} />
              </span>
              <span>{t('app.name')}</span>
              <span className={cx(ui.muted, m.status === 'streaming' && ui.runText)}>
                {m.status === 'streaming' ? t('composer.sending') : ''}
              </span>
            </header>
            {m.text ? (
              <Markdown text={m.text} />
            ) : (
              <p className={ui.muted}>
                {m.status === 'failed'
                  ? t('composer.replyFailedHint')
                  : t('composer.emptyReply')}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
