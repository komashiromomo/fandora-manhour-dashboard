# Fandora 人工時管理系統 — 多 Agent 重構開發指南

> 本文件供 Claude Code 多 Agent 並行開發使用。包含完整規格、前置作業、模組拆分、共用約定、以及每個 Agent 的 Prompt。

---

## 一、專案總覽

### 目標
將現有 3200 行單檔 `index.html`（React CDN + Babel）重構為 **React + Vite 模組化專案**，部署到 Vercel，功能 100% 保留。

### 技術棧

| 層級 | 技術 | 用途 |
|------|------|------|
| 框架 | React 18 + Vite | SPA 快速開發與建置 |
| UI 元件 | Ant Design 5 (antd) | 表格、卡片、Layout、篩選器 |
| 圖表 | Recharts 2.12 | 所有圖表 |
| 資料解析 | SheetJS (xlsx) | 前端解析 .xlsx 格式 |
| 工具 | lodash-es | 資料處理 |
| 認證 | Google Identity Services | @fandora.co 登入 |
| 資料來源 | Google Drive API v3 | 即時讀取 Excel / Sheet |
| 部署 | Vercel + GitHub 連動 | 自動部署 |

### 現有功能清單（全部保留）

1. **Google 登入閘門** — 限 @fandora.co 網域
2. **角色權限管理** — 從 Google Sheet 讀取 email→role 對照，admin/member 分權
3. **6 個分頁**：總表、專案分析、工作項目分析、員工分析、部門分析、設定
4. **Google Drive 整合** — 自動讀取指定資料夾的 Excel 工時表
5. **雙 Layout Excel 解析** — 全員工總表 + 個人工時表，含暱稱對照
6. **薪資表解析** — 月度成本分攤到各專案/部門/工作項目
7. **成本分攤計算** — 按工時比例分攤月度總人事成本
8. **非授權IP 過濾** — 從所有分析中排除
9. **進階分析面板** — 每個分頁的折疊式洞察
10. **設定頁** — API Key / Folder ID / Cost Sheet ID 可設定、手動上傳、測試連線
11. **資料快取** — localStorage 快取工時+薪資資料

---

## 二、前置作業（你需要先做的事）

### Step 1：安裝 Claude Code
如已安裝可跳過。在終端機執行：
```bash
npm install -g @anthropic-ai/claude-code
```

### Step 2：建立新專案
```bash
# 在你希望的位置建立專案
cd ~/projects  # 或任何你偏好的資料夾
npm create vite@latest fandora-manhour-dashboard -- --template react
cd fandora-manhour-dashboard

# 安裝依賴
npm install antd @ant-design/icons recharts xlsx lodash-es

# 初始化 Git
git init
git add -A
git commit -m "Initial Vite + React project scaffold"
```

### Step 3：設定環境變數
在專案根目錄建立 `.env` 檔案：
```env
VITE_GOOGLE_CLIENT_ID=768263377217-sg98j6ktnvnq28hh0b4ak0vs3ajg005p.apps.googleusercontent.com
VITE_GDRIVE_API_KEY=AIzaSyA2yafCAMqILEEda1FUVFsGXd2utGr1_0Y
VITE_GDRIVE_FOLDER_ID=1X5MnrR-2goU5Jo4bQlxaaxv7ESzyceCo
VITE_COST_SHEET_ID=13qiOx5PuVZb6fLtjio6FnP6lUunjwENOgCBe6UcgIQE
VITE_PERM_SHEET_ID=1b8zksLcjP7yVu7YlgGh40olHPHw1HjMdUueM7HAAv7I
```

建立 `.env.example`（不含真實 key，用來給其他人參考）：
```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GDRIVE_API_KEY=your-api-key
VITE_GDRIVE_FOLDER_ID=your-folder-id
VITE_COST_SHEET_ID=your-cost-sheet-id
VITE_PERM_SHEET_ID=your-permission-sheet-id
```

### Step 4：建立共用檔案（由 Agent 0 完成，其他 Agent 開始前必須先完成）

建立 `src/shared/` 資料夾並放入所有共用常數、型別、工具函式。詳見下方「共用規格」。

### Step 5：連結 GitHub + Vercel
1. 在 GitHub 建立新 repo `fandora-manhour-dashboard`
2. 推送程式碼到 GitHub
3. 在 Vercel 連結該 repo
4. 在 Vercel 設定環境變數（同 `.env` 內容）

---

## 三、檔案結構（全局設計）

