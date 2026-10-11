import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { NewTaskPage } from '@/pages/NewTaskPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { MonitorPage } from '@/pages/MonitorPage';
import { ReportPage } from '@/pages/ReportPage';
import { EvidencePage } from '@/pages/EvidencePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { useTaskStore } from '@/store/taskStore';

/**
 * 路由表与页面外壳（§4.2 六条路由）。
 * 任务列表在应用级拉取一次：直接深链进 /monitor/:id 时侧栏历史同样可用。
 */
export function App() {
  const loadTasks = useTaskStore((s) => s.loadTasks);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* 总览就是首页；§4.3 允许的 /overview 写法的只是语义名，归一到 "/" 一份真相 */}
        <Route index element={<OverviewPage />} />
        <Route path="overview" element={<Navigate to="/" replace />} />
        <Route path="new" element={<NewTaskPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="monitor/:id" element={<MonitorPage />} />
        <Route path="report/:id" element={<ReportPage />} />
        <Route path="evidence/:id" element={<EvidencePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
