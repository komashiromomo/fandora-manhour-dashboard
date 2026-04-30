/**
 * V2 視覺元件 — 來自 Fandora design bundle 的 components.jsx，移植為 React module
 * 不依賴外部圖表 lib，全部用 inline SVG，跟 design CSS class 配合。
 */
import React from 'react';
import Icon from '../Icon';

// ============== Sparkline ==============
export function Sparkline({ data, color = 'var(--accent)', w = 80, h = 32 }) {
  if (!data?.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ');
  const last = data[data.length - 1];
  const lastY = h - ((last - min) / range) * (h - 4) - 2;
  const id = `sp-${color.replace(/\W/g, '')}`;
  return (
    <svg width={w} height={h} className="kpi-spark">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} stroke="none" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={w} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

// ============== KPICard ==============
export function KPICard({ label, value, unit, delta, deltaDir, spark, sparkColor, onClick }) {
  return (
    <div className="kpi" onClick={onClick}>
      <div className="kpi-label">
        <span className="dot" />
        {label}
      </div>
      <div className="kpi-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div className="kpi-foot">
        {delta != null && (
          <span className={`kpi-delta ${deltaDir || 'flat'}`}>
            <Icon
              name={deltaDir === 'up' ? 'chevronUp' : deltaDir === 'down' ? 'chevronDown' : 'chevronRight'}
              size={11}
            />
            {delta}
          </span>
        )}
        {spark && <Sparkline data={spark} color={sparkColor || 'var(--accent)'} />}
      </div>
    </div>
  );
}

// ============== Card 包裝 ==============
export function Card({ title, sub, action, children, className = '', col }) {
  const cls = ['card', col ? `col-${col}` : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {(title || action) && (
        <div className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {action && <div className="actions">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ============== LineChart ==============
export function LineChart({ series, height = 280 }) {
  if (!series?.[0]?.data?.length) return <EmptySvg height={height} />;
  const w = 600;
  const h = height;
  const pad = { l: 36, r: 16, t: 16, b: 32 };
  const all = series.flatMap((s) => s.data.map((d) => d.value));
  const max = Math.max(...all, 1) * 1.1;
  const points = series[0].data.length;
  const xs = (i) => pad.l + (points <= 1 ? 0 : (i / (points - 1)) * (w - pad.l - pad.r));
  const ys = (v) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="line-chart" preserveAspectRatio="none">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r} y1={ys(t)} y2={ys(t)} className="grid-line" />
          <text x={pad.l - 6} y={ys(t) + 3} textAnchor="end" className="axis-text">
            {t}
          </text>
        </g>
      ))}
      {series[0].data.map((d, i) => (
        <text key={i} x={xs(i)} y={h - 12} textAnchor="middle" className="axis-text">
          {d.label}
        </text>
      ))}
      {series.map((s, si) => {
        const path = s.data
          .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(d.value)}`)
          .join(' ');
        const area =
          path + ` L ${xs(s.data.length - 1)} ${h - pad.b} L ${xs(0)} ${h - pad.b} Z`;
        return (
          <g key={si}>
            {si === 0 && <path d={area} fill={s.color} opacity=".10" />}
            <path
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth={si === 0 ? 2.5 : 2}
              strokeDasharray={s.dashed ? '5 5' : '0'}
            />
            {s.data.map((d, i) => (
              <circle key={i} cx={xs(i)} cy={ys(d.value)} r="3" fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ============== BarChart ==============
export function BarChart({ data, color, height = 280, valueOnBar = false, onBarClick }) {
  if (!data?.length) return <EmptySvg height={height} />;
  const w = 600;
  const h = height;
  const pad = { l: 36, r: 16, t: 16, b: 32 };
  const max = Math.max(...data.map((d) => d.value), 1) * 1.1;
  const bw = (w - pad.l - pad.r) / data.length;
  const yScale = (v) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const c = color || 'var(--accent)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="bar-chart" preserveAspectRatio="none">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r} y1={yScale(t)} y2={yScale(t)} className="grid-line" />
          <text x={pad.l - 6} y={yScale(t) + 3} textAnchor="end" className="axis-text">
            {t}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = pad.l + i * bw + bw * 0.15;
        const bWidth = bw * 0.7;
        const y = yScale(d.value);
        const bh = h - pad.b - y;
        return (
          <g
            key={i}
            onClick={() => onBarClick?.(d)}
            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
          >
            <rect x={x} y={y} width={bWidth} height={bh} fill={d.color || c} rx="3" />
            {valueOnBar && bh > 22 && (
              <text
                x={x + bWidth / 2}
                y={y + 14}
                textAnchor="middle"
                fontSize="11"
                fill="white"
                fontWeight="600"
                fontFamily="var(--font-numeric)"
              >
                {d.value}
              </text>
            )}
            <text x={x + bWidth / 2} y={h - 12} textAnchor="middle" className="axis-text">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ============== Donut ==============
export function Donut({ data, size = 200, hole = 0.58 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="var(--bg-page-alt)" />
        <circle cx={size / 2} cy={size / 2} r={(size / 2 - 4) * hole} fill="var(--bg-surface)" />
      </svg>
    );
  }
  let acc = 0;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        if (d.value <= 0) return null;
        const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += d.value;
        const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`}
            fill={d.color}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * hole} fill="var(--bg-surface)" />
    </svg>
  );
}

// ============== Heatmap ==============
export function Heatmap({ rows, cols, data, max }) {
  const colorFor = (v) => {
    if (!v) return 'var(--bg-page-alt)';
    const t = Math.min(1, v / max);
    const opacity = 0.15 + t * 0.85;
    return `color-mix(in oklab, var(--accent) ${Math.round(opacity * 100)}%, transparent)`;
  };
  return (
    <div className="heatmap" style={{ ['--cols']: cols.length }}>
      <div></div>
      {cols.map((c, i) => (
        <div key={i} className="colhead">
          {c}
        </div>
      ))}
      {rows.map((r, ri) => (
        <React.Fragment key={ri}>
          <div className="row-lbl">{r}</div>
          {cols.map((_, ci) => {
            const v = data[ri]?.[ci] ?? 0;
            return (
              <div
                key={ci}
                className="cell"
                style={{ background: colorFor(v) }}
                title={`${r} · ${cols[ci]}: ${v.toFixed(1)}h`}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============== Treemap ==============
export function Treemap({ data, height }) {
  if (!data?.length) return <div className="empty">無資料</div>;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const n = data.length;
  // 自動 height：12 個內 360，更多則隨 tile 數增加
  const dynamicHeight = height ?? (n <= 12 ? 360 : 360 + Math.ceil((n - 12) / 4) * 100);
  return (
    <div className="treemap" style={{ height: dynamicHeight }}>
      {data.map((t, i) => {
        let span = { col: 3, row: 4 };
        let cls = '';
        if (i === 0) span = { col: 6, row: 12 };
        else if (i < 3) span = { col: 6, row: 6 };
        else if (i < 6) {
          span = { col: 4, row: 6 };
          cls = 'sm';
        } else if (i < 12) {
          span = { col: 3, row: 4 };
          cls = 'sm';
        } else {
          // 第 13 個之後：再小一級的 xs tile，固定 3×3
          span = { col: 3, row: 3 };
          cls = 'xs';
        }
        const pct = ((t.value / total) * 100).toFixed(1);
        return (
          <div
            key={i}
            className={`tile ${cls}`}
            style={{
              background: t.color || 'var(--accent)',
              gridColumn: `span ${span.col}`,
              gridRow: `span ${span.row}`,
              cursor: t.onClick ? 'pointer' : 'default',
            }}
            title={`${t.name}: ${t.value}h (${pct}%)${t.onClick ? ' · 點擊查看詳細' : ''}`}
            onClick={t.onClick}
          >
            <div className="tile-name">{t.name}</div>
            <div className="tile-val">
              {t.value}
              <span style={{ fontSize: '.6em', opacity: 0.7, marginLeft: 2 }}>h</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============== Top list (橫條 list) ==============
export function TopList({ items, valueLabel = 'h', max, maxHeight }) {
  const m = max || Math.max(...items.map((x) => x.value), 1);
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    ...(maxHeight ? { maxHeight, overflowY: 'auto', paddingRight: 4 } : {}),
  };
  return (
    <div style={containerStyle}>
      {items.map((t, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: t.onClick ? 'pointer' : 'default',
            padding: t.onClick ? '4px 6px' : 0,
            margin: t.onClick ? '-4px -6px' : 0,
            borderRadius: 6,
            transition: 'background .12s',
          }}
          onClick={t.onClick}
          onMouseEnter={(e) => {
            if (t.onClick) e.currentTarget.style.background = 'var(--bg-page-alt)';
          }}
          onMouseLeave={(e) => {
            if (t.onClick) e.currentTarget.style.background = 'transparent';
          }}
          title={t.onClick ? '點擊查看詳細' : undefined}
        >
          <div style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.label || t.name}
          </div>
          <div
            style={{
              flex: 2,
              height: 6,
              background: 'var(--bg-page-alt)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(t.value / m) * 100}%`,
                background: t.color || 'var(--accent)',
                borderRadius: 3,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-numeric)',
              fontSize: 13,
              fontWeight: 600,
              minWidth: 56,
              textAlign: 'right',
            }}
          >
            {Math.round(t.value).toLocaleString()}{valueLabel}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============== Empty placeholder ==============
export function Empty({ icon = 'eye', title = '無資料', desc, action }) {
  return (
    <div className="empty">
      <div className="empty-ico">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
      {action}
    </div>
  );
}

function EmptySvg({ height = 280 }) {
  return (
    <div
      style={{
        height,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--fg-muted)',
        fontSize: 13,
      }}
    >
      無資料
    </div>
  );
}

// 為保留現有 import 路徑相容性
export { Icon };
