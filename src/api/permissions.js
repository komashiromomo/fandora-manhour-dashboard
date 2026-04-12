import { PERM_SHEET_ID, DEFAULT_ROLE } from '../shared/constants';

/**
 * 從權限表取得使用者角色
 * @param {string} email
 * @param {string} apiKey
 * @returns {Promise<string>} 'admin' | 'member'
 */
export async function fetchUserRole(email, apiKey) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${PERM_SHEET_ID}/export?format=csv&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return DEFAULT_ROLE;
    const csv = await res.text();
    const lines = csv.split('\n');
    for (const line of lines) {
      const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
      if (cols[0] && cols[0].toLowerCase() === email.toLowerCase()) {
        return cols[1] || DEFAULT_ROLE;
      }
    }
    return DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}
