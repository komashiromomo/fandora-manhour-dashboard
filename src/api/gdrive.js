import {
  DEFAULT_API_KEY, DEFAULT_FOLDER_ID, GDRIVE_API_BASE,
  GDRIVE_EXPORT_MIMETYPE, GOOGLE_SHEETS_MIMETYPE, GOOGLE_FOLDER_MIMETYPE,
  LS_API_KEY, LS_FOLDER_ID,
} from '../config/constants';

/** 取 API Key（env 優先，localStorage 次之） */
export function getApiKey() {
  return DEFAULT_API_KEY || localStorage.getItem(LS_API_KEY) || '';
}

/** 取 Folder ID */
export function getFolderId() {
  return DEFAULT_FOLDER_ID || localStorage.getItem(LS_FOLDER_ID) || '';
}

/**
 * 列出資料夾中的檔案
 * @param {string} folderId
 * @param {string} accessToken - OAuth2 token
 * @returns {Promise<Array<{id, name, mimeType, size}>>}
 */
export async function listFilesInFolder(folderId, accessToken) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size)',
    pageSize: '100',
  });
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  if (!accessToken) {
    const key = getApiKey();
    if (key) params.append('key', key);
  }
  const res = await fetch(`${GDRIVE_API_BASE}/files?${params}`, { headers });
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  const data = await res.json();
  return data.files || [];
}

/**
 * 遞迴列出資料夾（含子資料夾）中的所有 spreadsheet 檔案
 * @param {string} folderId
 * @param {string} accessToken
 * @returns {Promise<Array<{id, name, mimeType}>>}
 */
export async function listAllSpreadsheets(folderId, accessToken) {
  const files = await listFilesInFolder(folderId, accessToken);
  let spreadsheets = files.filter(f => f.mimeType === GOOGLE_SHEETS_MIMETYPE);
  const folders = files.filter(f => f.mimeType === GOOGLE_FOLDER_MIMETYPE);
  for (const folder of folders) {
    const subFiles = await listAllSpreadsheets(folder.id, accessToken);
    spreadsheets = spreadsheets.concat(subFiles);
  }
  return spreadsheets;
}

/**
 * 匯出 Google Sheets 為 xlsx buffer
 * @param {string} fileId
 * @param {string} accessToken
 * @returns {Promise<ArrayBuffer>}
 */
export async function exportSheetAsXlsx(fileId, accessToken) {
  const url = `${GDRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(GDRIVE_EXPORT_MIMETYPE)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Export error: ${res.status} for ${fileId}`);
  return res.arrayBuffer();
}

/**
 * 測試 Drive API 連線
 * @param {string} accessToken
 * @returns {Promise<boolean>}
 */
export async function testConnection(accessToken) {
  try {
    const folderId = getFolderId();
    if (!folderId) return false;
    await listFilesInFolder(folderId, accessToken);
    return true;
  } catch {
    return false;
  }
}
