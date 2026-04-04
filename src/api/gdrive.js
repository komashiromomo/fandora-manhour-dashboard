import {
  DEFAULT_API_KEY,
  DEFAULT_FOLDER_ID,
  DEFAULT_COST_SHEET_ID,
  GDRIVE_API_BASE,
  LS_API_KEY,
  LS_FOLDER_ID,
  LS_COST_SHEET_ID,
} from '../shared/constants';

/**
 * Get API key from localStorage or fallback to default
 */
export function getApiKey() {
  return localStorage.getItem(LS_API_KEY) || DEFAULT_API_KEY;
}

/**
 * Get folder ID from localStorage or fallback to default
 */
export function getFolderId() {
  return localStorage.getItem(LS_FOLDER_ID) || DEFAULT_FOLDER_ID;
}

/**
 * Get cost sheet ID from localStorage or fallback to default
 */
export function getCostSheetId() {
  return localStorage.getItem(LS_COST_SHEET_ID) || DEFAULT_COST_SHEET_ID;
}

/**
 * List all .xlsx files in a Google Drive folder, recursing into subfolders.
 * @param {string} folderId
 * @param {string} apiKey
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function listFiles(folderId, apiKey) {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const url = `${GDRIVE_API_BASE}/files?q=${query}&fields=files(id,name,mimeType)&pageSize=1000&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to list files: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const files = data.files || [];
  const results = [];

  for (const file of files) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      // Recurse into subfolders
      const subFiles = await listFiles(file.id, apiKey);
      results.push(...subFiles);
    } else if (
      file.name.endsWith('.xlsx') ||
      file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      results.push({ id: file.id, name: file.name });
    }
  }

  return results;
}

/**
 * Download a file from Google Drive as ArrayBuffer.
 * @param {string} fileId
 * @param {string} apiKey
 * @returns {Promise<ArrayBuffer>}
 */
export async function downloadFile(fileId, apiKey) {
  const url = `${GDRIVE_API_BASE}/files/${fileId}?alt=media&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}

/**
 * Test connection to Google Drive.
 * @param {string} apiKey
 * @param {string} folderId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function testConnection(apiKey, folderId) {
  try {
    await listFiles(folderId, apiKey);
    return { success: true, message: '連線成功' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Fetch a Google Sheet exported as xlsx ArrayBuffer.
 * @param {string} sheetId
 * @param {string} apiKey
 * @returns {Promise<ArrayBuffer>}
 */
export async function fetchCostSheet(sheetId, apiKey) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch cost sheet: ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}
