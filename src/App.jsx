import React, { useEffect, useRef, useState } from 'react';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DataProvider, useData } from './data/DataContext';
import { useDataLoader } from './data/useDataLoader';
import LoginScreen from './auth/LoginScreen';
import Layout from './components/Layout';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import TweaksPanel from './components/TweaksPanel';
import WeeklyMisrecordReminder from './components/WeeklyMisrecordReminder';

// Pages
import OverviewPage from './pages/OverviewPage';
import ProjectPage from './pages/ProjectPage';
import WorkTypePage from './pages/WorkTypePage';
import EmployeePage from './pages/EmployeePage';
import DepartmentPage from './pages/DepartmentPage';
import SettingsPage from './pages/SettingsPage';

/** 認證 + Drive token 都備齊且尚無資料時，自動拉一次 Drive；
 *  接著按 Tweaks.autoSyncMinutes 設定，背景定期 silent reload */
function AutoLoader() {
  const { workLogs } = useData();
  const { accessToken } = useAuth();
  const { loadFromDrive } = useDataLoader();
  const { autoSyncMinutes } = useTheme();
  const triggered = useRef(false);

  // 首次：未登入過 / 還沒資料 → 立刻拉一次
  useEffect(() => {
    if (!accessToken || triggered.current) return;
    if (workLogs.length > 0) return;
    triggered.current = true;
    loadFromDrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // 半自動：按 autoSyncMinutes 在背景定期 silent reload
  useEffect(() => {
    if (!accessToken) return;
    if (!autoSyncMinutes || autoSyncMinutes <= 0) return;
    const interval = setInterval(
      () => {
        console.info(`[autoSync] background sync (every ${autoSyncMinutes} min)`);
        loadFromDrive({ silent: true });
      },
      autoSyncMinutes * 60 * 1000
    );
    return () => clearInterval(interval);
  }, [accessToken, autoSyncMinutes, loadFromDrive]);

  return null;
}


const PAGE_MAP = {
  overview: OverviewPage,
  projects: ProjectPage,
  workTypes: WorkTypePage,
  employees: EmployeePage,
  departments: DepartmentPage,
  settings: SettingsPage,
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>系統發生錯誤</h2>
          <p style={{ color: '#999' }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>重新載入</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen() {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        height: '100vh',
        background: 'var(--bg-page-alt, #F2F5FA)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 20px',
            borderRadius: 14,
            background: 'var(--accent, #00A4C6)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-numeric)',
            fontWeight: 800,
            fontSize: 24,
            boxShadow: 'var(--shadow-brand)',
            animation: 'pulse 2s infinite',
          }}
        >
          F
        </div>
        <div style={{ fontSize: 14, color: 'var(--fg-3, #595959)' }}>載入中…</div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginScreen />;

  const PageComponent = PAGE_MAP[activeTab] || OverviewPage;

  return (
    <DataProvider>
      <AutoLoader />
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <PageComponent />
      </Layout>
      <TweaksPanel />
      <WeeklyMisrecordReminder />
    </DataProvider>
  );
}

// Ant Design v5 token，把 Fandora cyan 作為 primary 顏色注入
const ANTD_THEME = {
  token: {
    colorPrimary: '#00A4C6',
    colorInfo: '#00A4C6',
    colorSuccess: '#2BB673',
    colorWarning: '#F2994A',
    colorError: '#E14D4D',
    colorTextBase: '#0B111F',
    colorBgBase: '#FFFFFF',
    borderRadius: 10,
    fontFamily:
      '"Noto Sans TC", "Noto Sans", "Microsoft JhengHei", "PingFang TC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Button: { borderRadius: 10, controlHeight: 36 },
    Card: { borderRadiusLG: 14 },
  },
};

export default function App() {
  return (
    <ConfigProvider locale={zhTW} theme={ANTD_THEME}>
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </ConfigProvider>
  );
}
