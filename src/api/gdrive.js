import { GDRIVE_API_BASE, DEFAULT_API_KEY, DEFAULT_FOLDER_ID, DEFAULT_COST_SHEET_ID, LS_API_KEY, LS_FOLDER_ID, LS_COST_SHEET_ID } from '../shared/constants';

/** 從 localStorage 或 env 取 API Key */
export function getApiKey() {
  return localStorage.getItem(LS_API_KEY) || DEFAULT_API_KEY;
}

/** 從 localStorage 或 env 取 Folder ID */
export function getFolderId() {
  return localStorage.getItem(LS_FOLDER_ID) || DEFAULT_FOLDER_ID;
}

/** 從 localStorage 或 env 取 Cost Sheet ID */
export function getCostSheetId() {
  return localStorage.getItem(LS_COST_SHEET_ID) || DEFAULT_COST_SHEET_ID;
}

/**
 * 列出資料夾中的檔案（遞迴子資料夾）
 * @param {string} folderId
 * @param {string} apiKey
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function listFiles(folderId, apiKey) {
  const files = [];
  const query = `'${folderId}' in parents and trashed=false`;
  const url = `${GDRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&key=${apiKey}&pageSize=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to list files: ${res.status}`);
  const data = await res.json();
  for (const file of (data.files || [])) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      const subFiles = await listFiles(file.id, apiKey);
      files.push(...subFiles);
    } else if (file.name.endsWith('.xlsx') || file.mimeType.includes('spreadsheet')) {
      files.push({ id: file.id, name: file.name });
    }
  }
  return files;
}

/**
 * 下載檔案為 ArrayBuffer
 * @param {string} fileId
 * @param {string} apiKey
 * @returns {Promise<ArrayBuffer>}
 */
export async function downloadFile(fileId, apiKey) {
  const url = `${GDRIVE_API_BASE}/files/${fileId}?alt=media&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
  return res.arrayBuffer();
}

/**
 * 測試連線
 * @param {string} apiKey
 * @param {string} folderId
 * @returns {Promise<{success: boolean, message: string, fileCount?: number}>}
 */
export async function testConnection(apiKey, folderId) {
  try {
    const files = await listFiles(folderId, apiKey);
    return { success: true, message: `連線成功，找到 ${files.length} 個檔案`, fileCount: files.length };
  } catch (err) {
    return { success: false, message: `連線失敗：${err.message}` };
  }
}

/**
 * 下載 Google Sheets 為 xlsx ArrayBuffer
 * @param {string} sheetId
 * @param {string} apiKey
 * @returns {Promise<ArrayBuffer>}
 */
export async function fetchCostSheet(sheetId, apiKey) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch cost sheet: ${res.status}`);
  return res.arrayBuffer();
}
