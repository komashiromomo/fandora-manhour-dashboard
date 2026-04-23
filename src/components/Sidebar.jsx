import React from 'react';
import Icon from './Icon';

/**
 * Left navigation rail. Collapses to 68px via html[data-sidebar="collapsed"].
 */
export default function Sidebar({ tabs, activeTab, onTabChange, collapsed, onToggleCollapsed }) {
  const analytics = tabs.filter(t => t.id !== 'settings');
  const settings = tabs.find(t => t.id === 'settings');

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark">F</div>
        <div className="brand__text">
          <div className="brand__name">Fandora</div>
          <div className="brand__sub">人工時系統</div>
        </div>
      </div>

      <nav className="nav">
        {analytics.length > 0 && <div className="nav__section">Analytics</div>}
        {analytics.map(tab => (
          <button
            key={tab.id}
            className={'nav__item' + (activeTab === tab.id ? ' nav__item--active' : '')}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="nav__icon"><Icon name={tab.icon} size={16} /></span>
            <span className="nav__label">{tab.label}</span>
          </button>
        ))}

        {settings && (
          <>
            <div className="nav__section">System</div>
            <button
              className={'nav__item' + (activeTab === settings.id ? ' nav__item--active' : '')}
              onClick={() => onTabChange(settings.id)}
            >
              <span className="nav__icon"><Icon name={settings.icon} size={16} /></span>
              <span className="nav__label">{settings.label}</span>
            </button>
          </>
        )}
      </nav>

      <div className="sidebar__foot">
        <button className="sidebar__toggle" onClick={onToggleCollapsed}>
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
          <span className="nav__label">收起側欄</span>
        </button>
      </div>
    </aside>
  );
}
