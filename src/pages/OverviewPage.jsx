import React, { useMemo } from 'react';
import { useData } from '../data/DataContext';
import Card, { CardHead } from '../components/Card';
import Icon from '../components/Icon';
import Sparkline from '../components/Sparkline';
import MonthBars from '../components/MonthBars';
import Donut from '../components/Donut';
import MultiLine from '../components/MultiLine';
import RankList from '../components/RankList';
import { fmtHours, fmtMoney, fmtCompact, pct } from '../shared/format';
import { CHART_COLORS } from '../shared/constants';
import _ from 'lodash-es';

export default function OverviewPage() {
  const {
    workLogs, selectedMonth, setSelectedMonth,
    availableMonths, filteredLogs, filteredSalary,
  } = useData();

  // KPIs from filtered data
  const kpis = useMemo(() => {
    const total = _.sumBy(filteredLogs, 'hours');
    const emps = _.uniqBy(filteredLogs, 'name').length;
    const projs = _.uniq(filteredLogs.map(l => l.ipProject).filter(Boolean)).length;
    const cost = _.sumBy(filteredSalary, r => Number(r['總計']) || 0);
    return { total, emps, projs, avg: emps ? total / emps : 0, cost, rate: total ? cost / total : 0 };
  }, [filteredLogs, filteredSalary]);

  // Delta vs previous month (only meaningful when a specific month is selected)
  const deltaTotal = useMemo(() => {
    if (selectedMonth === 'all') return null;
    const idx = availableMonths.indexOf(selectedMonth);
    const prev = idx > 0 ? availableMonths[idx - 1] : null;
    if (!prev) return null;
    const cur = _.sumBy(workLogs.filter(l => l.month === selectedMonth), 'hours');
    const prevHours = _.sumBy(workLogs.filter(l => l.month === prev), 'hours');
    if (!prevHours) return null;
    return ((cur - prevHours) / prevHours) * 100;
  }, [selectedMonth, availableMonths, workLogs]);

  // Monthly totals (for MonthBars + hero sparkline)
  const monthTotals = useMemo(
    () => availableMonths.map(m => ({
      month: m,
      hours: _.sumBy(workLogs.filter(l => l.month === m), 'hours'),
    })),
    [availableMonths, workLogs]
  );
  const sparkData = monthTotals.map(m => m.hours);

  // Top IPs (exclude 非授權IP for project analysis)
  const topIPs = useMemo(() => {
    const filtered = filteredLogs.filter(l => l.ipProject && l.ipProject !== '非授權IP');
    return _(filtered)
      .groupBy('ipProject')
      .map((logs, name) => ({ name, hours: _.sumBy(logs, 'hours') }))
      .orderBy(['hours'], ['desc'])
      .take(8)
      .value();
  }, [filteredLogs]);

  // Dept donut
  const deptBreakdown = useMemo(() => {
    return _(filteredLogs)
      .groupBy('dept')
      .map((logs, name) => ({ name, value: _.sumBy(logs, 'hours') }))
      .orderBy(['value'], ['desc'])
      .value();
  }, [filteredLogs]);

  // Top work types
  const topWork = useMemo(() => {
    return _(filteredLogs)
      .groupBy('task')
      .map((logs, name) => ({ name, hours: _.sumBy(logs, 'hours') }))
      .orderBy(['hours'], ['desc'])
      .take(8)
      .value();
  }, [filteredLogs]);

  // Top-5 IP monthly trend (whole dataset)
  const trend = useMemo(() => {
    const overall = _(workLogs.filter(l => l.ipProject && l.ipProject !== '非授權IP'))
      .groupBy('ipProject')
      .map((logs, name) => ({ name, hours: _.sumBy(logs, 'hours') }))
      .orderBy(['hours'], ['desc'])
      .take(5)
      .value();
    const top = overall.map(o => o.name);
    const rows = availableMonths.map(m => {
      const row = { month: m };
      top.forEach(ip => {
        row[ip] = _.sumBy(
          workLogs.filter(l => l.month === m && l.ipProject === ip),
          'hours'
        );
      });
      return row;
    });
    return { rows, series: top };
  }, [workLogs, availableMonths]);

  // Insight strip (last month vs prev)
  const lastMonthData = monthTotals[monthTotals.length - 1];
  const prevMonthData = monthTotals[monthTotals.length - 2];
  const lastDelta = prevMonthData?.hours
    ? ((lastMonthData.hours - prevMonthData.hours) / prevMonthData.hours) * 100
    : 0;

  if (!workLogs.length) {
    return (
      <Card style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 14, color: 'var(--fd-gray-700)', marginBottom: 8 }}>
          尚無工時資料
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          請到「設定」頁點擊「測試連線」並重新載入數據
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* ===== Hero KPI ===== */}
      <div className="hero-kpi">
        <div className="kpi kpi--primary">
          <span className="kpi__label">總工時 · Total Hours</span>
          <div>
            <span className="kpi__value">{fmtHours(kpis.total)}</span>
            <span className="kpi__unit">小時</span>
          </div>
          <div className="kpi__foot">
            {deltaTotal !== null && (
              <span className={'kpi__delta ' + (deltaTotal >= 0 ? 'kpi__delta--up' : 'kpi__delta--down')}>
                <Icon name={deltaTotal >= 0 ? 'up' : 'down'} size={10} />
                {Math.abs(deltaTotal).toFixed(1)}%
              </span>
            )}
            <Sparkline
              data={sparkData}
              width={160}
              height={36}
              stroke="#fff"
              fill="rgba(255,255,255,.18)"
            />
          </div>
        </div>

        <div className="kpi">
          <span className="kpi__label">員工人數</span>
          <div>
            <span className="kpi__value">{kpis.emps}</span>
            <span className="kpi__unit">人</span>
          </div>
          <div className="kpi__foot">
            <span className="kpi__caption">平均每人 {fmtHours(kpis.avg)} 小時</span>
          </div>
        </div>

        <div className="kpi">
          <span className="kpi__label">IP 專案數</span>
          <div>
            <span className="kpi__value">{kpis.projs}</span>
            <span className="kpi__unit">個</span>
          </div>
          <div className="kpi__foot">
            <span className="kpi__caption">含授權與自有 IP</span>
          </div>
        </div>

        <div className="kpi">
          <span className="kpi__label">管銷總支出</span>
          <div>
            <span className="kpi__value">${fmtCompact(kpis.cost)}</span>
            <span className="kpi__unit">NTD</span>
          </div>
          <div className="kpi__foot">
            <span className="kpi__caption">平均時薪成本 ${fmtMoney(kpis.rate)}</span>
          </div>
        </div>
      </div>

      {/* ===== Insight strip ===== */}
      <div className="insight-strip">
        <div className="insight-strip__icon"><Icon name="trend" size={16} /></div>
        <div className="insight-strip__text">
          近月 <b>{lastMonthData?.month || '—'}</b> 總工時
          <b> {fmtHours(lastMonthData?.hours || 0)} 小時</b>，相比前月
          {lastDelta >= 0
            ? <> 上升 <b style={{ color: '#1C8C58' }}>{lastDelta.toFixed(1)}%</b></>
            : <> 下降 <b style={{ color: '#C03A3A' }}>{Math.abs(lastDelta).toFixed(1)}%</b></>}
          ； 主力 IP 為 <b>{topIPs[0]?.name || '—'}</b>
          ，佔比約 <b>{Math.round(pct(topIPs[0]?.hours || 0, kpis.total))}%</b>。
        </div>
        <button className="btn btn--ghost"><Icon name="download" size={14} />匯出</button>
      </div>

      {/* ===== Row 1: monthly bars + dept donut ===== */}
      <div className="grid-2">
        <Card>
          <CardHead
            title="月度工時走勢"
            subtitle="點擊任一月份快速篩選"
            right={
              <>
                <span className="chip chip--dot" style={{ color: 'var(--accent)' }}>當月</span>
                <span className="muted" style={{ fontSize: 12 }}>點擊切換</span>
              </>
            }
          />
          <MonthBars
            data={monthTotals}
            selectedMonth={selectedMonth}
            onSelect={setSelectedMonth}
          />
        </Card>
        <Card>
          <CardHead title="部門工時佔比" subtitle="按工時分配" />
          <Donut data={deptBreakdown.slice(0, 6)} />
        </Card>
      </div>

      {/* ===== Row 2: Top IP + Top Work ===== */}
      <div className="grid-2">
        <Card>
          <CardHead
            title="Top IP 專案"
            subtitle="依工時排序"
            right={<span className="eyebrow-label">Ranked</span>}
          />
          <RankList items={topIPs} />
        </Card>
        <Card>
          <CardHead
            title="Top 工作項目"
            subtitle="總體投入結構"
            right={<span className="eyebrow-label">Ranked</span>}
          />
          <RankList items={topWork} />
        </Card>
      </div>

      {/* ===== Row 3: Multi-line trend ===== */}
      {trend.series.length > 0 && (
        <Card>
          <CardHead
            title={`IP 月度趨勢 · Top ${trend.series.length}`}
            subtitle={`近 ${availableMonths.length} 個月`}
            right={
              <>
                {trend.series.map((s, i) => (
                  <span
                    key={s}
                    className="chip"
                    style={{
                      color: CHART_COLORS[i % CHART_COLORS.length],
                      background: 'transparent',
                      border: 'none',
                      fontWeight: 500,
                    }}
                  >
                    <span className="legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {s}
                  </span>
                ))}
              </>
            }
          />
          <MultiLine data={trend.rows} series={trend.series} height={220} />
        </Card>
      )}
    </>
  );
}
