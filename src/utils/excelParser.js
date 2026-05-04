/**
 * Excel 解析器 — Milestone 4
 *
 * 三種 Excel 格式支援：
 * 1. parseDetailSheet() — 全員工「明細總表」格式
 * 2. parsePivotSheet()  — 全員工 Pivot 交叉表格式
 * 3. parseIndividualSheets() — 個人版工作日誌
 *
 * ⚠️ 已實裝所有 5 個 CRITICAL bug 修復邏輯
 */

import { parseDateString, extractMonthFromFilename, extractNameFromFilename, extractDeptFromFilename, extractYearFromFilename, extractMonthFromSheetName, roundHours } from './dates';
import { normalizeName, getDept, classifyIP, classifyFileType, splitNameWithDept } from './names';
import { ALL_STAFF_DETAIL_SHEET, EXCLUDED_SHEETS, HOLIDAY_KEYWORDS, MONTH_SHEET_REGEX, INDIVIDUAL_TEMPLATE_TASKS } from '../config/constants';
import * as XLSX from 'xlsx';

/**
 * 解析全員工「明細總表」Sheet
 *
 * 預期 9 欄：
 * 員工姓名 | 部門 | 日期 | 應上下班時段 | 工作開始時間 | 工作結束時間 | 總工作時段 | 工作內容說明 | 實際時數
 *
 * @param {XLSX.WorkBook} workbook
 * @param {string} sheetName
 * @param {string} filename
 * @returns {Array} WorkLog[]
 */
export function parseDetailSheet(workbook, sheetName, filename) {
  try {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return [];

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const month = extractMonthFromFilename(filename);

    // 在前 30 行尋找 header 列
    let headerRowIdx = -1;
    let nameColIdx = -1;
    let hoursColIdx = -1;
    let deptColIdx = -1;
    let dateColIdx = -1;
    let shiftColIdx = -1;
    let taskColIdx = -1;

    for (let i = 0; i < Math.min(30, rows.length); i++) {
      const row = rows[i];
      const rowText = row.join('|').toLowerCase();
      if (rowText.includes('員工姓名') && rowText.includes('實際時數')) {
        headerRowIdx = i;
        // 找出各欄索引
        nameColIdx = row.findIndex(cell => String(cell).includes('員工姓名'));
        hoursColIdx = row.findIndex(cell => String(cell).includes('實際時數'));
        deptColIdx = row.findIndex(cell => String(cell).includes('部門'));
        dateColIdx = row.findIndex(cell => String(cell).includes('日期'));
        shiftColIdx = row.findIndex(cell => String(cell).includes('應上下班時段'));
        taskColIdx = row.findIndex(cell => String(cell).includes('工作內容說明'));
        break;
      }
    }

    if (headerRowIdx < 0 || nameColIdx < 0 || hoursColIdx < 0) {
      console.warn(`[parseDetailSheet] 找不到 header 或必要欄位 in ${sheetName}`);
      return [];
    }

    const logs = [];
    let lastEmployee = '';
    let lastDept = '';
    let lastDate = '';

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // Carry-forward 機制（Bug B3 修復）
      const nameVal = String(row[nameColIdx] || '').trim();
      const deptVal = String(row[deptColIdx] || '').trim();
      const dateVal = String(row[dateColIdx] || '').trim();

      if (nameVal) lastEmployee = nameVal;
      if (deptVal) lastDept = deptVal;
      if (dateVal) lastDate = dateVal;

      // 員工姓名欄可能是「本名_部門」複合字串，要拆開
      const { name: bareName, dept: nameDept } = splitNameWithDept(lastEmployee);
      const employee = bareName ? normalizeName(bareName) : '';

      // 部門優先序：EMPLOYEE_DEPT_MAP（含 overrides，最新組織表）→ 名字拆出的部門 → row 的部門 → 未知
      let dept = '未知部門';
      if (employee) {
        const looked = getDept(employee);
        if (looked && looked !== '未知部門') dept = looked;
        else if (nameDept) dept = nameDept;
        else if (lastDept) dept = lastDept;
      } else if (nameDept) dept = nameDept;
      else if (lastDept) dept = lastDept;

      const date = lastDate ? parseDateString(lastDate) : '';

      if (!employee || !date) continue;

      // 假日行判斷（Bug B2 修復：支援多格式）
      const shiftText = String(row[shiftColIdx] || '');
      if (HOLIDAY_KEYWORDS.some(kw => shiftText.includes(kw))) continue;

      // 解析工時
      const hoursVal = row[hoursColIdx];
      const hours = roundHours(parseFloat(hoursVal));
      if (isNaN(hours) || hours === 0) continue;

      // 工作內容與 IP 分類
      const task = String(row[taskColIdx] || '').trim();
      const ipProject = classifyIP(task);
      const workType = task;

      logs.push({
        date,
        month,
        employee,
        department: dept,
        task,
        hours,
        ipProject,
        workType,
        source: 'allStaff',
        sourceFile: filename,
      });
    }

    return logs;
  } catch (err) {
    console.warn(`[parseDetailSheet] 解析失敗 ${sheetName}:`, err.message);
    return [];
  }
}

