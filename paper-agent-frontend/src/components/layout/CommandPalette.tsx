import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaletteStore } from '@/store/paletteStore';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useI18n } from '@/i18n';
import { ROUTES } from '@/app/nav';
import { api } from '@/api/client';
import { exportLibraryBibtex } from '@/lib/libraryExport';
import { flattenItems, matchesFuzzy, moveIndex, rankByRecent } from '@/lib/commands';
import type { CommandItem, CommandSection } from '@/lib/commands';
import type { MsgKey } from '@/i18n';
import { Modal } from '@/components/ui/Overlay';
import { Icon } from '@/components/ui/Icon';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';

/** 文献搜索防抖（ms）：避免输入热路径打接口 */
const LIT_DEBOUNCE_MS = 250;
/** 文献段最多展示条数：面板是导航入口，全量检索走文献库页 */
const LIT_LIMIT = 8;

/**
 * 全局命令面板（FE-17）：任务 / 页面 / 动作 / 文献四源真实搜索。
 *
 * 2026-10-12 接线说明：底座（paletteStore + lib/commands + palette.* i18n）在此前
 * 迭代已建但零消费方，顶栏搜索框仅为禁用占位（"Cmd+K 即将支持"）。本组件补齐：
 * - Cmd/Ctrl+K 全局唤起（再按一次关闭）；Esc 由 Modal 的 useDismiss 处理；
 * - 任务搜索来自 taskStore.tasks（title + task_id 双键模糊匹配），直达报告页；
 * - 文献搜索走 GET /api/v1/library?q=（后端过滤，250ms 防抖），直达该任务证据页；
 * - 动作：新建任务 / 切换主题 / 导出全部文献库 BibTeX（真实触发，非占位）。
 */
