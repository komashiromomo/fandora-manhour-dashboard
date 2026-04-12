import React, { useRef, useState } from 'react';

export default function DragDropUpload({ onFiles, accept, label = '拖拽或點擊上傳檔案' }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      style={{
        ...styles.zone,
        borderColor: isDragging ? '#00BCD4' : '#ccc',
        background: isDragging ? 'rgba(0,188,212,0.05)' : '#fafafa',
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        multiple
      />
      <p style={styles.label}>{label}</p>
    </div>
  );
}

const styles = {
  zone: {
    border: '2px dashed #ccc',
    borderRadius: 8,
    padding: 40,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  label: {
    color: '#999',
    fontSize: 14,
    margin: 0,
  },
};
