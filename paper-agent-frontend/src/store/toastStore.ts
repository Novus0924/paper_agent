import { create } from 'zustand';
import type { ApiError } from '@/api/errors';
import type { MsgKey } from '@/i18n';

export type ToastTone = 'info' | 'ok' | 'warn' | 'fail';

export interface Toast {
  id: string;
  /** 文案键（错误时指向 errors.* 键，保证人类可读） */
  key: MsgKey;
  vars?: Record<string, string | number>;
  tone: ToastTone;
  /** 可选的下一步动作，由视图渲染为按钮 */
  action?: { labelKey: MsgKey; run: () => void };
}

interface ToastState {
  toasts: Toast[];
  push: (key: MsgKey, tone?: ToastTone, vars?: Record<string, string | number>) => string;
  pushError: (err: ApiError, action?: Toast['action']) => string;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => {
  /** 两条入口（普通提示 / 错误）共用的入队逻辑：生成 id、追加、到点自动 dismiss */
  function show(toast: Omit<Toast, 'id'>, ttlMs: number): string {
    const id = `toast-${(counter += 1)}`;
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }));
    window.setTimeout(() => get().dismiss(id), ttlMs);
    return id;
  }
  return {
    toasts: [],
    push(key, tone = 'info', vars) {
      return show({ key, tone, vars }, 4200);
    },
    pushError(err, action) {
      // 错误停留更久，方便读到下一步动作
      return show(
        {
          key: err.messageKey,
          tone: err.retryable ? 'warn' : 'fail',
          vars: { reason: err.message },
          action,
        },
        7000,
      );
    },
    dismiss(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
  };
});
