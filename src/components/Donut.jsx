import React from 'react';
import { CHART_COLORS } from '../shared/constants';
import { fmtCompact } from '../shared/format';

/**
 * SVG donut chart with legend.
 * data: [{ name, value, color? }]
 */
export default function Donut({ data, size = 140, thickness = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut">
      <svg className="donut__svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2},${size / 2}) rotate(-90)`}>
          <circle r={r} fill="none" stroke="var(--fd-gray-100)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * c;
            const seg = (
              <circle
                key={d.name}
                r={r}
                fill="none"
                stroke={d.color || CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text x="50%" y="48%" textAnchor="middle" fontFamily="var(--font-numeric)" fontWeight="700" fontSize="22" fill="var(--fd-ink)" dy=".35em">
          {fmtCompact(total)}
        </text>
        <text x="50%" y="62%" textAnchor="middle" fontSize="10" fill="var(--fd-gray-500)" letterSpacing=".1em">TOTAL</text>
      </svg>
      <div className="donut__legend">
        {data.map((d, i) => (
          <div key={d.name} className="donut__item">
            <span
              className="donut__swatch"
              style={{ background: d.color || CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="donut__name">{d.name}</span>
            <span className="donut__val">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
