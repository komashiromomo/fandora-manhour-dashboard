# Fandora 人工時管理系統 Dashboard v3 — 完整開發計畫

**Feature:** 從零重建人工時 Dashboard（第三次開發）
**Spec:** Fandora_人工時管理系統_Dashboard開發規格書_v2.docx
**Scope:** Phase 1（基礎 Dashboard）+ Phase 2（授權IP/工作項目分類）+ Phase 3（專案成本分攤）
**Created:** 2026-04-07

## 兩次開發的教訓（必讀）

### 第一次開發（2026/3/25-29）：MVP 成功但留下技術債

第一次用單一 index.html（611 行 JSX）成功做出了 MVP，發現並修復了 5 個 CRITICAL bug。這些 bug 的修復邏輯在第三次開發中**絕對不能回退**：

| # | Bug | 根因 | 已驗證的解法（必須保留） |
|---|-----|------|----------------------|
| B1 | SheetJS 把時間小數（0.375）當成專案名稱 | `cellDates:true` 讓 SheetJS 誤解析 | **必須用 `cellDates:false`**，手動解析日期 |
| B2 | Excel 日期序號（45358）顯示為部門名稱 | 序號被當成字串匹配 | **必須有 `parseDateValue()` 支援 5+ 種格式**：Excel serial、YYYY/MM/DD、M/D、2026/01/02（五） |
| B3 | 接續列空白日期/姓名導致資料遺失 | Excel 省略重複的儲存格 | **必須有 carry-forward 機制**：追蹤上一列的值，空白時延續 |
| B4 | 暱稱對不上部門 | 同一人有 3+ 種名字 | **NICKNAME_TO_REAL + EMPLOYEE_DEPT_MAP 必須涵蓋所有變體** |
| B5 | 無法自訂日期範圍篩選 | 只有月份下拉 | **必須有 dateFrom/dateTo 篩選** |

第一次開發的架構教訓：
- 單檔超過 300 行就很難維護 → 這次每個檔案控制在 150 行內
- API Key 認證無法存取個人 Drive → 這次用 OAuth 2.0
- 員工部門硬編碼 → 這次保留硬編碼但加 Settings UI 可覆蓋
- 花了 3 小時才搞清楚 Excel 結構 → **這次已經在開發前從 Drive 確認完畢**
- 日期解析花了 2 小時 → 這次直接搬用已驗證的解析函式

### 第二次開發（2026/4/5-7）：模組化重寫但未能運行

第二次把 611 行單檔拆成 34 個模組化檔案，但過程中產生了 7 個新問題：

| # | 問題 | 這次的防護 |
|---|------|-----------|
| I1 | 架構方向反覆切換 3+ 次（CDN↔Vite） | 開局先部署空白 app 到 Vercel，鎖定 Vite 不動搖 |
| I2 | 34 個檔案零 git commit | 每個里程碑必須 commit + push + Vercel 驗證 |
| I3 | setData 介面簽名誤用（CRITICAL bug ×2） | 先寫 types.js 定義所有介面合約，DataContext 用獨立 setter |
| I4 | 缺 client_id 導致白屏 crash | 零配置防禦：沒 env 也能啟動，顯示設定頁 |
| I5 | 根目錄 index.html 是舊版、新舊檔案混淆 | Clean repo，砍掉所有舊檔案 |
| I6 | Excel 解析用假資料開發，對不上真實格式 | **已從 Drive 確認真實欄位結構**，寫進本計畫 |
| I7 | 殭屍文件堆積（12+ 個說明文件） | 只保留 README + 這份 plan |

### 第一次 + 第二次的交叉教訓

