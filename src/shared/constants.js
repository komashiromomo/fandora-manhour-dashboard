// ===== 認證 =====
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const ALLOWED_DOMAIN = 'fandora.co';
export const AUTH_STORAGE_KEY = 'fandora_auth_user';
export const PERM_CACHE_KEY = 'fandora_perm_role';
export const PERM_SHEET_ID = import.meta.env.VITE_PERM_SHEET_ID;
export const DEFAULT_ROLE = 'member';

// ===== 資料來源 =====
export const DEFAULT_API_KEY = import.meta.env.VITE_GDRIVE_API_KEY;
export const DEFAULT_FOLDER_ID = import.meta.env.VITE_GDRIVE_FOLDER_ID;
export const DEFAULT_COST_SHEET_ID = import.meta.env.VITE_COST_SHEET_ID;
export const GDRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

// ===== 快取 =====
export const CACHE_KEY_WORK = 'fandora_cache_workLogs';
export const CACHE_KEY_SALARY = 'fandora_cache_salaryData';
export const CACHE_KEY_DATE = 'fandora_cache_date';

// ===== localStorage 設定鍵 =====
export const LS_API_KEY = 'gdrive_api_key';
export const LS_FOLDER_ID = 'gdrive_folder_id';
export const LS_COST_SHEET_ID = 'gdrive_cost_sheet_id';

// ===== 角色 → 分頁 =====
export const ROLE_TABS = {
  admin: ['overview', 'projects', 'workTypes', 'employees', 'departments', 'settings'],
  member: ['overview', 'projects', 'workTypes', 'departments'],
};

// ===== 暱稱 → 真名 =====
export const NICKNAME_TO_REAL = {
  'Kate': '余凱紓', 'Janet': '李宜臻', 'PAN': '潘美怡',
  '茹津': '許茹津', '敏佳': '陳敏佳', '阿溫': '劉蕙慈',
  'Stacy': '陳姿羽', 'Kerry': '侯渝琪', '小麥': '吳佳香',
  '妮佛': '陳敬文', '小智': '林宜萱',
};

// ===== 員工 → 部門 =====
export const EMPLOYEE_DEPT_MAP = {
  '余凱紓': '後勤部', '李宜臻': '企劃部', '潘美怡': '後勤部',
  '許茹津': '商品開發部', '劉蕙慈': '企劃部', '陳姿羽': '管理部',
  '侯渝琪': '商品開發部', '吳佳香': '銷售部', '陳敏佳': '企劃部',
  '林宜萱': '後勤部', '陳敬文': '後勤部',
};

// ===== 已知授權 IP =====
export const KNOWN_IP_LIST = [
  '老高與小茉', '老高', '力Qii', 'ㄇㄚˊ幾', '咖波', '好想兔',
  'WirForce', '傳說對決', '小學課本台灣主題', '魔物獵人',
  'Ru味春捲', '逆轉裁判', '排球少年', '銀魂', '咒術迴戰', '鏈鋸人',
  'hololive', '帕比順順', '麵包小偷', '葬送的芙莉蓮', 'ROSIE', '其他IP',
];

// ===== 圖表配色 =====
export const CHART_COLORS = [
  '#00BCD4', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B',
];

// ===== 分頁定義 =====
export const TAB_DEFINITIONS = [
  { id: 'overview', label: '總表' },
  { id: 'projects', label: '專案分析' },
  { id: 'workTypes', label: '工作項目分析' },
  { id: 'employees', label: '員工分析' },
  { id: 'departments', label: '部門分析' },
  { id: 'settings', label: '設定' },
];
