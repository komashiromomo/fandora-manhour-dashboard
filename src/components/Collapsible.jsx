import React, { useState } from 'react';

export default function Collapsible({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <span style={styles.title}>{title}</span>
        <span style={styles.arrow}>{isOpen ? '\u25B2' : '\u25BC'}</span>
      </div>
      <div style={{
        ...styles.content,
        maxHeight: isOpen ? 5000 : 0,
        padding: isOpen ? '0 16px 16px' : '0 16px',
      }}>
        {children}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#fff',
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    cursor: 'pointer',
    userSelect: 'none',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  arrow: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    overflow: 'hidden',
    transition: 'max-height 0.5s ease, padding 0.3s ease',
  },
};