| 教訓 | 從哪次學到的 | 對第三次的影響 |
|------|------------|--------------|
| Excel 有 3 種格式（明細總表 + 個人版 + Pivot 交叉表） | 第一次發現 Pivot，第三次從 Drive 確認個人版 | 解析器必須處理三種格式 |
| 全員工總表和個人版欄位完全不同 | 第三次準備階段確認 | 個人版是 Phase 2 的唯一資料來源 |
| `cellDates:false` 是唯一安全的 SheetJS 設定 | 第一次修 bug B1 | 絕對不改回 true |
| 日期格式至少有 5+ 種變體 | 第一次修 bug B2 | parseDateValue 必須涵蓋所有已知格式 |
| carry-forward 不只是日期，姓名和部門也需要 | 第一次修 bug B3 | 解析器的 carry-forward 要覆蓋所有可能空白的欄位 |
| 個人版前兩行是範本資料（全體例會/固定IP） | 第三次從 Drive 確認 | 解析器必須跳過或特別標記 |
| 模組間的介面合約不清楚會導致 CRITICAL bug | 第二次的 setData 慘案 | types.js 先寫，所有 setter 獨立 |
| 沒有 env 時 App 必須能活 | 第二次的白屏 crash | 零配置防禦寫進 AuthContext |

## 部署與環境

- **框架**：React 18 + Vite 5
- **UI**：Ant Design 5 + Recharts 2
- **部署**：Vercel（既有專案 `fandora-manhour-dashboard`，ID: `prj_fhyYmuQV3VrSWPg9AgkiDsVRF0dh`）
- **版控**：GitHub `komashiromomo/fandora-manhour-dashboard`
- **Team ID**：`team_LA1pJ17piBhdWfa8txwqOrKa`
- **Google Drive 資料夾**：
  - 根目錄 `工作日誌` (ID: `1X5MnrR-2goU5Jo4bQlxaaxv7ESzyceCo`)
  - 子結構：`2025年/` + `2026年/` → `每月整理檔案/`

## 環境變數

```
VITE_GOOGLE_CLIENT_ID=     # Google OAuth 2.0 Client ID
VITE_GDRIVE_API_KEY=       # Google Drive API Key（公開讀取用）
VITE_GDRIVE_FOLDER_ID=     # 工時資料夾根目錄 ID
VITE_COST_SHEET_ID=        # 薪資 Google Sheet ID
VITE_PERM_SHEET_ID=        # 權限 Google Sheet ID
```

## 檔案結構

```
fandora-manhour-dashboard/
├── index.html                    # Vite 入口（含 GIS script）
├── package.json
├── vite.config.js
├── .env.example
├── .gitignore
├── README.md
├── docs/
│   └── superpowers/plans/        # 本計畫
│
└── src/
    ├── main.jsx                  # React DOM 掛載
    ├── App.jsx                   # ErrorBoundary + 路由
    ├── index.css                 # 全域樣式
    │
    ├── config/
    │   ├── constants.js          # 所有常數、映射表、正則
    │   └── types.js              # JSDoc 介面合約（所有模組共用）
    │
    ├── auth/
    │   ├── AuthContext.jsx        # GIS JWT + OAuth2 token
    │   └── LoginScreen.jsx       # 登入 UI + 未設定提示
    │
    ├── data/
    │   ├── DataContext.jsx        # 全域資料狀態（workLogs, salary, filters）
    │   └── useDataLoader.js      # 載入邏輯（Drive API + 手動上傳）
    │
    ├── api/
    │   ├── gdrive.js             # Google Drive API 封裝
    │   └── permissions.js        # 角色權限查詢
    │
    ├── utils/
    │   ├── dates.js              # 日期解析、Excel serial 轉換
    │   ├── names.js              # 暱稱正規化、部門查詢、IP 分類
    │   ├── excelParser.js        # 全員工總表 + 個人版解析
    │   ├── salaryParser.js       # 薪資表解析
    │   └── costCalculator.js     # 成本分攤計算
    │
    ├── components/
    │   ├── Layout.jsx            # 主 Layout（header + tabs + content）
    │   ├── FilterToolbar.jsx     # 月份+日期篩選
    │   ├── KPICard.jsx           # 單張 KPI 卡片
    │   ├── ChartCard.jsx         # 圖表容器（標題+loading+empty）
    │   ├── DataTable.jsx         # 通用表格
    │   └── DragDropUpload.jsx    # 拖曳上傳
    │
    └── pages/
        ├── OverviewPage.jsx      # Phase 1：總表
        ├── ProjectPage.jsx       # Phase 2：專案分析（依授權IP）
        ├── WorkTypePage.jsx      # Phase 2：工作項目分析
        ├── EmployeePage.jsx      # Phase 1：員工分析
        ├── DepartmentPage.jsx    # Phase 1：部門分析
        └── SettingsPage.jsx      # Phase 1：設定（API config + 上傳）
```

