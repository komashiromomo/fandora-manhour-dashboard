/**
 * V2 Layout — 來自 Fandora design bundle
 * - 左側欄（可收合）含品牌標識、分組導覽、使用者資訊
 * - 上方 header：crumb + 標題 + 即時同步指示 + 重新整理 + 收合鈕
 * - 內容區包 .content（沿用 design 的 content padding / hero-decor）
 * - 不再使用 Ant Design Layout / Tabs（避免雙套 chrome）
 */
import React, { useState } from 'react';
import { Spin, Dropdown, message } from 'antd';
import Icon from './Icon';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../data/DataContext';
import { useDataLoader } from '../data/useDataLoader';
import { useTheme } from './ThemeProvider';
import { ROLE_TABS } from '../config/constants';

// 把當前 dashboard 的 page id 對應到 design 的 nav 設計
const NAV_ITEMS = [
  { id: 'overview', label: '總覽', icon: 'home', section: 'analytics' },
  { id: 'projects', label: '專案', icon: 'project', section: 'analytics' },
  { id: 'workTypes', label: '工時類型', icon: 'worktype', section: 'analytics' },
  { id: 'employees', label: '人員', icon: 'employee', section: 'analytics' },
  { id: 'departments', label: '部門', icon: 'department', section: 'analytics' },
  { id: 'settings', label: '設定', icon: 'settings', section: 'system' },
];

const PAGE_TITLES = {
  overview: { title: '總覽', crumb: 'OVERVIEW' },
  projects: { title: '專案分析', crumb: 'PROJECTS' },
  workTypes: { title: '工時類型', crumb: 'WORK TYPES' },
  employees: { title: '人員分析', crumb: 'PEOPLE' },
  departments: { title: '部門分析', crumb: 'DEPARTMENTS' },
  settings: { title: '系統設定', crumb: 'SETTINGS' },
};

function Sidebar({ active, onNav, collapsed, onToggle, role, authUser, onLogout }) {
  const visibleIds = ROLE_TABS[role] || ROLE_TABS.member;
  const items = NAV_ITEMS.filter((n) => visibleIds.includes(n.id));
  const analytics = items.filter((n) => n.section === 'analytics');
  const system = items.filter((n) => n.section === 'system');

  const userMenu = {
    items: [
      { key: 'logout', icon: <Icon name="logout" size={14} />, label: '登出', onClick: onLogout },
    ],
  };

  const initial = (authUser?.name || authUser?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-brand-mark">F</div>
        {!collapsed && (
          <div className="sb-brand-text">
            <b>人工時系統</b>
            <small>FANDORA · V3</small>
          </div>
        )}
      </div>
      <nav className="sb-nav">
        {!collapsed && analytics.length > 0 && <div className="sb-section">分析</div>}
        {analytics.map((n) => (
          <div
            key={n.id}
            className={`sb-item ${active === n.id ? 'active' : ''}`}
            onClick={() => onNav(n.id)}
            title={n.label}
          >
            <span className="ic"><Icon name={n.icon} /></span>
            <span className="lbl">{n.label}</span>
          </div>
        ))}
        {!collapsed && system.length > 0 && <div className="sb-section">系統</div>}
        {system.map((n) => (
          <div
            key={n.id}
            className={`sb-item ${active === n.id ? 'active' : ''}`}
            onClick={() => onNav(n.id)}
            title={n.label}
          >
            <span className="ic"><Icon name={n.icon} /></span>
            <span className="lbl">{n.label}</span>
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <Dropdown menu={userMenu} trigger={['click']} placement="topLeft">
          <div className="sb-user" title={collapsed ? authUser?.email : '帳號選單'}>
            {authUser?.picture ? (
              <img
                src={authUser.picture}
                alt={authUser.name}
                className="sb-avatar"
                style={{ objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="sb-avatar">{initial}</div>
            )}
            <div className="sb-user-info">
              <b>{authUser?.name || authUser?.email || '未登入'}</b>
              <small>{role === 'admin' ? '管理員 · admin' : '一般成員 · member'}</small>
            </div>
          </div>
        </Dropdown>
        <div
          className="sb-item"
          onClick={onToggle}
          title="切換側欄"
          style={{ marginTop: 6, justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <span className="ic">
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
          </span>
          <span className="lbl">收合側欄</span>
        </div>
      </div>
    </aside>
  );
}

function formatRelative(ts) {
  if (!ts) return '尚未同步';
  const diff = Date.now() - ts;
  if (diff < 60_000) return '剛剛同步';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分鐘前同步`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小時前同步`;
  return `${Math.floor(diff / 86400_000)} 天前同步`;
}

function Header({ title, crumb, onCollapse, onRefresh }) {
  const { lastSyncedAt } = useData();
  return (
    <div className="header">
      <button className="icon-btn" onClick={onCollapse} title="切換側欄">
        <Icon name="chevronLeft" size={16} />
      </button>
      <div className="header-title">
        {crumb && <span className="crumb">{crumb}</span>}
        <h1>{title}</h1>
      </div>
      <div className="grow" />
      <div className="live-pulse" title={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : '尚未同步'}>
        {formatRelative(lastSyncedAt)}
      </div>
      <button
        className="icon-btn"
        title="複製目前檢視的連結（可分享給同事）"
        onClick={() => {
          navigator.clipboard
            .writeText(window.location.href)
            .then(() => message.success('已複製目前檢視的連結到剪貼簿'))
            .catch(() => message.error('複製失敗，請手動從網址列複製'));
        }}
      >
        <Icon name="upload" size={16} />
      </button>
      <button className="icon-btn" title="重新整理（強制重抓 Drive）" onClick={onRefresh}>
        <Icon name="refresh" size={16} />
      </button>
    </div>
  );
}

export default function Layout({ children, activeTab, onTabChange }) {
  const { authUser, role, logout } = useAuth();
  const { isLoading, loadingMessage } = useData();
  const { collapsed, setTweak } = useTheme();
  const { loadFromDrive } = useDataLoader();
  const [refreshKey, setRefreshKey] = useState(0);

  const meta = PAGE_TITLES[activeTab] || PAGE_TITLES.overview;

  return (
    <div className="app" data-collapsed={collapsed}>
      <Sidebar
        active={activeTab}
        onNav={onTabChange}
        collapsed={collapsed}
        onToggle={() => setTweak('collapsed', !collapsed)}
        role={role}
        authUser={authUser}
        onLogout={logout}
      />
      <div className="main">
        <Header
          title={meta.title}
          crumb={meta.crumb}
          onCollapse={() => setTweak('collapsed', !collapsed)}
          onRefresh={() => {
            setRefreshKey((k) => k + 1);
            // header refresh = 強制略過 cache 重抓（cache 預設 24 小時，這顆鈕讓 user 立即拿最新）
            loadFromDrive({ forceFresh: true });
          }}
        />
        <div className="content" key={refreshKey}>
          {children}
          {isLoading && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(11, 17, 31, 0.55)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
              }}
            >
              <Spin size="large" />
              {loadingMessage && (
                <p style={{ color: '#fff', marginTop: 16, fontSize: 14 }}>{loadingMessage}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
