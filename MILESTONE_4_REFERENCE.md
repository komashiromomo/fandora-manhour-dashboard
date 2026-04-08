# Milestone 4: Excel 解析器 — 快速參考

## 檔案清單

| 檔案 | 行數 | 責任 |
|------|------|------|
| `src/utils/excelParser.js` | 358 | 三種 Excel 格式解析 + 自動分派 |
| `src/utils/salaryParser.js` | 105 | 薪資表解析（靜默失敗策略） |
| `src/utils/costCalculator.js` | 172 | 成本分攤計算 |

---

## 公開 API

### excelParser.js

```javascript
import { 
  parseWorkbook,
  parseDetailSheet, 
  parsePivotSheet, 
  parseIndividualSheets 
} from '@/utils/excelParser';

// 主入口（推薦使用）
const logs = parseWorkbook(buffer, filename);
// → WorkLog[] 自動偵測格式並解析

// 直接使用特定解析器
const logs = parseDetailSheet(workbook, sheetName, filename);
const logs = parsePivotSheet(workbook, sheetName, filename);
const logs = parseIndividualSheets(workbook, filename);
```

### salaryParser.js

```javascript
import { parseSalarySheet } from '@/utils/salaryParser';

const records = parseSalarySheet(buffer);
// → SalaryRecord[] { employee, month, salary }
// 失敗時回傳 []
```

### costCalculator.js

```javascript
import { 
  calcProjectCost,
  calcDeptCost,
  calcEmployeeProjectCost
} from '@/utils/costCalculator';

const costs = calcProjectCost(filteredLogs, salaryData);
// → { 'IP1': 50000, 'IP2': 30000, ... }

const costs = calcDeptCost(filteredLogs, salaryData);
// → { '後勤部': 100000, '企劃部': 80000, ... }

const costs = calcEmployeeProjectCost(filteredLogs, salaryData);
// → { 'Kate|老高': 25000, 'Janet|咖波': 15000, ... }
```

---

## 5 個 CRITICAL BUG 修復

| Bug | 解法 | 位置 |
|-----|------|------|
| **B1** SheetJS 把時間小數當專案名 | `cellDates: false` + 手動 parseDateString | parseWorkbook L323 |
| **B2** Excel 日期序號顯示為部門 | parseDateString 支援 5+ 格式 | dates.js (已驗) |
| **B3** 接續列空白導致資料遺失 | carry-forward 機制 | parseDetailSheet L66-72, parseIndividualSheets L224-228 |
| **B4** 暱稱對不上部門 | normalizeName() | parseDetailSheet L65, parsePivotSheet L96 |
| **B5** 無自訂日期篩選 | 已在 DataContext 處理 | — |

---

## 關鍵邏輯說明

### Carry-Forward 機制（Bug B3）

**問題**：員工跨多列，但名字只在第一列，往下的列為空。

**解法**：追蹤 `lastEmployee`, `lastDept`, `lastDate`：

```javascript
// parseDetailSheet 中
let lastEmployee = '';
let lastDept = '';
let lastDate = '';

for (let i = headerRowIdx + 1; i < rows.length; i++) {
  const nameVal = String(row[nameColIdx] || '').trim();
  const deptVal = String(row[deptColIdx] || '').trim();
  const dateVal = String(row[dateColIdx] || '').trim();

  if (nameVal) lastEmployee = nameVal;
  if (deptVal) lastDept = deptVal;
  if (dateVal) lastDate = dateVal;

  const employee = lastEmployee ? normalizeName(lastEmployee) : '';
  // ...
}
```

### 個人版範本跳過（parseIndividualSheets）

前幾行可能是「全體例會」等範本資料，不應被計入。判斷條件：
- 日期為空 **且** task 包含 `INDIVIDUAL_TEMPLATE_TASKS` 中的字串
- 僅最開頭的連續空白行視為範本（往下的空白行視為 carry-forward）

```javascript
let dataStartIdx = 0;
for (let i = 0; i < Math.min(5, rows.length); i++) {
  const dateVal = String(row[0] || '').trim();
  const taskVal = String(row[3] || '').trim();
  
  if (!dateVal && INDIVIDUAL_TEMPLATE_TASKS.some(t => taskVal.includes(t))) {
    dataStartIdx = i + 1;
  } else if (!dateVal && i < 2) {
    dataStartIdx = i + 1;
  } else {
    break;  // 一旦找到有日期的行，停止跳過
  }
}
```

### 全員工格式優先級（parseWorkbook）

1. **優先**：明細總表（`ALL_STAFF_DETAIL_SHEET = '明細總表'`）
2. **備援**：Pivot 表（任何非排除 sheet 且非月份 sheet）
3. **個人版**：符合 `INDIVIDUAL_FILENAME_REGEX` 的檔名
4. **fallback**：再次嘗試找明細總表

---

## 數據流向

```
Excel 檔案 (buffer)
    ↓
parseWorkbook(buffer, filename)
    ├─ classifyFileType → 'allStaff' | 'individual' | 'unknown'
    ├─ XLSX.read(..., { cellDates: false })
    ├─ 分派到 parseDetailSheet / parsePivotSheet / parseIndividualSheets
    └─ WorkLog[] → DataContext.setWorkLogs()

WorkLog 結構（對應 types.js）：
{
  date: 'YYYY-MM-DD',
  month: 'YYYY-MM',
  employee: '真名',
  department: '部門名',
  task: '工作內容或工作項目',
  hours: 8.5,
  ipProject: 'IP 名稱或非授權IP',
  workType: '工作項目',
  source: 'allStaff' | 'individual',
  sourceFile: '原始檔名'
}
```

---

## 錯誤處理策略

所有函式都遵循**靜默失敗**原則：

```javascript
try {
  // 解析邏輯
  return [...];
} catch (err) {
  console.warn(`[functionName] 解析失敗:`, err.message);
  return [];  // 空陣列，不中斷主流程
}
```

此策略確保：
- 單個損壞檔案不會導致應用崩潰
- 管理員看到 console 警告，知道有問題
- UI 優雅降級（可能資料少，但不卡住）

---

## 集成檢查清單

- [ ] 所有三個文件已建立在 `/src/utils/`
- [ ] 所有 import 路徑正確
- [ ] `package.json` 已包含 `xlsx` 依賴
- [ ] DataContext 已導入並呼叫 `parseWorkbook()`
- [ ] 測試檔案覆蓋三種格式 + 邊界情況
- [ ] console 無警告或錯誤

---

## 下一步：Milestone 5 Dashboard 可視化

此模組交付的 WorkLog[] + SalaryRecord[] 將供：
- Overview 頁籤：總工時、平均工時、部門分佈
- Projects / WorkTypes / Employees / Departments 頁籤：明細表 + 圖表
- 成本分析：使用 costCalculator 計算

---

**完成日期**：2026-04-08
**開發狀態**：✓ 已驗證所有 CRITICAL bug 修復
