import { create } from 'zustand';
import { api } from '@/api/client';
import { toApiError } from '@/api/errors';
import type { HealthInfo } from '@/api/types';

interface HealthState {
  health: HealthInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** 环境自检（FE-14，与后端 doctor / health 对接）：首屏给可读指引 */
export const useHealthStore = create<HealthState>((set) => ({
  health: null,
  loading: false,
  error: null,

  async refresh() {
    set({ loading: true });
    try {
      const health = await api.health();
      set({ health, loading: false, error: null });
    } catch (err) {
      set({ loading: false, error: toApiError(err).code });
    }
  },
}));
