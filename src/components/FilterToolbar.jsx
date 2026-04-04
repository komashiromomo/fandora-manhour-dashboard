import React from 'react';

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #e0e0e0',
  fontSize: 14,
  outline: 'none',
};

export default function FilterToolbar({
  months,
  selectedMonth,
  onMonthChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onReload,
  onClearDates,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        background: '#ffffff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <select
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        style={inputStyle}
      >
        <option value="all">全部</option>
        {(months || []).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <span style={{ fontSize: 14, color: '#666' }}>從</span>
      <input
        type="date"
        value={dateFrom || ''}
        onChange={(e) => onDateFromChange(e.target.value)}
        style={inputStyle}
      />

      <span style={{ fontSize: 14, color: '#666' }}>到</span>
      <input
        type="date"
        value={dateTo || ''}
        onChange={(e) => onDateToChange(e.target.value)}
        style={inputStyle}
      />

      <button
        onClick={onReload}
        style={{
          padding: '8px 16px',
          background: '#00BCD4',
          color: '#ffffff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        重新載入
      </button>

      <button
        onClick={onClearDates}
        style={{
          padding: '8px 16px',
          background: 'transparent',
          color: '#00BCD4',
          border: '1px solid #00BCD4',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        清除日期
      </button>
    </div>
  );
}
