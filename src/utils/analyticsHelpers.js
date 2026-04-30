/**
 * Detail drawer 共用分析 helper
 * 給 ProjectDetail / EmployeeDetail / DepartmentDetail / WorkTypeDetail 用
 */
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { roundHours, formatMonthDisplay } from './dates';
import { buildMonthCostMap } from './costCalculator';

/** 月度趨勢：[{ month, label, hours, days, employees }] (依月份升冪) */
export function makeMonthlyTrend(logs) {
  const grouped = groupBy(logs, 'month');
  return orderBy(
    Object.entries(grouped).map(([m, items]) => ({
      month: m,
      label: formatMonthDisplay(m),
      hours: roundHours(sumBy(items, 'hours')),
      days: new Set(items.map((l) => l.date)).size,
      employees: new Set(items.map((l) => l.employee)).size,
    })),
    'month'
  );
}

/** breakdown by key (employee / department / workType / ipProject)，含百分比與 employee 數 */
export function makeBreakdown(logs, keyFn, totalHours) {
  const grouped = groupBy(logs, keyFn);
  return orderBy(
    Object.entries(grouped).map(([key, items]) => ({
      label: key || '—',
      key: key || '—',
      value: roundHours(sumBy(items, 'hours')),
      employees: new Set(items.map((l) => l.employee)).size,
      pct: totalHours > 0 ? roundHours((sumBy(items, 'hours') * 100) / totalHours) : 0,
    })),
    'value',
    'desc'
  );
}

/**
 * 月度明細：[{ month, label, hours, sharePct, cost, employees, tasks }]
 * sharePct = 該月份該實體工時佔公司總工時的比例
 * cost = 該月公司管銷 × sharePct
 */
export function makeMonthlyDetail(entityLogs, allLogs, salaryData) {
  const monthCost = buildMonthCostMap(salaryData);
  const monthHoursAll = {};
  allLogs.forEach((l) => {
    monthHoursAll[l.month] = (monthHoursAll[l.month] || 0) + l.hours;
  });

  const grouped = groupBy(entityLogs, 'month');
  return orderBy(
    Object.entries(grouped).map(([m, items]) => {
      const hours = roundHours(sumBy(items, 'hours'));
      const totalH = monthHoursAll[m] || 0;
      const cost = monthCost[m] || 0;
      const sharePct = totalH > 0 ? roundHours((hours * 100) / totalH) : 0;
      const allocCost = cost > 0 && totalH > 0 ? Math.round(cost * (hours / totalH)) : 0;
      return {
        month: m,
        label: formatMonthDisplay(m),
        hours,
        sharePct,
        cost: allocCost,
        employees: new Set(items.map((l) => l.employee)).size,
        tasks: new Set(items.map((l) => l.task)).size,
      };
    }),
    'month',
    'desc'
  );
}

/** 對 entity logs 算「按月份逐月分攤公司管銷」的總成本 */
export function calcEntityTotalCost(entityLogs, allLogs, salaryData) {
  const monthCost = buildMonthCostMap(salaryData);
  const monthHoursAll = {};
  allLogs.forEach((l) => {
    monthHoursAll[l.month] = (monthHoursAll[l.month] || 0) + l.hours;
  });
  const entityMonthHours = {};
  entityLogs.forEach((l) => {
    entityMonthHours[l.month] = (entityMonthHours[l.month] || 0) + l.hours;
  });
  let total = 0;
  Object.entries(entityMonthHours).forEach(([m, h]) => {
    const cost = monthCost[m];
    const totalH = monthHoursAll[m];
    if (cost && totalH) total += cost * (h / totalH);
  });
  return Math.round(total);
}