## 真實資料結構（2026-04-07 從 Google Drive 確認）

### Google Drive 資料夾結構
```
工作日誌/ (ID: 1X5MnrR-2goU5Jo4bQlxaaxv7ESzyceCo)
├── 2025年/ (ID: 1byrxh1kWN_N7P_A5GaStOo_NvzosWLMR)
└── 2026年/ (ID: 1jgQkcVDOy8dm8dsYS25tPc20FJVV3xSH)
    ├── 每月整理檔案/ (ID: 1frqH_VxDL2FEBLKNUVHaYY0b9CGIe1PE)
    │   ├── Fandora工作日誌_2026年01月 (ID: 1XXcf54ms_0RpIJnzPAc7n3DTziKJjbXaXeiK-l5nRrY) [32KB]
    │   └── Fandora工作日誌_2026年02月 (ID: 1M3nMSZCMSxwkm6b_1zkWfyGasSr6bDYAAGGEWrQf8q0) [12KB]
    ├── 工作日誌_2026年_小麥 (ID: 1alsHhKQJNYxjX9jQNLUiUaiI1xh-xsh3f6Tx47Alpyg)
    ├── 工作日誌_2026年_小智
    ├── 工作日誌_2026年_妮佛
    ├── 工作日誌_2026年_阿溫
    ├── 工作日誌_2026年_茹津
    ├── 工作日誌_2026年_敏佳
    ├── 工作日誌_2026年_Janet
    ├── 工作日誌_2026年_Kate
    ├── 工作日誌_2026年_Kerry
    ├── 工作日誌_2026年_PAN
    └── 工作日誌_2026年_Stacy
```

所有檔案都是 **Google Sheets**（不是 .xlsx），需用 Google Sheets export endpoint 匯出為 xlsx 再解析。

### 全員工總表「2026_01」Pivot 交叉表 sheet（第一次開發發現的第三種格式）
```
（空白）  | 余凱紓 | 李宜臻 | 潘美怡 | ...（員工名當欄位 header）
倉庫      | 24.00  | 0.00   | 12.50  | ...
POD商品   | 8.50   | 0.00   | 0.00   | ...
自營快閃  | 35.00  | 0.00   | 0.00   | ...
```
特徵：
- 第一列是員工姓名（header）
- 第一欄是工作項目名稱
- cell 值是工時數
- **作為備援**：只在同一檔案找不到「明細總表」sheet 時才解析這種格式

### 全員工總表「明細總表」sheet 欄位（9 欄）
```
員工姓名 | 部門 | 日期 | 應上下班時段 | 工作開始時間 | 工作結束時間 | 總工作時段 | 工作內容說明 | 實際時數
```
範例資料：
```csv
"余凱紓","後勤部","2026/01/02（五）","09:57~18:57","10:00","12:00","2小時","倉庫","2.00"
"余凱紓","後勤部","","","12:00","13:00","1小時","POD商品","1.00"
"余凱紓","後勤部","","","14:00","17:00","3小時","庫存","3.00"
```
特徵：
- 日期格式 "2026/01/02（五）"，接續列日期為空（需 carry-forward）
- 假日在「應上下班時段」標記（"國定假日"、"休息日"、"例假日"），實際時數為 "0.00"
- 「工作內容說明」是單一欄位，**沒有** 授權IP/工作項目分類
- 「實際時數」是字串（"2.00"、"0.50"），需 parseFloat

