import { NICKNAME_TO_REAL, EMPLOYEE_DEPT_MAP, KNOWN_IP_LIST } from './constants';

/**
 * Excel 序列號轉 YYYY-MM-DD 字串
 * @param {number} serial - Excel 日期序列號
 * @returns {string} YYYY-MM-DD
 */
export function excelDateToString(serial) {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 移除 $ ¥ , 空白，回傳 number
 * @param {string|number} str
 * @returns {number}
 */
export function parseCurrency(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  return Number(String(str).replace(/[$¥,\s]/g, '')) || 0;
}

/**
 * 從檔名取 YYYY-MM
 * @param {string} filename
 * @returns {string|null} YYYY-MM 或 null
 */
export function extractMonthFromFilename(filename) {
  const match = filename.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, '0')}`;
  }
  return null;
}

/**
 * 檢查是否在 KNOWN_IP_LIST 中
 * @param {string} name
 * @returns {boolean}
 */
export function isKnownIP(name) {
  if (!name) return false;
  return KNOWN_IP_LIST.some(ip => name.includes(ip));
}

/**
 * 用 NICKNAME_TO_REAL 轉換暱稱為真名
 * @param {string} name
 * @returns {string} 真名或原名
 */
export function normalizeName(name) {
  if (!name) return '';
  const trimmed = name.trim();
  return NICKNAME_TO_REAL[trimmed] || trimmed;
}

/**
 * 用 EMPLOYEE_DEPT_MAP 取部門
 * @param {string} realName - 員工真名
 * @returns {string|undefined} 部門名稱
 */
export function getDept(realName) {
  return EMPLOYEE_DEPT_MAP[realName];
}
