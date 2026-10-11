import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import { api } from '@/api/client';
import { env } from '@/config/env';
import { useI18n, type MsgKey } from '@/i18n';
import type { LocaleId } from '@/i18n';
import type { ThemeMode } from '@/store/uiStore';
import { useUiStore } from '@/store/uiStore';
import { useHealthStore } from '@/store/healthStore';
import { useTaskStore } from '@/store/taskStore';
import { useToastStore } from '@/store/toastStore';
import { Card } from '@/components/ui/Card';
import { Field, SelectInput, CheckRow } from '@/components/ui/Fields';
import { Button, LinkButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const MODE_LABEL: Record<'mock' | 'live', MsgKey> = {
  mock: 'settings.modeMock',
  live: 'settings.modeLive',
};

/**
 * FE-11 设置 + FE-14 环境信息（P-06：不重复实现 AGH 原生配置）
 * 本页只放工作台自身偏好（模式/外观/语言/演示）与自检结果，模型与密钥深配交给 AGH。
 */
export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const speed = useUiStore((s) => s.speed);
  const setSpeed = useUiStore((s) => s.setSpeed);
  const health = useHealthStore((s) => s.health);
  const refreshHealth = useHealthStore((s) => s.refresh);
  const resetCount = useTaskStore((s) => s.tasks.length);

  const mockMode = api.mode === 'mock';

  /** 模式在模块加载时确定，切换需要带 ?mode= 重新加载；视图代码本身不变（§6.3） */
  function switchMode(next: 'mock' | 'live') {
    if (next === api.mode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('mode', next);
    window.location.assign(url.toString());
  }

  return (
    <div className={layout.page}>
      <header className={layout.pageHead}>
        <div>
          <h2 className={layout.pageTitle}>{t('settings.title')}</h2>
          <p className={layout.pageLead}>{t('settings.lead')}</p>
        </div>
      </header>

      <Card className={layout.block} title={t('settings.dataMode')} icon="settings">
        <Field
          label={t('settings.dataMode')}
          hint={t('settings.modeHint', { mode: t(MODE_LABEL[api.mode]) })}
        >
          <SelectInput
            aria-label={t('settings.dataMode')}
            value={api.mode}
            onChange={(e) => switchMode(e.target.value as 'mock' | 'live')}
            options={[
              { value: 'mock', label: t('settings.modeMock') },
              { value: 'live', label: t('settings.modeLive') },
            ]}
          />
        </Field>
        <p className={ui.muted}>
          <Icon name="info" /> API 基址{' '}
          <span className={ui.monoInline}>{env.apiBaseUrl}</span>
        </p>
      </Card>

      <Card className={layout.block} title={t('settings.theme')} icon="panel">
        <div className={layout.grid2}>
          <Field label={t('settings.theme')}>
            <SelectInput
              aria-label={t('settings.theme')}
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeMode)}
              options={[
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
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

      {mockMode && (
        <Card className={layout.block} title={t('settings.demo')} icon="bolt">
          <CheckRow
            checked={speed === 'fast'}
            onChange={(checked) => setSpeed(checked ? 'fast' : 'normal')}
            title={t('settings.demoSpeed')}
          />
          <p className={ui.muted}>{t('settings.demoSpeedHint')}</p>
          <div className={layout.row}>
            <Button
              size="sm"
              icon="refresh"
              onClick={() => {
                api.demo?.reset();
                useToastStore.getState().push('settings.resetDone', 'ok');
                window.location.reload();
              }}
            >
              {t('settings.demoReset')}
            </Button>
            <span className={ui.muted}>
              {t('settings.demoLead', { count: resetCount })}
            </span>
          </div>
        </Card>
      )}

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
            {t('overview.statsTasks')} <b>{health?.task_count ?? resetCount}</b>
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