/**
 * 解析全員工 Pivot 交叉表格式
 *
 * 預期結構：
 * - 第一列 = 員工姓名（header）
 * - 第一欄 = 工作項目名稱
 * - cell = 工時數字
 *
 * @param {XLSX.WorkBook} workbook
 * @param {string} sheetName
 * @param {string} filename
 * @returns {Array} WorkLog[]
 */
export function parsePivotSheet(workbook, sheetName, filename) {
  try {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return [];

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 2) return [];

    const month = extractMonthFromFilename(filename);
    const headerRow = rows[0];

    const logs = [];

    // 遍歷每一列（跳過第 0 行 header）
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const taskName = String(row[0] || '').trim();
      if (!taskName) continue;

      // 遍歷每個員工（跳過第 0 欄 task name）
      for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
        const employeeRaw = String(headerRow[colIdx] || '').trim();
        if (!employeeRaw) continue;

        const hoursVal = row[colIdx];
        const hours = roundHours(parseFloat(hoursVal));
        if (isNaN(hours) || hours === 0) continue;

        // header 也可能是「本名_部門」複合字串
        const { name: bareName, dept: headerDept } = splitNameWithDept(employeeRaw);
        const employee = normalizeName(bareName);
        const looked = getDept(employee);
        const department = (looked && looked !== '未知部門') ? looked : (headerDept || '未知部門');
        const ipProject = classifyIP(taskName);

        logs.push({
          date: `${month}-01`, // Pivot 表格沒有具體日期，用月初
          month,
          employee,
          department,
          task: taskName,
          hours,
          ipProject,
          workType: taskName,
          source: 'allStaff',
          sourceFile: filename,
        });
      }
    }

    return logs;
  } catch (err) {
    console.warn(`[parsePivotSheet] 解析失敗 ${sheetName}:`, err.message);
    return [];
  }
}

/**
 * 解析個人版工作日誌（多月份）
 *
 * 預期 7 欄：
 * 日期 | 星期 | 授權IP | 工作項目 | 工作開始時間 | 工作結束時間 | 實際時數
 *
 * 特點：
 * - 每月一個 sheet（「1月」、「2月」...「12月」）
 * - 前幾行可能是範本資料（日期為空 + task 包含 INDIVIDUAL_TEMPLATE_TASKS）
 * - 支援 carry-forward 日期和授權IP、工作項目
 *
 * @param {XLSX.WorkBook} workbook
 * @param {string} filename
 * @returns {Array} WorkLog[]
 */
