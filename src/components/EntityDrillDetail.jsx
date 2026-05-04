/**
 * 通用 Entity Drill-down Drawer
 *
 * 共用一份畫面，接 rootKind（project / employee / department / workType）
 * 與 rootValue 顯示對應 entity 的進階分析，支援多層下鑽。
 *
 * Drill 維度（5 種）：
 *   project（IP）/ employee（員工）/ department（部門）/ workType（工作項目）/ month（月份）
 *
 * 已被 root 或先前 drill 鎖定的維度，不會再出現在 breakdown
 * （例：rootKind=employee 時不顯示「員工」breakdown，只顯示 IP / 部門 / 工作項目 / 月份）
 */
import React, { useEffect, useMemo } from 'react';
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
import { useRoute } from '../router/RouteProvider';

const KIND_LABEL = {
  project: 'IP',
  employee: '員工',
  department: '部門',
  workType: '工作項目',
  month: '月份',
};

const ROOT_TITLE = {
  project: 'PROJECT DETAIL',
  employee: 'EMPLOYEE DETAIL',
  department: 'DEPARTMENT DETAIL',
  workType: 'WORK TYPE DETAIL',
};

// 一條 log 是否符合某個 (kind, value) 條件
function matchKindValue(log, kind, value) {
  switch (kind) {
    case 'project':
      return log.ipProject === value;
    case 'employee':
      return log.employee === value;
    case 'department':
      return log.department === value;
    case 'workType':
      return log.workType === value;
    case 'month':
      return log.month === value;
    default:
      return true;
  }
}

function Breadcrumb({ rootKind, rootValue, drills, onPop }) {
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
        style={{
          padding: '4px 10px',
          borderRadius: 6,
          background: drills.length > 0 ? 'var(--bg-page-alt)' : 'var(--accent)',
          color: drills.length > 0 ? 'var(--fg-2)' : 'white',
          cursor: drills.length > 0 ? 'pointer' : 'default',
          fontWeight: 600,
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center',
        }}
        title={drills.length > 0 ? '回到根層' : undefined}
      >
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            opacity: 0.7,
            letterSpacing: '.06em',
          }}
        >
          {KIND_LABEL[rootKind]}
        </span>
        {rootKind === 'month' ? formatMonthDisplay(rootValue) : rootValue}
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
                gap: 6,
                alignItems: 'center',
              }}
              title={isLast ? KIND_LABEL[d.kind] : '回到此層'}
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

