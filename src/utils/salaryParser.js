import * as XLSX from 'xlsx';
import { parseCurrency } from '../shared/utils';

/**
 * 解析薪資 Excel
 * @param {ArrayBuffer} buffer
 * @returns {import('../shared/types').SalaryRecord[]}
 */
export function parseSalaryExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.find(n => n.includes('薪資')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  let headerIdx = -1;
  const colMap = {};
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => String(c).trim());
    const hasDate = row.some(c => c.includes('日期') || c.includes('月份'));
    const hasPersonnel = row.some(c => c.includes('人事'));
    if (hasDate && hasPersonnel) {
      headerIdx = i;
      row.forEach((cell, j) => {
        if (cell.includes('日期') || cell.includes('月份')) colMap.date = j;
        if (cell.includes('人事')) colMap.personnel = j;
        if (cell.includes('房租') || cell.includes('場租')) colMap.rent = j;
        if (cell.includes('硬體') || cell.includes('系統')) colMap.hardware = j;
        if (cell.includes('雜費')) colMap.misc = j;
        if (cell.includes('總計') || cell.includes('合計') || cell.includes('月薪')) colMap.total = j;
      });
      break;
    }
  }

  if (headerIdx === -1) {
    console.warn('[salaryParser] 找不到薪資表 header');
    return [];
  }

  const records = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const dateVal = row[colMap.date];
    if (!dateVal) continue;

    const dateStr = String(dateVal).trim();
    const m = dateStr.match(/(\d{4})[/-](\d{1,2})/);
    if (!m) continue;
    const month = `${m[1]}-${String(m[2]).padStart(2, '0')}`;

    const personnel = parseCurrency(row[colMap.personnel]);
    const rent = parseCurrency(row[colMap.rent]);
    const hardware = parseCurrency(row[colMap.hardware]);
    const misc = parseCurrency(row[colMap.misc]);
    const total = colMap.total !== undefined ? parseCurrency(row[colMap.total]) : (personnel + rent + hardware + misc);

    if (total <= 0 && personnel <= 0) continue;

    records.push({
      月份: month,
      月薪: total || (personnel + rent + hardware + misc),
      人事費: personnel,
      房租場租: rent,
      硬體系統費用: hardware,
      雜費: misc,
    });
  }

  console.log(`[salaryParser] 解析 ${records.length} 筆薪資紀錄`);
  return records;
}