```
fandora-manhour-dashboard/
├── public/
│   └── index.html              # 載入 Google Identity Services script
├── src/
│   ├── main.jsx                # React 入口
│   ├── App.jsx                 # 路由 + 全局 Provider
│   │
│   ├── shared/                 # ===== 共用層 (Agent 0) =====
│   │   ├── constants.js        # 所有常數：暱稱表、部門表、IP清單、顏色、角色
│   │   ├── types.js            # JSDoc 型別定義
│   │   ├── utils.js            # 通用工具函式
│   │   └── styles.js           # 共用樣式 token（顏色、間距）
│   │
│   ├── api/                    # ===== 資料層 (Agent A) =====
│   │   ├── gdrive.js           # Google Drive API 呼叫
│   │   └── permissions.js      # 權限表 API
│   │
│   ├── utils/                  # ===== 資料處理 (Agent A) =====
│   │   ├── excelParser.js      # Excel 解析（全員工表 + 個人表）
│   │   ├── salaryParser.js     # 薪資表解析
│   │   ├── dataTransformer.js  # 資料正規化（暱稱、月份、部門）
│   │   └── costCalculator.js   # 成本分攤計算引擎
│   │
│   ├── auth/                   # ===== 認證層 (Agent B) =====
│   │   ├── AuthContext.jsx     # React Context：authUser, userRole, login, logout
│   │   ├── LoginScreen.jsx     # Google 登入畫面
│   │   └── useAuth.js          # 自定義 hook
│   │
│   ├── data/                   # ===== 資料狀態 (Agent A) =====
│   │   ├── DataContext.jsx     # React Context：workLogs, salaryData, filters, loading
│   │   └── useDataLoader.js   # 資料載入 hook（GDrive + 手動上傳 + 快取）
│   │
│   ├── components/             # ===== UI 元件 (Agent C) =====
│   │   ├── Layout.jsx          # 頁面 Layout（Header + Nav + Content）
│   │   ├── KPICard.jsx         # 單個 KPI 卡片
│   │   ├── KPIGrid.jsx         # KPI 卡片網格
│   │   ├── ChartContainer.jsx  # 圖表容器（標題 + ResponsiveContainer）
│   │   ├── DataTable.jsx       # 通用資料表格
│   │   ├── FilterToolbar.jsx   # 篩選工具列（月份、日期範圍）
│   │   ├── Collapsible.jsx     # 可折疊面板（進階分析用）
│   │   ├── DragDropUpload.jsx  # 拖拽上傳元件
│   │   └── UserBar.jsx         # 右上角使用者資訊 + 登出
│   │
│   └── pages/                  # ===== 各分頁 (Agents D~I) =====
│       ├── OverviewPage.jsx    # Agent D：總表
│       ├── ProjectPage.jsx     # Agent E：專案分析
│       ├── WorkTypePage.jsx    # Agent F：工作項目分析
│       ├── EmployeePage.jsx    # Agent G：員工分析
│       ├── DepartmentPage.jsx  # Agent H：部門分析
│       └── SettingsPage.jsx    # Agent I：設定
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
└── DEVELOPMENT-GUIDE.md        # 本文件
```

---

## 四、共用規格（所有 Agent 必須遵守）

### 4.1 常數定義 (`src/shared/constants.js`)

```javascript
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
  '侯渝琪': '商品商發部', '吳佳香': '銷售部', '陳敏佳': '企劃部',
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
```

### 4.2 資料型別定義 (`src/shared/types.js`)

```javascript
/**
 * @typedef {Object} WorkLog
 * @property {string} name      - 員工真名（已正規化）
 * @property {string} dept      - 部門名稱
 * @property {string} task      - 工作項目名稱
 * @property {string} ipProject - 授權IP專案名（或 '非授權IP'）
 * @property {number} hours     - 工時（小時）
 * @property {string} date      - 日期 YYYY-MM-DD
 * @property {string} month     - 月份 YYYY-MM
 * @property {string} note      - 備註
 */

/**
 * @typedef {Object} SalaryRecord
 * @property {string} 月份     - YYYY-MM
 * @property {number} 月薪     - 該月總成本（人事費+房租+硬體+雜費）
 * @property {number} 人事費
 * @property {number} 房租場租
 * @property {number} 硬體系統費用
 * @property {number} 雜費
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} name
 * @property {string} email
 * @property {string} picture
 * @property {number} exp       - JWT 過期時間戳
 */

/**
 * @typedef {'admin'|'member'} UserRole
 */

/**
 * @typedef {Object} ProjectCost
 * @property {string} name   - 專案名稱
 * @property {number} cost   - 分攤費用
 * @property {number} hours  - 總工時
 */

/**
 * @typedef {Object} DeptCost
 * @property {string} name        - 部門名稱
 * @property {number} cost        - 分攤費用
 * @property {number} hours       - 總工時
 * @property {number} memberCount - 成員數
 */
```

### 4.3 共用樣式 Token (`src/shared/styles.js`)

```javascript
export const colors = {
  primary: '#00BCD4',
  primaryLight: 'rgba(0,188,212,0.1)',
  dark: '#1a1a2e',
  darkMid: '#16213e',
  darkEnd: '#0f3460',
  bg: '#f5f7fa',
  white: '#ffffff',
  border: '#e0e0e0',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  error: '#e53935',
  success: '#4CAF50',
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};
```

### 4.4 成本分攤公式（所有用到成本的 Agent 必須一致）

```
某實體的分攤費用 = Σ（該實體在某月的工時 ÷ 該月全公司總工時 × 該月總人事成本）
時薪成本 = 分攤費用 ÷ 總工時
```

此公式用於：專案(IP)、工作項目、部門。計算邏輯統一放在 `src/utils/costCalculator.js`，各頁面只呼叫不重寫。

### 4.5 非授權IP 過濾規則

所有分析（圖表、表格、KPI、下拉選單）都必須排除 `ipProject === '非授權IP'` 的紀錄。但原始 `workLogs` 中保留這些紀錄（員工分析需要完整工時）。

### 4.6 命名規則

