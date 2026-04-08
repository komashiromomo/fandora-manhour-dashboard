import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DataProvider } from './data/DataContext';
import LoginScreen from './auth/LoginScreen';
import Layout from './components/Layout';

// Pages
import OverviewPage from './pages/OverviewPage';
import ProjectPage from './pages/ProjectPage';
import WorkTypePage from './pages/WorkTypePage';
import EmployeePage from './pages/EmployeePage';
import DepartmentPage from './pages/DepartmentPage';
import SettingsPage from './pages/SettingsPage';

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
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#f5f5f5',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, color: '#1a1a2e' }}>Fandora 人工時管理系統</h1>
        <p style={{ color: '#666', marginTop: 8 }}>載入中...</p>
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
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <PageComponent />
      </Layout>
    </DataProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
