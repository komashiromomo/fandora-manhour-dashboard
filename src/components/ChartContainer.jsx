import React from 'react';
import { ResponsiveContainer } from 'recharts';

export default function ChartContainer({ title, children, height = 300 }) {
  return (
    <div style={styles.container}>
      {title && <h3 style={styles.title}>{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  container: {
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    margin: '0 0 16px',
  },
};
