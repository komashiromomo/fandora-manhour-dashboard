/**
 * CRITICAL FORMULA: entity cost = Σ(entity hours in month / total hours in month × month total cost)
 */

/**
 * Build a map of month → total hours from filtered logs (including 非授權IP).
 * @param {Array<import('../shared/types').WorkLog>} logs
 * @returns {Object<string, number>}
 */
function buildMonthlyTotalHours(logs) {
  const map = {};
  for (const log of logs) {
    if (!map[log.month]) map[log.month] = 0;
    map[log.month] += log.hours;
  }
  return map;
}

/**
 * Calculate cost allocation per IP project.
 * Excludes 非授權IP from results but includes them in the total hours denominator.
 * @param {Array<import('../shared/types').WorkLog>} filteredLogs
 * @param {Object<string, number>} monthlyCostMap
 * @returns {Array<import('../shared/types').ProjectCost>} Sorted by cost desc
 */
export function calcProjectCosts(filteredLogs, monthlyCostMap) {
  const totalHoursByMonth = buildMonthlyTotalHours(filteredLogs);

  // Group by ipProject → month → hours
  const projectMap = {};
  for (const log of filteredLogs) {
    if (log.ipProject === '非授權IP') continue;
    if (!projectMap[log.ipProject]) projectMap[log.ipProject] = {};
    if (!projectMap[log.ipProject][log.month]) projectMap[log.ipProject][log.month] = 0;
    projectMap[log.ipProject][log.month] += log.hours;
  }

  const results = [];
  for (const [projectName, monthMap] of Object.entries(projectMap)) {
    let totalCost = 0;
    let totalHours = 0;

    for (const [month, hours] of Object.entries(monthMap)) {
      totalHours += hours;
      const monthTotal = totalHoursByMonth[month] || 0;
      const monthCost = monthlyCostMap[month] || 0;
      if (monthTotal > 0) {
        totalCost += (hours / monthTotal) * monthCost;
      }
    }

    results.push({
      name: projectName,
      cost: Math.round(totalCost),
      hours: Math.round(totalHours * 100) / 100,
    });
  }

  return results.sort((a, b) => b.cost - a.cost);
}

/**
 * Calculate cost allocation per work type (task).
 * @param {Array<import('../shared/types').WorkLog>} filteredLogs
 * @param {Object<string, number>} monthlyCostMap
 * @returns {Object<string, {cost: number, hours: number}>}
 */
export function calcWorkTypeCosts(filteredLogs, monthlyCostMap) {
  const totalHoursByMonth = buildMonthlyTotalHours(filteredLogs);

  // Group by task → month → hours
  const taskMap = {};
  for (const log of filteredLogs) {
    if (!taskMap[log.task]) taskMap[log.task] = {};
    if (!taskMap[log.task][log.month]) taskMap[log.task][log.month] = 0;
    taskMap[log.task][log.month] += log.hours;
  }

  const results = {};
  for (const [taskName, monthMap] of Object.entries(taskMap)) {
    let totalCost = 0;
    let totalHours = 0;

    for (const [month, hours] of Object.entries(monthMap)) {
      totalHours += hours;
      const monthTotal = totalHoursByMonth[month] || 0;
      const monthCost = monthlyCostMap[month] || 0;
      if (monthTotal > 0) {
        totalCost += (hours / monthTotal) * monthCost;
      }
    }

    results[taskName] = {
      cost: Math.round(totalCost),
      hours: Math.round(totalHours * 100) / 100,
    };
  }

  return results;
}

/**
 * Calculate cost allocation per department.
 * @param {Array<import('../shared/types').WorkLog>} filteredLogs
 * @param {Object<string, number>} monthlyCostMap
 * @returns {Array<import('../shared/types').DeptCost>} Sorted by cost desc
 */
export function calcDeptCosts(filteredLogs, monthlyCostMap) {
  const totalHoursByMonth = buildMonthlyTotalHours(filteredLogs);

  // Group by dept → month → hours, also track unique members
  const deptMap = {};
  const deptMembers = {};

  for (const log of filteredLogs) {
    if (!deptMap[log.dept]) deptMap[log.dept] = {};
    if (!deptMap[log.dept][log.month]) deptMap[log.dept][log.month] = 0;
    deptMap[log.dept][log.month] += log.hours;

    if (!deptMembers[log.dept]) deptMembers[log.dept] = new Set();
    deptMembers[log.dept].add(log.name);
  }

  const results = [];
  for (const [deptName, monthMap] of Object.entries(deptMap)) {
    let totalCost = 0;
    let totalHours = 0;

    for (const [month, hours] of Object.entries(monthMap)) {
      totalHours += hours;
      const monthTotal = totalHoursByMonth[month] || 0;
      const monthCost = monthlyCostMap[month] || 0;
      if (monthTotal > 0) {
        totalCost += (hours / monthTotal) * monthCost;
      }
    }

    results.push({
      name: deptName,
      cost: Math.round(totalCost),
      hours: Math.round(totalHours * 100) / 100,
      memberCount: deptMembers[deptName].size,
    });
  }

  return results.sort((a, b) => b.cost - a.cost);
}
