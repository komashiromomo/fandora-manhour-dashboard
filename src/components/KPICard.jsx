import React from 'react';

export default function KPICard({ label, value, unit }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderLeft: '4px solid #00BCD4',
        borderRadius: 8,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#999', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 'bold', color: '#333' }}>{value}</span>
        <span style={{ fontSize: 12, color: '#999' }}>{unit}</span>
      </div>
    </div>
  );
}
