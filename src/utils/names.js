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

// ===== 組織表 overrides（localStorage） =====
const DEPT_OVERRIDES_KEY = 'fandora_emp_dept_overrides';
let _deptOverridesCache = null;

export function loadDeptOverrides() {
  try {
    const raw = localStorage.getItem(DEPT_OVERRIDES_KEY);
    _deptOverridesCache = raw ? JSON.parse(raw) : {};
  } catch {
    _deptOverridesCache = {};
  }
  return _deptOverridesCache;
}

export function getDeptOverrides() {
  if (_deptOverridesCache === null) loadDeptOverrides();
  return _deptOverridesCache;
}

export function setDeptOverrides(map) {
  _deptOverridesCache = map || {};
  try {
    localStorage.setItem(DEPT_OVERRIDES_KEY, JSON.stringify(_deptOverridesCache));
  } catch (err) {
    console.warn('[setDeptOverrides] localStorage 寫入失敗:', err.message);
  }
}

/** code 預設組織表 + localStorage overrides 合併（overrides 優先） */
export function getEffectiveDeptMap() {
  return { ...EMPLOYEE_DEPT_MAP, ...getDeptOverrides() };
}

/**
 * 拆解「本名_部門」格式
 * "陳敬文_實體行銷部" → { name: "陳敬文", dept: "實體行銷部" }
 * "余凱紓"           → { name: "余凱紓", dept: null }
 */
export function splitNameWithDept(raw) {
  if (!raw && raw !== 0) return { name: '', dept: null };
  const str = String(raw).trim();
  const idx = str.indexOf('_');
  if (idx > 0 && idx < str.length - 1) {
    return {
      name: str.slice(0, idx).trim(),
      dept: str.slice(idx + 1).trim() || null,
    };
  }
  return { name: str, dept: null };
}

/**
 * 正規化員工名稱（拆「_部門」後綴 + 暱稱 → 真名）
 * @param {string} name
 * @returns {string} 真名
 */
export function normalizeName(name) {
  if (!name) return '';
  const { name: bare } = splitNameWithDept(name);
  return NICKNAME_TO_REAL[bare] || bare;
}

/**
 * 查詢員工部門（含 localStorage overrides）
 * @param {string} realName
 * @returns {string} 部門名稱 or '未知部門'
 */
export function getDept(realName) {
  if (!realName) return '未知部門';
  const map = getEffectiveDeptMap();
  return map[realName] || '未知部門';
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
