import React from 'react';
import { Table } from 'antd';

export default function DataTable({ columns, dataSource, rowKey, ...rest }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: 8, overflow: 'hidden' }}>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        size="middle"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
        {...rest}
      />
    </div>
  );
}
