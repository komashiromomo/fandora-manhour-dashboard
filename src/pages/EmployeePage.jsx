/**
 * 人員分析頁 — Fandora V2 設計風格
 */
import { useMemo, useState } from 'react';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { KPICard, Card, TopList, Empty } from '../components/v2';
import FilterToolbar from '../components/FilterToolbar';
import EmployeeDetail from '../components/EmployeeDetail';
import IpMisrecordWarning from '../components/IpMisrecordWarning';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { roundHours } from '../utils/dates';
import { useTheme } from '../components/ThemeProvider';
import { calcEmployeeCost } from '../utils/costCalculator';

export default function EmployeePage() {
  const { filteredLogs, salaryData } = useData();
  const { role } = useAuth();
  const { showCost } = useTheme();
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // 個人估算成本（公司管銷 × 個人工時佔比）
  const employeeCostMap = useMemo(
    () => calcEmployeeCost(filteredLogs, salaryData),
    [filteredLogs, salaryData]
  );

  const employeeStats = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'employee');
    return orderBy(
      Object.entries(grouped).map(([employee, logs]) => {
        const hours = roundHours(sumBy(logs, 'hours'));
        const days = new Set(logs.map((l) => l.date)).size;
        const cost = Math.round(employeeCostMap[employee] || 0);
        return {
          employee,
          department: logs[0]?.department || '未知',
          hours,
          taskCount: new Set(logs.map((l) => l.task)).size,
          days,
          avgDailyHours: days > 0 ? roundHours(hours / days) : 0,
          cost,
          costPerHour: hours > 0 && cost > 0 ? Math.round(cost / hours) : null,
        };
      }),
      'hours',
      'desc'
    );
  }, [filteredLogs, employeeCostMap]);

  const topList = useMemo(
    () =>
      employeeStats.map((e) => ({
        label: `${e.employee}（${e.department}）`,
        value: e.hours,
        onClick: () => setSelectedEmployee(e.employee),
      })),
    [employeeStats]
  );

  const totalHours = sumBy(employeeStats, 'hours');
  const showCostCol = showCost && role === 'admin';

  if (filteredLogs.length === 0) {
    return (
      <>
        <div className="hero-decor" />
        <div className="page-hero">
          <div>
            <div className="eyebrow">PEOPLE</div>
            <h1>人員分析</h1>
            <p className="sub">檢視個別員工的工時與時薪成本。</p>
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
          <div className="eyebrow">PEOPLE</div>
          <h1>人員分析</h1>
          <p className="sub">
            {employeeStats.length} 位員工 · 總工時 {Math.round(totalHours).toLocaleString()} 小時 ·
            平均每人 {employeeStats.length > 0 ? Math.round(totalHours / employeeStats.length) : 0} 小時。
          </p>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 'var(--gap)' }}>
        <FilterToolbar />
      </div>

      <IpMisrecordWarning />

      <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
        <KPICard label="員工數" value={employeeStats.length} unit="人" />
        <KPICard
          label="平均工時"
          value={
            employeeStats.length > 0
              ? Math.round(totalHours / employeeStats.length).toLocaleString()
              : 0
          }
          unit="小時"
          sparkColor="#FF9900"
        />
        <KPICard
          label="工時最高"
          value={employeeStats[0]?.employee || '—'}
          unit={employeeStats[0] ? `${employeeStats[0].hours}h` : ''}
          sparkColor="#9B59B6"
        />
        <KPICard
          label="平均每日工時"
          value={
            employeeStats.length > 0
              ? roundHours(
                  employeeStats.reduce((s, e) => s + e.avgDailyHours, 0) / employeeStats.length
                )
              : 0
          }
          unit="小時/日"
          sparkColor="#2BB673"
        />
      </div>

      <div className="grid grid-12">
        <Card col={12} title="員工工時排行" sub={`${employeeStats.length} 位員工 · 點擊查看詳細`}>
          <TopList items={topList} maxHeight={520} />
        </Card>

        <Card col={12} title="員工統計表" sub={`${employeeStats.length} 位員工`}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>部門</th>
                  <th className="num">工時</th>
                  <th className="num">任務數</th>
                  <th className="num">出勤天數</th>
                  <th className="num">平均日工時</th>
                  {showCostCol && <th className="num">估算成本</th>}
                  {showCostCol && <th className="num">平均時薪</th>}
                </tr>
              </thead>
              <tbody>
                {employeeStats.map((e) => (
                  <tr
                    key={e.employee}
                    onClick={() => setSelectedEmployee(e.employee)}
                    style={{ cursor: 'pointer' }}
                    title="點擊查看進階分析"
                  >
                    <td style={{ fontWeight: 600 }}>{e.employee}</td>
                    <td>
                      <span className="tag">{e.department}</span>
                    </td>
                    <td className="num">{e.hours.toLocaleString()}</td>
                    <td className="num">{e.taskCount}</td>
                    <td className="num">{e.days}</td>
                    <td className="num">{e.avgDailyHours}</td>
                    {showCostCol && (
                      <td className="num">{e.cost ? `$${e.cost.toLocaleString()}` : '—'}</td>
                    )}
                    {showCostCol && (
                      <td className="num">{e.costPerHour ? `$${e.costPerHour.toLocaleString()}` : '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <EmployeeDetail employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
    </>
  );
}
