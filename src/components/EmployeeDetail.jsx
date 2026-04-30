/**
 * 單一員工進階分析 Drawer
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

export default function EmployeeDetail({ employee, onClose }) {
  const { workLogs, salaryData } = useData();
  const { showCost } = useTheme();

  const empLogs = useMemo(
    () => workLogs.filter((l) => l.employee === employee),
    [workLogs, employee]
  );

  const kpi = useMemo(() => {
    const totalHours = roundHours(sumBy(empLogs, 'hours'));
    const ipCount = new Set(
      empLogs.filter((l) => l.ipProject !== '非授權IP').map((l) => l.ipProject)
    ).size;
    const taskCount = new Set(empLogs.map((l) => l.workType)).size;
    const days = new Set(empLogs.map((l) => l.date)).size;
    const monthCount = new Set(empLogs.map((l) => l.month)).size;
    const department = empLogs[0]?.department || '—';
    const totalCost = calcEntityTotalCost(empLogs, workLogs, salaryData);
    return {
      totalHours,
      ipCount,
      taskCount,
      days,
      monthCount,
      department,
      totalCost,
      avgDailyHours: days > 0 ? roundHours(totalHours / days) : 0,
      costPerHour: totalHours > 0 && totalCost > 0 ? Math.round(totalCost / totalHours) : null,
    };
  }, [empLogs, workLogs, salaryData]);

  const monthlyTrend = useMemo(() => makeMonthlyTrend(empLogs), [empLogs]);
  const lineSeries = useMemo(
    () => [
      {
        data: monthlyTrend.map((d) => ({ label: d.label, value: d.hours })),
        color: 'var(--accent)',
      },
    ],
    [monthlyTrend]
  );

  const ipBreakdown = useMemo(
    () => makeBreakdown(empLogs, (l) => l.ipProject, kpi.totalHours),
    [empLogs, kpi.totalHours]
  );
  const workTypeBreakdown = useMemo(
    () => makeBreakdown(empLogs, (l) => l.workType, kpi.totalHours),
    [empLogs, kpi.totalHours]
  );
  const monthlyDetail = useMemo(
    () => makeMonthlyDetail(empLogs, workLogs, salaryData),
    [empLogs, workLogs, salaryData]
  );

  const open = !!employee;

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
            EMPLOYEE DETAIL · {kpi.department}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{employee}</div>
        </div>
      }
      styles={{ body: { padding: 24, background: 'var(--bg-page-alt)' } }}
    >
      {empLogs.length === 0 ? (
        <Empty title="該員工沒有工時記錄" />
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
            <KPICard label="總工時" value={kpi.totalHours.toLocaleString()} unit="小時" />
            <KPICard label="參與 IP" value={kpi.ipCount} unit="個" sparkColor="#FF9900" />
            <KPICard label="工作項目" value={kpi.taskCount} unit="項" sparkColor="#9B59B6" />
            <KPICard label="出勤天數" value={kpi.days} unit="天" sparkColor="#2BB673" />
          </div>

          {showCost && (
            <div className="grid grid-3" style={{ marginBottom: 'var(--gap)' }}>
              <KPICard label="跨越月份" value={kpi.monthCount} unit="月" sparkColor="#3498DB" />
              <KPICard
                label="估算成本"
                value={kpi.totalCost ? `$${kpi.totalCost.toLocaleString()}` : '—'}
                sparkColor="#E14D4D"
              />
              <KPICard
                label="平均時薪"
                value={kpi.costPerHour ? `$${kpi.costPerHour.toLocaleString()}` : '—'}
                unit="/小時"
                sparkColor="#1ABC9C"
              />
            </div>
          )}

          <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
            <Card col={12} title="逐月工時趨勢" sub={`${monthlyTrend.length} 個月`}>
              {monthlyTrend.length > 0 ? <LineChart series={lineSeries} /> : <Empty title="無" />}
            </Card>
          </div>

          <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
            <Card col={6} title="IP 分布" sub={`${ipBreakdown.length} 個 IP`}>
              {ipBreakdown.length > 0 ? (
                <TopList items={ipBreakdown.slice(0, 12)} />
              ) : (
                <Empty title="無" />
              )}
            </Card>
            <Card col={6} title="工作項目分布" sub={`${workTypeBreakdown.length} 項`}>
              {workTypeBreakdown.length > 0 ? (
                <TopList items={workTypeBreakdown.slice(0, 12)} />
              ) : (
                <Empty title="無" />
              )}
            </Card>
          </div>

          <div className="grid grid-12">
            <Card col={12} title="月度明細" sub="按月份逐項拆解">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th className="num">工時</th>
                      <th className="num">公司佔比</th>
                      {showCost && <th className="num">分攤成本</th>}
                      <th className="num">出勤天數</th>
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
                        <td className="num">
                          {monthlyTrend.find((x) => x.month === d.month)?.days || 0}
                        </td>
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
