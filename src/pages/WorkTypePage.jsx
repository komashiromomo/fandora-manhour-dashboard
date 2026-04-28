/**
 * 工時類型頁 — Fandora V2 設計風格
 */
import { useMemo } from 'react';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { KPICard, Card, Treemap, TopList, Empty } from '../components/v2';
import FilterToolbar from '../components/FilterToolbar';
import { useData } from '../data/DataContext';
import { roundHours } from '../utils/dates';

const PALETTE = [
  '#00A4C6', '#FF9900', '#9B59B6', '#2BB673', '#E14D4D',
  '#3498DB', '#F1C40F', '#1ABC9C', '#E67E22', '#34495E',
  '#16A085', '#C0392B',
];

export default function WorkTypePage() {
  const { filteredLogs } = useData();

  const stats = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'workType');
    const total = sumBy(filteredLogs, 'hours');
    return orderBy(
      Object.entries(grouped).map(([workType, logs], idx) => ({
        workType,
        hours: roundHours(sumBy(logs, 'hours')),
        percent: total > 0 ? roundHours((sumBy(logs, 'hours') / total) * 100) : 0,
        employeeCount: new Set(logs.map((l) => l.employee)).size,
        projects: [...new Set(logs.map((l) => l.ipProject))],
        color: PALETTE[idx % PALETTE.length],
      })),
      'hours',
      'desc'
    );
  }, [filteredLogs]);

  const totalHours = sumBy(stats, 'hours');

  const treemapData = useMemo(
    () =>
      stats.slice(0, 12).map((s) => ({
        name: s.workType,
        value: s.hours,
        color: s.color,
      })),
    [stats]
  );

  const topList = useMemo(
    () =>
      stats.slice(0, 10).map((s) => ({
        label: s.workType,
        value: s.hours,
        color: s.color,
      })),
    [stats]
  );

  if (filteredLogs.length === 0) {
    return (
      <>
        <div className="hero-decor" />
        <div className="page-hero">
          <div>
            <div className="eyebrow">WORK TYPES</div>
            <h1>工時類型分析</h1>
            <p className="sub">把工時依工作項目分類、找到時間都花到哪去了。</p>
          </div>
        </div>
        <Empty title="暫無數據" desc="請先到「設定」頁從 Drive 載入工時資料。" />
      </>
    );
  }

  return (
    <>
      <div className="hero-decor" />
      <div className="page-hero">
        <div>
          <div className="eyebrow">WORK TYPES</div>
          <h1>工時類型分析</h1>
          <p className="sub">
            {stats.length} 種工作項目 · 總工時 {Math.round(totalHours).toLocaleString()} 小時 ·
            前 3 名共佔 {stats.slice(0, 3).reduce((s, x) => s + x.percent, 0).toFixed(0)}%。
          </p>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 'var(--gap)' }}>
        <FilterToolbar />
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
        <KPICard label="工作項目數" value={stats.length} unit="項" />
        <KPICard label="總工時" value={Math.round(totalHours).toLocaleString()} unit="小時" sparkColor="#FF9900" />
        <KPICard
          label="最大佔比"
          value={stats[0]?.workType || '—'}
          unit={stats[0] ? `${stats[0].percent}%` : ''}
          sparkColor="#9B59B6"
        />
        <KPICard
          label="平均項目工時"
          value={stats.length > 0 ? Math.round(totalHours / stats.length).toLocaleString() : 0}
          unit="小時"
          sparkColor="#2BB673"
        />
      </div>

      <div className="grid grid-12">
        <Card col={12} title="工作項目 Treemap" sub="區塊面積 = 工時佔比">
          <Treemap data={treemapData} />
        </Card>

        <Card col={5} title="Top 10 工作項目">
          <TopList items={topList} />
        </Card>

        <Card col={7} title="完整工作項目統計" sub={`${stats.length} 項`}>
          <div className="tbl-wrap" style={{ maxHeight: 480, overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>工作項目</th>
                  <th className="num">工時</th>
                  <th className="bar-cell">佔比</th>
                  <th className="num">參與人數</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.workType}>
                    <td>
                      <span className="ip-swatch" style={{ background: s.color, marginRight: 8 }} />
                      {s.workType}
                    </td>
                    <td className="num">{s.hours.toLocaleString()}</td>
                    <td className="bar-cell">
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${Math.min(100, s.percent)}%`, background: s.color }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 8 }}>
                        {s.percent}%
                      </span>
                    </td>
                    <td className="num">{s.employeeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
