import React, { useState } from 'react';

export default function Collapsible({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(0,188,212,0.1)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>{title}</span>
        <span style={{ fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      <div
        style={{
          overflow: 'hidden',
          maxHeight: isOpen ? 2000 : 0,
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}
