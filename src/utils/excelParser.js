import * as XLSX from 'xlsx';
import { extractMonthFromFilename, isKnownIP, normalizeName, getDept, excelDateToString } from '../shared/utils';

/**
 * 分類檔案類型
 * @param {string} filename
 * @returns {'allStaff'|'individual'|'unknown'}
 */
export function classifyFile(filename) {
  if (/Fandora工作日誌/.test(filename) || /Fandora.*工作日誌_\d{4}年\d{1,2}月/.test(filename)) {
    return 'allStaff';
  }
  if (/工作日誌_(\d{4})年_(.+)/.test(filename)) {
    return 'individual';
  }
  return 'unknown';
}

function parseDateValue(val, fallbackMonth) {
  if (!val) return fallbackMonth ? `${fallbackMonth}-01` : '';
  if (typeof val === 'number') return excelDateToString(val);
  const str = String(val).trim();
  const m = str.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  const m2 = str.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (m2 && fallbackMonth) {
    const [y] = fallbackMonth.split('-');
    return `${y}-${String(m2[1]).padStart(2, '0')}-${String(m2[2]).padStart(2, '0')}`;
  }
  return fallbackMonth ? `${fallbackMonth}-01` : '';
}

/**
 * 解析全員工總表
 * @param {ArrayBuffer} buffer
 * @param {string} filename
 * @returns {import('../shared/types').WorkLog[]}
 */
export function parseAllStaffFile(buffer, filename) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.find(n => n.includes('明細總表')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const month = extractMonthFromFilename(filename);

  let headerIdx = -1;
  const colMap = {};
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => String(c).trim());
    const hasName = row.some(c => c.includes('員工姓名') || c.includes('姓名'));
    const hasHours = row.some(c => c.includes('實際時數') || c.includes('時數'));
    if (hasName && hasHours) {
      headerIdx = i;
      row.forEach((cell, j) => {
        if (cell.includes('員工姓名') || cell === '姓名') colMap.name = j;
        if (cell.includes('部門')) colMap.dept = j;
        if (cell.includes('授權IP') || cell.includes('IP')) colMap.ip = j;
        if (cell.includes('日期')) colMap.date = j;
        if (cell.includes('工作項目') || cell.includes('項目')) colMap.task = j;
        if (cell.includes('實際時數') || cell.includes('時數')) colMap.hours = j;
        if (cell.includes('備註')) colMap.note = j;
      });
      break;
    }
  }

  if (headerIdx === -1) {
    console.warn(`[excelParser] 找不到 header: ${filename}`);
    return [];
  }

  const logs = [];
  let prevName = '', prevDept = '', prevIP = '', prevDate = '';

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c && c !== 0)) continue;

    const rawName = row[colMap.name] ? String(row[colMap.name]).trim() : '';
    const rawDept = row[colMap.dept] ? String(row[colMap.dept]).trim() : '';
    const rawIP = colMap.ip !== undefined ? (row[colMap.ip] ? String(row[colMap.ip]).trim() : '') : '';
    const rawDate = row[colMap.date];
    const rawTask = row[colMap.task] ? String(row[colMap.task]).trim() : '';
    const rawHours = Number(row[colMap.hours]) || 0;
    const rawNote = colMap.note !== undefined ? String(row[colMap.note] || '') : '';

    const name = rawName || prevName;
    const dept = rawDept || prevDept;
    const ip = rawIP || prevIP;
    const dateStr = rawDate ? parseDateValue(rawDate, month) : prevDate;

    if (name) prevName = name;
    if (rawDept) prevDept = rawDept;
    if (rawIP) prevIP = rawIP;
    if (rawDate) prevDate = dateStr;

    if (!name || rawHours <= 0) continue;

    const realName = normalizeName(name);
    const realDept = getDept(realName) || dept;

    let ipProject;
    if (ip && ip !== '-' && ip !== '') {
      ipProject = ip;
    } else if (rawTask && isKnownIP(rawTask)) {
      ipProject = rawTask;
    } else {
      ipProject = '非授權IP';
    }

    logs.push({
      name: realName, dept: realDept, task: rawTask, ipProject,
      hours: rawHours, date: dateStr,
      month: month || (dateStr ? dateStr.substring(0, 7) : ''),
      note: rawNote,
    });
  }

  console.log(`[excelParser] 全員工表 ${filename}: ${logs.length} 筆, ${new Set(logs.map(l => l.name)).size} 位員工`);
  return logs;
}

/**
 * 解析個人工時表
 * @param {ArrayBuffer} buffer
 * @param {string} filename
 * @returns {import('../shared/types').WorkLog[]}
 */
export function parseIndividualFile(buffer, filename) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const nameMatch = filename.match(/工作日誌_(\d{4})年_(.+?)(?:\.\w+)?$/);
  if (!nameMatch) {
    console.warn(`[excelParser] 無法解析個人表檔名: ${filename}`);
    return [];
  }
  const year = nameMatch[1];
  const nickname = nameMatch[2];
  const realName = normalizeName(nickname);
  const dept = getDept(realName) || '';

  const allLogs = [];

  for (const sheetName of wb.SheetNames) {
    const monthMatch = sheetName.match(/^(\d{1,2})月$/);
    if (!monthMatch) continue;

    const monthNum = monthMatch[1];
    const month = `${year}-${String(monthNum).padStart(2, '0')}`;
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let headerIdx = -1;
    const colMap = {};
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i].map(c => String(c).trim());
      const hasDate = row.some(c => c.includes('日期'));
      const hasTask = row.some(c => c.includes('工作項目') || c.includes('項目'));
      const hasHours = row.some(c => c.includes('實際時數') || c.includes('時數'));
      if (hasDate && hasTask && hasHours) {
        headerIdx = i;
        row.forEach((cell, j) => {
          if (cell.includes('日期')) colMap.date = j;
          if (cell.includes('工作項目') || cell === '項目') colMap.task = j;
          if (cell.includes('實際時數') || cell.includes('時數')) colMap.hours = j;
          if (cell.includes('授權IP') || cell.includes('IP')) colMap.ip = j;
          if (cell.includes('備註')) colMap.note = j;
        });
        break;
      }
    }

    if (headerIdx === -1) continue;

    let prevDate = '', prevIP = '';
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => !c && c !== 0)) continue;

      const rawDate = row[colMap.date];
      const rawTask = row[colMap.task] ? String(row[colMap.task]).trim() : '';
      const rawHours = Number(row[colMap.hours]) || 0;
      const rawIP = colMap.ip !== undefined ? (row[colMap.ip] ? String(row[colMap.ip]).trim() : '') : '';
      const rawNote = colMap.note !== undefined ? String(row[colMap.note] || '') : '';

      const dateStr = rawDate ? parseDateValue(rawDate, month) : prevDate;
      const ip = rawIP || prevIP;
      if (rawDate) prevDate = dateStr;
      if (rawIP) prevIP = rawIP;

      if (rawHours <= 0) continue;

      let ipProject;
      if (ip && ip !== '-' && ip !== '') {
        ipProject = ip;
      } else if (rawTask && isKnownIP(rawTask)) {
        ipProject = rawTask;
      } else {
        ipProject = '非授權IP';
      }

      allLogs.push({
        name: realName, dept, task: rawTask, ipProject,
        hours: rawHours, date: dateStr, month, note: rawNote,
      });
    }
  }

  console.log(`[excelParser] 個人表 ${filename}: ${allLogs.length} 筆, ${realName}`);
  return allLogs;
}
