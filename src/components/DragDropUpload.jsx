import React, { useRef, useState } from 'react';

export default function DragDropUpload({ onFiles, accept, label = '拖拽或點擊上傳檔案' }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? '#00BCD4' : '#e0e0e0'}`,
        borderRadius: 8,
        padding: 40,
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragging ? 'rgba(0,188,212,0.05)' : 'transparent',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div style={{ color: '#999', fontSize: 14 }}>{label}</div>
    </div>
  );
}
