import React from 'react';
import { ResponsiveContainer } from 'recharts';

export default function ChartContainer({ title, children, height = 300 }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {title && (
        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>{title}</div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
