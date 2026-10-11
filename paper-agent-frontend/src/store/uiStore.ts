import { create } from 'zustand';
import { api } from '@/api/client';

export type DemoSpeed = 'normal' | 'fast';
/** 主题只切换 tokens 的变量块，不改任何组件样式（§5.1 多主题预留） */
export type ThemeMode = 'light' | 'dark';

interface UiState {
  navCollapsed: boolean;
  speed: DemoSpeed;
  theme: ThemeMode;
  /** 顶部上下文栏显示"当前任务"，由监控/报告/证据页写入 */
  currentTaskId: string | null;
  toggleNav: () => void;
  setSpeed: (speed: DemoSpeed) => void;
  setTheme: (theme: ThemeMode) => void;
  setCurrentTask: (taskId: string | null) => void;
}

const STORAGE_KEY = 'paper-agent-frontend.ui';

interface PersistedUi {
  navCollapsed?: boolean;
  speed?: DemoSpeed;
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
  speed: persisted.speed ?? 'normal',
  theme: persisted.theme ?? 'light',
  currentTaskId: null,

  toggleNav() {
    const next = !get().navCollapsed;
    set({ navCollapsed: next });
    writePersisted({ navCollapsed: next, speed: get().speed, theme: get().theme });
  },

  setSpeed(speed) {
    set({ speed });
    writePersisted({ navCollapsed: get().navCollapsed, speed, theme: get().theme });
    // 只影响演示推进节奏；Live 模式下该控件不渲染
    api.demo?.setSpeed(speed === 'fast' ? 20 : 1);
  },

  setTheme(theme) {
    set({ theme });
    applyTheme(theme);
    writePersisted({ navCollapsed: get().navCollapsed, speed: get().speed, theme });
  },

  setCurrentTask(taskId) {
    set({ currentTaskId: taskId });
  },
}));

// 刷新后要恢复上次的演示节奏：getSpeed 与 setSpeed 都作用于同一 runtime 单例，
// 否则 UI 显示"快进"但 Mock 仍按 1× 推进（持久化偏好与实际行为不一致）。
if (persisted.speed === 'fast') api.demo?.setSpeed(20);

applyTheme(persisted.theme ?? 'light');
