import { create } from 'zustand';

/**
 * 双主题（FE-16）：'dark' 为默认（:root 深色控制台），'light' 覆盖为浅色科研台。
 * 主题只切 tokens 的变量块，不改任何组件样式（§5.1）。
 */
export type ThemeMode = 'light' | 'dark';

/** 默认深色：data-theme='dark' 落回 :root，视觉与"控制台深色"一致 */
export const DEFAULT_THEME: ThemeMode = 'dark';

interface UiState {
  navCollapsed: boolean;
  theme: ThemeMode;
  /** 顶部上下文栏显示"当前任务"，由监控/报告/证据页写入 */
  currentTaskId: string | null;
  toggleNav: () => void;
  setTheme: (theme: ThemeMode) => void;
  setCurrentTask: (taskId: string | null) => void;
}

const STORAGE_KEY = 'paper-agent-frontend.ui';

interface PersistedUi {
  navCollapsed?: boolean;
  theme?: ThemeMode;
}

function readPersisted(): PersistedUi {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedUi) : {};
  } catch {
    return {};
  }
}

function writePersisted(value: PersistedUi): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* 存储不可用时仅影响偏好记忆，不影响功能 */
  }
}

const persisted = readPersisted();

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export const useUiStore = create<UiState>((set, get) => ({
  navCollapsed: persisted.navCollapsed ?? false,
  theme: persisted.theme ?? DEFAULT_THEME,
  currentTaskId: null,

  toggleNav() {
    const next = !get().navCollapsed;
    set({ navCollapsed: next });
    writePersisted({ navCollapsed: next, theme: get().theme });
  },

  setTheme(theme) {
    set({ theme });
    applyTheme(theme);
    writePersisted({ navCollapsed: get().navCollapsed, theme });
  },

  setCurrentTask(taskId) {
    set({ currentTaskId: taskId });
  },
}));

applyTheme(persisted.theme ?? DEFAULT_THEME);
