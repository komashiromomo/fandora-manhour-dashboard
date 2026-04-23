import React from 'react';

/**
 * Inline SVG sparkline — line path + subtle fill area + last-point dot.
 */
export default function Sparkline({
  data,
  width = 120,
  height = 36,
  stroke = 'var(--accent)',
  fill = 'rgba(0,164,198,0.12)',
  strokeWidth = 1.5,
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = Math.max(max - min, 1);
  const step = width / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => [i * step, height - 4 - ((v - min) / range) * (height - 10)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className="spark-inline">
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={stroke} />
    </svg>
  );
}