function DailyDetail({ logs }) {
  const dayRows = useMemo(() => {
    const grouped = groupBy(logs, 'date');
    return orderBy(
      Object.entries(grouped).map(([date, items]) => ({
        date,
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
                <th>授權 IP</th>
                <th className="num">時數</th>
              </tr>
            </thead>
            <tbody>
              {dayRows.flatMap((d) =>
                d.items.map((item, idx) => (
                  <tr key={`${d.date}-${idx}`}>
                    <td
                      style={{
                        fontWeight: idx === 0 ? 600 : 400,
                        color: idx === 0 ? 'inherit' : 'var(--fg-3)',
                      }}
                    >
                      {idx === 0 ? d.date : ''}
                    </td>
                    <td>{item.employee}</td>
                    <td>{item.task}</td>
                    <td>
                      <span className="tag">{item.ipProject}</span>
                    </td>
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

export default function EntityDrillDetail({ rootKind, rootValue, onClose }) {
  const { workLogs, salaryData } = useData();
  const { showCost, customIPs } = useTheme();
  const { route, pushDrill: routePushDrill, popDrillsTo: routePopTo } = useRoute();
  const drills = route.drills || [];

  const rootLogs = useMemo(() => {
    if (!rootValue) return [];
    return workLogs.filter((l) => matchKindValue(l, rootKind, rootValue));
  }, [workLogs, rootKind, rootValue]);

  const filteredLogs = useMemo(() => {
    return rootLogs.filter((l) =>
      drills.every((d) => matchKindValue(l, d.kind, d.value))
    );
  }, [rootLogs, drills]);

  // 已鎖定維度（含 root）
  const lockedKinds = useMemo(
    () => new Set([rootKind, ...drills.map((d) => d.kind)]),
    [rootKind, drills]
  );

  // KPI
  const kpi = useMemo(() => {
    const totalHours = roundHours(sumBy(filteredLogs, 'hours'));
    const employeeCount = new Set(filteredLogs.map((l) => l.employee)).size;
    const monthCount = new Set(filteredLogs.map((l) => l.month)).size;
    const taskCount = new Set(filteredLogs.map((l) => l.task)).size;
    const ipCount = new Set(
      filteredLogs.filter((l) => l.ipProject !== '非授權IP').map((l) => l.ipProject)
    ).size;
    const deptCount = new Set(filteredLogs.map((l) => l.department)).size;
    const days = new Set(filteredLogs.map((l) => l.date)).size;
    const totalCost = calcEntityTotalCost(filteredLogs, workLogs, salaryData);
    return {
      totalHours,
      employeeCount,
      monthCount,
      taskCount,
      ipCount,
      deptCount,
      days,
      totalCost,
      avgCostPerHour:
        totalHours > 0 && totalCost > 0 ? Math.round(totalCost / totalHours) : null,
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
    () => filteredLogs.filter((l) => !isKnownIP(l.workType, customIPs)),
    [filteredLogs, customIPs]
  );
  const taskFilteredOut = filteredLogs.length - taskLogs.length;
  const taskBreakdown = useMemo(
    () => makeBreakdown(taskLogs, (l) => l.workType, kpi.totalHours),
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
  const ipBreakdown = useMemo(
    () => makeBreakdown(filteredLogs, (l) => l.ipProject, kpi.totalHours),
    [filteredLogs, kpi.totalHours]
  );
  const monthlyDetail = useMemo(
    () => makeMonthlyDetail(filteredLogs, workLogs, salaryData),
    [filteredLogs, workLogs, salaryData]
  );

  const pushDrill = (kind, value) => routePushDrill(kind, value);
  const popToLevel = (level) => routePopTo(level);

  const open = !!rootValue;
  const isRoot = drills.length === 0;
  const lastDrill = drills[drills.length - 1];

  // Title 取 root metadata
  const rootMetadata = useMemo(() => {
    if (rootKind === 'employee' && rootLogs[0]) {
      return rootLogs[0].department;
    }
    return null;
  }, [rootKind, rootLogs]);

  const rootIsIpLikeWorkType = rootKind === 'workType' && isKnownIP(rootValue, customIPs);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width="min(1000px, 94vw)"
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
            {isRoot
              ? `${ROOT_TITLE[rootKind] || 'DETAIL'}${rootMetadata ? ' · ' + rootMetadata : ''}`
              : `DRILL · ${KIND_LABEL[lastDrill.kind]}`}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {isRoot ? rootValue : lastDrill.value}
            {rootIsIpLikeWorkType && isRoot && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--state-warn, #F2994A)',
                  background: 'rgba(242,153,74,0.16)',
                  padding: '2px 8px',
                  borderRadius: 999,
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
      <Breadcrumb
        rootKind={rootKind}
        rootValue={rootValue}
        drills={drills}
        onPop={popToLevel}
      />

      {filteredLogs.length === 0 ? (
        <Empty title="沒有對應的工時記錄" />
      ) : (
        <>
          {/* KPI row — 視 lockedKinds 動態決定哪些 KPI 有意義 */}
          <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
            <KPICard label="工時" value={kpi.totalHours.toLocaleString()} unit="小時" />
            {!lockedKinds.has('employee') && (
              <KPICard label="參與人員" value={kpi.employeeCount} unit="人" sparkColor="#FF9900" />
            )}
            {lockedKinds.has('employee') && (
              <KPICard label="出勤天數" value={kpi.days} unit="天" sparkColor="#FF9900" />
            )}
            {!lockedKinds.has('month') && (
              <KPICard label="跨越月數" value={kpi.monthCount} unit="月" sparkColor="#9B59B6" />
            )}
            {lockedKinds.has('month') && (
              <KPICard label="出勤天數" value={kpi.days} unit="天" sparkColor="#9B59B6" />
            )}
            {!lockedKinds.has('workType') && (
              <KPICard label="工作項目" value={kpi.taskCount} unit="項" sparkColor="#2BB673" />
            )}
            {lockedKinds.has('workType') && !lockedKinds.has('project') && (
              <KPICard label="關聯 IP" value={kpi.ipCount} unit="個" sparkColor="#2BB673" />
            )}
            {lockedKinds.has('workType') && lockedKinds.has('project') && (
              <KPICard label="跨部門" value={kpi.deptCount} unit="個" sparkColor="#2BB673" />
            )}
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

          {/* 月度趨勢 — 只有非 month locked 時才顯示 */}
          {!lockedKinds.has('month') && (
            <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
              <Card col={12} title="逐月工時趨勢" sub={`${monthlyTrend.length} 個月`}>
                {monthlyTrend.length > 0 ? (
                  <LineChart series={lineSeries} />
                ) : (
                  <Empty title="無" />
                )}
              </Card>
            </div>
          )}

          {/* 動態 breakdowns — 已鎖定的維度不顯示 */}
          <div className="grid grid-12" style={{ marginBottom: 'var(--gap)' }}>
            {!lockedKinds.has('project') && ipBreakdown.length > 1 && (
              <Card
                col={6}
                title="IP 分布"
                sub={`${ipBreakdown.length} 個 IP · 點擊深入分析`}
              >
                <TopList
                  items={ipBreakdown.slice(0, 12).map((x) => ({
                    ...x,
                    onClick: () => pushDrill('project', x.label),
                  }))}
                  maxHeight={ipBreakdown.length > 12 ? 360 : undefined}
                />
              </Card>
            )}

            {!lockedKinds.has('workType') && (
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
                      onClick: () => pushDrill('workType', t.label),
                    }))}
                    maxHeight={taskBreakdown.length > 12 ? 360 : undefined}
                  />
                ) : (
                  <Empty title="無資料" />
                )}
              </Card>
            )}

            {!lockedKinds.has('department') && deptBreakdown.length > 1 && (
              <Card
                col={6}
                title="部門貢獻"
                sub={`${deptBreakdown.length} 個部門 · 點擊深入分析`}
              >
                <TopList
                  items={deptBreakdown.map((d) => ({
                    ...d,
                    onClick: () => pushDrill('department', d.label),
                  }))}
                />
              </Card>
            )}

            {!lockedKinds.has('employee') && (
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

          {/* 月度明細 / 每日明細 */}
          {!lockedKinds.has('month') ? (
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
          ) : (
            <DailyDetail logs={filteredLogs} />
          )}
        </>
      )}
    </Drawer>
  );
}