| 項目 | 規則 | 範例 |
|------|------|------|
| React 元件 | PascalCase | `KPICard.jsx` |
| 工具函式 | camelCase | `parseWorkLogExcel()` |
| 常數 | UPPER_SNAKE | `KNOWN_IP_LIST` |
| CSS 類名 | kebab-case | `kpi-card` |
| 檔案名 | PascalCase（元件）、camelCase（工具）| `OverviewPage.jsx`、`costCalculator.js` |

### 4.7 import 規則

```javascript
// 1. React / 第三方
import React, { useState, useMemo } from 'react';
import { Card, Table } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import _ from 'lodash-es';

// 2. 共用
import { CHART_COLORS, KNOWN_IP_LIST } from '../shared/constants';
import { colors } from '../shared/styles';

// 3. 內部
import { useData } from '../data/DataContext';
import KPIGrid from '../components/KPIGrid';
```

---

## 五、模組拆分與 Agent 分工

### 開發階段

```
Phase 0 ──→ Agent 0（基礎骨架）
              │
              ▼
Phase 1 ──→ Agent A（資料層） ← 同時 → Agent B（認證） ← 同時 → Agent C（共用UI元件）
              │                          │                         │
              ▼                          ▼                         ▼
Phase 2 ──→ Agent D~I（6個分頁，全部同時開發）
              │
              ▼
Phase 3 ──→ Agent J（整合 + 測試 + 部署）
```

### Agent 職責表

| Agent | 負責模組 | 檔案 | 依賴 |
|-------|---------|------|------|
| **0-Foundation** | 專案骨架、共用檔案、App.jsx | `shared/*`, `App.jsx`, `main.jsx`, `vite.config.js` | 無 |
| **A-Data** | 資料層全部 | `api/*`, `utils/*`, `data/*` | Agent 0 |
| **B-Auth** | 認證 + 權限 | `auth/*` | Agent 0 |
| **C-UIKit** | 共用 UI 元件 | `components/*` | Agent 0 |
| **D-Overview** | 總表頁 | `pages/OverviewPage.jsx` | Agent 0, A, C |
| **E-Project** | 專案分析頁 | `pages/ProjectPage.jsx` | Agent 0, A, C |
| **F-WorkType** | 工作項目分析頁 | `pages/WorkTypePage.jsx` | Agent 0, A, C |
| **G-Employee** | 員工分析頁 | `pages/EmployeePage.jsx` | Agent 0, A, C |
| **H-Department** | 部門分析頁 | `pages/DepartmentPage.jsx` | Agent 0, A, C |
| **I-Settings** | 設定頁 | `pages/SettingsPage.jsx` | Agent 0, A, C |
| **J-Integrate** | 整合測試部署 | 全部 | 全部 |

---

## 六、各 Agent Context 與介面約定

### Agent A 輸出的介面（DataContext 提供的 API）

```javascript
// DataContext 提供以下值給所有 consumer：
const DataContext = {
  // 原始資料
  workLogs: WorkLog[],          // 全部工時紀錄（含非授權IP）
  salaryData: SalaryRecord[],   // 薪資紀錄

  // 篩選後資料
  filteredLogs: WorkLog[],      // 根據 selectedMonth + dateRange 篩選
  filteredSalary: SalaryRecord[],

  // 篩選控制
  selectedMonth: string,        // 'all' | 'YYYY-MM'
  setSelectedMonth: Function,
  dateFrom: string,             // 'YYYY-MM-DD' | ''
  setDateFrom: Function,
  dateTo: string,
  setDateTo: Function,

  // 計算結果（共用 useMemo）
  monthlyCostMap: { [month: string]: number },  // 月份 → 總成本
  projectCosts: ProjectCost[],   // 專案成本排序
  workTypeCosts: { [name: string]: { cost: number, hours: number } },
  deptCosts: DeptCost[],

  // 操作
  loadData: () => Promise<void>,   // 從 GDrive 重新載入
  clearData: () => void,           // 清除全部資料
  isLoading: boolean,
  loadingMessage: string,

  // 可用月份列表（for dropdown）
  availableMonths: string[],       // ['2025-09', '2025-10', ...]
};
```

### Agent B 輸出的介面（AuthContext 提供的 API）

```javascript
const AuthContext = {
  authUser: AuthUser | null,
  userRole: UserRole,            // 'admin' | 'member'
  isAuthenticated: boolean,
  isLoading: boolean,            // 正在載入角色中
  login: (credential: string) => Promise<void>,
  logout: () => void,
  allowedTabs: string[],         // 根據角色過濾後的分頁 ID 列表
};
```

### Agent C 輸出的元件介面

```jsx
// KPICard
<KPICard label="總工時" value={10354.97} unit="小時" />

// KPIGrid
<KPIGrid items={[{ label, value, unit }, ...]} />

// ChartContainer
<ChartContainer title="月度工時對比">
  <BarChart>...</BarChart>
</ChartContainer>

// DataTable
<DataTable
  columns={[{ title: '授權IP', dataIndex: 'name', key: 'name' }, ...]}
  dataSource={data}
  rowKey="name"
/>

// FilterToolbar — 已整合到 DataContext，只需 render
<FilterToolbar />

// Collapsible
<Collapsible title="進階分析" defaultOpen={false}>
  <div>...</div>
</Collapsible>

// DragDropUpload
<DragDropUpload onFiles={(files) => handleUpload(files)} accept=".xlsx" label="拖拽或點擊上傳工時表" />

// UserBar
<UserBar />  // 自動從 AuthContext 取資料

// Layout
<Layout>
  <OverviewPage />  {/* 根據 activeTab 顯示 */}
</Layout>
```

