import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { zhCN, type Locale } from './zh-CN';
import { en } from './en';

type Path<T> = T extends object
  ? { [K in keyof T & string]: K | `${K}.${Path<T[K]>}` }[keyof T & string]
  : never;

/** 编译期校验的文案键（拼错键名会在 typecheck 报错） */
export type MsgKey = Path<Locale>;

export type LocaleId = 'zh-CN' | 'en';

const resources: Record<LocaleId, unknown> = { 'zh-CN': zhCN, en };
const STORAGE_KEY = 'paper-agent-frontend.locale';

function lookup(source: unknown, path: string): string | undefined {
  let cur: unknown = source;
  for (const seg of path.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] === undefined ? `{${k}}` : String(vars[k]),
  );
}

type Translate = (key: MsgKey, vars?: Record<string, string | number>) => string;

const I18nContext = createContext<{
  locale: LocaleId;
  setLocale: (l: LocaleId) => void;
  t: Translate;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(() => {
    const saved =
      typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'zh-CN';
  });

  const setLocale = useCallback((l: LocaleId) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* 隐私模式下写入失败不影响使用 */
    }
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => {
      const hit = lookup(resources[locale], key) ?? lookup(resources['zh-CN'], key);
      if (hit === undefined) {
        if (import.meta.env.DEV) console.warn(`[i18n] 缺失文案键：${key}`);
        return key;
      }
      return interpolate(hit, vars);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n 必须在 I18nProvider 内使用');
  return ctx;
}
