import React from 'react';
import KPICard from './KPICard';

export default function KPIGrid({ items }) {
  return (
    <div style={styles.grid}>
      {items.map((item, i) => (
        <KPICard key={i} label={item.label} value={item.value} unit={item.unit} />
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
};
