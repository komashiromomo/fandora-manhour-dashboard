import React from 'react';
import { Table } from 'antd';

export default function DataTable({ columns, dataSource, rowKey, ...rest }) {
  return (
    <div style={styles.wrapper}>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        pagination={{ pageSize: 50, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
        size="small"
        {...rest}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    background: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: 24,
  },
};
