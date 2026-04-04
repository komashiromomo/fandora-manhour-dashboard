import { NICKNAME_TO_REAL, EMPLOYEE_DEPT_MAP, KNOWN_IP_LIST } from './constants';

/**
 * Excel 序列號轉 YYYY-MM-DD 字串
 * @param {number} serial - Excel 日期序列號
 * @returns {string} YYYY-MM-DD
 */
export function excelDateToString(serial) {
  if (!serial || typeof serial !== 'number') return '';
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 移除貨幣符號，回傳數字
 * @param {string|number} str
 * @returns {number}
 */
export function parseCurrency(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  return parseFloat(String(str).replace(/[$¥,\s]/g, '')) || 0;
}

/**
 * 從檔名取月份 YYYY-MM
 * @param {string} filename
 * @returns {string} YYYY-MM
 */
export function extractMonthFromFilename(filename) {
  // Match patterns like "2025年9月" or "2025年10月"
  const match = filename.match(/(\d{4})年(\d{1,2})月/);
  if (match) {
    const year = match[1];
    const month = String(parseInt(match[2])).padStart(2, '0');
    return `${year}-${month}`;
  }
  return '';
}

/**
 * 檢查是否為已知授權 IP
 * @param {string} name
 * @returns {boolean}
 */
export function isKnownIP(name) {
  if (!name) return false;
  return KNOWN_IP_LIST.includes(name.trim());
}

/**
 * 暱稱轉真名
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  if (!name) return '';
  const trimmed = name.trim();
  return NICKNAME_TO_REAL[trimmed] || trimmed;
}

/**
 * 取得部門
 * @param {string} realName
 * @returns {string}
 */
export function getDept(realName) {
  return EMPLOYEE_DEPT_MAP[realName] || '未分類';
}