---

## 七、Agent Prompts

以下是每個 Agent 的完整 prompt。在 Claude Code 中開啟多個終端視窗，每個視窗跑一個 `claude` 並貼入對應 prompt。

---

### 🔧 Agent 0：Foundation（必須第一個完成）

```
你是 Fandora 人工時管理系統重構專案的基礎架構 Agent。

## 任務
建立專案骨架和所有共用檔案。你的輸出是其他所有 Agent 的依賴。

## 要建立的檔案

### 1. vite.config.js
- 設定 React plugin
- resolve alias: `@` → `./src`

### 2. public/index.html
- 載入 Google Identity Services：<script src="https://accounts.google.com/gsi/client" async defer></script>
- 設定 viewport meta tag
- 載入字型：Inter + Noto Sans TC（Google Fonts）

### 3. src/main.jsx
- ReactDOM.createRoot 掛載 App

### 4. src/App.jsx
- 骨架結構：AuthProvider 包 DataProvider 包 Layout
- 暫時用 placeholder 內容，等其他 Agent 完成再整合
- export default App

### 5. src/shared/constants.js
完整內容請參照 DEVELOPMENT-GUIDE.md 第四章 4.1 節，一字不改地複製。

### 6. src/shared/types.js
完整內容請參照 DEVELOPMENT-GUIDE.md 第四章 4.2 節。

### 7. src/shared/styles.js
完整內容請參照 DEVELOPMENT-GUIDE.md 第四章 4.3 節。

### 8. src/shared/utils.js
- excelDateToString(serial): Excel 序列號 → YYYY-MM-DD 字串
- parseCurrency(str): 移除 $ ¥ , 空白，回傳 number
- extractMonthFromFilename(filename): 從檔名取 YYYY-MM
- isKnownIP(name): 檢查是否在 KNOWN_IP_LIST 中
- normalizeName(name): 用 NICKNAME_TO_REAL 轉換
- getDept(realName): 用 EMPLOYEE_DEPT_MAP 取部門

### 9. src/index.css
- 全局 reset、字型設定、基礎 CSS 變數
- 顏色：primary #00BCD4、背景 #f5f7fa
- 讓 body 填滿視窗、無 margin

### 10. .gitignore
- node_modules, dist, .env, .DS_Store

### 11. .env.example
- 列出所有需要的環境變數（不含真實值）

## 完成標準
- `npm run dev` 可以啟動且頁面不報錯
- 所有 shared/ 檔案 export 正確
- 其他 Agent 可以 import { ... } from '../shared/constants' 等

## 完成後
執行 git add 和 git commit，訊息：「feat: project scaffold with shared constants and utilities」
```

---

### 🔌 Agent A：Data Layer（Phase 1，Agent 0 完成後開始）

