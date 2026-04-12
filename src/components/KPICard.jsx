import React from 'react';

export default function KPICard({ label, value, unit }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.valueRow}>
        <span style={styles.value}>{displayValue}</span>
        {unit && <span style={styles.unit}>{unit}</span>}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 16,
    borderLeft: '4px solid #00BCD4',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  label: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: 700,
    color: '#333',
  },
  unit: {
    fontSize: 12,
    color: '#999',
  },
};
