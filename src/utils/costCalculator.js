/**
 * 成本分攤計算器
 *
 * 核心公式：
 * 員工在專案的成本 = (專案工時 / 當月總工時) × 月薪
 */

/**
 * 按專案計算成本分攤
 *
 * @param {Array} filteredLogs - WorkLog[] 已篩選資料
 * @param {Array} salaryData - SalaryRecord[] 薪資資料
 * @returns {Object} { project1: cost1, project2: cost2, ... }
 */
export function calcProjectCost(filteredLogs, salaryData) {
  if (!filteredLogs || filteredLogs.length === 0) return {};
  if (!salaryData || salaryData.length === 0) return {};

  // 構建薪資 map：{ 'employee|month': salary }
  const salaryMap = {};
  salaryData.forEach(record => {
    const key = `${record.employee}|${record.month}`;
    salaryMap[key] = record.salary;
  });

  // 按專案、員工、月份分組統計工時
  // { 'project|employee|month': totalHours }
  const projectHoursByEmployeeMonth = {};
  // { 'employee|month': totalHours }
  const totalHoursByEmployeeMonth = {};

  filteredLogs.forEach(log => {
    const empMonthKey = `${log.employee}|${log.month}`;
    const projEmpMonthKey = `${log.ipProject}|${log.employee}|${log.month}`;

    projectHoursByEmployeeMonth[projEmpMonthKey] =
      (projectHoursByEmployeeMonth[projEmpMonthKey] || 0) + log.hours;

    totalHoursByEmployeeMonth[empMonthKey] =
      (totalHoursByEmployeeMonth[empMonthKey] || 0) + log.hours;
  });

  // 計算成本
  const projectCosts = {};

  Object.entries(projectHoursByEmployeeMonth).forEach(([key, projHours]) => {
    const [project, employee, month] = key.split('|');
    const empMonthKey = `${employee}|${month}`;
    const totalHours = totalHoursByEmployeeMonth[empMonthKey] || 1;
    const salaryKey = `${employee}|${month}`;
    const salary = salaryMap[salaryKey] || 0;

    if (salary <= 0) return; // 無薪資資料，跳過

    const cost = (projHours / totalHours) * salary;

    if (!projectCosts[project]) {
      projectCosts[project] = 0;
    }
    projectCosts[project] += cost;
  });

  return projectCosts;
}

/**
 * 按部門計算成本分攤
 *
 * @param {Array} filteredLogs - WorkLog[] 已篩選資料
 * @param {Array} salaryData - SalaryRecord[] 薪資資料
 * @returns {Object} { dept1: cost1, dept2: cost2, ... }
 */
export function calcDeptCost(filteredLogs, salaryData) {
  if (!filteredLogs || filteredLogs.length === 0) return {};
  if (!salaryData || salaryData.length === 0) return {};

  // 構建薪資 map
  const salaryMap = {};
  salaryData.forEach(record => {
    const key = `${record.employee}|${record.month}`;
    salaryMap[key] = record.salary;
  });

  // 按部門、員工、月份分組統計工時
  const deptHoursByEmployeeMonth = {};
  const totalHoursByEmployeeMonth = {};

  filteredLogs.forEach(log => {
    const empMonthKey = `${log.employee}|${log.month}`;
    const deptEmpMonthKey = `${log.department}|${log.employee}|${log.month}`;

    deptHoursByEmployeeMonth[deptEmpMonthKey] =
      (deptHoursByEmployeeMonth[deptEmpMonthKey] || 0) + log.hours;

    totalHoursByEmployeeMonth[empMonthKey] =
      (totalHoursByEmployeeMonth[empMonthKey] || 0) + log.hours;
  });

  // 計算成本
  const deptCosts = {};

  Object.entries(deptHoursByEmployeeMonth).forEach(([key, deptHours]) => {
    const [dept, employee, month] = key.split('|');
    const empMonthKey = `${employee}|${month}`;
    const totalHours = totalHoursByEmployeeMonth[empMonthKey] || 1;
    const salaryKey = `${employee}|${month}`;
    const salary = salaryMap[salaryKey] || 0;

    if (salary <= 0) return; // 無薪資資料，跳過

    const cost = (deptHours / totalHours) * salary;

    if (!deptCosts[dept]) {
      deptCosts[dept] = 0;
    }
    deptCosts[dept] += cost;
  });

  return deptCosts;
}

/**
 * 計算員工在特定專案的成本
 * 用於詳細分析
 *
 * @param {Array} filteredLogs - WorkLog[] 已篩選資料
 * @param {Array} salaryData - SalaryRecord[] 薪資資料
 * @returns {Object} { 'employee|project': cost, ... }
 */
export function calcEmployeeProjectCost(filteredLogs, salaryData) {
  if (!filteredLogs || filteredLogs.length === 0) return {};
  if (!salaryData || salaryData.length === 0) return {};

  const salaryMap = {};
  salaryData.forEach(record => {
    const key = `${record.employee}|${record.month}`;
    salaryMap[key] = record.salary;
  });

  const empProjHours = {};
  const totalHoursByEmployeeMonth = {};

  filteredLogs.forEach(log => {
    const empMonthKey = `${log.employee}|${log.month}`;
    const empProjKey = `${log.employee}|${log.ipProject}`;
    const empMonthProjKey = `${log.employee}|${log.month}|${log.ipProject}`;

    empProjHours[empMonthProjKey] =
      (empProjHours[empMonthProjKey] || 0) + log.hours;

    totalHoursByEmployeeMonth[empMonthKey] =
      (totalHoursByEmployeeMonth[empMonthKey] || 0) + log.hours;
  });

  const costs = {};

  Object.entries(empProjHours).forEach(([key, hours]) => {
    const [employee, month, project] = key.split('|');
    const empMonthKey = `${employee}|${month}`;
    const totalHours = totalHoursByEmployeeMonth[empMonthKey] || 1;
    const salaryKey = `${employee}|${month}`;
    const salary = salaryMap[salaryKey] || 0;

    if (salary <= 0) return;

    const cost = (hours / totalHours) * salary;
    const costKey = `${employee}|${project}`;
    costs[costKey] = (costs[costKey] || 0) + cost;
  });

  return costs;
}