```
你是 Fandora 人工時管理系統的資料層 Agent。負責所有資料的取得、解析、轉換、計算、快取。

## 重要規則
- 閱讀 DEVELOPMENT-GUIDE.md 全文後再開始
- 所有常數從 src/shared/constants.js import，不要自己定義
- 所有工具函式從 src/shared/utils.js import

## 要建立的檔案

### 1. src/api/gdrive.js
Google Drive API 呼叫層：
- getApiKey(): 從 localStorage 或 env 取 API Key
- getFolderId(): 從 localStorage 或 env 取 Folder ID
- getCostSheetId(): 同上
- listFiles(folderId, apiKey): 列出資料夾中的 .xlsx 檔案（遞迴子資料夾）
- downloadFile(fileId, apiKey): 下載檔案為 ArrayBuffer
- testConnection(apiKey, folderId): 測試連線成功/失敗
- fetchCostSheet(sheetId, apiKey): 下載薪資 Google Sheet 為 xlsx

### 2. src/api/permissions.js
- fetchUserRole(email, apiKey): 從 PERM_SHEET_ID 下載 CSV，比對 email 回傳 role
- 找不到回傳 DEFAULT_ROLE ('member')

### 3. src/utils/excelParser.js
**核心解析邏輯，這是最複雜的部分。**

全員工總表解析 (parseAllStaffFile):
- 檔名格式：Fandora工作日誌_YYYY年M月_*
- 只讀「明細總表」sheet
- Header 偵測：找到包含 '員工姓名', '部門', '授權IP', '日期', '工作項目', '實際時數' 的列
- Carry-forward 邏輯：當某格空白時，沿用上一列的值（員工姓名、部門、IP、日期都適用）
- IP 分類：有明確 IP 欄位值 → 用該值；task 名稱在 KNOWN_IP_LIST → 用 task；否則 → '非授權IP'
- 月份：以檔名為準（不信任 cell 日期）
- 員工姓名正規化：用 normalizeName()
- 部門：優先用 EMPLOYEE_DEPT_MAP，其次用 Excel 中的部門欄

個人工時表解析 (parseIndividualFile):
- 檔名格式：工作日誌_YYYY年_[暱稱]
- 從檔名取出員工暱稱，轉真名
- 遍歷所有月份 sheet（pattern: /^\d{1,2}月$/）
- Header 偵測：找 '日期', '工作項目', '實際時數', '授權IP'
- 同樣的 carry-forward + IP 分類邏輯

輸出格式：每筆都是 WorkLog 物件

### 4. src/utils/salaryParser.js
- parseSalaryExcel(buffer): 解析薪資 .xlsx
- 找「薪資」sheet
- 欄位：日期, 人事費, 房租場租, 硬體系統費用, 雜費, 總計
- 日期格式 "2025/9" → "2025-09"
- 幣值解析用 parseCurrency()
- 輸出：SalaryRecord[]

### 5. src/utils/dataTransformer.js
- buildMonthlyCostMap(salaryData): { 'YYYY-MM': totalCost }
- getAvailableMonths(workLogs): 從所有 workLog 取出不重複月份，排序
- filterLogsByMonth(logs, month, dateFrom, dateTo): 篩選函式

### 6. src/utils/costCalculator.js
統一的成本分攤計算引擎：
- calcProjectCosts(filteredLogs, monthlyCostMap): 回傳 ProjectCost[]，排除非授權IP
- calcWorkTypeCosts(filteredLogs, monthlyCostMap): 回傳 { [name]: { cost, hours } }
- calcDeptCosts(filteredLogs, monthlyCostMap): 回傳 DeptCost[]

公式（必須嚴格遵守）：
某實體分攤費用 = Σ (該實體某月工時 / 該月全公司總工時 × 該月總成本)

### 7. src/data/DataContext.jsx
React Context，提供：
- workLogs, salaryData（原始資料）
- filteredLogs, filteredSalary（篩選後）
- selectedMonth, setSelectedMonth
- dateFrom, setDateFrom, dateTo, setDateTo
- monthlyCostMap, projectCosts, workTypeCosts, deptCosts（useMemo 計算）
- loadData(), clearData(), isLoading, loadingMessage
- availableMonths

### 8. src/data/useDataLoader.js
- loadDataFromGDrive(): 主載入流程
  1. 列出資料夾所有 .xlsx
  2. Phase 1：先載入全員工總表，記錄已涵蓋月份
  3. Phase 2：再載入個人表，只保留未涵蓋月份的紀錄
  4. 載入薪資表
  5. 存入 localStorage 快取
- loadFromCache(): 從快取恢復
- handleWorkLogUpload(files): 手動上傳 .xlsx
- handleSalaryUpload(files): 手動上傳薪資表

## 資料載入策略（關鍵！）
1. 全員工總表優先（資料品質較高）
2. 個人表只補缺：追蹤 coveredMonths，個人表中已被全員工表涵蓋的月份直接跳過
3. 薪資表缺失不崩潰：如果找不到薪資表，成本分析留空就好

## 完成標準
- 所有函式有 JSDoc 註解
- console.log 記錄載入進度（幾筆紀錄、涵蓋幾個月、幾位員工）
- 非授權IP 在 projectCosts 計算中被排除
- git commit：「feat: complete data layer with GDrive API, Excel parsing, and cost calculator」
```

---

### 🔐 Agent B：Auth System（Phase 1，與 Agent A 同時開始）

```
你是 Fandora 人工時管理系統的認證與權限 Agent。

## 重要規則
- 閱讀 DEVELOPMENT-GUIDE.md 全文後再開始
- Google Identity Services 已在 public/index.html 中載入
- 所有常數從 src/shared/constants.js import

## 要建立的檔案

### 1. src/auth/AuthContext.jsx
React Context Provider，管理：
- authUser: AuthUser | null
- userRole: 'admin' | 'member'
- isAuthenticated: boolean
- isLoading: boolean（載入角色時）
- allowedTabs: string[]（根據 ROLE_TABS[userRole]）
- login(credential): 解析 JWT → 驗證 @fandora.co → 儲存 localStorage → fetchUserRole
- logout(): 清除 localStorage（AUTH_STORAGE_KEY + PERM_CACHE_KEY）→ 重置狀態

初始載入流程：
1. 檢查 localStorage 有無 AUTH_STORAGE_KEY
2. 有 → 解析 JWT 檢查 exp 是否過期
3. 未過期 → 設定 authUser，從 PERM_CACHE_KEY 載入角色（或重新 fetch）
4. 過期或無 → 顯示登入畫面

### 2. src/auth/LoginScreen.jsx
登入畫面 UI：
- 深色漸層背景（#1a1a2e → #16213e → #0f3460）
- 白色卡片置中，max-width 420px
- Fandora Logo + 標題「人工時管理系統」
- Google Sign-In 按鈕（用 google.accounts.id.renderButton）
- 底部提示「僅限 @fandora.co 帳號登入」
- 錯誤訊息顯示（非 fandora.co 網域時）
- Loading 狀態（載入角色時顯示 spinner + 「正在確認權限...」）

### 3. src/auth/useAuth.js
- useAuth() hook：回傳 AuthContext 的值
- 方便其他元件使用

## JWT 解析
```javascript
function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(
    atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  ));
}
```

## Google Sign-In 初始化
```javascript
google.accounts.id.initialize({
  client_id: GOOGLE_CLIENT_ID,
  callback: handleCredentialResponse,
  auto_select: true,
});
google.accounts.id.renderButton(buttonRef, {
  theme: 'outline', size: 'large', width: 320, text: 'signin_with',
});
```

## 角色讀取
呼叫 src/api/permissions.js 的 fetchUserRole(email, apiKey)。

## 完成標準
- 非 @fandora.co 信箱登入顯示錯誤訊息
- 登入成功後角色正確載入
- 重新整理頁面保持登入狀態（JWT 未過期時）
- 登出清除所有 auth 相關 localStorage
- git commit：「feat: Google Sign-In auth with role-based access control」
```

