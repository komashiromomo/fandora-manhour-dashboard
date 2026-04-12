import _ from 'lodash-es';

/**
 * 計算專案成本分攤（非授權IP排除在結果，但計入分母）
 * @param {import('../shared/types').WorkLog[]} filteredLogs
 * @param {Object<string, number>} monthlyCostMap
 * @returns {import('../shared/types').ProjectCost[]}
 */
export function calcProjectCosts(filteredLogs, monthlyCostMap) {
  const monthlyTotalHours = {};
  for (const log of filteredLogs) {
    monthlyTotalHours[log.month] = (monthlyTotalHours[log.month] || 0) + log.hours;
  }

  const projectMonthHours = {};
  for (const log of filteredLogs) {
    const key = log.ipProject;
    if (!projectMonthHours[key]) projectMonthHours[key] = {};
    projectMonthHours[key][log.month] = (projectMonthHours[key][log.month] || 0) + log.hours;
  }

  const results = [];
  for (const [name, monthHours] of Object.entries(projectMonthHours)) {
    if (name === '非授權IP') continue;
    let cost = 0, totalHours = 0;
    for (const [month, hours] of Object.entries(monthHours)) {
      totalHours += hours;
      const totalMonthHours = monthlyTotalHours[month] || 0;
      const monthCost = monthlyCostMap[month] || 0;
      if (totalMonthHours > 0 && monthCost > 0) {
        cost += (hours / totalMonthHours) * monthCost;
      }
    }
    results.push({ name, cost, hours: totalHours });
  }

  return _.orderBy(results, ['cost'], ['desc']);
}

/**
 * 計算工作項目成本分攤
 * @param {import('../shared/types').WorkLog[]} filteredLogs
 * @param {Object<string, number>} monthlyCostMap
 * @returns {Object<string, {cost: number, hours: number}>}
 */
export function calcWorkTypeCosts(filteredLogs, monthlyCostMap) {
  const monthlyTotalHours = {};
  for (const log of filteredLogs) {
    monthlyTotalHours[log.month] = (monthlyTotalHours[log.month] || 0) + log.hours;
  }

  const taskMonthHours = {};
  for (const log of filteredLogs) {
    if (!log.task) continue;
    if (!taskMonthHours[log.task]) taskMonthHours[log.task] = {};
    taskMonthHours[log.task][log.month] = (taskMonthHours[log.task][log.month] || 0) + log.hours;
  }

  const result = {};
  for (const [name, monthHours] of Object.entries(taskMonthHours)) {
    let cost = 0, totalHours = 0;
    for (const [month, hours] of Object.entries(monthHours)) {
      totalHours += hours;
      const totalMonthHours = monthlyTotalHours[month] || 0;
      const monthCost = monthlyCostMap[month] || 0;
      if (totalMonthHours > 0 && monthCost > 0) {
        cost += (hours / totalMonthHours) * monthCost;
      }
    }
    result[name] = { cost, hours: totalHours };
  }
  return result;
}

/**
 * 計算部門成本分攤
 * @param {import('../shared/types').WorkLog[]} filteredLogs
 * @param {Object<string, number>} monthlyCostMap
 * @returns {import('../shared/types').DeptCost[]}
 */
export function calcDeptCosts(filteredLogs, monthlyCostMap) {
  const monthlyTotalHours = {};
  for (const log of filteredLogs) {
    monthlyTotalHours[log.month] = (monthlyTotalHours[log.month] || 0) + log.hours;
  }

  const deptMonthHours = {};
  const deptMembers = {};
  for (const log of filteredLogs) {
    if (!log.dept) continue;
    if (!deptMonthHours[log.dept]) deptMonthHours[log.dept] = {};
    deptMonthHours[log.dept][log.month] = (deptMonthHours[log.dept][log.month] || 0) + log.hours;
    if (!deptMembers[log.dept]) deptMembers[log.dept] = new Set();
    deptMembers[log.dept].add(log.name);
  }

  const results = [];
  for (const [name, monthHours] of Object.entries(deptMonthHours)) {
    let cost = 0, totalHours = 0;
    for (const [month, hours] of Object.entries(monthHours)) {
      totalHours += hours;
      const totalMonthHours = monthlyTotalHours[month] || 0;
      const monthCost = monthlyCostMap[month] || 0;
      if (totalMonthHours > 0 && monthCost > 0) {
        cost += (hours / totalMonthHours) * monthCost;
      }
    }
    results.push({ name, cost, hours: totalHours, memberCount: deptMembers[name] ? deptMembers[name].size : 0 });
  }

  return _.orderBy(results, ['cost'], ['desc']);
}
