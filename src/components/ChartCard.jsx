import React from 'react';
import { Card, Empty, Spin } from 'antd';

export default function ChartCard({
  title,
  loading,
  empty,
  children,
  style,
}) {
  return (
    <Card
      title={title}
      style={{
        marginBottom: 16,
        ...style,
      }}
      bordered={false}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : empty ? (
        <Empty description="暫無資料" />
      ) : (
        children
      )}
    </Card>
  );
}
