import React from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

export default function DragDropUpload({
  onUpload,
  label = '點擊或拖曳 Excel 檔案上傳',
}) {
  const props = {
    accept: '.xlsx,.xls',
    multiple: true,
    showUploadList: false,
    beforeUpload: (file, fileList) => {
      // 不自動上傳，手動處理
      if (fileList.indexOf(file) === fileList.length - 1) {
        onUpload(fileList);
      }
      return false;
    },
  };

  return (
    <Dragger {...props}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">{label}</p>
      <p className="ant-upload-hint">支援 .xlsx 和 .xls 格式</p>
    </Dragger>
  );
}