export function CommandPalette() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const open = usePaletteStore((s) => s.open);
  const setOpen = usePaletteStore((s) => s.setOpen);
  const recent = usePaletteStore((s) => s.recent);
  const remember = usePaletteStore((s) => s.remember);
  const tasks = useTaskStore((s) => s.tasks);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [litItems, setLitItems] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 全局 Cmd/Ctrl+K 唤起/关闭（IM 合成输入中的 e.key 可能是过程串，判断放最后）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!usePaletteStore.getState().open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  // 打开时重置查询并聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setLitItems([]);
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  // 文献搜索：≥2 字符触发，后端 q 过滤 + 防抖 + 卸载保护（fake/live 同一契约）
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setLitItems([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      api
        .listLibraryEvidence({ q })
        .then((res) => {
          if (!alive) return;
          setLitItems(
            res.items.slice(0, LIT_LIMIT).map((x) => ({
              id: `evidence:${x.task_id}:${x.ev_id}`,
              kind: 'evidence' as const,
              label: x.title || x.ev_id,
              hint: `${x.ev_id} · ${x.task_id}`,
              to: ROUTES.evidence(x.task_id),
            })),
          );
        })
        .catch(() => {
          if (alive) setLitItems([]);
        });
    }, LIT_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const sections: CommandSection[] = useMemo(() => {
    const pages: CommandItem[] = [
      { id: 'page:overview', kind: 'page', label: t('palette.pageOverview'), to: ROUTES.overview, icon: 'panel' },
      { id: 'page:new', kind: 'page', label: t('palette.pageNew'), to: ROUTES.new, icon: 'plus' },
      { id: 'page:library', kind: 'page', label: t('palette.pageLibrary'), to: ROUTES.library, icon: 'evidence' },
      { id: 'page:settings', kind: 'page', label: t('palette.pageSettings'), to: ROUTES.settings, icon: 'settings' },
    ];
    const actions: CommandItem[] = [
      { id: 'action:new-task', kind: 'action', label: t('palette.actionNewTask'), to: ROUTES.new, icon: 'plus' },
      {
        id: 'action:theme',
        kind: 'action',
        label: t('palette.actionTheme'),
        icon: 'sun',
        run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'action:export-bibtex',
        kind: 'action',
        label: t('palette.actionExport'),
        icon: 'download',
        run: () => {
          void exportLibraryBibtex();
        },
      },
    ];
    const taskItems: CommandItem[] = tasks
      .filter((x) => !x.archived)
      .slice(0, 30)
      .map((x) => ({
        id: `task:${x.task_id}`,
        kind: 'task' as const,
        label: x.title || x.task_id,
        hint: x.task_id,
        to: ROUTES.report(x.task_id),
        icon: 'doc' as const,
      }));
    const out: Array<{ key: string; titleKey: MsgKey; items: CommandItem[] }> = [
      { key: 'task', titleKey: 'palette.sectionTask', items: taskItems },
      { key: 'evidence', titleKey: 'palette.sectionEvidence', items: litItems },
      { key: 'page', titleKey: 'palette.sectionPage', items: pages },
      { key: 'action', titleKey: 'palette.sectionAction', items: actions },
    ];
    return out.filter((s) => s.items.length > 0);
  }, [t, tasks, theme, setTheme, litItems]);

  const filtered: CommandSection[] = useMemo(() => {
    const out: CommandSection[] = [];
    for (const s of sections) {
      const items = s.items.filter((it) => matchesFuzzy(query, `${it.label} ${it.hint ?? ''}`));
      if (items.length) out.push({ ...s, items });
    }
    return out;
  }, [sections, query]);

  const flat: CommandItem[] = useMemo(
    () => rankByRecent(flattenItems(filtered), recent),
    [filtered, recent],
  );

  // 过滤结果变化时光标回归首项，避免停留在已消失的条目上
  useEffect(() => {
    setCursor(0);
  }, [query]);

  function execute(item: CommandItem): void {
    remember(item.id);
    setOpen(false);
    if (item.to) navigate(item.to);
    else item.run?.();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => moveIndex(flat.length, c, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => moveIndex(flat.length, c, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[cursor];
      if (item) execute(item);
    }
  }

  let runningIndex = -1;

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={t('palette.title')}>
      <p className={ui.muted}>{t('palette.lead')}</p>
      <div className={layout.paletteSearch}>
        <Icon name="search" size={14} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('palette.placeholder')}
          aria-label={t('palette.title')}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-listbox"
          aria-activedescendant={flat[cursor] ? `palette-opt-${cursor}` : undefined}
        />
        <span className={layout.tbKbd}>Esc</span>
      </div>
      {flat.length === 0 ? (
        <div className={layout.paletteEmpty}>
          <p>{t('palette.empty')}</p>
          <p className={ui.muted}>{t('palette.emptyLead')}</p>
        </div>
      ) : (
        <div className={layout.paletteList} ref={listRef} role="listbox" id="palette-listbox">
          {filtered.map((section) => (
            <div key={section.key} role="group" aria-label={t(section.titleKey)}>
              <p className={layout.paletteSection}>{t(section.titleKey)}</p>
              {section.items.map((item) => {
                runningIndex += 1;
                const idx = runningIndex;
                return (
                  <button
                    type="button"
                    key={item.id}
                    id={`palette-opt-${idx}`}
                    role="option"
                    aria-selected={idx === cursor}
                    className={cxPaletteItem(idx === cursor)}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => execute(item)}
                  >
                    <Icon
                      name={item.icon ?? (item.kind === 'task' ? 'doc' : item.kind === 'evidence' ? 'evidence' : 'panel')}
                      size={13}
                    />
                    <span className={layout.paletteItemLabel}>{item.label}</span>
                    {item.hint && <span className={layout.paletteItemHint}>{item.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <p className={layout.paletteHint}>{t('palette.hintNav')}</p>
    </Modal>
  );
}

function cxPaletteItem(active: boolean): string {
  return `${layout.paletteItem} ${active ? layout.paletteItemActive : ''}`.trim();
}
