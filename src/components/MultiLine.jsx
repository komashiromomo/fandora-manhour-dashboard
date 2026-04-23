import React from 'react';
import { CHART_COLORS } from '../shared/constants';

/**
 * Multi-series line chart — grid lines + 2px strokes + 2.5px dots.
 * data: [{ month, [seriesKey]: number, ... }], series: [key1, key2, ...]
 */
export default function MultiLine({ data, series, height = 200 }) {
  if (!data?.length || !series?.length) return null;

  const width = 640;
  const padL = 36;
  const padR = 16;
  const padT = 10;
  const padB = 28;
  const w = width - padL - padR;
  const h = height - padT - padB;

  let max = 0;
  series.forEach(s => data.forEach(d => { if (d[s] > max) max = d[s]; }));
  max = Math.ceil(max / 50) * 50 || 10;

  const xAt = (i) => padL + (data.length <= 1 ? w / 2 : (i * w) / (data.length - 1));
  const yAt = (v) => padT + h - (v / max) * h;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: padT + h - t * h,
    val: Math.round(max * t),
  }));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padL} x2={width - padR} y1={g.y} y2={g.y}
            stroke="var(--fd-gray-200)" strokeWidth="1"
            strokeDasharray={i === 0 ? '0' : '3 4'}
          />
          <text
            x={padL - 6} y={g.y + 3} textAnchor="end"
            fontSize="10" fill="var(--fd-gray-500)"
            fontFamily="var(--font-numeric)"
          >
            {g.val}
          </text>
        </g>
      ))}
      {data.map((d, i) => (
        <text
          key={i} x={xAt(i)} y={height - 8} textAnchor="middle"
          fontSize="10" fill="var(--fd-gray-500)"
          fontFamily="var(--font-numeric)"
        >
          {d.month.slice(2).replace('-', '/')}
        </text>
      ))}
      {series.map((s, si) => {
        const color = CHART_COLORS[si % CHART_COLORS.length];
        const path = data.map((d, i) =>
          (i === 0 ? 'M' : 'L') + xAt(i) + ',' + yAt(d[s] || 0)
        ).join(' ');
        return (
          <g key={s}>
            <path
              d={path} fill="none" stroke={color}
              strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round"
            />
            {data.map((d, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(d[s] || 0)} r="2.5" fill={color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
