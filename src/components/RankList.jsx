import React from 'react';
import { fmtHours, fmtCompact } from '../shared/format';

/**
 * Ranked list with progress bars.
 * items: [{ name, hours, cost?, id? }]
 * selectedName: highlight a row
 * onSelect: optional click handler
 * showCost: whether to render cost below value
 * simpleLayout: use 28px|1fr|bar|value columns (Overview) instead of
 *               28px|1fr with nested bar (AnalysisView left pane)
 */
export default function RankList({
  items,
  max,
  selectedName,
  onSelect,
  showCost,
  simpleLayout = true,
}) {
  if (!items || !items.length) return null;
  const topMax = max ?? Math.max(1, ...items.map(i => i.hours));

  if (simpleLayout) {
    return (
      <div className="rank">
        {items.map((it, i) => (
          <div
            key={it.id || it.name}
            className={'rank__row' + (selectedName === it.name ? ' rank__row--selected' : '')}
            onClick={() => onSelect && onSelect(it.name)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          >
            <span className="rank__num">{String(i + 1).padStart(2, '0')}</span>
            <span className="rank__name">{it.name}</span>
            <span className="rank__bar">
              <span
                className="rank__bar-fill"
                style={{ width: `${(it.hours / topMax) * 100}%` }}
              />
            </span>
            <span className="rank__value">
              {fmtHours(it.hours)}
              <span className="muted" style={{ fontSize: 10, marginLeft: 3 }}>h</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Layered layout for analysis left pane (name above, bar below, value on right)
  return (
    <div className="rank">
      {items.map((it, i) => (
        <div
          key={it.id || it.name}
          className={'rank__row' + (selectedName === it.name ? ' rank__row--selected' : '')}
          onClick={() => onSelect && onSelect(it.name)}
          style={{ gridTemplateColumns: '28px 1fr auto', cursor: onSelect ? 'pointer' : 'default' }}
        >
          <span className="rank__num">{String(i + 1).padStart(2, '0')}</span>
          <div style={{ minWidth: 0 }}>
            <div className="rank__name">{it.name}</div>
            <div style={{ marginTop: 4 }}>
              <span className="rank__bar">
                <span
                  className="rank__bar-fill"
                  style={{ width: `${(it.hours / topMax) * 100}%` }}
                />
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="rank__value">
              {fmtHours(it.hours)}
              <span className="muted" style={{ fontSize: 10, marginLeft: 3 }}>h</span>
            </div>
            {showCost && (
              <div className="muted num-tight" style={{ fontSize: 11, marginTop: 3 }}>
                ${fmtCompact(it.cost || 0)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
