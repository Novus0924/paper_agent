import monitor from '@/styles/monitor.module.css';
import ui from '@/styles/ui.module.css';
import type { Activity } from '@/api/types';
import { useI18n } from '@/i18n';
import { timeOf } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

export interface ActivityFeedProps {
  activities: Activity[];
  running: boolean;
}

/** FE-05 当前进展：只显示人类可读描述（工具名/原始 JSON 属于过程细节区） */
export function ActivityFeed({ activities, running }: ActivityFeedProps) {
  const { t } = useI18n();
  const latest = activities.at(-1);
  return (
    <div>
      <p className={monitor.activityHead}>
        <Icon name="brain" />
        {running ? t('monitor.thinking') : t('monitor.thinkingDone')}
      </p>
      {activities.length === 0 ? (
        <p className={ui.muted}>
          {running ? t('monitor.waitingActivity') : t('monitor.noActivity')}
        </p>
      ) : (
        <>
          <p className={ui.leadText}>
            {latest?.human_message}
            {running && <span className={monitor.caret} aria-hidden />}
          </p>
          <div className={monitor.activityList}>
            {activities
              .slice(0, -1)
              .slice(-8)
              .reverse()
              .map((a) => (
                <div key={a.id} className={monitor.activityItem}>
                  <span className={monitor.activityTime}>{timeOf(a.ts)}</span>
                  <span>{a.human_message}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
