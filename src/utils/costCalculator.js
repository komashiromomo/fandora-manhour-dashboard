/**
 * 成本分攤計算器（v2：以「公司月度管銷總額」為底）
 *
 * 公式：
 *   專案 P 在月份 M 的成本 = 該月管銷 × (P 在該月工時 / 全公司在該月總工時)
 *   累加每月後得到 P 的總成本。部門、員工同理。
 *
 * salaryData 結構：[{ month: 'YYYY-MM', total: number, ...details }]
 *   來自 parseSalarySheet 解析「月度管銷費用表」
 */

// 用  當 key 分隔字元，避免部門 / IP 名稱含有常見符號（| / - 等）
const SEP = '';

/** 把 salaryData 摺成 { month: totalCost } */
export function buildMonthCostMap(salaryData) {
  const map = {};
  if (!Array.isArray(salaryData)) return map;
  salaryData.forEach((r) => {
    if (!r?.month) return;
    const cost = r.total ?? r.salary ?? 0;
    if (cost > 0) map[r.month] = (map[r.month] || 0) + cost;
  });
  return map;
}

/** 通用：依 key（project/department/employee）計算成本分攤 */
function calcCostByKey(logs, salaryData, keyFn) {
  if (!logs?.length || !salaryData?.length) return {};
  const monthCost = buildMonthCostMap(salaryData);

  const monthHours = {};
  const keyMonthHours = {};

  logs.forEach((log) => {
    const k = keyFn(log);
    if (k == null) return;
    monthHours[log.month] = (monthHours[log.month] || 0) + log.hours;
    const ck = `${k}${SEP}${log.month}`;
    keyMonthHours[ck] = (keyMonthHours[ck] || 0) + log.hours;
  });

  const result = {};
  Object.entries(keyMonthHours).forEach(([ck, hours]) => {
    const [key, month] = ck.split(SEP);
    const totalH = monthHours[month];
    const cost = monthCost[month];
    if (!totalH || !cost) return;
    result[key] = (result[key] || 0) + cost * (hours / totalH);
  });
  return result;
}

export function calcProjectCost(logs, salaryData) {
  return calcCostByKey(logs, salaryData, (l) => l.ipProject);
}

export function calcDeptCost(logs, salaryData) {
  return calcCostByKey(logs, salaryData, (l) => l.department);
}

export function calcEmployeeCost(logs, salaryData) {
  return calcCostByKey(logs, salaryData, (l) => l.employee);
}

/**
 * 員工 × 專案的成本（用於 detail panel）
 */
export function calcEmployeeProjectCost(logs, salaryData) {
  if (!logs?.length || !salaryData?.length) return {};
  const monthCost = buildMonthCostMap(salaryData);
  const monthHours = {};
  const empProjMonthHours = {};

  logs.forEach((l) => {
    monthHours[l.month] = (monthHours[l.month] || 0) + l.hours;
    const pk = `${l.employee}${SEP}${l.ipProject}${SEP}${l.month}`;
    empProjMonthHours[pk] = (empProjMonthHours[pk] || 0) + l.hours;
  });

  const result = {};
  Object.entries(empProjMonthHours).forEach(([k, hours]) => {
    const [employee, project, month] = k.split(SEP);
    const totalH = monthHours[month];
    const cost = monthCost[month];
    if (!totalH || !cost) return;
    const key = `${employee}|${project}`;
    result[key] = (result[key] || 0) + cost * (hours / totalH);
  });
  return result;
}

/**
 * 取得篩選後資料對應月份的「公司總管銷」 — Overview 平均時薪用
 */
export function totalCompanyCostForLogs(logs, salaryData) {
  const monthCost = buildMonthCostMap(salaryData);
  const monthsWithLogs = new Set((logs || []).map((l) => l.month));
  let total = 0;
  monthsWithLogs.forEach((m) => {
    total += monthCost[m] || 0;
  });
  return total;
}