### 個人版工作日誌欄位（7 欄）— 結構完全不同！
```
日期 | 星期 | 授權IP | 工作項目 | 工作開始時間 | 工作結束時間 | 實際時數
```
範例資料：
```csv
"","","","全體例會","11:45","13:00","1.25"        ← 前兩行是固定範本，要跳過
"","","老高與小茉","文博","9:00","11:30","2.50"    ← 範本行
"3/2","一","","行銷例行","9:00","11:00","2.00"
"3/2","一","","專案與年度計畫","11:00","12:30","1.50"
"3/2","一","魔物獵人","","14:00","18:00","4.00"     ← 有授權IP，無工作項目
```
特徵：
- 每月一個 sheet（1月、2月...12月）
- **有「授權IP」和「工作項目」兩個獨立欄位**（Phase 2 的關鍵資料來源！）
- 日期格式 "3/2" 而非完整日期（需搭配 sheet 名稱判斷年月）
- 沒有員工姓名/部門欄位（從檔名推斷）
- 前兩行是範本資料（需跳過或特別處理）

### ⚠️ 資料策略更新
原計畫是「全員工總表優先，個人版補缺」。但真實資料顯示：
- **Phase 2（授權IP/工作項目分類）完全依賴個人版**，因為全員工總表沒有這兩個欄位
- 因此正確策略是：**兩種資料都必須解析，互補使用**
  - 全員工總表 → 基礎工時、出勤（Phase 1）
  - 個人版 → 授權IP、工作項目分類（Phase 2）
  - 以個人版的 ipProject + workType 回填到全員工總表的 WorkLog 記錄中

## 介面合約（types.js 核心定義）

這是上次最大的教訓——所有模組必須對照這份合約開發：

```javascript
/**
 * @typedef {Object} WorkLog
 * @property {string} date        - YYYY-MM-DD
 * @property {string} month       - YYYY-MM（從檔名取，不從 cell 取）
 * @property {string} employee    - 真名（已正規化）
 * @property {string} department  - 部門名稱
 * @property {string} task        - 工作內容說明（全員工總表）或工作項目（個人版）
 * @property {number} hours       - 工時（小時）
 * @property {string} ipProject   - 授權IP 名稱 or '非授權IP'（個人版直接取；全員工用推斷）
 * @property {string} workType    - 工作項目（個人版直接取；全員工=task）
 * @property {string} source      - 'allStaff' | 'individual'
 * @property {string} sourceFile  - 來源檔名
 */

/**
 * @typedef {Object} SalaryRecord
 * @property {string} employee    - 真名
 * @property {string} month       - YYYY-MM
 * @property {number} salary      - 月薪金額
 */

/**
 * @typedef {Object} DataState
 * @property {WorkLog[]} workLogs
 * @property {SalaryRecord[]} salaryData
 * @property {boolean} isLoading
 * @property {string} loadingMessage
 * @property {Object} filters           - { month, dateFrom, dateTo }
 * @property {WorkLog[]} filteredLogs    - derived from workLogs + filters
 */

/**
 * DataContext 對外暴露的介面（所有 consumer 只透過這些方法操作）：
 *
 * setWorkLogs(logs: WorkLog[]) → void          // 替換全部工時資料
 * appendWorkLogs(logs: WorkLog[]) → void        // 追加工時資料
 * setSalaryData(records: SalaryRecord[]) → void // 替換薪資資料
 * setFilters(filters: Partial<Filters>) → void  // 更新篩選條件
 * clearAll() → void                             // 清除所有資料
 *
 * ⚠️ 注意：沒有 setData(logs, salary) 這種雙參數函式。
 * 上次就是因為 setData 的簽名不清楚才出 bug。
 * 每種資料有獨立的 setter，不會互相影響。
 */
```

## 開發里程碑

### Milestone 0：Clean Repo + 部署 Pipeline（15 分鐘）

**目標**：空白 React app 成功部署到 Vercel，確認 pipeline 暢通。

- [ ] 0.1 清空現有 src/ 和根目錄殭屍檔案
- [ ] 0.2 建立乾淨的 Vite + React 專案結構
- [ ] 0.3 package.json 安裝所有依賴
- [ ] 0.4 index.html（含 GIS script async）
- [ ] 0.5 src/main.jsx + src/App.jsx（顯示 "Fandora 人工時管理系統 - 載入中..."）
- [ ] 0.6 .env.example + .gitignore
- [ ] 0.7 Git commit: "feat: initial Vite project scaffold"
- [ ] 0.8 Push to GitHub → 觸發 Vercel 自動部署
- [ ] 0.9 **驗證**：Vercel 部署成功，瀏覽器可看到文字

