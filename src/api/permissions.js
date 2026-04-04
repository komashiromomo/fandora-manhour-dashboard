import { PERM_SHEET_ID, DEFAULT_API_KEY, DEFAULT_ROLE } from '../shared/constants';
import { getApiKey } from './gdrive';

/**
 * Fetch user role from the permissions Google Sheet.
 * @param {string} email - User email to look up
 * @param {string} [apiKey] - Optional API key override
 * @returns {Promise<string>} User role or DEFAULT_ROLE
 */
export async function fetchUserRole(email, apiKey) {
  const key = apiKey || getApiKey();
  const url = `https://docs.google.com/spreadsheets/d/${PERM_SHEET_ID}/export?format=csv&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Failed to fetch permissions sheet, using default role');
    return DEFAULT_ROLE;
  }

  const csvText = await res.text();
  const rows = csvText.split('\n').map((row) => row.split(',').map((cell) => cell.trim()));

  for (const row of rows) {
    if (row[0] && row[0].toLowerCase() === email.toLowerCase()) {
      return row[1] || DEFAULT_ROLE;
    }
  }

  return DEFAULT_ROLE;
}
