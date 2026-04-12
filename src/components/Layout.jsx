import React, { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useData } from '../data/DataContext';
import { TAB_DEFINITIONS } from '../shared/constants';
import UserBar from './UserBar';
import FilterToolbar from './FilterToolbar';
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

export default function Layout() {
  const { authUser, userRole, logout, allowedTabs } = useAuth();
  const {
    availableMonths, selectedMonth, setSelectedMonth,
    dateFrom, setDateFrom, dateTo, setDateTo,
    loadData, isLoading, loadingMessage,
  } = useData();

  const [activeTab, setActiveTab] = useState(allowedTabs[0] || 'overview');

  const tabs = TAB_DEFINITIONS.filter(t => allowedTabs.includes(t.id));
  const PageComponent = PAGE_MAP[activeTab];

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>Fandora</h1>
          <span style={styles.subtitle}>人工時管理系統</span>
        </div>
        <UserBar user={authUser} role={userRole} onLogout={logout} />
      </header>

      <nav style={styles.nav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tabBtn,
              color: activeTab === tab.id ? '#00BCD4' : '#666',
              borderBottom: activeTab === tab.id ? '2px solid #00BCD4' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {activeTab !== 'settings' && (
          <FilterToolbar
            months={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onReload={loadData}
            onClearDates={() => { setDateFrom(''); setDateTo(''); }}
          />
        )}

        {isLoading ? (
          <div style={styles.loading}>
            <p>{loadingMessage || '載入中...'}</p>
          </div>
        ) : (
          PageComponent && <PageComponent />
        )}
      </main>
    </div>
  );
}

const styles = {
  layout: {
    minHeight: '100vh',
    background: '#f5f7fa',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    padding: '0 32px',
    height: 64,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    color: '#00BCD4',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  nav: {
    display: 'flex',
    background: '#fff',
    padding: '0 32px',
    borderBottom: '1px solid #e0e0e0',
  },
  tabBtn: {
    padding: '12px 24px',
    border: 'none',
    background: 'none',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  main: {
    padding: '24px 32px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: 48,
    color: '#666',
    fontSize: 16,
  },
};