### Milestone 1：Config + Types + Utils（20 分鐘）

**目標**：所有常數、介面定義、純函式就位。這些是其他模組的基礎。

- [ ] 1.1 建立 src/config/types.js（完整 JSDoc 介面合約）
- [ ] 1.2 建立 src/config/constants.js（從現有搬運，保留所有員工/IP 資料）
- [ ] 1.3 建立 src/utils/dates.js（從第一次開發的已驗證邏輯搬運）
  - excelDateToString(serial)：Excel 序號 → YYYY-MM-DD（Bug B2 修復邏輯）
  - parseDateString(value)：支援 5+ 種格式（Excel serial、"2026/01/02（五）"、"3/2"、YYYY-MM-DD、M/D）
  - formatMonthDisplay(monthStr, format)：月份顯示格式化
  - extractMonthFromFilename(filename)：從檔名取 YYYY-MM
  - 注意：個人版日期 "3/2" 需搭配年份參數才能組成完整日期
- [ ] 1.4 建立 src/utils/names.js（normalizeName, getDept, classifyIP, isKnownIP）
- [ ] 1.5 Git commit: "feat: add config constants and utility functions"

### Milestone 2：Auth 模組（20 分鐘）

**目標**：Google Sign-In 可運作。**零配置防禦**：沒 env 時顯示設定提示，不 crash。

- [ ] 2.1 建立 src/auth/AuthContext.jsx
  - initializeGIS() + initializeTokenClient() 都有 `if (!GOOGLE_CLIENT_ID) return` 防護
  - waitForGIS 在沒有 client_id 時直接 setIsLoading(false)
  - 對外暴露：authUser, isAuthenticated, isLoading, accessToken, renderSignInButton, logout, refreshToken
- [ ] 2.2 建立 src/auth/LoginScreen.jsx
  - 有 client_id → 顯示 Google Sign-In 按鈕
  - 沒 client_id → 顯示「請先在設定頁面配置 Google API」提示
- [ ] 2.3 更新 src/App.jsx 整合 AuthProvider
  - ErrorBoundary → AuthProvider → AppContent
  - AppContent: loading → LoginScreen → DataProvider + Layout
- [ ] 2.4 Git commit: "feat: auth module with zero-config defense"
- [ ] 2.5 Push → **驗證** Vercel 部署成功，開啟不白屏

### Milestone 3：Data 模組 + API 層（25 分鐘）

**目標**：DataContext 和 Google Drive API 整合完成。

- [ ] 3.1 建立 src/api/gdrive.js
  - getApiKey()：env > localStorage 的取值優先順序
  - listFilesInFolder(folderId, accessToken)：遞迴列出子資料夾
  - exportFile(fileId, accessToken)：下載 Google Sheets 為 xlsx
  - downloadFile(fileId, accessToken)：下載 xlsx 原始檔案
- [ ] 3.2 建立 src/api/permissions.js
  - fetchUserRole(email, apiKey)：從 PERM_SHEET_ID 查詢角色
- [ ] 3.3 建立 src/data/DataContext.jsx
  - 嚴格遵守 types.js 定義的介面：setWorkLogs, appendWorkLogs, setSalaryData, setFilters, clearAll
  - filteredLogs 是 useMemo derived state
  - 無 setData 雙參數函式
- [ ] 3.4 建立 src/data/useDataLoader.js
  - loadFromDrive(folderId, accessToken)：遞迴掃描 → 分類 → 解析 → setWorkLogs
  - handleWorkLogUpload(files)：手動上傳 → appendWorkLogs
  - handleSalaryUpload(files)：手動上傳 → setSalaryData
  - 所有 setter 呼叫都對照 DataContext 的實際介面簽名
- [ ] 3.5 Git commit: "feat: data context and Google Drive API integration"

### Milestone 4：Excel 解析器（30 分鐘）— 最關鍵的模組

**目標**：正確解析三種 Excel 格式，不回退第一次開發已修復的 5 個 bug。

