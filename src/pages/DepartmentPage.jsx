/**
 * 部門分析頁 — Fandora V2 設計風格
 */
import { useMemo, useState } from 'react';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import {
  KPICard,
  Card,
  Donut,
  TopList,
  Empty,
} from '../components/v2';
import FilterToolbar from '../components/FilterToolbar';
import DepartmentDetail from '../components/DepartmentDetail';
import IpMisrecordWarning from '../components/IpMisrecordWarning';
import { useData } from '../data/DataContext';
import { roundHours } from '../utils/dates';
import { calcDeptCost } from '../utils/costCalculator';
import { useTheme } from '../components/ThemeProvider';

const DEPT_PALETTE = [
  '#00A4C6', '#FF9900', '#9B59B6', '#2BB673', '#E14D4D',
  '#3498DB', '#F1C40F', '#1ABC9C', '#E67E22', '#34495E',
];

export default function DepartmentPage() {
  const { filteredLogs, salaryData } = useData();
  const { showCost } = useTheme();
  const [selectedDept, setSelectedDept] = useState(null);

  const deptCosts = useMemo(() => calcDeptCost(filteredLogs, salaryData), [filteredLogs, salaryData]);

  const deptStats = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'department');
    return orderBy(
      Object.entries(grouped).map(([dept, logs], idx) => ({
        dept: dept || '未知部門',
        hours: roundHours(sumBy(logs, 'hours')),
        employeeCount: new Set(logs.map((l) => l.employee)).size,
        projectCount: new Set(
          logs.filter((l) => l.ipProject !== '非授權IP').map((l) => l.ipProject)
        ).size,
        cost: Math.round(deptCosts[dept] || 0),
        color: DEPT_PALETTE[idx % DEPT_PALETTE.length],
      })),
      'hours',
      'desc'
    );
  }, [filteredLogs, deptCosts]);

  const totalHours = sumBy(deptStats, 'hours');
  const totalEmployees = new Set(filteredLogs.map((l) => l.employee)).size;
  const totalDepts = deptStats.length;

  const donutData = useMemo(
    () => deptStats.map((d) => ({ value: d.hours, color: d.color })),
    [deptStats]
  );

  const topList = useMemo(
    () =>
      deptStats.map((d) => ({
        label: d.dept,
        value: d.hours,
        color: d.color,
        onClick: () => setSelectedDept(d.dept),
      })),
    [deptStats]
  );

  if (filteredLogs.length === 0) {
    return (
      <>
        <div className="hero-decor" />
        <div className="page-hero">
          <div>
            <div className="eyebrow">DEPARTMENTS</div>
            <h1>部門分析</h1>
            <p className="sub">檢視各部門的工時分佈、員工人數與成本投入。</p>
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
          <div className="eyebrow">DEPARTMENTS</div>
          <h1>部門分析</h1>
          <p className="sub">
            目前涵蓋 {totalDepts} 個部門 · {totalEmployees} 位員工 · 總工時 {Math.round(totalHours).toLocaleString()} 小時。
          </p>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 'var(--gap)' }}>
        <FilterToolbar />
      </div>

      <IpMisrecordWarning />

      <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
        <KPICard label="部門數" value={totalDepts} unit="個" />
        <KPICard label="總員工數" value={totalEmployees} unit="人" sparkColor="#FF9900" />
        <KPICard label="總工時" value={Math.round(totalHours).toLocaleString()} unit="小時" sparkColor="#9B59B6" />
        <KPICard
          label="平均部門工時"
          value={totalDepts > 0 ? Math.round(totalHours / totalDepts).toLocaleString() : 0}
          unit="小時"
          sparkColor="#2BB673"
        />
      </div>

      <div className="grid grid-12">
        <Card col={5} title="部門工時分佈" sub="各部門佔比">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Donut data={donutData} size={180} />
            <div style={{ flex: 1, fontSize: 12 }}>
              {deptStats.slice(0, 6).map((d) => (
                <div key={d.dept} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="ip-swatch" style={{ background: d.color }} />
                  <span style={{ flex: 1, color: 'var(--fg-2)' }}>{d.dept}</span>
                  <span style={{ fontFamily: 'var(--font-numeric)', fontWeight: 600 }}>
                    {Math.round((d.hours * 100) / (totalHours || 1))}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card col={7} title="部門工時排行">
          <TopList items={topList} />
        </Card>

        <Card col={12} title="部門統計表" sub={`${deptStats.length} 個部門`}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>部門</th>
                  <th className="num">員工數</th>
                  <th className="num">工時</th>
                  <th className="num">授權 IP 數</th>
                  {showCost && <th className="num">估算成本</th>}
                </tr>
              </thead>
              <tbody>
                {deptStats.map((d) => (
                  <tr
                    key={d.dept}
                    onClick={() => setSelectedDept(d.dept)}
                    style={{ cursor: 'pointer' }}
                    title="點擊查看進階分析"
                  >
                    <td>
                      <span className="ip-swatch" style={{ background: d.color, marginRight: 8 }} />
                      {d.dept}
                    </td>
                    <td className="num">{d.employeeCount}</td>
                    <td className="num">{d.hours.toLocaleString()}</td>
                    <td className="num">{d.projectCount}</td>
                    {showCost && <td className="num">{d.cost ? `$${d.cost.toLocaleString()}` : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <DepartmentDetail department={selectedDept} onClose={() => setSelectedDept(null)} />
    </>
  );
}
