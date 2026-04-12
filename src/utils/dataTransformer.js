import _ from 'lodash-es';

/**
 * 建立月份成本對照表
 * @param {import('../shared/types').SalaryRecord[]} salaryData
 * @returns {Object<string, number>}
 */
export function buildMonthlyCostMap(salaryData) {
  const map = {};
  for (const rec of salaryData) {
    map[rec.月份] = (map[rec.月份] || 0) + rec.月薪;
  }
  return map;
}

/**
 * 取得可用月份列表
 * @param {import('../shared/types').WorkLog[]} workLogs
 * @returns {string[]}
 */
export function getAvailableMonths(workLogs) {
  return _.uniq(workLogs.map(l => l.month)).filter(Boolean).sort();
}

/**
 * 篩選工時紀錄
 * @param {import('../shared/types').WorkLog[]} logs
 * @param {string} month
 * @param {string} dateFrom
 * @param {string} dateTo
 * @returns {import('../shared/types').WorkLog[]}
 */
export function filterLogsByMonth(logs, month, dateFrom, dateTo) {
  let filtered = logs;
  if (month && month !== 'all') {
    filtered = filtered.filter(l => l.month === month);
  }
  if (dateFrom) {
    filtered = filtered.filter(l => l.date >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter(l => l.date <= dateTo);
  }
  return filtered;
}
