import React from 'react';
import KPICard from './KPICard';

export default function KPIGrid({ items }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}
    >
      {items.map((item, index) => (
        <KPICard key={index} label={item.label} value={item.value} unit={item.unit} />
      ))}
    </div>
  );
}
