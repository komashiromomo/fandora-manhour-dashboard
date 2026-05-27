/**
 * IP 清單表解析器
 *
 * 預期 sheet 格式：
 *   | A: IP 主名      | B: 別名 1 | C: 別名 2 | D: 別名 3 | ...
 *   | 老高與小茉      | 老高      |           |           |
 *   | 力Qii          | 力氣      |           |           |
 *   | ㄇㄚˊ幾        | ㄇㄚˊ幾兔 | 馬幾      | 麻幾      |
 *   | 咖波            |           |           |           |
 *   | 魔物獵人        |           |           |           |
 *
 * 第一列視為 header（跳過）。
 * 主名空白 → 整列略過。
 *
 * 回傳：
 *   { ipList:[...], aliasMap:{ 別名→主名 } }
 *   ipList 含所有主名 + 所有別名（用於 isKnownIP 偵測員工填寫的任意變體）
 */
import * as XLSX from 'xlsx';

export function parseIPListSheet(buffer) {
  try {
    const wb = XLSX.read(buffer, { cellDates: false });
    const wsName = wb.SheetNames[0];
    if (!wsName) return { ipList: [], aliasMap: {} };

    const ws = wb.Sheets[wsName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 2) return { ipList: [], aliasMap: {} };

    const ipSet = new Set();
    const aliasMap = {};

    // 跳過第一列 header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const mainName = String(row[0] || '').trim();
      if (!mainName) continue;
      ipSet.add(mainName);
      // 後續欄位為別名
      for (let j = 1; j < row.length; j++) {
        const alias = String(row[j] || '').trim();
        if (!alias || alias === mainName) continue;
        ipSet.add(alias);
        aliasMap[alias] = mainName;
      }
    }

    return { ipList: [...ipSet], aliasMap };
  } catch (err) {
    console.warn('[parseIPListSheet] 解析失敗:', err.message);
    return { ipList: [], aliasMap: {} };
  }
}
