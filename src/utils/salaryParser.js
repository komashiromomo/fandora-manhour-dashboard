/**
 * 月度管銷費用表解析器（取代原本的「員工月薪」格式）
 *
 * 新格式：
 *   月份(空欄header) | 人事費 | 房租場租 | 硬體系統費用 | 雜費 | 總計
 *   2025/9          | $1,000,000 | ...                     | ...  | $1,200,000
 *   2025/10         ...
 *
 * 舊格式（姓名+月薪）：仍 fallback 解析，每個 employee 視為一筆 month=當月、total=月薪 的記錄
 *
 * 回傳結構（為了相容既有 DataContext 命名，物件 key 仍稱 salary，但語意上是「該月度管銷總額」）：
 *   { month: 'YYYY-MM', total: number, personnel?, rent?, hardware?, misc?, employee?: '_company_' }
 *
 * 靜默失敗：任何錯誤回 []，不中斷主流程
 */

import * as XLSX from 'xlsx';
import { normalizeName } from './names';

function normalizeMonth(value) {
  if (value == null || value === '') return '';
  // Excel serial number for date
  if (typeof value === 'number') {
    if (value < 10000 || value > 80000) return '';
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const str = String(value).trim();
  // 2025/9 / 2025-09 / 2025年9月
  const match = str.match(/(\d{4})[\/\-年](\d{1,2})/);
  if (!match) return '';
  return `${match[1]}-${match[2].padStart(2, '0')}`;
}

function parseAmount(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const num = parseFloat(String(v).replace(/[\$,\s]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * 解析月度管銷費用表（或 fallback 到舊員工薪資表）
 * @param {ArrayBuffer} buffer
 * @returns {Array} ExpenseRecord[]
 */
export function parseSalarySheet(buffer) {
  try {
    const wb = XLSX.read(buffer, { cellDates: false });
    const wsName = wb.SheetNames[0];
    if (!wsName) return [];

    const ws = wb.Sheets[wsName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 2) return [];

    // ===== 嘗試新格式：月度管銷 =====
    // header 第一列若含「總計 / 人事費 / 費用 / 雜費」之一，就走新格式
    const header = rows[0].map((c) => String(c));
    const headerText = header.join('|');
    const looksLikeExpense =
      /總計|人事費|管銷|雜費|房租|場租|硬體/.test(headerText);

    if (looksLikeExpense) {
      const totalIdx = header.findIndex((c) => /總計|total/i.test(c));
      const personnelIdx = header.findIndex((c) => /人事費/.test(c));
      const rentIdx = header.findIndex((c) => /房租|場租/.test(c));
      const hwIdx = header.findIndex((c) => /硬體|系統/.test(c));
      const miscIdx = header.findIndex((c) => /雜費|其他/.test(c));
      const monthIdx = 0; // 第一欄

      const records = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const month = normalizeMonth(row[monthIdx]);
        if (!month) continue;

        const personnel = personnelIdx >= 0 ? parseAmount(row[personnelIdx]) : 0;
        const rent = rentIdx >= 0 ? parseAmount(row[rentIdx]) : 0;
        const hardware = hwIdx >= 0 ? parseAmount(row[hwIdx]) : 0;
        const misc = miscIdx >= 0 ? parseAmount(row[miscIdx]) : 0;
        const totalCell = totalIdx >= 0 ? parseAmount(row[totalIdx]) : 0;
        const total = totalCell > 0 ? totalCell : personnel + rent + hardware + misc;
        if (total <= 0) continue;

        records.push({
          month,
          total: Math.round(total),
          personnel: Math.round(personnel),
          rent: Math.round(rent),
          hardware: Math.round(hardware),
          misc: Math.round(misc),
          employee: '_company_', // sentinel：標示這是公司全體管銷
          salary: Math.round(total), // 舊命名相容（DataContext.salaryData 仍可 sumBy 'salary'）
        });
      }
      if (records.length > 0) return records;
    }

    // ===== Fallback：舊格式（姓名 + 月薪） =====
    let headerRowIdx = -1;
    let nameColIdx = -1;
    let salaryColIdx = -1;
    let monthColIdx = -1;

    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      const rowText = row.join('|').toLowerCase();
      if (rowText.includes('姓名') && rowText.includes('月薪')) {
        headerRowIdx = i;
        nameColIdx = row.findIndex((cell) => String(cell).includes('姓名'));
        salaryColIdx = row.findIndex((cell) => String(cell).includes('月薪'));
        monthColIdx = row.findIndex((cell) => String(cell).toLowerCase().includes('月份'));
        break;
      }
    }

    if (headerRowIdx < 0 || nameColIdx < 0 || salaryColIdx < 0) {
      console.warn('[parseSalarySheet] 找不到任何已知 header（總計/人事費 或 姓名/月薪）');
      return [];
    }

    const records = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const nameVal = String(row[nameColIdx] || '').trim();
      if (!nameVal) continue;
      const salaryVal = parseAmount(row[salaryColIdx]);
      if (salaryVal <= 0) continue;

      const employee = normalizeName(nameVal);
      let month = '';
      if (monthColIdx >= 0) {
        month = normalizeMonth(row[monthColIdx]);
      }
      if (!month) {
        const now = new Date();
        month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }

      records.push({
        employee,
        month,
        salary: Math.round(salaryVal),
        total: Math.round(salaryVal),
      });
    }
    return records;
  } catch (err) {
    console.warn('[parseSalarySheet] 解析失敗:', err.message);
    return [];
  }
}
