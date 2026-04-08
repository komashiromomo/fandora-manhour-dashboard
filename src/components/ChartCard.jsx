import React from 'react';
import { Card, Empty, Spin } from 'antd';

export default function ChartCard({
  title,
  loading,
  isEmpty,
  empty,
  children,
  style,
  height,
}) {
  const isEmptyState = isEmpty || empty;

  return (
    <Card
      title={title}
      style={{ marginBottom: 16, ...style }}
      bordered={false}
    >
      {loading ? (
        <div style={{ height: height || 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin />
        </div>
      ) : isEmptyState ? (
        <div style={{ height: height || 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="暫無資料" />
        </div>
      ) : (
        <div style={height ? { height } : undefined}>{children}</div>
      )}
    </Card>
  );
}
