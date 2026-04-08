import { PERM_SHEET_ID, DEFAULT_ROLE } from '../config/constants';

/**
 * 查詢使用者角色
 * @param {string} email
 * @param {string} accessToken
 * @returns {Promise<'admin'|'member'>}
 */
export async function fetchUserRole(email, accessToken) {
  if (!PERM_SHEET_ID || !accessToken) return DEFAULT_ROLE;
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${PERM_SHEET_ID}/values/A:B`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return DEFAULT_ROLE;
    const data = await res.json();
    const rows = data.values || [];
    for (const row of rows) {
      if (row[0] && row[0].toLowerCase() === email.toLowerCase()) {
        return row[1] === 'admin' ? 'admin' : 'member';
      }
    }
    return DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}
