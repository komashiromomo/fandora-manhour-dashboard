// ===== 認證 =====
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const ALLOWED_DOMAIN = 'fandora.co';
export const AUTH_STORAGE_KEY = 'fandora_auth_user';
export const PERM_CACHE_KEY = 'fandora_perm_role';
export const PERM_SHEET_ID = import.meta.env.VITE_PERM_SHEET_ID || '';
export const DEFAULT_ROLE = 'member';
// 預設管理員（不需 PERM_SHEET_ID 也能登入後拿 admin 角色）
export const ADMIN_EMAILS = ['komashiro@fandora.co'];

// ===== 資料來源 =====
export const DEFAULT_API_KEY = import.meta.env.VITE_GDRIVE_API_KEY || '';
// 工作日誌根目錄（Plan 文件記載的固定 ID；env 可覆蓋）
export const DEFAULT_FOLDER_ID =
  import.meta.env.VITE_GDRIVE_FOLDER_ID || '1X5MnrR-2goU5Jo4bQlxaaxv7ESzyceCo';
export const DEFAULT_COST_SHEET_ID = import.meta.env.VITE_COST_SHEET_ID || '';
export const GDRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const GDRIVE_EXPORT_MIMETYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const GOOGLE_SHEETS_MIMETYPE = 'application/vnd.google-apps.spreadsheet';
export const GOOGLE_FOLDER_MIMETYPE = 'application/vnd.google-apps.folder';

// ===== OAuth Scope =====
// drive.readonly：讀工作日誌、薪資表（user 自建的 sheets）
// drive.file：寫 / 讀本 dashboard 自己建立的 cache JSON（讓全公司同事共享 cache）
export const DRIVE_READONLY_SCOPE =
  'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file';

// 雲端共享 cache 設定
export const CACHE_FILE_NAME = 'fandora-dashboard-cache.json';
// cache 24 小時內視為新鮮 — 每天從 Drive 抓一次即可，登入不再每次等待
// 想立即取最新資料 → 按 Header 的「重新整理」按鈕（強制重抓）
export const CACHE_TTL_MINUTES = 60 * 24;

// ===== localStorage 鍵 =====
export const LS_API_KEY = 'gdrive_api_key';
export const LS_FOLDER_ID = 'gdrive_folder_id';
export const LS_COST_SHEET_ID = 'gdrive_cost_sheet_id';
export const LS_ACCESS_TOKEN = 'fandora_access_token';

// ===== 暱稱 → 真名（legacy fallback） =====
// 2026 起檔名與資料欄位皆改用本名；保留此表只為相容 2025 年舊檔。
export const NICKNAME_TO_REAL = {
  Kate: '余凱紓',
  Janet: '李宜臻',
  PAN: '潘美怡',
  panpan: '潘美怡',
  toto: '許茹津',
  茹津: '許茹津',
  敏佳: '陳敏佳',
  minjia: '陳敏佳',
  阿溫: '劉蕙慈',
  wendy: '劉蕙慈',
  Stacy: '陳姿羽',
  Kerry: '侯渝琪',
  小麥: '吳佳香',
  michael: '吳佳香',
  妮佛: '陳敬文',
  jennifer: '陳敬文',
  小智: '林宜萱',
  sara: '林宜萱',
  sophia: '陳孟華',
  daniel: '陳勁宇',
};

// ===== 員工 → 部門（來源：HR 組織表 Sheet 1W6OWQpMFB...） =====
export const EMPLOYEE_DEPT_MAP = {
  陳勁宇: '經營層',
  余凱紓: '後勤部',
  李宜臻: '授權企劃部',
  潘美怡: '後勤部',
  許茹津: '商品開發部',
  劉蕙慈: '授權企劃部',
  陳姿羽: '行政部',
  侯渝琪: '商品開發部',
  吳佳香: '數位行銷部',
  陳敏佳: '視覺設計部',
  林宜萱: '後勤部',
  陳孟華: '管理部',
  陳敬文: '實體行銷部',
};

// ===== 已知授權 IP（主名 + 員工常用別名） =====
// 別名（如「老高」、「力氣」、「ㄇㄚˊ幾兔」）也列入清單，這樣員工填別名時也能被偵測；
// 統計時透過 IP_ALIAS 歸併到主名（見下）
export const KNOWN_IP_LIST = [
  '老高與小茉', '老高',
  '力Qii', '力氣',
  'ㄇㄚˊ幾', 'ㄇㄚˊ幾兔',
  '咖波', '好想兔', 'WirForce', '傳說對決', '小學課本台灣主題', '魔物獵人',
  'Ru味春捲', '逆轉裁判', '排球少年', '銀魂', '咒術迴戰', '鏈鋸人',
  'hololive', '帕比順順', '麵包小偷', '葬送的芙莉蓮', 'ROSIE',
  '卡娜赫拉', '虎爺實習中', '米薩小姐', '黃山料',
  // 已移除（2026-05-05）：「其他IP」（分類標籤）、「畫博」「卡特島市集」（皆為活動，非 IP）
];

// ===== IP 別名 → 主名（同一 IP 的不同寫法歸併統計） =====
export const IP_ALIAS = {
  '老高': '老高與小茉',
  '力氣': '力Qii',
  'ㄇㄚˊ幾兔': 'ㄇㄚˊ幾',
};

// ===== 角色 → 可見頁籤 =====
export const ROLE_TABS = {
  admin: [
    'overview', 'projects', 'workTypes', 'employees', 'departments', 'settings',
  ],
  member: ['overview', 'projects', 'workTypes', 'departments'],
};

// ===== 頁籤定義 =====
export const TAB_DEFINITIONS = [
  { id: 'overview', label: '總表' },
  { id: 'projects', label: '專案分析' },
  { id: 'workTypes', label: '工作項目分析' },
  { id: 'employees', label: '員工分析' },
  { id: 'departments', label: '部門分析' },
  { id: 'settings', label: '設定' },
];

// ===== 圖表配色 =====
export const CHART_COLORS = [
  '#00BCD4', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B',
  '#82CA9D', '#8884D8', '#FFBB28', '#FF8042', '#A4DE6C',
];

// ===== 全員工總表 sheet 名 =====
export const ALL_STAFF_DETAIL_SHEET = '明細總表';

// ===== 檔名 pattern =====
export const ALL_STAFF_FILENAME_REGEX =
  /Fandora工作日誌_(\d{4})年(\d{1,2})月/;
// 新格式：工作日誌_2026年_余凱紓_後勤部
export const INDIVIDUAL_FILENAME_REGEX =
  /工作日誌_(\d{4})年_([^_]+)_([^_.\s/]+)/;
// 舊格式（2025 年以前）：工作日誌_2026年_Kate
export const INDIVIDUAL_FILENAME_REGEX_LEGACY =
  /工作日誌_(\d{4})年_(.+?)(?:\.[^.]+)?$/;
export const MONTH_SHEET_REGEX = /^(\d{1,2})月$/;

// ===== 要排除的 sheet =====
export const EXCLUDED_SHEETS = ['選單未填(勿動)'];

// ===== 假日關鍵字（明細總表「應上下班時段」欄位） =====
export const HOLIDAY_KEYWORDS = ['國定假日', '休息日', '例假日'];

// ===== 個人版前幾行是範本資料，需跳過的判斷條件 =====
export const INDIVIDUAL_TEMPLATE_TASKS = ['全體例會'];