---

### 🎨 Agent C：UI Components（Phase 1，與 Agent A、B 同時開始）

```
你是 Fandora 人工時管理系統的共用 UI 元件 Agent。

## 重要規則
- 閱讀 DEVELOPMENT-GUIDE.md 全文後再開始
- 使用 Ant Design 元件庫（antd）搭配自定義樣式
- 配色主色 #00BCD4，風格簡潔現代
- 所有元件都是 pure presentational（不直接存取 Context）

## 要建立的檔案

### 1. src/components/KPICard.jsx
Props: { label: string, value: string|number, unit: string }
- 白色卡片，左邊 4px 主色邊框
- label 12px 灰色大寫，value 28px 粗體，unit 12px 灰色

### 2. src/components/KPIGrid.jsx
Props: { items: Array<{ label, value, unit }> }
- CSS Grid，auto-fit columns minmax(200px, 1fr)，gap 16px
- 渲染多個 KPICard

### 3. src/components/ChartContainer.jsx
Props: { title: string, children: ReactNode, height?: number }
- 白色容器，border-radius 8px，padding 16px
- 標題 16px bold
- 用 Recharts ResponsiveContainer 包裹 children

### 4. src/components/DataTable.jsx
Props: { columns, dataSource, rowKey, ...rest }
- 基於 antd Table 的封裝
- 預設：sticky header、striped rows、hover highlight
- 響應式：overflow-x auto

### 5. src/components/FilterToolbar.jsx
Props: { months, selectedMonth, onMonthChange, dateFrom, dateTo, onDateFromChange, onDateToChange, onReload, onClearDates }
- 水平 flex 排列，flex-wrap
- 月份 <select>（全部 + 各月份）
- 起始日/截止日 <input type="date">
- 「重新載入」按鈕（主色）
- 「清除日期」按鈕

### 6. src/components/Collapsible.jsx
Props: { title: string, defaultOpen?: boolean, children: ReactNode }
- 可折疊面板，點擊標題展開/收合
- 展開動畫：max-height transition
- 標題右側 ▼/▲ 箭頭

### 7. src/components/DragDropUpload.jsx
Props: { onFiles: (files: File[]) => void, accept?: string, label?: string }
- 拖拽區域，虛線邊框
- 點擊也可選擇檔案
- 拖拽時邊框變主色
- 顯示 label 文字

### 8. src/components/UserBar.jsx
Props: { user: { name, picture }, role: string, onLogout: () => void }
- 水平排列：頭像(32px 圓形) + 名稱 + 角色標籤 + 登出按鈕
- admin 角色標籤：主色背景
- member 角色標籤：灰色背景

### 9. src/components/Layout.jsx
Props: { children: ReactNode }
- 從 AuthContext 取 allowedTabs
- Header：Logo「Fandora」+ 副標「人工時管理系統」+ UserBar
- Nav tabs：根據 allowedTabs 過濾 TAB_DEFINITIONS 渲染
- activeTab 狀態管理
- Content 區域渲染對應的 children（根據 activeTab）

## 風格規範
- 背景色 #f5f7fa
- 卡片/容器白色，border-radius 8px，subtle shadow
- 表格 header 固定、偶數行 #fafafa、hover #f0f7ff
- 按鈕 border-radius 6px，主色 #00BCD4
- 響應式：768px 以下 KPI grid 2 欄

## 完成標準
- 每個元件可獨立 import 使用
- 不依賴任何 Context（props only）
- git commit：「feat: shared UI components library」
```

---

### 📊 Agent D：Overview Page（Phase 2）

```
你是 Fandora 人工時管理系統的「總表」頁面 Agent。

## 重要規則
- 閱讀 DEVELOPMENT-GUIDE.md 全文後再開始
- 從 DataContext 取資料，用 src/components/* 的共用元件
- 圖表用 Recharts

## 檔案
src/pages/OverviewPage.jsx

## 頁面內容

### KPI 卡片（6 個）
1. 總工時 = sum(filteredLogs.hours)，單位「小時」
2. 員工人數 = uniq(filteredLogs.name).length，單位「人」
3. 專案數量 = uniq(filteredLogs.task).length，單位「個」
4. 平均每人工時 = 總工時 / 員工人數，單位「小時」
5. 總管理費用 = sum(monthlyCostMap values for filtered months)，單位「NTD」
6. 平均時薪成本 = 總管理費用 / 總工時，單位「NTD/小時」

### 圖表
1. **月度工時對比**（BarChart 垂直）：X=月份, Y=該月工時
2. **專案工時分佈**（PieChart）：各 ipProject 的工時佔比，排除非授權IP
3. **工作項目工時**（BarChart 水平）：top 10 task by hours
4. **員工工時排名**（BarChart 水平）：所有員工 by hours 降序
5. **部門工時排名**（BarChart 水平）：各 dept by hours
6. **專案費用排行**（BarChart 水平）：projectCosts top 10

### 進階分析（Collapsible）
- 最繁忙專案（工時最高）
- 最多元員工（參與最多工作項目）
- 最高工時員工
- Top 5 授權IP 月度趨勢折線圖

## 完成標準
- 所有圖表使用 CHART_COLORS 配色
- 圖表高度根據資料量動態調整
- 非授權IP 不出現在任何專案相關圖表中
- git commit：「feat: Overview page with KPIs, charts, and advanced analytics」
```