**⚠️ 必須遵守的解析規則（從兩次開發學到的）：**
- `XLSX.read(buffer, { cellDates: false })` — 絕對不用 cellDates:true（Bug B1）
- 所有日期用 `parseDateValue()` 手動解析，支援 5+ 種格式（Bug B2）
- 空白儲存格一律 carry-forward（日期、姓名、部門）（Bug B3）
- 員工名一律經過 `normalizeName()` 正規化（Bug B4）
- 個人版前兩行是範本資料（全體例會/固定IP），需跳過

- [ ] 4.1 建立 src/utils/excelParser.js — 三種格式解析器
  - **parseDetailSheet(buffer, filename)**：全員工「明細總表」sheet
    - 9 欄：員工姓名|部門|日期|應上下班時段|工作開始|工作結束|總工作時段|工作內容說明|實際時數
    - Header 搜尋範圍：前 30 行
    - 空白日期/姓名/部門 carry-forward
    - 月份從檔名取（不從 cell 取）
    - 假日行（"國定假日"/"休息日"/"例假日"）跳過不計
    - ipProject 從 task 推斷（isKnownIP）；workType = task
  - **parsePivotSheet(buffer, sheetName)**：全員工「2026_01」交叉表 sheet
    - 第一列 = 員工名，第一欄 = 工作項目，cell = 工時
    - 作為備援：只在「明細總表」不存在時使用
  - **parseIndividualSheet(buffer, filename)**：個人版工作日誌
    - 7 欄：日期|星期|授權IP|工作項目|工作開始|工作結束|實際時數
    - 每月一個 sheet（1月、2月...12月）
    - 員工名從檔名取（extractNicknameFromFilename → normalizeName）
    - 日期格式 "3/2" → 搭配 sheet 名稱（3月）和檔名年份組成 YYYY-MM-DD
    - **前兩行是範本**：日期欄為空且有固定內容（全體例會/老高與小茉），需跳過
    - **授權IP 和工作項目直接從欄位取**（Phase 2 核心資料來源）
  - **parseWorkbook(buffer, filename)**：自動偵測檔案類型並分派
    - 檔名匹配 `Fandora工作日誌_YYYY年MM月` → allStaff（先找明細總表 sheet，沒有就用 Pivot）
    - 檔名匹配 `工作日誌_YYYY年_暱稱` → individual
- [ ] 4.2 建立 src/utils/salaryParser.js
  - parseSalarySheet(buffer)：解析薪資表
  - 靜默失敗：解析失敗回傳空陣列，不拋錯
- [ ] 4.3 建立 src/utils/costCalculator.js
  - calcProjectCost(workLogs, salaryData)：按工時比例分攤月薪到專案
  - calcDeptCost(workLogs, salaryData)：按工時比例分攤月薪到部門
  - 公式：`員工在專案的成本 = (專案工時 / 當月總工時) × 月薪`
- [ ] 4.4 **用真實資料測試**：在 Chrome 中 fetch Google Sheets export CSV，比對解析結果
- [ ] 4.5 Git commit: "feat: Excel parsers and cost calculator"
- [ ] 4.6 Push → **驗證** Vercel 部署成功

### Milestone 5：UI 共用元件 + Layout（20 分鐘）

**目標**：主框架可切換頁籤，共用元件就位。

- [ ] 5.1 建立 src/index.css（全域樣式：字型、reset、scrollbar）
- [ ] 5.2 建立 src/components/Layout.jsx
  - Ant Design Layout + Tabs
  - 依角色過濾可見頁籤
  - UserBar（頭像 + 登出）
- [ ] 5.3 建立 src/components/FilterToolbar.jsx（月份下拉 + 日期選擇器）
- [ ] 5.4 建立 src/components/KPICard.jsx（單張指標卡）
- [ ] 5.5 建立 src/components/ChartCard.jsx（圖表容器 + loading/empty 狀態）
- [ ] 5.6 建立 src/components/DataTable.jsx（Ant Design Table 封裝）
- [ ] 5.7 建立 src/components/DragDropUpload.jsx（拖曳上傳區域）
- [ ] 5.8 Git commit: "feat: shared UI components and layout"

