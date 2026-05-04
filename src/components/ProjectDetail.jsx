/**
 * 單一專案進階分析 Drawer
 * 從 ProjectPage 點擊某個 IP 觸發，從右側滑出詳細分析
 */
import React, { useMemo } from 'react';
import { Drawer } from 'antd';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { KPICard, Card, LineChart, TopList, Empty } from './v2';
import { roundHours, formatMonthDisplay } from '../utils/dates';
import { useData } from '../data/DataContext';
import { buildMonthCostMap } from '../utils/costCalculator';
import { useTheme } from './ThemeProvider';
import { isKnownIP } from '../utils/names';

export default function ProjectDetail({ project, onClose }) {
  const { workLogs, salaryData } = useData();
  const { showCost, customIPs } = useTheme();

  // 鎖定該專案的 logs（用全量 workLogs，避免被當前 filter 限縮 — detail 要看全貌）
  const projectLogs = useMemo(
    () => workLogs.filter((l) => l.ipProject === project),
    [workLogs, project]
  );

  // ===== KPI =====
  const kpi = useMemo(() => {
    const totalHours = roundHours(sumBy(projectLogs, 'hours'));
    const employeeCount = new Set(projectLogs.map((l) => l.employee)).size;
    const monthCount = new Set(projectLogs.map((l) => l.month)).size;
    const taskCount = new Set(projectLogs.map((l) => l.task)).size;

    // 月度成本分攤
    const monthCost = buildMonthCostMap(salaryData);
    const monthHours = {};
    const projMonthHours = {};
    workLogs.forEach((l) => {
      monthHours[l.month] = (monthHours[l.month] || 0) + l.hours;
    });
    projectLogs.forEach((l) => {
      projMonthHours[l.month] = (projMonthHours[l.month] || 0) + l.hours;
    });
    let totalCost = 0;
    Object.entries(projMonthHours).forEach(([m, h]) => {
      const cost = monthCost[m];
      const totalH = monthHours[m];
      if (cost && totalH) totalCost += cost * (h / totalH);
    });

    return {
      totalHours,
      employeeCount,
      monthCount,
      taskCount,
      totalCost: Math.round(totalCost),
      avgCostPerHour: totalHours > 0 && totalCost > 0 ? Math.round(totalCost / totalHours) : null,
    };
  }, [projectLogs, workLogs, salaryData]);

  // ===== 月度趨勢 =====
  const monthlyTrend = useMemo(() => {
    const grouped = groupBy(projectLogs, 'month');
    return orderBy(
      Object.entries(grouped).map(([m, logs]) => ({
        month: m,
        label: formatMonthDisplay(m),
        hours: roundHours(sumBy(logs, 'hours')),
      })),
      'month'
    );
  }, [projectLogs]);

  const lineSeries = useMemo(
    () => [
      {
        data: monthlyTrend.map((d) => ({ label: d.label, value: d.hours })),
        color: 'var(--accent)',
      },
    ],
    [monthlyTrend]
  );

  // ===== 工作項目 breakdown =====
  // 過濾掉「workType 其實是 IP 名稱」的誤填條目，避免「老高與小茉的工作項目分布裡出現魔物獵人」
  const taskBreakdown = useMemo(() => {
    const filtered = projectLogs.filter((l) => !isKnownIP(l.task, customIPs));
    const grouped = groupBy(filtered, 'task');
    return orderBy(
      Object.entries(grouped).map(([task, logs]) => ({
        label: task || '未分類',
        value: roundHours(sumBy(logs, 'hours')),
        employees: new Set(logs.map((l) => l.employee)).size,
      })),
      'value',
      'desc'
    );
  }, [projectLogs, customIPs]);

  const filteredOutByIp = useMemo(
    () => projectLogs.filter((l) => isKnownIP(l.task, customIPs)).length,
    [projectLogs, customIPs]
  );

  // ===== 員工貢獻 =====
  const employeeBreakdown = useMemo(() => {
    const grouped = groupBy(projectLogs, 'employee');
    return orderBy(
      Object.entries(grouped).map(([employee, logs]) => ({
        label: `${employee}（${logs[0]?.department || '—'}）`,
        employee,
        department: logs[0]?.department,
        value: roundHours(sumBy(logs, 'hours')),
        pct: kpi.totalHours > 0 ? roundHours((sumBy(logs, 'hours') * 100) / kpi.totalHours) : 0,
      })),
      'value',
      'desc'
    );
  }, [projectLogs, kpi.totalHours]);

  // ===== 部門貢獻 =====
  const deptBreakdown = useMemo(() => {
    const grouped = groupBy(projectLogs, 'department');
    return orderBy(
      Object.entries(grouped).map(([department, logs]) => ({
        label: department || '未知',
        value: roundHours(sumBy(logs, 'hours')),
        employees: new Set(logs.map((l) => l.employee)).size,
      })),
      'value',
      'desc'
    );
  }, [projectLogs]);

  // ===== 月度詳細表 =====
  const monthlyDetail = useMemo(() => {
    const monthCost = buildMonthCostMap(salaryData);
    const monthHoursAll = {};
    workLogs.forEach((l) => {
      monthHoursAll[l.month] = (monthHoursAll[l.month] || 0) + l.hours;
    });

    const grouped = groupBy(projectLogs, 'month');
    return orderBy(
      Object.entries(grouped).map(([m, logs]) => {
        const hours = roundHours(sumBy(logs, 'hours'));
        const totalH = monthHoursAll[m] || 0;
        const monthCostVal = monthCost[m] || 0;
        const cost =
          totalH > 0 && monthCostVal > 0 ? Math.round(monthCostVal * (hours / totalH)) : 0;
        const sharePct = totalH > 0 ? roundHours((hours * 100) / totalH) : 0;
        return {
          month: m,
          label: formatMonthDisplay(m),
          hours,
          sharePct,
          cost,
          employees: new Set(logs.map((l) => l.employee)).size,
          tasks: new Set(logs.map((l) => l.task)).size,
        };
      }),
      'month',
      'desc'
    );
  }, [projectLogs, workLogs, salaryData]);

  const open = !!project;

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
            PROJECT DETAIL
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{project}</div>
        </div>
      }
      styles={{ body: { padding: 24, background: 'var(--bg-page-alt)' } }}
    >
      {projectLogs.length === 0 ? (
        <Empty title="該專案沒有工時記錄" />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
            <KPICard label="總工時" value={kpi.totalHours.toLocaleString()} unit="小時" />
            <KPICard label="參與人員" value={kpi.employeeCount} unit="人" sparkColor="#FF9900" />
            <KPICard label="跨越月數" value={kpi.monthCount} unit="月" sparkColor="#9B59B6" />
            <KPICard
              label="工作項目"
              value={kpi.taskCount}
              unit="項"
              sparkColor="#2BB673"
            />
          </div>

          {showCost && (kpi.totalCost > 0 || kpi.avgCostPerHour) && (
            <div className="grid grid-2" style={{ marginBottom: 'var(--gap)' }}>
              <KPICard
                label="估算成本"
                value={kpi.totalCost ? `$${kpi.totalCost.toLocaleString()}` : '—'}
                sparkColor="#E14D4D"
              />
              <KPICard
                label="平均時薪"
                value={kpi.avgCostPerHour ? `$${kpi.avgCostPerHour.toLocaleString()}` : '—'}
                unit="/小時"
                sparkColor="#3498DB"
              />
            </div>
          )}

          {/* 月度趨勢 */}
          <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
            <Card col={12} title="逐月工時趨勢" sub={`${monthlyTrend.length} 個月`}>
              {monthlyTrend.length > 0 ? (
                <LineChart series={lineSeries} />
              ) : (
                <Empty title="無月度資料" />
              )}
            </Card>
          </div>

          {/* 工作項目 + 員工貢獻 + 部門貢獻 */}
          <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
            <Card
              col={6}
              title="工作項目分布"
              sub={
                filteredOutByIp > 0
                  ? `${taskBreakdown.length} 項（已排除 ${filteredOutByIp} 筆把 IP 當工作項目的誤填）`
                  : `${taskBreakdown.length} 項`
              }
            >
              {taskBreakdown.length > 0 ? (
                <TopList items={taskBreakdown.slice(0, 10)} />
              ) : (
                <Empty title="無資料" />
              )}
            </Card>
            <Card col={6} title="部門貢獻" sub={`${deptBreakdown.length} 個部門`}>
              {deptBreakdown.length > 0 ? (
                <TopList items={deptBreakdown} />
              ) : (
                <Empty title="無資料" />
              )}
            </Card>
            <Card col={12} title="人員貢獻" sub={`${employeeBreakdown.length} 位員工`}>
              {employeeBreakdown.length > 0 ? (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>員工</th>
                        <th>部門</th>
                        <th className="num">工時</th>
                        <th>佔比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeBreakdown.map((e) => (
                        <tr key={e.employee}>
                          <td style={{ fontWeight: 600 }}>{e.employee}</td>
                          <td>
                            <span className="tag">{e.department || '—'}</span>
                          </td>
                          <td className="num">{e.value.toLocaleString()}</td>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                minWidth: 160,
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  height: 6,
                                  background: 'var(--bg-page-alt)',
                                  borderRadius: 3,
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(100, e.pct)}%`,
                                    background: 'var(--accent)',
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontFamily: 'var(--font-numeric)',
                                  fontSize: 12,
                                  color: 'var(--fg-3)',
                                  minWidth: 44,
                                  textAlign: 'right',
                                }}
                              >
                                {e.pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="無資料" />
              )}
            </Card>
          </div>

          {/* 月度詳細表 */}
          <div className="grid grid-12">
            <Card col={12} title="月度明細" sub="按月份逐項拆解">
              {monthlyDetail.length > 0 ? (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>月份</th>
                        <th className="num">工時</th>
                        <th className="num">公司佔比</th>
                        {showCost && <th className="num">分攤成本</th>}
                        <th className="num">參與人員</th>
                        <th className="num">工作項目數</th>
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
              ) : (
                <Empty title="無月度資料" />
              )}
            </Card>
          </div>
        </>
      )}
    </Drawer>
  );
}
