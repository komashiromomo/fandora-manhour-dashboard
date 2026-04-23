import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { useData } from '../data/DataContext';
import { TAB_DEFINITIONS, CACHE_KEY_DATE } from '../shared/constants';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ControlBar from './ControlBar';
import OverviewPage from '../pages/OverviewPage';
import ProjectPage from '../pages/ProjectPage';
import WorkTypePage from '../pages/WorkTypePage';
import EmployeePage from '../pages/EmployeePage';
import DepartmentPage from '../pages/DepartmentPage';
import SettingsPage from '../pages/SettingsPage';

const PAGE_MAP = {
  overview: OverviewPage,
  projects: ProjectPage,
  workTypes: WorkTypePage,
  employees: EmployeePage,
  departments: DepartmentPage,
  settings: SettingsPage,
};

const LS_SIDEBAR = 'hr_sidebar';
const LS_TAB = 'hr_tab';

export default function Layout() {
  const { authUser, userRole, logout, allowedTabs } = useAuth();
  const {
    availableMonths, selectedMonth, setSelectedMonth,
    loadData, isLoading, loadingMessage,
  } = useData();

  const [activeTab, setActiveTab] = useState(() => {
    const cached = localStorage.getItem(LS_TAB);
    if (cached && allowedTabs.includes(cached)) return cached;
    return allowedTabs[0] || 'overview';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(LS_SIDEBAR) === 'collapsed';
  });

  // Apply layout tweaks to <html>
  useEffect(() => {
    document.documentElement.dataset.sidebar = sidebarCollapsed ? 'collapsed' : 'expanded';
    localStorage.setItem(LS_SIDEBAR, sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  useEffect(() => {
    document.documentElement.dataset.palette = 'cool';
    document.documentElement.dataset.density = 'cozy';
  }, []);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem(LS_TAB, activeTab);
  }, [activeTab]);

  const tabs = useMemo(
    () => TAB_DEFINITIONS.filter(t => allowedTabs.includes(t.id)),
    [allowedTabs]
  );
  const activeDef = tabs.find(t => t.id === activeTab) || tabs[0];
  const PageComponent = PAGE_MAP[activeTab];

  const monthOptions = useMemo(() => [
    { value: 'all', label: '全部月份' },
    ...availableMonths.slice().reverse().map(m => ({ value: m, label: m })),
  ], [availableMonths]);

  const [syncedAt, setSyncedAt] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY_DATE); } catch { return null; }
  });
  useEffect(() => {
    if (!isLoading) {
      try { setSyncedAt(localStorage.getItem(CACHE_KEY_DATE)); } catch {}
    }
  }, [isLoading]);

  return (
    <div className="app" data-screen-label={activeDef?.label}>
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
      />

      <div className="main">
        <Topbar
          monthOptions={monthOptions}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onReload={loadData}
          syncedAt={syncedAt}
          authUser={authUser}
          userRole={userRole}
          onLogout={logout}
        />

        {activeDef && (
          <ControlBar
            eyebrow={activeDef.eyebrow}
            title={activeDef.title}
            desc={activeDef.desc}
            showExport={activeTab !== 'settings'}
          />
        )}

        <div className="content">
          {isLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 14, color: 'var(--fd-gray-700)' }}>
                {loadingMessage || '載入中…'}
              </div>
            </div>
          ) : (
            PageComponent && <PageComponent />
          )}
        </div>
      </div>
    </div>
  );
}