### Milestone 6：Phase 1 頁面 — 總表 + 員工 + 部門 + 設定（30 分鐘）

**目標**：四個基礎頁面全部可運作。

- [ ] 6.1 建立 src/pages/SettingsPage.jsx
  - API Key / Folder ID / Cost Sheet ID 輸入框
  - 測試連線按鈕
  - 工時/薪資手動上傳（DragDropUpload）
  - 清除數據按鈕
- [ ] 6.2 建立 src/pages/OverviewPage.jsx
  - KPI 卡片：總工時、員工人數、專案數、平均每人工時、總管理費用、平均時薪
  - 月度工時對比柱狀圖
  - Top 10 分類圓餅圖
  - 部門工時分佈橫條圖
  - 員工工時排行
- [ ] 6.3 建立 src/pages/EmployeePage.jsx
  - 員工統計表格（部門、工時、任務數、時薪）
  - 員工篩選下拉
  - 員工工時橫條圖
  - 進階分析卡片
- [ ] 6.4 建立 src/pages/DepartmentPage.jsx
  - 部門統計表格
  - 部門篩選下拉
  - 部門工時橫條圖
  - 進階分析卡片
- [ ] 6.5 Git commit: "feat: Phase 1 pages — overview, employee, department, settings"
- [ ] 6.6 Push → **驗證** Vercel 部署成功，所有頁面可切換

### Milestone 7：Phase 2 — 授權IP + 工作項目分析（20 分鐘）

**目標**：專案分析和工作項目分析頁面完成。

- [ ] 7.1 建立 src/pages/ProjectPage.jsx
  - 依 ipProject 欄位分組（授權IP + 非授權IP）
  - 專案工時排行表格
  - 專案工時橫條圖
  - 跨部門參與分析
- [ ] 7.2 建立 src/pages/WorkTypePage.jsx
  - 依 workType 欄位分組
  - 工作項目排行表格
  - 工作項目分佈圓餅圖
- [ ] 7.3 Git commit: "feat: Phase 2 — project and work type analysis pages"

### Milestone 8：Phase 3 — 成本分攤（15 分鐘）

**目標**：成本計算整合到各分析頁面。

- [ ] 8.1 在 OverviewPage 加入「專案成本排行」圖表
- [ ] 8.2 在 ProjectPage 加入「專案成本」欄位和排行
- [ ] 8.3 在 DepartmentPage 加入「部門薪資成本」統計
- [ ] 8.4 在 EmployeePage 加入「時薪成本」欄位（僅 admin 可見）
- [ ] 8.5 Git commit: "feat: Phase 3 — cost allocation across all pages"
- [ ] 8.6 Push → **驗證** Vercel 部署成功

### Milestone 9：最終驗收（15 分鐘）

- [ ] 9.1 全頁面巡覽：6 個頁籤逐一確認渲染正常
- [ ] 9.2 零配置測試：移除 env → 確認不白屏、顯示設定頁
- [ ] 9.3 手動上傳測試：拖曳 Excel 上傳 → 確認圖表渲染
- [ ] 9.4 清理：移除所有 console.log（保留 console.warn/error）
- [ ] 9.5 最終 commit: "chore: final cleanup and verification"
- [ ] 9.6 Push → Vercel 最終部署
- [ ] 9.7 設定 Vercel 環境變數（Google API credentials）
- [ ] 9.8 完整功能測試（Google Drive 即時載入 → 圖表渲染）

## Skill 啟用策略

本專案在各階段啟用不同 skills 來確保品質和效率：

### 高相關 Skills（每次開發必用）

| Skill | 用途 | 啟用時機 |
|-------|------|---------|
| **subagent-driven-development** | 派出 sub-agent 並行開發，附帶兩階段審查（規格符合度 + 程式品質） | Round 3-4 並行開發時 |
| **dispatching-parallel-agents** | 協調 2+ 獨立任務同時執行 | Round 3-4 同時派出多組 agent |
| **superpowers-executing-plans** | 載入本計畫，逐步執行，確保不偏離 | 每個 Round 開始前 |
| **superpowers-verification-before-completion** | 完成宣告前強制驗證（跑命令、看輸出，不靠假設） | 每個 Milestone 完成前 |
| **superpowers-requesting-code-review** | 派出獨立 reviewer agent 審查程式碼 | 每個 Milestone commit 前 |

