import { create } from 'zustand';
import type { MsgKey } from '@/i18n';

/** 通知来源：任务终态 / 降级 / 创建 / 归档（FE-18） */
export type NotificationKind = 'done' | 'failed' | 'degraded' | 'created' | 'archived';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  titleKey: MsgKey;
  vars?: Record<string, string | number>;
  ts: string;
  read: boolean;
  /** 可点击跳转的目标路由（报告 / 监控） */
  to?: string;
}

interface NotificationState {
  items: NotificationItem[];
  push: (input: Omit<NotificationItem, 'id' | 'ts' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const STORAGE_KEY = 'paper-agent-frontend.notifications';
const MAX_ITEMS = 50;

function readItems(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as NotificationItem[]).filter(
      (x) => x && typeof x.id === 'string' && typeof x.titleKey === 'string',
    );
  } catch {
    return [];
  }
}

function writeItems(items: NotificationItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* 存储不可用只影响持久化，不影响本次会话的通知 */
  }
}

let counter = 0;

/** 未读数：面板徽章的单一数据源 */
export function unreadCount(items: NotificationItem[]): number {
  return items.reduce((n, it) => (it.read ? n : n + 1), 0);
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: readItems(),

  push(input) {
    const item: NotificationItem = {
      id: `notif-${Date.now()}-${(counter += 1)}`,
      ts: new Date().toISOString(),
      read: false,
      ...input,
    };
    // FIFO：超出上限丢掉最旧的一条
    const items = [item, ...get().items].slice(0, MAX_ITEMS);
    set({ items });
    writeItems(items);
  },

  markRead(id) {
    const items = get().items.map((it) => (it.id === id ? { ...it, read: true } : it));
    set({ items });
    writeItems(items);
  },

  markAllRead() {
    const items = get().items.map((it) => (it.read ? it : { ...it, read: true }));
    set({ items });
    writeItems(items);
  },

  clear() {
    set({ items: [] });
    writeItems([]);
  },
}));
