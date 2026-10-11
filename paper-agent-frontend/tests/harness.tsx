import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { emptyRuntime, type TaskRuntimeState } from '@/api/normalize';
import { App } from '@/app/App';
import { I18nProvider } from '@/i18n';
import { ToastStack } from '@/components/ui/ToastStack';
import { __resetTaskSubscriptions, useTaskStore } from '@/store/taskStore';
import { useToastStore } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';

/** 渲染真实路由入口：整条链路（外壳 + 导航 + 健康横幅 + 页面）都参与测试 */
export function renderApp(at: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[at]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  );
}

/** 渲染被测页面/组件：带上文案、路由（含 :id 参数）与全局 Toast 三个上下文 */
export function renderAt(
  ui: ReactElement,
  { at, pattern = at }: { at: string; pattern?: string },
) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path={pattern} element={ui} />
        </Routes>
      </MemoryRouter>
      <ToastStack />
    </I18nProvider>,
  );
}

/** 每个用例都从干净的状态开始，避免 store 与订阅串扰 */
export function resetStores(): void {
  __resetTaskSubscriptions();
  useTaskStore.setState({
    tasks: [],
    listLoading: false,
    listError: null,
    byId: {},
    preflight: null,
    preflightLoading: false,
  });
  useToastStore.setState({ toasts: [] });
  useUiStore.setState({ currentTaskId: null });
}

/** 直接把某个任务的运行时状态写进 store，用于只针对渲染层的用例 */
export function seedTask(taskId: string, patch: Partial<TaskRuntimeState> = {}): void {
  useTaskStore.setState((s) => ({
    byId: {
      ...s.byId,
      [taskId]: {
        ...emptyRuntime(null),
        loaded: true,
        loading: false,
        error: null,
        connection: 'online',
        evidence: null,
        report: null,
        lastFetchedAt: null,
        ...patch,
      },
    },
  }));
}
