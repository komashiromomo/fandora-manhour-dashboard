import React from 'react';

export default function UserBar({ user, role, onLogout }) {
  if (!user) return null;
  return (
    <div style={styles.bar}>
      {user.picture && (
        <img src={user.picture} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
      )}
      <span style={styles.name}>{user.name}</span>
      <span style={{
        ...styles.badge,
        background: role === 'admin' ? '#00BCD4' : '#e0e0e0',
        color: role === 'admin' ? '#fff' : '#666',
      }}>
        {role}
      </span>
      <button onClick={onLogout} style={styles.logout}>登出</button>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
  },
  name: {
    fontSize: 14,
    color: '#333',
  },
  badge: {
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 10,
    fontWeight: 500,
  },
  logout: {
    fontSize: 13,
    color: '#999',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
  },
};
