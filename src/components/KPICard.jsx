import React from 'react';
import { Card, Statistic } from 'antd';

export default function KPICard({
  title,
  value,
  suffix,
  prefix,
  precision = 0,
  loading,
  style,
}) {
  return (
    <Card
      size="small"
      style={{
        flex: 1,
        minWidth: 160,
        ...style,
      }}
      bordered={false}
    >
      <Statistic
        title={title}
        value={value}
        suffix={suffix}
        prefix={prefix}
        precision={precision}
        loading={loading}
        valueStyle={{ fontSize: 20, fontWeight: 600 }}
      />
    </Card>
  );
}