export function parseIndividualSheets(workbook, filename) {
  try {
    const rawName = extractNameFromFilename(filename);
    const filenameDept = extractDeptFromFilename(filename);
    const year = extractYearFromFilename(filename);
    if (!rawName || !year) {
      console.warn(`[parseIndividualSheets] 無法從檔名取得姓名或年份: ${filename}`);
      return [];
    }

    // 新格式檔名直接帶本名與部門；舊格式仍走 normalizeName + EMPLOYEE_DEPT_MAP
    const employee = normalizeName(rawName);
    const department = filenameDept || getDept(employee);

    const logs = [];

    for (const sheetName of workbook.SheetNames) {
      // 匹配月份 sheet（「1月」、「2月」...「12月」）
      const monthStr = extractMonthFromSheetName(sheetName);
      if (!monthStr) continue;

      const month = `${year}-${monthStr.padStart(2, '0')}`;

      const ws = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // 跳過前幾行範本資料
      let dataStartIdx = 0;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i];
        const dateVal = String(row[0] || '').trim();
        const taskVal = String(row[3] || '').trim();
        // 前兩行為空日期 + 包含範本 task 名稱
        if (!dateVal && INDIVIDUAL_TEMPLATE_TASKS.some(t => taskVal.includes(t))) {
          dataStartIdx = i + 1;
        } else if (!dateVal && i < 2) {
          // 最開頭的連續空白行（可能是範本）
          dataStartIdx = i + 1;
        } else {
          break;
        }
      }

      // 尋找欄位索引
      let dateColIdx = 0;
      let ipColIdx = 2;
      let taskColIdx = 3;
      let hoursColIdx = 6;

      let lastDate; // ⚠️ 保留原始型別（可能是 number Excel serial，String 化會讓 parseDateString 失敗）
      let lastIP = '';
      let lastTask = '';

      // 解析資料列
      for (let i = dataStartIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rawDate = row[dateColIdx];
        const dateStr = String(rawDate ?? '').trim();

        // 範例列（A 欄填「範例 1」「範例 2」「example 1」等）— 整列跳過，且不 carry-forward
        // 否則範例列的 IP / 工作項目會 carry-forward 到後續正常列，造成資料污染
        if (/^範例\s*\d*$|^example\s*\d*$|^示例\s*\d*$/i.test(dateStr)) continue;

        const hasDate = rawDate !== undefined && rawDate !== null && dateStr !== '';
        const ipVal = String(row[ipColIdx] || '').trim();
        const taskVal = String(row[taskColIdx] || '').trim();
        const hoursVal = row[hoursColIdx];

        // Carry-forward 機制：日期保留原始 raw（number serial 不要 String 化）
        if (hasDate) lastDate = rawDate;
        if (ipVal && ipVal !== '-' && ipVal !== '無') lastIP = ipVal;
        if (taskVal) lastTask = taskVal;

        const date = lastDate !== undefined ? parseDateString(lastDate, year, monthStr) : '';
        if (!date) continue;

        // 解析工時（hoursVal 可能是 number，也可能是 string）
        const hoursNum = typeof hoursVal === 'number' ? hoursVal : parseFloat(hoursVal);
        const hours = roundHours(hoursNum);
        if (isNaN(hours) || hours === 0) continue;

        // IP 和工作項目的優先順序
        // - 優先使用此列的值，沒有才用 carry-forward
        const ipProject = classifyIP(taskVal || lastTask, ipVal || lastIP);
        const workType = taskVal || lastTask || '其他';

        logs.push({
          date,
          month,
          employee,
          department,
          task: workType,
          hours,
          ipProject,
          workType,
          source: 'individual',
          sourceFile: filename,
        });
      }
    }

    return logs;
  } catch (err) {
    console.warn(`[parseIndividualSheets] 解析失敗 ${filename}:`, err.message);
    return [];
  }
}

/**
 * 自動偵測檔案類型並分派解析
 *
 * 優先順序：
 * 1. 全員工檔案 → 優先找「明細總表」sheet
 * 2. 全員工檔案 → 備援 Pivot sheet
 * 3. 個人版檔案 → parseIndividualSheets()
 * 4. 未知 → 嘗試找「明細總表」
 *
 * @param {ArrayBuffer} buffer
 * @param {string} filename
 * @returns {Array} WorkLog[]
 */
export function parseWorkbook(buffer, filename) {
  try {
    // Bug B1 修復：cellDates: false — 絕對必須
    const wb = XLSX.read(buffer, { cellDates: false });
    const fileType = classifyFileType(filename);

    if (fileType === 'allStaff') {
      // 優先找「明細總表」sheet
      if (wb.SheetNames.includes(ALL_STAFF_DETAIL_SHEET)) {
        return parseDetailSheet(wb, ALL_STAFF_DETAIL_SHEET, filename);
      }

      // 備援：尋找 Pivot sheet（如「2026_01」之類的 sheet）
      for (const sheetName of wb.SheetNames) {
        // 跳過排除列表和月份 sheet
        if (EXCLUDED_SHEETS.includes(sheetName)) continue;
        if (MONTH_SHEET_REGEX.test(sheetName)) continue;
        // 可能是 Pivot 格式，嘗試解析
        return parsePivotSheet(wb, sheetName, filename);
      }

      return [];
    }

    if (fileType === 'individual') {
      return parseIndividualSheets(wb, filename);
    }

    // unknown：嘗試找「明細總表」
    if (wb.SheetNames.includes(ALL_STAFF_DETAIL_SHEET)) {
      return parseDetailSheet(wb, ALL_STAFF_DETAIL_SHEET, filename);
    }

    return [];
  } catch (err) {
    console.warn(`[parseWorkbook] 解析失敗 ${filename}:`, err.message);
    return [];
  }
}
