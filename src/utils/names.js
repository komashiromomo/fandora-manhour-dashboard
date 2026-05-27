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
  IP_ALIAS,
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
 * 來源優先序：
 *   1. KNOWN_IP_LIST（hardcoded）
 *   2. customIPs（React Context 傳入；或從 localStorage 讀）
 *   3. sheetIPs（從 Drive IP 清單 sheet 載入後寫進 localStorage）
 */
export function isKnownIP(name, customIPs) {
  if (!name) return false;
  const trimmed = String(name).trim();
  if (KNOWN_IP_LIST.some((ip) => ip === trimmed)) return true;
  // customIPs（user 手動加）
  if (Array.isArray(customIPs)) {
    if (customIPs.includes(trimmed)) return true;
  } else {
    try {
      const raw = localStorage.getItem('fandora_custom_ip_list');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.includes(trimmed)) return true;
      }
    } catch {}
  }
  // sheetIPs（從 Drive sheet 載入）
  try {
    const raw = localStorage.getItem('fandora_sheet_ip_list');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.includes(trimmed)) return true;
    }
  } catch {}
  return false;
}

/**
 * 把 IP 別名規範化為主名
 *  順序：
 *    1. constants.IP_ALIAS（hardcoded）
 *    2. localStorage 'fandora_sheet_ip_alias'（從 Drive IP 清單 sheet 載入）
 *  都沒命中 → 原樣回傳
 */
export function normalizeIPName(name) {
  if (!name) return name;
  const trimmed = String(name).trim();
  if (IP_ALIAS[trimmed]) return IP_ALIAS[trimmed];
  try {
    const raw = localStorage.getItem('fandora_sheet_ip_alias');
    if (!raw) return trimmed;
    const sheetAlias = JSON.parse(raw);
    return sheetAlias?.[trimmed] || trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * 分類 IP 專案
 * - 個人版：有獨立「授權IP」欄位，直接使用；員工把 IP 填到 task 欄
 *   不再認列為 IP 工時（會由 IpMisrecordWarning 點名警示）
 * - 全員工總表：保留 task 推斷 IP 的 fallback（沒獨立 IP 欄）
 * - 統一透過 normalizeIPName 把別名歸併到主名
 *
 * @param {string} task - 工作內容
 * @param {string} [ipColumnValue] - 個人版的授權IP欄位值
 * @param {object} [opts]
 * @param {boolean} [opts.allowTaskFallback=true] - 是否允許從 task 推斷 IP
 *   個人版 parser 應傳 false（只信 IP 欄；員工誤填到 task 欄不認列）
 * @returns {string} 主名 IP 或 '非授權IP'
 */
export function classifyIP(task, ipColumnValue, opts = {}) {
  const { allowTaskFallback = true } = opts;
  // 優先使用個人版的明確 IP 欄位
  if (ipColumnValue && String(ipColumnValue).trim()) {
    const trimmed = String(ipColumnValue).trim();
    if (trimmed !== '' && trimmed !== '-' && trimmed !== '無') {
      return normalizeIPName(trimmed);
    }
  }
  // 從 task 名稱推斷（只在全員工總表開啟）
  if (allowTaskFallback && task && isKnownIP(task)) {
    return normalizeIPName(String(task).trim());
  }
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
