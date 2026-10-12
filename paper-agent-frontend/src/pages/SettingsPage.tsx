import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import { env } from '@/config/env';
import { useI18n } from '@/i18n';
import type { LocaleId } from '@/i18n';
import type { ThemeMode } from '@/store/uiStore';
import { useUiStore } from '@/store/uiStore';
import { useHealthStore } from '@/store/healthStore';
import { useTaskStore } from '@/store/taskStore';
import { Card } from '@/components/ui/Card';
import { Field, SelectInput } from '@/components/ui/Fields';
import { Button, LinkButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/**
 * FE-11 设置 + FE-14 环境信息（P-06：不重复实现 AGH 原生配置）
 * 本页只放工作台自身偏好（外观/语言）与自检结果，模型与密钥深配交给 AGH。
 * 数据来源唯一：真实 AGH 研究平台（BFF），演示适配器已于 v2.5 整体移除。
 */
export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const health = useHealthStore((s) => s.health);
  const refreshHealth = useHealthStore((s) => s.refresh);
  const taskCount = useTaskStore((s) => s.tasks.length);

  return (
    <div className={layout.page}>
      <header className={layout.pageHead}>
        <div>
          <h2 className={layout.pageTitle}>{t('settings.title')}</h2>
          <p className={layout.pageLead}>{t('settings.lead')}</p>
        </div>
      </header>

      <Card className={layout.block} title={t('settings.dataMode')} icon="settings">
        <p className={ui.muted}>
          <Icon name="info" /> {t('settings.dataModeLive')}{' '}
          <span className={ui.monoInline}>{env.apiBaseUrl}</span>
        </p>
      </Card>

      <Card className={layout.block} title={t('settings.theme')} icon="panel">
        <div className={layout.grid2}>
          <Field label={t('settings.theme')} hint={t('settings.themeHint')}>
            <SelectInput
              aria-label={t('settings.theme')}
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeMode)}
              options={[
                { value: 'dark', label: t('settings.themeDark') },
                { value: 'light', label: t('settings.themeLight') },
              ]}
            />
          </Field>
          <Field label={t('settings.language')} hint={t('settings.languageHint')}>
            <SelectInput
              aria-label={t('settings.language')}
              value={locale}
              onChange={(e) => setLocale(e.target.value as LocaleId)}
              options={[
                { value: 'zh-CN', label: '简体中文' },
                { value: 'en', label: 'English' },
              ]}
            />
          </Field>
        </div>
      </Card>

      <Card className={layout.block} title={t('settings.aghSettings')} icon="external">
        {env.aghSettingsUrl ? (
          <LinkButton href={env.aghSettingsUrl} external icon="external">
            {t('settings.aghSettings')}
          </LinkButton>
        ) : (
          <p className={ui.note}>
            <Icon name="info" className={ui.noteIc} />
            <span>{t('settings.aghSettingsMissing')}</span>
          </p>
        )}
      </Card>

      <Card className={layout.block} title={t('health.issuesTitle')} icon="shield">
        <div className={layout.row}>
          <span className={ui.muted}>
            {t('overview.statsTasks')} <b>{health?.task_count ?? taskCount}</b>
          </span>
          <span className={ui.muted}>
            {t('health.model')} <b>{health?.model ?? '—'}</b>
          </span>
          <span className={ui.muted}>
            {t('health.session')}{' '}
            <b>{health?.session_ready ? t('agh.recorded') : t('agh.notRecorded')}</b>
          </span>
        </div>
        <div className={layout.row}>
          <Button size="sm" icon="refresh" onClick={() => void refreshHealth()}>
            {t('common.refresh')}
          </Button>
        </div>
      </Card>

      <Card className={layout.block} title={t('settings.about')} icon="info">
        <p className={ui.leadText}>{t('settings.aboutLead')}</p>
      </Card>
    </div>
  );
}
