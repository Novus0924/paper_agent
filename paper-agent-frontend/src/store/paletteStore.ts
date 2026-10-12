import { create } from 'zustand';

/**
 * 全局命令面板（FE-17）状态：开关 + "最近使用"记忆。
 * 只存 id（命令/页面/任务的稳定键），不存对象——结果随时可重算，
 * 记忆只用于把常点的条目排到前面。
 */
interface PaletteState {
  open: boolean;
  /** 最近执行过的条目 id，最新在前，最多 5 条 */
  recent: string[];
  setOpen: (open: boolean) => void;
  toggle: () => void;
  remember: (id: string) => void;
  clearRecent: () => void;
}

const STORAGE_KEY = 'paper-agent-frontend.palette';
const MAX_RECENT = 5;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecent(recent: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    /* 隐私模式下写入失败只影响记忆，不影响功能 */
  }
}

export const usePaletteStore = create<PaletteState>((set, get) => ({
  open: false,
  recent: readRecent(),

  setOpen(open) {
    set({ open });
  },

  toggle() {
    set({ open: !get().open });
  },

  remember(id) {
    const next = [id, ...get().recent.filter((x) => x !== id)].slice(0, MAX_RECENT);
    set({ recent: next });
    writeRecent(next);
  },

  clearRecent() {
    set({ recent: [] });
    writeRecent([]);
  },
}));
