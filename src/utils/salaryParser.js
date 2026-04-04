import * as XLSX from 'xlsx';
import { parseCurrency } from '../shared/utils';

/**
 * Parse a salary/cost Excel file.
 * @param {ArrayBuffer} buffer - xlsx file buffer
 * @returns {Array<import('../shared/types').SalaryRecord>}
 */
export function parseSalaryExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Find sheet containing "薪資" in its name
  const sheetName = workbook.SheetNames.find((n) => n.includes('薪資')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Find header row with '日期' or '月份'
  let headerIdx = -1;
  let colDate = -1, colPersonnel = -1, colRent = -1, colHardware = -1, colMisc = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const cells = row.map((c) => String(c || '').trim());

    const dateIdx = cells.findIndex((c) => c === '日期' || c === '月份');
    if (dateIdx !== -1) {
      headerIdx = i;
      colDate = dateIdx;
      colPersonnel = cells.findIndex((c) => c.includes('人事費'));
      colRent = cells.findIndex((c) => c.includes('房租場租'));
      colHardware = cells.findIndex((c) => c.includes('硬體系統費用'));
      colMisc = cells.findIndex((c) => c.includes('雜費'));
      break;
    }
  }

  if (headerIdx === -1) {
    console.warn('Salary header row not found');
    return [];
  }

  const results = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[colDate] == null) continue;

    const rawDate = String(row[colDate]).trim();
    if (!rawDate) continue;

    // Parse date "2025/9" → "2025-09"
    let monthStr;
    if (/^\d{4}\/\d{1,2}$/.test(rawDate)) {
      const parts = rawDate.split('/');
      monthStr = `${parts[0]}-${parts[1].padStart(2, '0')}`;
    } else if (/^\d{4}-\d{2}$/.test(rawDate)) {
      monthStr = rawDate;
    } else {
      // Try to extract year-month from other formats
      const match = rawDate.match(/(\d{4})[/-](\d{1,2})/);
      if (match) {
        monthStr = `${match[1]}-${match[2].padStart(2, '0')}`;
      } else {
        continue;
      }
    }

    const personnel = colPersonnel >= 0 ? parseCurrency(row[colPersonnel]) : 0;
    const rent = colRent >= 0 ? parseCurrency(row[colRent]) : 0;
    const hardware = colHardware >= 0 ? parseCurrency(row[colHardware]) : 0;
    const misc = colMisc >= 0 ? parseCurrency(row[colMisc]) : 0;
    const totalCost = personnel + rent + hardware + misc;

    results.push({
      月份: monthStr,
      月薪: totalCost,
      人事費: personnel,
      房租場租: rent,
      硬體系統費用: hardware,
      雜費: misc,
    });
  }

  return results;
}
