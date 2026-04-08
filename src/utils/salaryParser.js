/**
 * 薪資表解析器
 *
 * 靜默失敗策略：任何解析錯誤都回傳空陣列，不中斷主流程
 * 預期檔案格式：第一列為 header，包含「姓名」和「月薪」欄位
 */

import * as XLSX from 'xlsx';
import { normalizeName } from './names';

/**
 * 解析薪資表
 *
 * 預期格式：
 * - 第一列：header（包含「姓名」和「月薪」欄位）
 * - 後續列：員工資料
 *
 * @param {ArrayBuffer} buffer
 * @returns {Array} SalaryRecord[] with { employee, month, salary }
 */
export function parseSalarySheet(buffer) {
  try {
    const wb = XLSX.read(buffer, { cellDates: false });
    const wsName = wb.SheetNames[0];
    if (!wsName) return [];

    const ws = wb.Sheets[wsName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) return [];

    // 尋找 header 列
    let headerRowIdx = -1;
    let nameColIdx = -1;
    let salaryColIdx = -1;
    let monthColIdx = -1;

    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      const rowText = row.join('|').toLowerCase();

      if (rowText.includes('姓名') && rowText.includes('月薪')) {
        headerRowIdx = i;
        nameColIdx = row.findIndex(cell => String(cell).includes('姓名'));
        salaryColIdx = row.findIndex(cell => String(cell).includes('月薪'));
        // 可選：尋找月份欄位
        monthColIdx = row.findIndex(cell => String(cell).toLowerCase().includes('月份'));
        break;
      }
    }

    if (headerRowIdx < 0 || nameColIdx < 0 || salaryColIdx < 0) {
      console.warn('[parseSalarySheet] 找不到必要欄位（姓名、月薪）');
      return [];
    }

    const records = [];

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const nameVal = String(row[nameColIdx] || '').trim();
      if (!nameVal) continue;

      const salaryVal = parseFloat(row[salaryColIdx]);
      if (isNaN(salaryVal) || salaryVal <= 0) continue;

      const employee = normalizeName(nameVal);
      let month = '';

      // 如果有月份欄位，使用它
      if (monthColIdx >= 0) {
        const monthVal = String(row[monthColIdx] || '').trim();
        if (monthVal) {
          // 嘗試解析月份（簡單邏輯：YYYY-MM 或 YYYY年MM月）
          const fullMatch = monthVal.match(/(\d{4})[年\-](\d{1,2})/);
          if (fullMatch) {
            const [, y, m] = fullMatch;
            month = `${y}-${m.padStart(2, '0')}`;
          }
        }
      }

      // 若無月份資訊，使用當前月份（caller 應自行提供月份）
      if (!month) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        month = `${y}-${m}`;
      }

      records.push({
        employee,
        month,
        salary: Math.round(salaryVal),
      });
    }

    return records;
  } catch (err) {
    console.warn('[parseSalarySheet] 解析失敗:', err.message);
    return [];
  }
}