### 中相關 Skills（按需啟用）

| Skill | 用途 | 啟用時機 |
|-------|------|---------|
| **superpowers-test-driven-development** | RED-GREEN-REFACTOR 循環 | 寫 Excel 解析器時（最關鍵的邏輯） |
| **superpowers-systematic-debugging** | 四階段根因除錯 | 遇到 bug 時，尤其是解析相關 |
| **using-git-worktrees** | Git worktree 隔離開發 | 如果需要分支隔離（本專案可能不需要） |
| **finishing-a-development-branch** | 分支整合流程 | M9 最終驗收後，準備 merge/PR |
| **ui-ux-pro-max** | UI/UX 設計規範、配色、字型 | M5-M7 建 UI 元件和頁面時 |

### 各 Round 的 Skill 啟用順序

```
Round 1 (M0): 無需額外 skill，手動執行 scaffold
Round 2 (M1): 無需額外 skill，搬運已驗證的 config/utils
Round 3 (M2+M3+M4):
  → dispatching-parallel-agents（同時派三組）
  → subagent-driven-development（每組含 PM+RD 審查）
  → superpowers-test-driven-development（M4 Excel 解析器必用 TDD）
  → superpowers-verification-before-completion（三組都完成後驗證）
Round 4 (M5+M6+M7):
  → dispatching-parallel-agents
  → subagent-driven-development
  → ui-ux-pro-max（確保 UI 一致性）
  → superpowers-requesting-code-review（頁面完成後審查）
Round 5 (M8): superpowers-verification-before-completion（成本計算邏輯驗證）
Round 6 (M9):
  → superpowers-verification-before-completion（最終全面驗收）
  → finishing-a-development-branch（整合 + PR）
```

## 並行開發策略

以下里程碑可並行（由多個 sub-agent 同時執行）：

```
Round 1: M0（scaffold）— 單獨先做，驗證部署
Round 2: M1（config/utils）— 單獨先做，後續模組的基礎
Round 3: M2（auth）+ M3（data/api）+ M4（excel）— 三組並行
Round 4: M5（UI 元件）+ M6（Phase 1 頁面）+ M7（Phase 2 頁面）— 三組並行
Round 5: M8（Phase 3 成本）— 依賴前面全部完成
Round 6: M9（最終驗收）— 依賴全部完成
```

## KPI 計算定義（第一次開發的教訓：定義不明會導致反覆修改）

| KPI | 公式 | 注意事項 |
|-----|------|---------|
| 總工時 | Σ(filteredLogs.hours) | 排除假日行（hours=0 的直接排除） |
| 員工人數 | count(distinct employee in filteredLogs) | 只計有資料的員工，不是全員 11 人 |
| 專案數量 | count(distinct ipProject in filteredLogs where ipProject≠'非授權IP') | 不含「非授權IP」類別 |
| 平均每人工時 | 總工時 / 員工人數 | 分母用有資料的員工數 |
| 總管理費用 | Σ(salaryData.salary) for selected month | 沒有薪資資料時顯示「--」不是 0 |
| 平均時薪成本 | 總管理費用 / 總工時 | 工時為 0 時顯示「--」 |

## 風險控管

| 風險 | 緩解措施 |
|------|---------|
| 並行 agent 產出的程式碼風格不一致 | 每個 agent 的 prompt 都包含完整的 types.js 和 constants.js |
| Excel 解析邏輯對不上真實資料 | M4.4 強制用真實檔案測試，不通過不往下走 |
| Vercel 部署失敗 | M0 就驗證 pipeline，每個 milestone push 後都驗證 |
| Google API 權限問題 | 零配置防禦，沒 API 也能手動上傳使用 |
| 成本計算邏輯錯誤 | 成本放最後（M8），前面的基礎穩了才做 |
