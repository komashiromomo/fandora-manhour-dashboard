/**
 * 員工名稱、部門、IP 分類工具
 *
 * 2026 起檔名與資料欄位均改用本名，NICKNAME_TO_REAL 僅作 2025 舊檔 fallback。
 * Bug B4 修復邏輯：同一人有 3+ 種名字（保留處理機制）
 */

import {
  NICKNAME_TO_REAL,
  EMPLOYEE_DEPT_MAP,
  KNOWN_IP_LIST,
  ALL_STAFF_FILENAME_REGEX,
  INDIVIDUAL_FILENAME_REGEX,
  INDIVIDUAL_FILENAME_REGEX_LEGACY,
} from '../config/constants';

/**
 * 正規化員工名稱（暱稱 → 真名）
 * @param {string} name
 * @returns {string} 真名，或原名（如果沒有對應）
 */
export function normalizeName(name) {
  if (!name) return '';
  const trimmed = String(name).trim();
  return NICKNAME_TO_REAL[trimmed] || trimmed;
}

/**
 * 查詢員工部門
 * @param {string} realName - 真名
 * @returns {string} 部門名稱 or '未知部門'
 */
export function getDept(realName) {
  if (!realName) return '未知部門';
  return EMPLOYEE_DEPT_MAP[realName] || '未知部門';
}

/**
 * 判斷是否為已知授權 IP
 * @param {string} name
 * @returns {boolean}
 */
export function isKnownIP(name) {
  if (!name) return false;
  const trimmed = String(name).trim();
  return KNOWN_IP_LIST.some((ip) => ip === trimmed);
}

/**
 * 分類 IP 專案
 * - 個人版：有獨立「授權IP」欄位，直接使用
 * - 全員工總表：從 task 名稱推斷
 *
 * @param {string} task - 工作內容
 * @param {string} [ipColumnValue] - 個人版的授權IP欄位值
 * @returns {string} IP 名稱 or '非授權IP'
 */
export function classifyIP(task, ipColumnValue) {
  // 優先使用個人版的明確 IP 欄位
  if (ipColumnValue && String(ipColumnValue).trim()) {
    const trimmed = String(ipColumnValue).trim();
    if (trimmed !== '' && trimmed !== '-' && trimmed !== '無') {
      return trimmed;
    }
  }
  // 從 task 名稱推斷
  if (task && isKnownIP(task)) return String(task).trim();
  return '非授權IP';
}

/**
 * 分類檔案類型
 * @param {string} filename
 * @returns {'allStaff'|'individual'|'unknown'}
 */
export function classifyFileType(filename) {
  if (!filename) return 'unknown';
  if (ALL_STAFF_FILENAME_REGEX.test(filename)) return 'allStaff';
  if (INDIVIDUAL_FILENAME_REGEX.test(filename)) return 'individual';
  if (INDIVIDUAL_FILENAME_REGEX_LEGACY.test(filename)) return 'individual';
  return 'unknown';
}
