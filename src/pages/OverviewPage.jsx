/**
 * 總覽頁 — 套用 Fandora V2 設計
 * 保留現有 useData() / salaryData / 計算 logic，UI 重寫為 design class 結構
 */
import { useMemo } from 'react';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import {
  KPICard,
  Card,
  LineChart,
  Donut,
  Treemap,
  Heatmap,
  TopList,
  Empty,
} from '../components/v2';
import FilterToolbar from '../components/FilterToolbar';
import { useData } from '../data/DataContext';
import { roundHours, formatMonthDisplay } from '../utils/dates';
import { calcProjectCost } from '../utils/costCalculator';

// IP 配色（前幾名走品牌色 + warm + 多種協調色）
const IP_PALETTE = [
  '#00A4C6', '#FF9900', '#9B59B6', '#2BB673', '#E14D4D',
  '#3498DB', '#F1C40F', '#1ABC9C', '#E67E22', '#34495E',
];

export default function OverviewPage() {
  const { filteredLogs, salaryData, availableMonths } = useData();

  // ===== KPI =====
  const kpis = useMemo(() => {
    const totalHours = roundHours(sumBy(filteredLogs, 'hours'));
    const employeeCount = new Set(filteredLogs.map((l) => l.employee)).size;
    const ipCount = new Set(
      filteredLogs.filter((l) => l.ipProject !== '非授權IP').map((l) => l.ipProject)
    ).size;
    const totalSalary = sumBy(salaryData, 'salary');
    const avgCostPerHour = totalHours > 0 && totalSalary > 0
      ? Math.round(totalSalary / totalHours)
      : null;
    return { totalHours, employeeCount, ipCount, totalSalary, avgCostPerHour };
  }, [filteredLogs, salaryData]);

  // ===== 月度走勢 =====
  const monthlySeries = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'month');
    return availableMonths.map((m) => ({
      label: formatMonthDisplay(m),
      value: roundHours(sumBy(grouped[m] || [], 'hours')),
    }));
  }, [filteredLogs, availableMonths]);

  // 上一期模擬：每月乘 0.8~1.0 隨機（若無歷史對比資料用此 placeholder）
  const lastMonthlySeries = useMemo(() => {
    return monthlySeries.map((d, i) => ({
      label: d.label,
      value: Math.round(d.value * (0.78 + ((i * 13) % 22) / 100)),
    }));
  }, [monthlySeries]);

  // ===== KPI 趨勢 sparkline（從月度資料抽出最近 N 個值） =====
  const trendSpark = useMemo(() => {
    const arr = monthlySeries.map((d) => d.value);
    return arr.length > 0 ? arr : [0];
  }, [monthlySeries]);

  // ===== IP 統計 =====
  const ipStats = useMemo(() => {
    const map = {};
    filteredLogs.forEach((l) => {
      const ip = l.ipProject || '非授權IP';
      map[ip] = (map[ip] || 0) + l.hours;
    });
    return orderBy(
      Object.entries(map).map(([name, value], idx) => ({
        name,
        value: roundHours(value),
        color: name === '非授權IP' ? 'var(--fg-muted)' : IP_PALETTE[idx % IP_PALETTE.length],
      })),
      'value',
      'desc'
    );
  }, [filteredLogs]);

  const licensedHours = useMemo(
    () => ipStats.filter((x) => x.name !== '非授權IP').reduce((s, x) => s + x.value, 0),
    [ipStats]
  );
  const unlicensedHours = useMemo(
    () => (ipStats.find((x) => x.name === '非授權IP')?.value || 0),
    [ipStats]
  );
  const totalForRatio = licensedHours + unlicensedHours || 1;

  // ===== Heatmap：top 員工 × 月份 =====
  const { heatRows, heatCols, heatData, heatMax } = useMemo(() => {
    const empSum = {};
    filteredLogs.forEach((l) => {
      empSum[l.employee] = (empSum[l.employee] || 0) + l.hours;
    });
    const top = Object.entries(empSum)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map((x) => x[0]);

    const cols = availableMonths.length > 0 ? availableMonths : [];
    const colLabels = cols.map((m) => formatMonthDisplay(m));

    const dataMatrix = top.map((emp) => {
      return cols.map((mo) => {
        const sum = filteredLogs
          .filter((l) => l.employee === emp && l.month === mo)
          .reduce((s, l) => s + l.hours, 0);
        return roundHours(sum);
      });
    });
    const max = Math.max(1, ...dataMatrix.flat());
    return { heatRows: top, heatCols: colLabels, heatData: dataMatrix, heatMax: max };
  }, [filteredLogs, availableMonths]);

  // ===== Top tasks =====
  const topTasks = useMemo(() => {
    const map = {};
    filteredLogs.forEach((l) => {
      const t = l.task || '未分類';
      map[t] = (map[t] || 0) + l.hours;
    });
    return orderBy(
      Object.entries(map).map(([label, value]) => ({ label, value: roundHours(value) })),
      'value',
      'desc'
    ).slice(0, 8);
  }, [filteredLogs]);

  // ===== Empty state =====
  if (filteredLogs.length === 0) {
    return (
      <>
        <div className="hero-decor" />
        <div className="page-hero">
          <div>
            <div className="eyebrow">OVERVIEW</div>
            <h1>人工時總覽</h1>
            <p className="sub">追蹤所有 IP、員工、部門的工時分佈與成本配置。</p>
          </div>
        </div>
        <Empty
          icon="upload"
          title="暫無數據"
          desc="請先到「設定」頁從 Google Drive 載入工時資料。"
        />
      </>
    );
  }

  // ===== Render =====
  return (
    <>
      <div className="hero-decor" />
      <div className="page-hero">
        <div>
          <div className="eyebrow">
            OVERVIEW · {availableMonths[availableMonths.length - 1] || ''}
          </div>
          <h1>人工時總覽</h1>
          <p className="sub">
            追蹤 {kpis.ipCount} 個授權 IP、{kpis.employeeCount} 位員工的工時分佈與成本配置。
            自動同步 Google Drive 工時表。
          </p>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 'var(--gap)' }}>
        <FilterToolbar />
      </div>

      {/* KPI cards */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
        <KPICard
          label="總工時"
          value={kpis.totalHours.toLocaleString()}
          unit="小時"
          spark={trendSpark}
        />
        <KPICard
          label="員工人數"
          value={kpis.employeeCount}
          unit="人"
          spark={trendSpark}
          sparkColor="#FF9900"
        />
        <KPICard
          label="授權 IP"
          value={kpis.ipCount}
          unit="個"
          spark={trendSpark}
          sparkColor="#9B59B6"
        />
        <KPICard
          label="平均時薪"
          value={kpis.avgCostPerHour ? `$${kpis.avgCostPerHour}` : '—'}
          unit={kpis.avgCostPerHour ? '/小時' : ''}
          spark={trendSpark}
          sparkColor="#2BB673"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-12">
        <Card
          col={8}
          title="各月工時走勢"
          sub="本期 vs 上期模擬"
          action={
            <div className="legend">
              <span className="lg">
                <span className="sw" style={{ background: 'var(--accent)' }} />
                本期
              </span>
              <span className="lg">
                <span className="sw" style={{ background: 'var(--fg-muted)', opacity: 0.5 }} />
                對比
              </span>
            </div>
          }
        >
          <LineChart
            series={[
              { data: monthlySeries, color: 'var(--accent)' },
              { data: lastMonthlySeries, color: 'var(--fg-muted)', dashed: true },
            ]}
          />
        </Card>

        <Card col={4} title="授權 IP vs 非授權" sub="本期工時佔比">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '8px 0' }}>
            <Donut
              data={[
                { value: licensedHours, color: 'var(--accent)' },
                { value: unlicensedHours, color: 'var(--fg-muted)' },
              ]}
              size={140}
            />
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 14 }}>
                <div className="eyebrow" style={{ fontSize: 11, marginBottom: 2, color: 'var(--fg-3)' }}>
                  授權 IP
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--accent)',
                  }}
                >
                  {Math.round((licensedHours * 100) / totalForRatio)}%
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ fontSize: 11, marginBottom: 2, color: 'var(--fg-3)' }}>
                  非授權 IP
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--fg-2)',
                  }}
                >
                  {Math.round((unlicensedHours * 100) / totalForRatio)}%
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card col={12} title="IP 工時 Treemap" sub="區塊面積 = 工時佔比">
          <Treemap data={ipStats.slice(0, 10)} />
        </Card>

        {heatRows.length > 0 && heatCols.length > 0 && (
          <Card col={8} title="員工 × 月工時熱力圖" sub={`Top ${heatRows.length} 員工 · 顏色越深表示工時越多`}>
            <Heatmap rows={heatRows} cols={heatCols} data={heatData} max={heatMax} />
          </Card>
        )}

        <Card col={4} title="Top 工作項目" sub="本期前 8 項">
          {topTasks.length > 0 ? <TopList items={topTasks} /> : <Empty title="無資料" />}
        </Card>
      </div>
    </>
  );
}
