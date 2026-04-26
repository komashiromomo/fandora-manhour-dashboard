/**
 * 日期解析工具 — 從第一次開發搬運，已驗證的邏輯
 *
 * 已知日期格式（Bug B2 修復）：
 * 1. Excel serial number (e.g. 45658)
 * 2. "2026/01/02（五）" — 全員工總表格式
 * 3. "2026/1/2" or "2026-01-02"
 * 4. "3/2" — 個人版格式（需搭配年份）
 * 5. "M/D" 無年份
 */

import {
  ALL_STAFF_FILENAME_REGEX,
  INDIVIDUAL_FILENAME_REGEX,
  INDIVIDUAL_FILENAME_REGEX_LEGACY,
} from '../config/constants';

/**
 * Excel serial → YYYY-MM-DD
 * @param {number} serial
 * @returns {string}
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
 * 解析各種日期格式 → YYYY-MM-DD
 * ⚠️ cellDates:false 所以 SheetJS 會給 serial number，必須手動處理
 *
 * @param {string|number} value - 日期值
 * @param {string} [yearHint] - 年份提示（個人版用，e.g. "2026"）
 * @param {string} [monthHint] - 月份提示（個人版 sheet 名稱，e.g. "3"）
 * @returns {string} YYYY-MM-DD or ''
 */
export function parseDateString(value, yearHint, monthHint) {
  if (!value && value !== 0) return '';

  // Excel serial number
  if (typeof value === 'number') {
    // 小於 1 的數字是時間（0.375 = 9:00），不是日期（Bug B1）
    if (value < 1) return '';
    // 大於 60000 可能是異常值
    if (value > 60000) return '';
    return excelDateToString(value);
  }

  const str = String(value).trim();
  if (!str) return '';

  // 移除星期後綴 "2026/01/02（五）" → "2026/01/02"
  const cleaned = str.replace(/[（(][^）)]*[）)]/g, '').trim();

  // 完整日期 YYYY/MM/DD or YYYY-MM-DD
  const fullMatch = cleaned.match(/(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/);
  if (fullMatch) {
    const [, y, m, d] = fullMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 短日期 M/D（個人版格式），需搭配年月提示
  const shortMatch = cleaned.match(/^(\d{1,2})[/\-](\d{1,2})$/);
  if (shortMatch) {
    const [, m, d] = shortMatch;
    const year = yearHint || new Date().getFullYear().toString();
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return '';
}

/**
 * 月份顯示格式化
 * "2025-09" → "9月"(short) or "2025年9月"(long)
 * @param {string} monthStr - YYYY-MM
 * @param {'short'|'long'} [format='short']
 * @returns {string}
 */
export function formatMonthDisplay(monthStr, format = 'short') {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const [y, m] = parts;
  const monthNum = parseInt(m, 10);
  if (isNaN(monthNum)) return monthStr;
  if (format === 'long') return `${y}年${monthNum}月`;
  return `${monthNum}月`;
}

/**
 * 從全員工檔名取 YYYY-MM
 * "Fandora工作日誌_2026年01月" → "2026-01"
 * @param {string} filename
 * @returns {string|null}
 */
export function extractMonthFromFilename(filename) {
  if (!filename) return null;
  const match = filename.match(ALL_STAFF_FILENAME_REGEX);
  if (match) {
    const [, year, month] = match;
    return `${year}-${month.padStart(2, '0')}`;
  }
  return null;
}

/**
 * 從個人版檔名取本名
 * 新格式："工作日誌_2026年_余凱紓_後勤部" → "余凱紓"
 * 舊格式："工作日誌_2026年_Kate" → "Kate"（後續經 normalizeName 對應）
 * @param {string} filename
 * @returns {string|null}
 */
export function extractNameFromFilename(filename) {
  if (!filename) return null;
  const match = filename.match(INDIVIDUAL_FILENAME_REGEX);
  if (match) return match[2];
  const legacy = filename.match(INDIVIDUAL_FILENAME_REGEX_LEGACY);
  return legacy ? legacy[2].trim() : null;
}

// 向後相容 alias
export const extractNicknameFromFilename = extractNameFromFilename;

/**
 * 從個人版檔名取部門（僅新格式有）
 * "工作日誌_2026年_余凱紓_後勤部" → "後勤部"
 * @param {string} filename
 * @returns {string|null}
 */
export function extractDeptFromFilename(filename) {
  if (!filename) return null;
  const match = filename.match(INDIVIDUAL_FILENAME_REGEX);
  return match ? match[3] : null;
}

/**
 * 從個人版檔名取年份
 * "工作日誌_2026年_余凱紓_後勤部" → "2026"
 * @param {string} filename
 * @returns {string|null}
 */
export function extractYearFromFilename(filename) {
  if (!filename) return null;
  const match = filename.match(INDIVIDUAL_FILENAME_REGEX);
  if (match) return match[1];
  const legacy = filename.match(INDIVIDUAL_FILENAME_REGEX_LEGACY);
  return legacy ? legacy[1] : null;
}

/**
 * 從 sheet 名稱取月份數字
 * "3月" → "3", "12月" → "12"
 * @param {string} sheetName
 * @returns {string|null}
 */
export function extractMonthFromSheetName(sheetName) {
  if (!sheetName) return null;
  const match = sheetName.match(/^(\d{1,2})月$/);
  return match ? match[1] : null;
}

/**
 * 四捨五入工時到小數點 2 位
 * @param {number} value
 * @returns {number}
 */
export function roundHours(value) {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return parseFloat(value.toFixed(2));
}
