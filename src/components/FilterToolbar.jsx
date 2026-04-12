import React from 'react';

export default function FilterToolbar({
  months = [],
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
    <div style={styles.bar}>
      <select
        value={selectedMonth}
        onChange={e => onMonthChange(e.target.value)}
        style={styles.select}
      >
        <option value="all">全部月份</option>
        {months.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <input
        type="date"
        value={dateFrom}
        onChange={e => onDateFromChange(e.target.value)}
        style={styles.input}
      />
      <span style={{ color: '#999' }}>~</span>
      <input
        type="date"
        value={dateTo}
        onChange={e => onDateToChange(e.target.value)}
        style={styles.input}
      />

      <button onClick={onReload} style={styles.primaryBtn}>重新載入</button>
      <button onClick={onClearDates} style={styles.secondaryBtn}>清除日期</button>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    background: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  select: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #d9d9d9',
    fontSize: 14,
    outline: 'none',
  },
  input: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #d9d9d9',
    fontSize: 14,
    outline: 'none',
  },
  primaryBtn: {
    padding: '6px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#00BCD4',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '6px 16px',
    borderRadius: 6,
    border: '1px solid #d9d9d9',
    background: '#fff',
    color: '#666',
    fontSize: 14,
    cursor: 'pointer',
  },
};
