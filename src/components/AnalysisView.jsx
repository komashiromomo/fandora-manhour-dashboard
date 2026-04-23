import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardHead } from './Card';
import Icon from './Icon';
import Sparkline from './Sparkline';
import Donut from './Donut';
import MultiLine from './MultiLine';
import RankList from './RankList';
import { fmtHours, fmtMoney, fmtCompact, pct } from '../shared/format';
import _ from 'lodash-es';

/**
 * Shared two-pane analysis tab.
 *
 * Props:
 *   logs, salary, allMonths  — pre-filtered data
 *   config: {
 *     groupBy:        'ipProject' | 'task' | 'name' | 'dept' | Function(log)
 *     itemLabel:      '專案' | '工作項目' | '員工' | '部門'
 *     eyebrow:        'IP PROJECT' | ...
 *     secondaryKey:   key name for the secondary breakdown donut
 *     secondaryLabel: label for the secondary card
 *     peopleLabel:    '參與人員' etc.
 *     showCost:       show cost columns in list and detail (hide for employee)
 *     excludeIP:      true to drop 非授權IP rows
 *   }
 */
export default function AnalysisView({ logs, salary, allMonths, config }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const baseLogs = useMemo(() => {
    if (!config.excludeIP) return logs;
    return logs.filter(l => l.ipProject !== '非授權IP');
  }, [logs, config.excludeIP]);

  // Aggregate by groupBy
  const items = useMemo(() => {
    const map = {};
    baseLogs.forEach(l => {
      const key = typeof config.groupBy === 'function' ? config.groupBy(l) : l[config.groupBy];
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          name: key,
          hours: 0,
          logs: [],
          employees: new Set(),
          depts: new Set(),
          ips: new Set(),
          workTypes: new Set(),
        };
      }
      map[key].hours += l.hours;
      map[key].logs.push(l);
      map[key].employees.add(l.name);
      if (l.dept) map[key].depts.add(l.dept);
      if (l.ipProject) map[key].ips.add(l.ipProject);
      if (l.task) map[key].workTypes.add(l.task);
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [baseLogs, config]);

  // Proportional cost allocation — entity_cost = Σ (hours/total_month_hours × month_total_cost)
  // Uses the FULL (unfiltered-for-exclusion) logs to compute monthly totals for accuracy.
  const monthlyCostMap = useMemo(() => {
    const m = {};
    salary.forEach(r => {
      const key = r['月份'];
      const v = Number(r['總計']) || 0;
      m[key] = (m[key] || 0) + v;
    });
    return m;
  }, [salary]);

  const monthlyTotalHours = useMemo(() => {
    const m = {};
    logs.forEach(l => { m[l.month] = (m[l.month] || 0) + l.hours; });
    return m;
  }, [logs]);

  const itemsWithCost = useMemo(() => items.map(it => {
    let cost = 0;
    it.logs.forEach(l => {
      const mc = monthlyCostMap[l.month] || 0;
      const mh = monthlyTotalHours[l.month] || 1;
      cost += (l.hours / mh) * mc;
    });
    return { ...it, cost, rate: it.hours > 0 ? cost / it.hours : 0 };
  }), [items, monthlyCostMap, monthlyTotalHours]);

  const filtered = useMemo(() => {
    if (!search) return itemsWithCost;
    const q = search.toLowerCase();
    return itemsWithCost.filter(i => i.name.toLowerCase().includes(q));
  }, [itemsWithCost, search]);

  const totalHours = useMemo(() => itemsWithCost.reduce((s, i) => s + i.hours, 0), [itemsWithCost]);
  const maxHours = filtered[0]?.hours || 1;

  // Auto-select first when list changes
  useEffect(() => {
    if (filtered.length && (!selected || !filtered.find(i => i.name === selected))) {
      setSelected(filtered[0].name);
    }
  }, [filtered, selected]);

  const sel = itemsWithCost.find(i => i.name === selected);

  // Monthly trend for selected (full-dataset months)
  const selTrend = useMemo(() => {
    if (!sel) return [];
    return allMonths.map(m => ({
      month: m,
      hours: _.sumBy(sel.logs.filter(l => l.month === m), 'hours'),
    }));
  }, [sel, allMonths]);

  // Secondary breakdown (donut) for selected
  const selBreakdown = useMemo(() => {
    if (!sel || !config.secondaryKey) return [];
    const map = {};
    sel.logs.forEach(l => {
      const k = l[config.secondaryKey];
      if (!k) return;
      map[k] = (map[k] || 0) + l.hours;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [sel, config]);

  // People participating in selected (if groupBy is something other than 'name')
  const relatedPeople = useMemo(() => {
    if (!sel) return [];
    const map = {};
    sel.logs.forEach(l => { map[l.name] = (map[l.name] || 0) + l.hours; });
    return Object.entries(map)
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6);
  }, [sel]);

  const selTrendData = selTrend.map(t => t.hours);

  if (!items.length) {
    return (
      <Card style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 14, color: 'var(--fd-gray-700)' }}>尚無資料</div>
      </Card>
    );
  }

  return (
    <div className="grid-2" style={{ gridTemplateColumns: 'minmax(340px, 1fr) 1.4fr' }}>
      {/* ====== LEFT: ranked list ====== */}
      <div className="card card--flush">
        <div style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--fd-gray-200)',
          gap: 12,
        }}>
          <div>
            <div className="card__title">{config.itemLabel} 排名</div>
            <div className="card__sub">
              {filtered.length} 項 · 共 {fmtHours(totalHours)} 小時
            </div>
          </div>
          <div style={{ position: 'relative', flex: 'none' }}>
            <span style={{
              position: 'absolute',
              left: 8, top: 7,
              color: 'var(--fd-gray-500)',
              pointerEvents: 'none',
            }}>
              <Icon name="search" size={14} />
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋…"
              style={{
                padding: '6px 10px 6px 28px',
                border: '1px solid var(--fd-gray-200)',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'inherit',
                width: 140,
                background: 'var(--fd-gray-50)',
                outline: 'none',
              }}
            />
          </div>
        </div>
        <div style={{ maxHeight: 540, overflowY: 'auto', padding: '8px 20px 12px' }}>
          <RankList
            items={filtered}
            max={maxHours}
            selectedName={selected}
            onSelect={setSelected}
            showCost={config.showCost}
            simpleLayout={false}
          />
          {!filtered.length && <div className="detail-empty">無符合資料</div>}
        </div>
      </div>

      {/* ====== RIGHT: detail pane ====== */}
      <div className="stack" style={{ gap: 16 }}>
        {sel ? (
          <>
            <Card>
              <div className="card__head">
                <div>
                  <span className="eyebrow-label">{config.eyebrow}</span>
                  <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.015em', marginTop: 4 }}>
                    {sel.name}
                  </div>
                </div>
                <div className="cluster">
                  {[...sel.depts].slice(0, 3).map(d => <span key={d} className="chip">{d}</span>)}
                </div>
              </div>

              <div className="grid-3" style={{ marginBottom: 0, gap: 12 }}>
                <div className="stack">
                  <span className="eyebrow-label">工時</span>
                  <div>
                    <span className="num-tight" style={{ fontSize: 28, fontWeight: 700 }}>{fmtHours(sel.hours)}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 4 }}>小時</span>
                  </div>
                  <span className="muted" style={{ fontSize: 11 }}>
                    佔總體 {pct(sel.hours, totalHours).toFixed(1)}%
                  </span>
                </div>
                {config.showCost && (
                  <div className="stack">
                    <span className="eyebrow-label">分攤成本</span>
                    <div>
                      <span className="num-tight" style={{ fontSize: 28, fontWeight: 700 }}>${fmtCompact(sel.cost)}</span>
                    </div>
                    <span className="muted" style={{ fontSize: 11 }}>
                      平均時薪 ${fmtMoney(sel.rate)}
                    </span>
                  </div>
                )}
                <div className="stack">
                  <span className="eyebrow-label">{config.peopleLabel || '參與人數'}</span>
                  <div>
                    <span className="num-tight" style={{ fontSize: 28, fontWeight: 700 }}>{sel.employees.size}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 4 }}>人</span>
                  </div>
                  <span className="muted" style={{ fontSize: 11 }}>
                    跨 {sel.depts.size} 個部門
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead
                title="月度工時趨勢"
                subtitle={
                  allMonths.length
                    ? `${allMonths[0]} — ${allMonths[allMonths.length - 1]}`
                    : ''
                }
                right={<Sparkline data={selTrendData} width={90} height={28} />}
              />
              <MultiLine
                data={selTrend.map(t => ({ month: t.month, v: t.hours }))}
                series={['v']}
                height={190}
              />
            </Card>

            {selBreakdown.length > 0 && (
              <div className="grid-2" style={{ marginBottom: 0, gridTemplateColumns: '1fr 1fr' }}>
                <Card>
                  <CardHead
                    title={config.secondaryLabel}
                    subtitle="工時分佈"
                  />
                  <Donut data={selBreakdown.slice(0, 6)} size={120} thickness={18} />
                </Card>
                {config.groupBy !== 'name' && (
                  <Card>
                    <CardHead
                      title={`相關${config.peopleLabel || '人員'}`}
                      subtitle={`參與此${config.itemLabel.slice(-2)}者`}
                    />
                    <RankList items={relatedPeople} />
                  </Card>
                )}
              </div>
            )}
          </>
        ) : (
          <Card>
            <div className="detail-empty">請選取左側項目以顯示詳細資料</div>
          </Card>
        )}
      </div>
    </div>
  );
}
