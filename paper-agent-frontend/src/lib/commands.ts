import type { MsgKey } from '@/i18n';

/** 命令面板条目分类：任务 / 页面 / 动作 / 文献（FE-17） */
export type CommandKind = 'task' | 'page' | 'action' | 'evidence';

export interface CommandItem {
  id: string;
  kind: CommandKind;
  label: string;
  hint?: string;
  /** 跳转目标；动作类可不带 to，改用 run */
  to?: string;
  run?: () => void;
}

export interface CommandSection {
  key: string;
  titleKey: MsgKey;
  items: CommandItem[];
}

/**
 * 宽松匹配：先看子串，再看"按顺序出现的子序列"（"nwtsk" 能命中"new task"）。
 * 空查询视为全部命中（面板一打开就列出常用项）。
 */
export function matchesFuzzy(query: string, text: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return true;
  }
  return i === q.length;
}

/** 键盘上下移动：环形回绕；当前无选中时向下选第一个、向上选最后一个 */
export function moveIndex(len: number, current: number, delta: number): number {
  if (len <= 0) return -1;
  if (current < 0) return delta > 0 ? 0 : len - 1;
  return (current + delta + len) % len;
}

/** 把各分区拍平成一条有序列表，键盘只在这条列表上移动 */
export function flattenItems(sections: CommandSection[]): CommandItem[] {
  return sections.flatMap((s) => s.items);
}

/** 最近使用的条目排到前面（稳定排序，未命中记忆的保持原序） */
export function rankByRecent(items: CommandItem[], recent: string[]): CommandItem[] {
  if (recent.length === 0) return items;
  const rank = new Map(recent.map((id, i) => [id, i]));
  return [...items].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** 按查询过滤一个分区，并把最近使用的条目前置 */
export function filterSection(
  section: CommandSection,
  query: string,
  recent: string[],
): CommandSection {
  const items = rankByRecent(section.items, recent).filter((it) =>
    matchesFuzzy(query, `${it.label} ${it.hint ?? ''}`),
  );
  return { ...section, items };
}
