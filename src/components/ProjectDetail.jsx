/**
 * 專案進階分析 Drawer — 支援多層 drill-down
 *
 * Drill 的維度有 4 種：task（工作項目）/ employee（員工）/ department（部門）/ month（月份）
 * 從 root（單看 IP）出發，每點一個 sub-entity 就 push 進 drills，可一直深下去：
 *   老高與小茉 › 商開設計 › 陳敏佳 › 2026-01
 * 麵包屑顯示完整 path，每段可點回退到該層。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Drawer } from 'antd';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { KPICard, Card, LineChart, TopList, Empty } from './v2';
import { roundHours, formatMonthDisplay } from '../utils/dates';
import { useData } from '../data/DataContext';
import { useTheme } from './ThemeProvider';
import { isKnownIP } from '../utils/names';
import {
  makeMonthlyTrend,
  makeBreakdown,
  makeMonthlyDetail,
  calcEntityTotalCost,
} from '../utils/analyticsHelpers';

const KIND_LABEL = {
  task: '工作項目',
  employee: '員工',
  department: '部門',
  month: '月份',
};

function Breadcrumb({ project, drills, onPop, onClose }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
        marginBottom: 16,
        fontSize: 12,
      }}
    >
      <span
        onClick={() => onPop(0)}
        className="crumb"
        style={{
          padding: '4px 10px',
          borderRadius: 6,
          background: drills.length > 0 ? 'var(--bg-page-alt)' : 'var(--accent)',
          color: drills.length > 0 ? 'var(--fg-2)' : 'white',
          cursor: drills.length > 0 ? 'pointer' : 'default',
          fontWeight: 600,
        }}
      >
        {project}
      </span>
      {drills.map((d, i) => {
        const isLast = i === drills.length - 1;
        return (
          <React.Fragment key={i}>
            <span style={{ color: 'var(--fg-muted)' }}>›</span>
            <span
              onClick={() => !isLast && onPop(i + 1)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: isLast ? 'var(--accent)' : 'var(--bg-page-alt)',
                color: isLast ? 'white' : 'var(--fg-2)',
                cursor: isLast ? 'default' : 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title={isLast ? `${KIND_LABEL[d.kind]}` : '回到此層'}
            >
              <span
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  opacity: 0.7,
                  letterSpacing: '.06em',
                }}
              >
                {KIND_LABEL[d.kind]}
              </span>
              {d.kind === 'month' ? formatMonthDisplay(d.value) : d.value}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function ProjectDetail({ project, onClose }) {
  const { workLogs, salaryData } = useData();
  const { showCost, customIPs } = useTheme();
  const [drills, setDrills] = useState([]);

  // 切換專案時重置 drill
  useEffect(() => {
    setDrills([]);
  }, [project]);

  const projectLogs = useMemo(
    () => (project ? workLogs.filter((l) => l.ipProject === project) : []),
    [workLogs, project]
  );

  // 套用 drill 過濾
  const filteredLogs = useMemo(() => {
    return projectLogs.filter((l) =>
      drills.every((d) => {
        if (d.kind === 'task') return l.workType === d.value;
        if (d.kind === 'employee') return l.employee === d.value;
        if (d.kind === 'department') return l.department === d.value;
        if (d.kind === 'month') return l.month === d.value;
        return true;
      })
    );
  }, [projectLogs, drills]);

  const drilledKinds = useMemo(() => new Set(drills.map((d) => d.kind)), [drills]);

  // KPI
  const kpi = useMemo(() => {
    const totalHours = roundHours(sumBy(filteredLogs, 'hours'));
    const employeeCount = new Set(filteredLogs.map((l) => l.employee)).size;
    const monthCount = new Set(filteredLogs.map((l) => l.month)).size;
    const taskCount = new Set(filteredLogs.map((l) => l.task)).size;
    const totalCost = calcEntityTotalCost(filteredLogs, workLogs, salaryData);
    return {
      totalHours,
      employeeCount,
      monthCount,
      taskCount,
      totalCost,
      avgCostPerHour: totalHours > 0 && totalCost > 0 ? Math.round(totalCost / totalHours) : null,
    };
  }, [filteredLogs, workLogs, salaryData]);

  // 月度趨勢
  const monthlyTrend = useMemo(() => makeMonthlyTrend(filteredLogs), [filteredLogs]);
  const lineSeries = useMemo(
    () => [
      {
        data: monthlyTrend.map((d) => ({ label: d.label, value: d.hours })),
        color: 'var(--accent)',
      },
    ],
    [monthlyTrend]
  );

  // 工作項目（過濾 IP 名稱誤填）
  const taskLogs = useMemo(
    () => filteredLogs.filter((l) => !isKnownIP(l.task, customIPs)),
    [filteredLogs, customIPs]
  );
  const taskFilteredOut = filteredLogs.length - taskLogs.length;
  const taskBreakdown = useMemo(
    () => makeBreakdown(taskLogs, (l) => l.task || '未分類', kpi.totalHours),
    [taskLogs, kpi.totalHours]
  );

  const employeeBreakdown = useMemo(
    () => makeBreakdown(filteredLogs, (l) => l.employee, kpi.totalHours),
    [filteredLogs, kpi.totalHours]
  );
  const deptBreakdown = useMemo(
    () => makeBreakdown(filteredLogs, (l) => l.department, kpi.totalHours),
    [filteredLogs, kpi.totalHours]
  );
  const monthlyDetail = useMemo(
    () => makeMonthlyDetail(filteredLogs, workLogs, salaryData),
    [filteredLogs, workLogs, salaryData]
  );

  const pushDrill = (kind, value) => setDrills((d) => [...d, { kind, value }]);
  const popToLevel = (level) => setDrills((d) => d.slice(0, level));

  const open = !!project;
  const isRoot = drills.length === 0;
  const lastDrill = drills[drills.length - 1];

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
            {isRoot ? 'PROJECT DETAIL' : `DRILL · ${KIND_LABEL[lastDrill.kind]}`}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
            {isRoot ? project : lastDrill.value}
          </div>
        </div>
      }
      styles={{ body: { padding: 24, background: 'var(--bg-page-alt)' } }}
    >
      <Breadcrumb project={project} drills={drills} onPop={popToLevel} />

      {filteredLogs.length === 0 ? (
        <Empty title="沒有對應的工時記錄" />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
            <KPICard label="工時" value={kpi.totalHours.toLocaleString()} unit="小時" />
            <KPICard label="參與人員" value={kpi.employeeCount} unit="人" sparkColor="#FF9900" />
            <KPICard label="跨越月數" value={kpi.monthCount} unit="月" sparkColor="#9B59B6" />
            <KPICard label="工作項目" value={kpi.taskCount} unit="項" sparkColor="#2BB673" />
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

          {/* 月度趨勢（month drilled 後就不顯示，因為只剩單月） */}
          {!drilledKinds.has('month') && (
            <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
              <Card col={12} title="逐月工時趨勢" sub={`${monthlyTrend.length} 個月`}>
                {monthlyTrend.length > 0 ? <LineChart series={lineSeries} /> : <Empty title="無" />}
              </Card>
            </div>
          )}

          {/* 動態 breakdowns — 已 drill 過的維度不再顯示 */}
          <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
            {!drilledKinds.has('task') && (
              <Card
                col={6}
                title="工作項目分布"
                sub={
                  taskFilteredOut > 0
                    ? `${taskBreakdown.length} 項（已排除 ${taskFilteredOut} 筆 IP 誤填）`
                    : `${taskBreakdown.length} 項 · 點擊深入分析`
                }
              >
                {taskBreakdown.length > 0 ? (
                  <TopList
                    items={taskBreakdown.slice(0, 12).map((t) => ({
                      ...t,
                      onClick: () => pushDrill('task', t.label),
                    }))}
                    maxHeight={taskBreakdown.length > 12 ? 360 : undefined}
                  />
                ) : (
                  <Empty title="無資料" />
                )}
              </Card>
            )}

            {!drilledKinds.has('department') && (
              <Card
                col={6}
                title="部門貢獻"
                sub={`${deptBreakdown.length} 個部門 · 點擊深入分析`}
              >
                {deptBreakdown.length > 0 ? (
                  <TopList
                    items={deptBreakdown.map((d) => ({
                      ...d,
                      onClick: () => pushDrill('department', d.label),
                    }))}
                  />
                ) : (
                  <Empty title="無資料" />
                )}
              </Card>
            )}

            {!drilledKinds.has('employee') && (
              <Card
                col={12}
                title="人員貢獻"
                sub={`${employeeBreakdown.length} 位員工 · 點擊深入分析`}
              >
                {employeeBreakdown.length > 0 ? (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>員工</th>
                          <th className="num">工時</th>
                          <th>佔比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeBreakdown.map((e) => (
                          <tr
                            key={e.key}
                            onClick={() => pushDrill('employee', e.label)}
                            style={{ cursor: 'pointer' }}
                            title="點擊深入分析"
                          >
                            <td style={{ fontWeight: 600 }}>{e.label}</td>
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
            )}
          </div>

          {/* 月度明細（month drilled 後不顯示） */}
          {!drilledKinds.has('month') && (
            <div className="grid grid-12">
              <Card col={12} title="月度明細" sub="點月份深入該月細節">
                {monthlyDetail.length > 0 ? (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>月份</th>
                          <th className="num">工時</th>
                          <th className="num">公司佔比</th>
                          {showCost && <th className="num">分攤成本</th>}
                          <th className="num">人員</th>
                          <th className="num">工作項目</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyDetail.map((d) => (
                          <tr
                            key={d.month}
                            onClick={() => pushDrill('month', d.month)}
                            style={{ cursor: 'pointer' }}
                            title="點擊查看該月細節"
                          >
                            <td style={{ fontWeight: 600 }}>{d.label}</td>
                            <td className="num">{d.hours.toLocaleString()}</td>
                            <td className="num">{d.sharePct}%</td>
                            {showCost && (
                              <td className="num">
                                {d.cost ? `$${d.cost.toLocaleString()}` : '—'}
                              </td>
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
          )}

          {/* month drill 模式：顯示日級明細 */}
          {drilledKinds.has('month') && (
            <DailyDetail logs={filteredLogs} />
          )}
        </>
      )}
    </Drawer>
  );
}

// 當 drill 到具體月份後，顯示該月每天的明細
function DailyDetail({ logs }) {
  const dayRows = useMemo(() => {
    const grouped = groupBy(logs, 'date');
    return orderBy(
      Object.entries(grouped).map(([date, items]) => ({
        date,
        hours: roundHours(sumBy(items, 'hours')),
        employees: new Set(items.map((l) => l.employee)).size,
        tasks: new Set(items.map((l) => l.task)).size,
        items,
      })),
      'date'
    );
  }, [logs]);

  return (
    <div className="grid grid-12">
      <Card col={12} title="每日明細" sub={`${dayRows.length} 個工作日`}>
        <div className="tbl-wrap" style={{ maxHeight: 480, overflowY: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>日期</th>
                <th>員工</th>
                <th>工作項目</th>
                <th className="num">時數</th>
              </tr>
            </thead>
            <tbody>
              {dayRows.flatMap((d) =>
                d.items.map((item, idx) => (
                  <tr key={`${d.date}-${idx}`}>
                    <td style={{ fontWeight: idx === 0 ? 600 : 400, color: idx === 0 ? 'inherit' : 'var(--fg-3)' }}>
                      {idx === 0 ? d.date : ''}
                    </td>
                    <td>{item.employee}</td>
                    <td>{item.task}</td>
                    <td className="num">{roundHours(item.hours)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