---

### 📁 Agent E：Project Analysis Page（Phase 2）

```
你是 Fandora 人工時管理系統的「專案分析」頁面 Agent。

## 檔案
src/pages/ProjectPage.jsx

## 頁面內容

### KPI 卡片（3 個）
1. 專案總費用 = sum(projectCosts.cost)
2. 最高費用專案 = projectCosts[0].name + 費用
3. 平均專案費用 = 專案總費用 / projectCosts.length

### 篩選器
- 專案下拉選單：「全部」+ 所有 ipProject（排除非授權IP），選定後只顯示該專案

### 圖表
1. **Top 20 授權IP工時**（BarChart 水平）
2. **授權IP 成本分攤排行**（BarChart 水平，top 10）

### 表格：授權IP彙總
欄位：授權IP | 總工時 | 分攤費用 | 時薪成本(=費用/工時) | 參與員工 | 部門數 | 工作項目數

### 選定專案詳情（選了特定專案時）
- 員工工時分佈 PieChart
- 部門工時分佈 PieChart

### 進階分析（Collapsible）
- 最高成本專案
- 最多團隊成員專案
- Top 5 IP 月度趨勢折線圖

## 關鍵邏輯
- 非授權IP 完全排除（下拉選單、圖表、表格、KPI）
- projectCosts 從 DataContext 取得（已排除非授權IP）
- 時薪成本 = cost / hours

## 完成標準
- git commit：「feat: Project analysis page with cost allocation and IP filtering」
```

---

### 🔨 Agent F：Work Type Page（Phase 2）

```
你是 Fandora 人工時管理系統的「工作項目分析」頁面 Agent。

## 檔案
src/pages/WorkTypePage.jsx

## 頁面內容

### 篩選器
- 工作項目下拉選單：「全部」+ 所有 unique task

### 圖表
1. **工作項目工時**（BarChart 水平，top 20）

### 表格：工作項目彙總
欄位：工作項目 | 工時 | 分攤費用 | 時薪成本 | 參與人數 | 涉及部門 | 相關授權IP

### 選定工作項目詳情
- 員工工時分佈
- 月度工時趨勢

### 進階分析（Collapsible）
- 最耗時工作項目
- 最多協作者的工作項目
- 橫跨最多IP的工作項目

## 完成標準
- workTypeCosts 從 DataContext 取得
- git commit：「feat: Work type analysis page」
```

---

### 👥 Agent G：Employee Page（Phase 2）

```
你是 Fandora 人工時管理系統的「員工分析」頁面 Agent。

## 重要隱私規則
員工分析頁**不顯示任何費用/成本資訊**。沒有分攤費用、沒有時薪成本。只有工時數據。

## 檔案
src/pages/EmployeePage.jsx

## 頁面內容

### 篩選器
- 員工下拉選單：「全部」+ 所有 unique name

### 全部員工視圖
表格：姓名 | 部門 | 工時 | 工作類型數

### 選定員工詳情
- 詳細信息卡片（姓名、部門、總工時、工作分類數）
- 各 task 的工時分佈 BarChart
- 月度工時趨勢 BarChart

### 進階分析（Collapsible）
- 最多元員工（參與最多 task）
- 最高工時員工
- Top 5 員工月度趨勢折線圖

## 完成標準
- 絕對不顯示費用
- 員工分析使用完整 filteredLogs（含非授權IP 工時，因為這是員工的真實工時）
- git commit：「feat: Employee analysis page (privacy-safe, no cost data)」
```

---

### 🏢 Agent H：Department Page（Phase 2）

```
你是 Fandora 人工時管理系統的「部門分析」頁面 Agent。

## 檔案
src/pages/DepartmentPage.jsx

## 頁面內容

### KPI 卡片
- 部門總數
- 最大部門（成員數最多）
- 最忙部門（工時最高）

### 篩選器
- 部門下拉選單：「全部」+ 所有 unique dept

### 圖表
1. **部門工時**（BarChart）

### 表格：部門統計
欄位：部門 | 總工時 | 分攤費用 | 人均費用(=費用/成員數) | 成員數 | 平均工時(=工時/成員數)

### 選定部門詳情
- 成員工時分佈
- 月度趨勢

### 進階分析（Collapsible）
- 最大部門
- 最忙碌部門
- 最高效部門（工時/成員數 最高）
- 所有部門月度趨勢折線圖

## 完成標準
- deptCosts 從 DataContext 取得
- git commit：「feat: Department analysis page with cost allocation」
```

---

### ⚙️ Agent I：Settings Page（Phase 2）

