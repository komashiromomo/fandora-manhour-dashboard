/**
 * Fandora 人工時管理系統 — 介面合約定義
 * 所有模組必須對照此檔案的 typedef 開發
 * ⚠️ 不要修改 property 名稱，否則全部模組會壞
 */

/**
 * 單筆工時記錄
 * @typedef {Object} WorkLog
 * @property {string} date        - YYYY-MM-DD
 * @property {string} month       - YYYY-MM（從檔名取，不從 cell 取）
 * @property {string} employee    - 真名（已正規化）
 * @property {string} department  - 部門名稱
 * @property {string} task        - 工作內容說明（全員工總表）或工作項目（個人版）
 * @property {number} hours       - 工時（小時）
 * @property {string} ipProject   - 授權IP 名稱 or '非授權IP'
 * @property {string} workType    - 工作項目（個人版直接取；全員工=task）
 * @property {string} source      - 'allStaff' | 'individual'
 * @property {string} sourceFile  - 來源檔名
 */

/**
 * 薪資記錄
 * @typedef {Object} SalaryRecord
 * @property {string} employee    - 真名
 * @property {string} month       - YYYY-MM
 * @property {number} salary      - 月薪金額
 */

/**
 * 篩選條件
 * @typedef {Object} Filters
 * @property {string} [month]     - YYYY-MM or 'all'
 * @property {string} [dateFrom]  - YYYY-MM-DD
 * @property {string} [dateTo]    - YYYY-MM-DD
 */

/**
 * DataContext 全域狀態
 * @typedef {Object} DataState
 * @property {WorkLog[]} workLogs
 * @property {SalaryRecord[]} salaryData
 * @property {boolean} isLoading
 * @property {string} loadingMessage
 * @property {Filters} filters
 * @property {WorkLog[]} filteredLogs - derived from workLogs + filters
 */

/**
 * DataContext 對外介面（所有 consumer 只透過這些方法操作）：
 *
 * setWorkLogs(logs: WorkLog[]) → void          // 替換全部工時資料
 * appendWorkLogs(logs: WorkLog[]) → void        // 追加工時資料
 * setSalaryData(records: SalaryRecord[]) → void // 替換薪資資料
 * setFilters(filters: Partial<Filters>) → void  // 更新篩選條件
 * clearAll() → void                             // 清除所有資料
 * setLoading(isLoading, message?) → void        // 設定載入狀態
 *
 * ⚠️ 注意：沒有 setData(logs, salary) 這種雙參數函式。
 * 每種資料有獨立的 setter，不會互相影響。
 */

/**
 * AuthContext 對外介面：
 *
 * authUser: { email, name, picture } | null
 * isAuthenticated: boolean
 * isLoading: boolean
 * accessToken: string | null
 * role: 'admin' | 'member'
 * renderSignInButton(elementRef) → void
 * logout() → void
 * refreshToken() → Promise<string>
 */

export {};
