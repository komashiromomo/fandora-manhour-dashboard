import React from 'react';
import { Table } from 'antd';

export default function DataTable({
  columns,
  dataSource,
  rowKey,
  pagination,
  ...rest
}) {
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey={rowKey || ((_, i) => i)}
      pagination={
        pagination !== false
          ? {
            pageSize: 20,
            showSizeChanger: true,
            showTotal: t => `共 ${t} 筆`,
          }
          : false
      }
      size="small"
      scroll={{ x: 'max-content' }}
      {...rest}
    />
  );
}
