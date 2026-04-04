/**
 * Build a map of month → total cost from salary data.
 * @param {Array<import('../shared/types').SalaryRecord>} salaryData
 * @returns {Object<string, number>} e.g. { '2025-09': 500000 }
 */
export function buildMonthlyCostMap(salaryData) {
  const map = {};
  for (const record of salaryData) {
    map[record.月份] = record.月薪;
  }
  return map;
}

/**
 * Get sorted unique months from work logs.
 * @param {Array<import('../shared/types').WorkLog>} workLogs
 * @returns {string[]} Sorted YYYY-MM strings
 */
export function getAvailableMonths(workLogs) {
  const months = new Set();
  for (const log of workLogs) {
    if (log.month) {
      months.add(log.month);
    }
  }
  return [...months].sort();
}

/**
 * Filter work logs by month and optional date range.
 * @param {Array<import('../shared/types').WorkLog>} logs
 * @param {string} month - YYYY-MM or 'all'
 * @param {string} [dateFrom] - YYYY-MM-DD
 * @param {string} [dateTo] - YYYY-MM-DD
 * @returns {Array<import('../shared/types').WorkLog>}
 */
export function filterLogsByMonth(logs, month, dateFrom, dateTo) {
  let filtered = logs;

  if (month && month !== 'all') {
    filtered = filtered.filter((log) => log.month === month);
  }

  if (dateFrom) {
    filtered = filtered.filter((log) => log.date >= dateFrom);
  }

  if (dateTo) {
    filtered = filtered.filter((log) => log.date <= dateTo);
  }

  return filtered;
}
