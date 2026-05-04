/**
 * 單一部門進階分析 Drawer
 */
import React, { useMemo } from 'react';
import { Drawer } from 'antd';
import { sumBy } from 'lodash-es';
import { KPICard, Card, LineChart, TopList, Empty } from './v2';
import { roundHours } from '../utils/dates';
import { useData } from '../data/DataContext';
import {
  makeMonthlyTrend,
  makeBreakdown,
  makeMonthlyDetail,
  calcEntityTotalCost,
} from '../utils/analyticsHelpers';
import { useTheme } from './ThemeProvider';
import { isKnownIP } from '../utils/names';

export default function DepartmentDetail({ department, onClose }) {
  const { workLogs, salaryData } = useData();
  const { showCost, customIPs } = useTheme();

  const deptLogs = useMemo(
    () => workLogs.filter((l) => l.department === department),
    [workLogs, department]
  );

  const kpi = useMemo(() => {
    const totalHours = roundHours(sumBy(deptLogs, 'hours'));
    const employeeCount = new Set(deptLogs.map((l) => l.employee)).size;
    const ipCount = new Set(
      deptLogs.filter((l) => l.ipProject !== '非授權IP').map((l) => l.ipProject)
    ).size;
    const taskCount = new Set(deptLogs.map((l) => l.workType)).size;
    const totalCost = calcEntityTotalCost(deptLogs, workLogs, salaryData);
    return {
      totalHours,
      employeeCount,
      ipCount,
      taskCount,
      totalCost,
      avgPerEmployee: employeeCount > 0 ? roundHours(totalHours / employeeCount) : 0,
    };
  }, [deptLogs, workLogs, salaryData]);

  const monthlyTrend = useMemo(() => makeMonthlyTrend(deptLogs), [deptLogs]);
  const lineSeries = useMemo(
    () => [
      {
        data: monthlyTrend.map((d) => ({ label: d.label, value: d.hours })),
        color: 'var(--accent)',
      },
    ],
    [monthlyTrend]
  );

  const employeeBreakdown = useMemo(
    () => makeBreakdown(deptLogs, (l) => l.employee, kpi.totalHours),
    [deptLogs, kpi.totalHours]
  );
  const ipBreakdown = useMemo(
    () => makeBreakdown(deptLogs, (l) => l.ipProject, kpi.totalHours),
    [deptLogs, kpi.totalHours]
  );
  const cleanLogsForWorkType = useMemo(
    () => deptLogs.filter((l) => !isKnownIP(l.workType, customIPs)),
    [deptLogs, customIPs]
  );
  const workTypeBreakdown = useMemo(
    () => makeBreakdown(cleanLogsForWorkType, (l) => l.workType, kpi.totalHours),
    [cleanLogsForWorkType, kpi.totalHours]
  );
  const wtFilteredCount = deptLogs.length - cleanLogsForWorkType.length;
  const monthlyDetail = useMemo(
    () => makeMonthlyDetail(deptLogs, workLogs, salaryData),
    [deptLogs, workLogs, salaryData]
  );

  const open = !!department;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width="min(960px, 92vw)"
      title={
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontFamily: 'var(--font-latin)',
              fontWeight: 700,
            }}
          >
            DEPARTMENT DETAIL
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{department}</div>
        </div>
      }
      styles={{ body: { padding: 24, background: 'var(--bg-page-alt)' } }}
    >
      {deptLogs.length === 0 ? (
        <Empty title="該部門沒有工時記錄" />
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
            <KPICard label="員工人數" value={kpi.employeeCount} unit="人" />
            <KPICard label="總工時" value={kpi.totalHours.toLocaleString()} unit="小時" sparkColor="#FF9900" />
            <KPICard label="參與 IP" value={kpi.ipCount} unit="個" sparkColor="#9B59B6" />
            <KPICard label="工作項目" value={kpi.taskCount} unit="項" sparkColor="#2BB673" />
          </div>

          {showCost && (
            <div className="grid grid-2" style={{ marginBottom: 'var(--gap)' }}>
              <KPICard
                label="估算成本"
                value={kpi.totalCost ? `$${kpi.totalCost.toLocaleString()}` : '—'}
                sparkColor="#E14D4D"
              />
              <KPICard
                label="平均每人工時"
                value={kpi.avgPerEmployee.toLocaleString()}
                unit="小時/人"
                sparkColor="#3498DB"
              />
            </div>
          )}

          <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
            <Card col={12} title="逐月工時趨勢" sub={`${monthlyTrend.length} 個月`}>
              {monthlyTrend.length > 0 ? <LineChart series={lineSeries} /> : <Empty title="無" />}
            </Card>
          </div>

          <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
            <Card col={4} title="員工貢獻" sub={`${employeeBreakdown.length} 人`}>
              <TopList items={employeeBreakdown} />
            </Card>
            <Card col={4} title="IP 分布" sub={`${ipBreakdown.length} 個`}>
              <TopList items={ipBreakdown.slice(0, 12)} />
            </Card>
            <Card
              col={4}
              title="工作項目"
              sub={
                wtFilteredCount > 0
                  ? `${workTypeBreakdown.length} 項（已排除 ${wtFilteredCount} 筆 IP 誤填）`
                  : `${workTypeBreakdown.length} 項`
              }
            >
              <TopList items={workTypeBreakdown.slice(0, 12)} />
            </Card>
          </div>

          <div className="grid grid-12">
            <Card col={12} title="月度明細">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th className="num">工時</th>
                      <th className="num">公司佔比</th>
                      {showCost && <th className="num">分攤成本</th>}
                      <th className="num">員工數</th>
                      <th className="num">工作項目</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyDetail.map((d) => (
                      <tr key={d.month}>
                        <td style={{ fontWeight: 600 }}>{d.label}</td>
                        <td className="num">{d.hours.toLocaleString()}</td>
                        <td className="num">{d.sharePct}%</td>
                        {showCost && (
                          <td className="num">{d.cost ? `$${d.cost.toLocaleString()}` : '—'}</td>
                        )}
                        <td className="num">{d.employees}</td>
                        <td className="num">{d.tasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </Drawer>
  );
}
