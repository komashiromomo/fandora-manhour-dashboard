import React, { lazy, Suspense, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { TAB_DEFINITIONS } from '../shared/constants';
import { colors } from '../shared/styles';
import UserBar from './UserBar';

const pages = {
  overview: lazy(() => import('../pages/OverviewPage')),
  projects: lazy(() => import('../pages/ProjectPage')),
  workTypes: lazy(() => import('../pages/WorkTypePage')),
  employees: lazy(() => import('../pages/EmployeePage')),
  departments: lazy(() => import('../pages/DepartmentPage')),
  settings: lazy(() => import('../pages/SettingsPage')),
};

export default function Layout() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const allowedTabs = TAB_DEFINITIONS.filter((tab) =>
    auth.allowedTabs?.includes(tab.id)
  );

  const ActivePage = pages[activeTab];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      {/* Header */}
      <header
        style={{
          background: colors.white,
          borderBottom: `1px solid ${colors.border}`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
            Fandora
          </span>
          <span style={{ fontSize: 14, color: colors.textMuted }}>人工時管理系統</span>
        </div>
        <UserBar user={auth.user} role={auth.role} onLogout={auth.logout} />
      </header>

      {/* Tab Navigation */}
      <nav
        style={{
          background: colors.white,
          borderBottom: `1px solid ${colors.border}`,
          padding: '0 24px',
          display: 'flex',
        }}
      >
        {allowedTabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: 14,
              color: activeTab === tab.id ? colors.primary : colors.textSecondary,
              borderBottom:
                activeTab === tab.id ? `2px solid ${colors.primary}` : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {tab.label}
          </div>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: 24, minHeight: 'calc(100vh - 120px)' }}>
        <Suspense
          fallback={
            <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>
              載入中...
            </div>
          }
        >
          {ActivePage ? <ActivePage /> : null}
        </Suspense>
      </main>
    </div>
  );
}