```
你是 Fandora 人工時管理系統的「設定」頁面 Agent。

## 檔案
src/pages/SettingsPage.jsx

## 頁面內容

### API 設定區
三個輸入框（值從 localStorage 讀取，改了存回去）：
1. Google Drive API Key（password input，有顯示/隱藏切換）
2. 工時表資料夾 ID（text input）
3. 薪資表 Sheet ID（text input，標註「選填」）

三個按鈕：
- 「保存設定」→ 存到 localStorage
- 「測試連線」→ 呼叫 testConnection()，顯示成功/失敗
- 「現在載入數據」→ 呼叫 DataContext.loadData()

設定區底部的說明文字：
- API Key 去哪裡取
- Folder ID 是 Google Drive 網址 /folders/ 後面的那段
- Cost Sheet ID 是 Google 試算表網址 /d/ 後面的那段

### 手動上傳區
兩個 DragDropUpload：
1. 工時表上傳（接受 .xlsx）→ handleWorkLogUpload
2. 薪資表上傳（接受 .xlsx）→ handleSalaryUpload
上傳後顯示「已載入 X 筆紀錄」

### 資料管理區
- 「清除所有數據」按鈕（紅色，有確認對話框）
- 顯示當前資料狀態（幾筆工時紀錄、幾筆薪資紀錄、最後載入時間）

## 完成標準
- localStorage 讀寫正確
- 測試連線有成功/失敗回饋
- 上傳完成有數量回饋
- git commit：「feat: Settings page with API config, manual upload, and data management」
```

---

### 🔗 Agent J：Integration（Phase 3，所有其他 Agent 完成後）

```
你是 Fandora 人工時管理系統的整合 Agent。所有其他模組已完成，你負責把它們接在一起。

## 任務清單

### 1. 整合 App.jsx
```jsx
import { AuthProvider } from './auth/AuthContext';
import { DataProvider } from './data/DataContext';
import Layout from './components/Layout';
import LoginScreen from './auth/LoginScreen';
import { useAuth } from './auth/useAuth';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginScreen />;
  return (
    <DataProvider>
      <Layout />
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

### 2. 整合 Layout.jsx
確認 Layout 正確根據 activeTab 渲染對應的 Page 元件：
- overview → OverviewPage
- projects → ProjectPage
- workTypes → WorkTypePage
- employees → EmployeePage
- departments → DepartmentPage
- settings → SettingsPage

### 3. 檢查所有 import 路徑
- 確認所有元件的 import 路徑正確
- 確認沒有 circular dependency

### 4. 執行 npm run dev 並修復所有錯誤
- 確保啟動無報錯
- 確保所有頁面可切換
- 確保圖表正常渲染

### 5. 執行 npm run build 並修復 build 錯誤

### 6. 推到 GitHub
```bash
git add -A
git commit -m "feat: integrate all modules into working dashboard"
git remote add origin https://github.com/[username]/fandora-manhour-dashboard.git
git push -u origin main
```

### 7. 在 Vercel 部署
- 確認 Framework Preset: Vite
- 確認環境變數已設定
- 確認部署成功

## 完成標準
- 登入畫面正常
- 登入後角色正確（admin 看到 6 tabs，member 看到 4 tabs）
- 資料載入正常（從 GDrive 或快取）
- 所有 6 個分頁的圖表、表格、KPI 正常顯示
- 非授權IP 不出現在專案分析
- 員工分析不顯示費用
- 設定頁可保存/測試/上傳
- git commit：「release: v2.0 - modular React + Vite dashboard」
```

---

## 八、執行指令速查

### 在終端機開多個 Claude Code

```bash
# 終端 1 - Agent 0（先完成）
cd ~/projects/fandora-manhour-dashboard
claude

# Agent 0 完成後，同時開 3 個終端：

# 終端 2 - Agent A
cd ~/projects/fandora-manhour-dashboard
claude

# 終端 3 - Agent B
cd ~/projects/fandora-manhour-dashboard
claude

# 終端 4 - Agent C
cd ~/projects/fandora-manhour-dashboard
claude

# A/B/C 都完成後，同時開 6 個終端（D~I）
# 最後開 1 個終端跑 Agent J 整合
```

### Git 分支策略（建議）

```bash
# 每個 Agent 在自己的分支工作
git checkout -b agent/foundation    # Agent 0
git checkout -b agent/data-layer    # Agent A
git checkout -b agent/auth          # Agent B
git checkout -b agent/ui-components # Agent C
git checkout -b agent/overview      # Agent D
git checkout -b agent/project       # Agent E
git checkout -b agent/worktype      # Agent F
git checkout -b agent/employee      # Agent G
git checkout -b agent/department    # Agent H
git checkout -b agent/settings      # Agent I

# Agent J 在 main 上整合
git checkout main
git merge agent/foundation
git merge agent/data-layer
# ... 逐一 merge
```

---

## 九、常見問題

**Q: Agent 之間有衝突怎麼辦？**
A: 每個 Agent 只修改自己負責的檔案，不會衝突。唯一可能衝突的是 App.jsx 和 Layout.jsx，這留給 Agent J 處理。

**Q: 某個 Agent 失敗了怎麼辦？**
A: 只需重跑那個 Agent 的 prompt，不影響其他 Agent。

**Q: 可以跳過某些 Agent 嗎？**
A: Phase 0 (Agent 0) 和 Phase 1 (A/B/C) 不能跳。Phase 2 的分頁 Agent 可以選擇性執行。Phase 3 (Agent J) 必須最後跑。

**Q: 怎麼確認 Agent 做完了？**
A: 每個 Agent 的 prompt 末尾都有「完成標準」和 git commit 指令。看到 commit 成功就表示完成。
