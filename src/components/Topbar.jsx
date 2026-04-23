import React from 'react';
import PopSelect from './PopSelect';
import Icon from './Icon';

/**
 * Sticky 64px topbar: title + month filter + sync chip + user chip.
 */
export default function Topbar({
  monthOptions, selectedMonth, onMonthChange,
  onReload, syncedAt,
  authUser, userRole, onLogout,
}) {
  const initials = (name) => {
    if (!name) return '?';
    const chars = Array.from(name.trim());
    return chars.slice(0, 2).join('').toUpperCase();
  };
  const syncLabel = syncedAt
    ? `同步於 ${new Date(syncedAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`
    : '尚未同步';

  return (
    <header className="topbar">
      <div className="topbar__title">
        <div className="topbar__heading">Fandora 人工時系統</div>
        <div className="topbar__sub">Workforce Hours · v2.3</div>
      </div>
      <div className="topbar__spacer" />

      <div className="filters">
        <PopSelect
          label="月份"
          value={selectedMonth}
          onSelect={onMonthChange}
          options={monthOptions}
          formatValue={v => v === 'all' ? '全部' : v}
        />
        <div className="sync-chip">
          <span className="sync-dot" />
          <span>{syncLabel}</span>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          title="重新載入"
          onClick={onReload}
        >
          <Icon name="refresh" size={15} />
        </button>
      </div>

      <div className="user-chip" onClick={onLogout} title="點擊登出">
        <span className="user-chip__avatar">
          {authUser?.picture
            ? <img src={authUser.picture} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : initials(authUser?.name)}
        </span>
        <div>
          <div className="user-chip__name">{authUser?.name || '訪客'}</div>
          <div className="user-chip__role">{userRole === 'admin' ? 'Admin' : 'Member'}</div>
        </div>
      </div>
    </header>
  );
}
