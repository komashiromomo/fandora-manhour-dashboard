import React from 'react';
import { fmtHours } from '../shared/format';

/**
 * Clickable monthly bar chart. Click a bar to filter to that month;
 * click the same month again to clear back to "all".
 * data: [{ month: "YYYY-MM", hours: number }]
 */
export default function MonthBars({ data, selectedMonth, onSelect, height = 180 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.hours), 1);
  return (
    <div className="monthbars" style={{ height }}>
      {data.map(d => {
        const h = Math.max((d.hours / max) * (height - 24), 4);
        const selected = d.month === selectedMonth;
        return (
          <div
            key={d.month}
            className={'monthbars__col' + (selected ? ' monthbars__col--selected' : '')}
            onClick={() => onSelect && onSelect(selected ? 'all' : d.month)}
          >
            <span className="monthbars__val">{fmtHours(d.hours)}h</span>
            <div className="monthbars__bar" style={{ height: `${h}px` }} />
            <span className="monthbars__label">{d.month.slice(2).replace('-', '/')}</span>
          </div>
        );
      })}
    </div>
  );
}
