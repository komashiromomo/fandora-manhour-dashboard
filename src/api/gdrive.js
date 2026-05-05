import {
  DEFAULT_API_KEY, DEFAULT_FOLDER_ID, GDRIVE_API_BASE,
  GDRIVE_EXPORT_MIMETYPE, GOOGLE_SHEETS_MIMETYPE, GOOGLE_FOLDER_MIMETYPE,
  LS_API_KEY, LS_FOLDER_ID, CACHE_FILE_NAME,
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
 * 列出資料夾中的檔案（支援 Shared Drive / 共用雲端硬碟）
 * @param {string} folderId
 * @param {string} accessToken - OAuth2 token
 * @returns {Promise<Array<{id, name, mimeType, size}>>}
 */
export async function listFilesInFolder(folderId, accessToken) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size)',
    pageSize: '1000',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    corpora: 'allDrives',
  });
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  if (!accessToken) {
    const key = getApiKey();
    if (key) params.append('key', key);
  }
  const res = await fetch(`${GDRIVE_API_BASE}/files?${params}`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API error: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const files = data.files || [];
  console.info(
    `[listFilesInFolder] ${folderId}: ${files.length} 項 — ` +
      files.slice(0, 5).map((f) => `${f.name}[${f.mimeType.replace('application/vnd.google-apps.', '')}]`).join(', ') +
      (files.length > 5 ? ' ...' : '')
  );
  return files;
}

/**
 * 遞迴列出資料夾（含子資料夾）中的所有 spreadsheet 檔案
 * @param {string} folderId
 * @param {string} accessToken
 * @returns {Promise<Array<{id, name, mimeType}>>}
 */
export async function listAllSpreadsheets(folderId, accessToken) {
  const files = await listFilesInFolder(folderId, accessToken);
  let spreadsheets = files.filter((f) => f.mimeType === GOOGLE_SHEETS_MIMETYPE);
  const folders = files.filter((f) => f.mimeType === GOOGLE_FOLDER_MIMETYPE);
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

// ============== Drive 共享 cache file（跨設備 / 跨同事） ==============

/**
 * 找指定 folder 內的 dashboard cache file
 * @returns {Promise<{id,name,modifiedTime,size}|null>}
 */
export async function findCacheFile(folderId, accessToken) {
  // q 字串中 single quote 要 escape
  const safeName = CACHE_FILE_NAME.replace(/'/g, "\\'");
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and name='${safeName}' and trashed=false`,
    fields: 'files(id,name,modifiedTime,size)',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    corpora: 'allDrives',
  });
  const res = await fetch(`${GDRIVE_API_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0] || null;
}

/** 讀 cache file 內容（JSON） */
export async function readCacheFile(fileId, accessToken) {
  const url = `${GDRIVE_API_BASE}/files/${fileId}?alt=media&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Read cache error: ${res.status}`);
  }
  return res.json();
}

/**
 * 寫 cache file（新建或覆蓋既有）
 * 用 multipart upload 一次傳 metadata + JSON content
 */
export async function writeCacheFile(folderId, content, accessToken) {
  const existing = await findCacheFile(folderId, accessToken);
  const meta = { name: CACHE_FILE_NAME, mimeType: 'application/json' };
  if (!existing) meta.parents = [folderId];

  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&supportsAllDrives=true`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true`;
  const method = existing ? 'PATCH' : 'POST';

  const boundary = '-------fandora-' + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(meta) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    JSON.stringify(content) +
    `\r\n--${boundary}--`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Write cache error: ${res.status} ${txt.slice(0, 200)}`);
  }
  return res.json();
}
