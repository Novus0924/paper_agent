import { Outlet } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import { useI18n } from '@/i18n';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { ToastStack } from '@/components/ui/ToastStack';
import { HealthBanner } from '@/components/common/HealthBanner';

/** 应用外壳：左侧持久导航 + 顶部上下文栏 + 主内容区（§4.2） */
export function AppShell() {
  const { t } = useI18n();
  return (
    <div className={layout.app}>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <Sidebar />
      {/* 这里是 div 而不是 section：无名 <section> 是分界内容，会让里面的 <header> 退化成 generic，
          顶栏的标题和状态徽章就掉出所有地标（axe 的 region 规则扫出来的正是它）。div 下 header 才是 banner。 */}
      <div className={layout.main}>
        <Topbar />
        {/* tabIndex=-1 是"跳到主内容"能真的把焦点交出来的前提：main 默认可聚焦不了 */}
        <main className={layout.scrollArea} id="main" tabIndex={-1}>
          <HealthBanner />
          <Outlet />
        </main>
      </div>
      <ToastStack />
      <CommandPalette />
    </div>
  );
}
