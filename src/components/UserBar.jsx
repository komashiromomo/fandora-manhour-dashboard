import React, { useState } from 'react';

export default function UserBar({ user, role, onLogout }) {
  const [logoutHover, setLogoutHover] = useState(false);

  const isAdmin = role === 'admin';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {user?.picture && (
        <img
          src={user.picture}
          alt={user.name}
          style={{ width: 32, height: 32, borderRadius: '50%' }}
        />
      )}
      <span style={{ fontSize: 14 }}>{user?.name}</span>
      <span
        style={{
          fontSize: 12,
          padding: '2px 8px',
          borderRadius: 12,
          background: isAdmin ? '#00BCD4' : '#e0e0e0',
          color: isAdmin ? '#ffffff' : '#666',
        }}
      >
        {role}
      </span>
      <button
        onClick={onLogout}
        onMouseEnter={() => setLogoutHover(true)}
        onMouseLeave={() => setLogoutHover(false)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          color: logoutHover ? '#e53935' : '#999',
        }}
      >
        登出
      </button>
    </div>
  );
}
