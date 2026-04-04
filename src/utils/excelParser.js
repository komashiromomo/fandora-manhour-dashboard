import * as XLSX from 'xlsx';
import {
  excelDateToString,
  normalizeName,
  getDept,
  isKnownIP,
  extractMonthFromFilename,
} from '../shared/utils';
import { KNOWN_IP_LIST } from '../shared/constants';

/**
 * Parse the consolidated all-staff work log file (Fandora工作日誌).
 * @param {ArrayBuffer} buffer - xlsx file buffer
 * @param {string} filename - original filename for month extraction
 * @returns {Array<import('../shared/types').WorkLog>}
 */
export function parseAllStaffFile(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets['明細總表'];
  if (!sheet) {
    console.warn(`Sheet "明細總表" not found in ${filename}`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const month = extractMonthFromFilename(filename);

  // Find header row
  let headerIdx = -1;
  let colName = -1, colDept = -1, colIP = -1, colDate = -1, colTask = -1, colHours = -1, colNote = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const cells = row.map((c) => String(c || '').trim());
    const nameIdx = cells.indexOf('員工姓名');
    if (nameIdx !== -1) {
      headerIdx = i;
      colName = nameIdx;
      colDept = cells.indexOf('部門');
      colIP = cells.indexOf('授權IP');
      colDate = cells.indexOf('日期');
      colTask = cells.indexOf('工作項目');
      colHours = cells.indexOf('實際時數');
      colNote = cells.indexOf('備註');
      break;
    }
  }

  if (headerIdx === -1) {
    console.warn(`Header row not found in ${filename}`);
    return [];
  }

  const results = [];
  let prevName = '', prevDept = '', prevIP = '', prevDate = '';

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    // Carry-forward logic
    const rawName = row[colName] != null && String(row[colName]).trim() !== '' ? String(row[colName]).trim() : prevName;
    const rawDept = colDept >= 0 && row[colDept] != null && String(row[colDept]).trim() !== '' ? String(row[colDept]).trim() : prevDept;
    const rawIP = colIP >= 0 && row[colIP] != null && String(row[colIP]).trim() !== '' ? String(row[colIP]).trim() : prevIP;
    const rawDate = colDate >= 0 && row[colDate] != null && String(row[colDate]).trim() !== '' ? row[colDate] : prevDate;

    prevName = rawName;
    prevDept = rawDept;
    prevIP = rawIP;
    prevDate = rawDate;

    const task = colTask >= 0 && row[colTask] != null ? String(row[colTask]).trim() : '';
    const hours = colHours >= 0 ? parseFloat(row[colHours]) || 0 : 0;
    const note = colNote >= 0 && row[colNote] != null ? String(row[colNote]).trim() : '';

    if (hours === 0 || !task) continue;

    const name = normalizeName(rawName);
    const dept = getDept(name) !== '未分類' ? getDept(name) : rawDept;

    // IP classification: explicit IP value from row takes priority
    let ipProject;
    const explicitIP = colIP >= 0 && row[colIP] != null && String(row[colIP]).trim() !== '';
    if (explicitIP) {
      ipProject = String(row[colIP]).trim();
    } else if (isKnownIP(task)) {
      ipProject = task;
    } else {
      ipProject = '非授權IP';
    }

    // Date formatting
    let dateStr;
    if (typeof rawDate === 'number') {
      dateStr = excelDateToString(rawDate);
    } else {
      const d = String(rawDate).trim();
      // Try to parse various date formats into YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        dateStr = d;
      } else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(d)) {
        const parts = d.split('/');
        dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        dateStr = d;
      }
    }

    results.push({
      name,
      dept,
      task,
      ipProject,
      hours,
      date: dateStr,
      month: month || (dateStr ? dateStr.substring(0, 7) : ''),
      note,
    });
  }

  return results;
}

/**
 * Parse an individual staff work log file (工作日誌_YYYY年_[nickname]).
 * @param {ArrayBuffer} buffer - xlsx file buffer
 * @param {string} filename - original filename
 * @returns {Array<import('../shared/types').WorkLog>}
 */
export function parseIndividualFile(buffer, filename) {
  // Extract nickname from filename pattern "工作日誌_YYYY年_[nickname]"
  const nickMatch = filename.match(/工作日誌_(\d{4})年_([^.]+)/);
  if (!nickMatch) {
    console.warn(`Cannot extract nickname from filename: ${filename}`);
    return [];
  }

  const year = nickMatch[1];
  const nickname = nickMatch[2].replace(/\.xlsx$/i, '');
  const name = normalizeName(nickname);
  const dept = getDept(name);

  const workbook = XLSX.read(buffer, { type: 'array' });
  const results = [];

  for (const sheetName of workbook.SheetNames) {
    // Only process sheets matching pattern like "9月", "10月"
    if (!/^\d{1,2}月$/.test(sheetName)) continue;

    const monthNum = parseInt(sheetName.replace('月', ''));
    const month = `${year}-${String(monthNum).padStart(2, '0')}`;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find header row
    let headerIdx = -1;
    let colDate = -1, colTask = -1, colHours = -1, colIP = -1, colNote = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const cells = row.map((c) => String(c || '').trim());
      const dateIdx = cells.indexOf('日期');
      const taskIdx = cells.indexOf('工作項目');
      if (dateIdx !== -1 && taskIdx !== -1) {
        headerIdx = i;
        colDate = dateIdx;
        colTask = taskIdx;
        colHours = cells.indexOf('實際時數');
        colIP = cells.indexOf('授權IP');
        colNote = cells.indexOf('備註');
        break;
      }
    }

    if (headerIdx === -1) continue;

    let prevDate = '', prevIP = '';

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      // Carry-forward for date and IP
      const rawDate = colDate >= 0 && row[colDate] != null && String(row[colDate]).trim() !== '' ? row[colDate] : prevDate;
      const rawIP = colIP >= 0 && row[colIP] != null && String(row[colIP]).trim() !== '' ? String(row[colIP]).trim() : prevIP;

      prevDate = rawDate;
      prevIP = rawIP;

      const task = colTask >= 0 && row[colTask] != null ? String(row[colTask]).trim() : '';
      const hours = colHours >= 0 ? parseFloat(row[colHours]) || 0 : 0;
      const note = colNote >= 0 && row[colNote] != null ? String(row[colNote]).trim() : '';

      if (hours === 0 || !task) continue;

      // IP classification
      let ipProject;
      const explicitIP = colIP >= 0 && row[colIP] != null && String(row[colIP]).trim() !== '';
      if (explicitIP) {
        ipProject = String(row[colIP]).trim();
      } else if (isKnownIP(task)) {
        ipProject = task;
      } else {
        ipProject = '非授權IP';
      }

      // Date formatting
      let dateStr;
      if (typeof rawDate === 'number') {
        dateStr = excelDateToString(rawDate);
      } else {
        const d = String(rawDate).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          dateStr = d;
        } else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(d)) {
          const parts = d.split('/');
          dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          dateStr = d;
        }
      }

      results.push({
        name,
        dept,
        task,
        ipProject,
        hours,
        date: dateStr,
        month,
        note,
      });
    }
  }

  return results;
}
