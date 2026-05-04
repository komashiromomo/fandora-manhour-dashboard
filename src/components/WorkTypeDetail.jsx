/**
 * 單一工作項目進階分析 Drawer
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



export default function WorkTypeDetail({ workType, onClose }) {
  const { workLogs, salaryData } = useData();
  const { showCost, customIPs } = useTheme();

  const wtLogs = useMemo(
    () => workLogs.filter((l) => l.workType === workType),
    [workLogs, workType]
  );

  const kpi = useMemo(() => {
    const totalHours = roundHours(sumBy(wtLogs, 'hours'));
    const employeeCount = new Set(wtLogs.map((l) => l.employee)).size;
    const deptCount = new Set(wtLogs.map((l) => l.department)).size;
    const ipCount = new Set(
      wtLogs.filter((l) => l.ipProject !== '非授權IP').map((l) => l.ipProject)
    ).size;
    const totalCost = calcEntityTotalCost(wtLogs, workLogs, salaryData);
    return { totalHours, employeeCount, deptCount, ipCount, totalCost };
  }, [wtLogs, workLogs, salaryData]);

  const monthlyTrend = useMemo(() => makeMonthlyTrend(wtLogs), [wtLogs]);
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
    () => makeBreakdown(wtLogs, (l) => l.employee, kpi.totalHours),
    [wtLogs, kpi.totalHours]
  );
  const deptBreakdown = useMemo(
    () => makeBreakdown(wtLogs, (l) => l.department, kpi.totalHours),
    [wtLogs, kpi.totalHours]
  );
  const ipBreakdown = useMemo(
    () => makeBreakdown(wtLogs, (l) => l.ipProject, kpi.totalHours),
    [wtLogs, kpi.totalHours]
  );
  const monthlyDetail = useMemo(
    () => makeMonthlyDetail(wtLogs, workLogs, salaryData),
    [wtLogs, workLogs, salaryData]
  );

  const open = !!workType;
  const looksLikeIp = workType && isKnownIP(workType, customIPs);

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
            WORK TYPE DETAIL
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
            {workType}
            {looksLikeIp && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--state-warn, #F2994A)',
                  background: 'rgba(242,153,74,0.16)',
                  padding: '2px 8px',
                  borderRadius: 999,
                  verticalAlign: 'middle',
                }}
              >
                ⚠ 此名稱其實是 IP
              </span>
            )}
          </div>
        </div>
      }
      styles={{ body: { padding: 24, background: 'var(--bg-page-alt)' } }}
    >
      {wtLogs.length === 0 ? (
        <Empty title="該工作項目沒有記錄" />
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
            <KPICard label="總工時" value={kpi.totalHours.toLocaleString()} unit="小時" />
            <KPICard label="參與員工" value={kpi.employeeCount} unit="人" sparkColor="#FF9900" />
            <KPICard label="跨部門" value={kpi.deptCount} unit="個" sparkColor="#9B59B6" />
            <KPICard label="關聯 IP" value={kpi.ipCount} unit="個" sparkColor="#2BB673" />
          </div>

          {showCost && kpi.totalCost > 0 && (
            <div className="grid grid-2" style={{ marginBottom: 'var(--gap)' }}>
              <KPICard
                label="估算成本"
                value={`$${kpi.totalCost.toLocaleString()}`}
                sparkColor="#E14D4D"
              />
              <KPICard
                label="跨越月份"
                value={monthlyTrend.length}
                unit="月"
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
              <TopList items={employeeBreakdown.slice(0, 15)} />
            </Card>
            <Card col={4} title="部門貢獻" sub={`${deptBreakdown.length} 個`}>
              <TopList items={deptBreakdown} />
            </Card>
            <Card col={4} title="關聯 IP" sub={`${ipBreakdown.length} 個`}>
              <TopList items={ipBreakdown.slice(0, 12)} />
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
