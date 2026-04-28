import { useCallback } from 'react';
import { useData } from './DataContext';
import { useAuth } from '../auth/AuthContext';
import { listAllSpreadsheets, exportSheetAsXlsx, getFolderId } from '../api/gdrive';
import { parseWorkbook } from '../utils/excelParser';
import { parseSalarySheet } from '../utils/salaryParser';
import { classifyFileType } from '../utils/names';
import { LS_ACCESS_TOKEN } from '../config/constants';

const isAuthError = (err) =>
  /401|invalid[_ ]?token|invalid authentication|UNAUTHENTICATED/i.test(String(err?.message || err));

export function useDataLoader() {
  const { setWorkLogs, appendWorkLogs, setSalaryData, setLoading } = useData();
  const { accessToken, refreshToken } = useAuth();

  /**
   * 從 Google Drive 載入所有工時資料（只抓個人版，排除全員工每月整理版本）
   * - 自動處理 401：用 refreshToken() 取新 access token 後重試一次
   * @returns {Promise<{ok:boolean, total:number, individual:number, skipped:number, parsedFiles:number, parseErrors:number, logs:number, error?:string}>}
   */
  const loadFromDrive = useCallback(async () => {
    const folderId = getFolderId();
    if (!folderId) {
      return { ok: false, total: 0, individual: 0, skipped: 0, parsedFiles: 0, parseErrors: 0, logs: 0, error: '缺少 Folder ID' };
    }

    // 一次完整的載入流程，吃 token 進來；遇到 auth error 就 throw 讓外層重試
    const runOnce = async (token) => {
      setLoading(true, '正在掃描 Google Drive...');
      const allFiles = await listAllSpreadsheets(folderId, token);
      const individualFiles = allFiles.filter(
        (f) => classifyFileType(f.name) === 'individual'
      );
      const skipped = allFiles.length - individualFiles.length;
      console.info(
        `[loadFromDrive] 共找到 ${allFiles.length} 個 sheet，個人版 ${individualFiles.length} 個（跳過 ${skipped}）`
      );

      let allLogs = [];
      let parseErrors = 0;
      for (let i = 0; i < individualFiles.length; i++) {
        const file = individualFiles[i];
        setLoading(true, `正在解析 ${file.name} (${i + 1}/${individualFiles.length})`);
        try {
          const buffer = await exportSheetAsXlsx(file.id, token);
          const logs = parseWorkbook(buffer, file.name);
          console.info(`[loadFromDrive] ${file.name} → ${logs.length} 筆`);
          allLogs = allLogs.concat(logs);
        } catch (err) {
          if (isAuthError(err)) throw err; // 讓外層 refresh 後重試
          parseErrors += 1;
          console.warn(`[loadFromDrive] 解析失敗: ${file.name}`, err);
        }
      }

      return {
        allLogs,
        stats: {
          ok: true,
          total: allFiles.length,
          individual: individualFiles.length,
          skipped,
          parsedFiles: individualFiles.length - parseErrors,
          parseErrors,
          logs: allLogs.length,
        },
      };
    };

    let token = accessToken || localStorage.getItem(LS_ACCESS_TOKEN) || '';

    // 兩段式 token recovery：401 → silent refresh → 失敗就 force consent
    const tryRefresh = async (force) => {
      console.info(`[loadFromDrive] refreshing token (force=${force})...`);
      return await refreshToken({ force });
    };

    try {
      if (!token) {
        try {
          token = await tryRefresh(false);
        } catch {
          // silent fail → force consent（仍在 user gesture 內，popup 通常允許）
          token = await tryRefresh(true);
        }
      }

      let result;
      try {
        result = await runOnce(token);
      } catch (err) {
        if (!isAuthError(err)) throw err;
        // 401 第一次：silent refresh
        try {
          token = await tryRefresh(false);
          result = await runOnce(token);
        } catch (silentErr) {
          // silent 也 401 / timeout → force consent，彈出 Google 授權視窗
          console.warn('[loadFromDrive] silent refresh 失敗，改走 force consent');
          token = await tryRefresh(true);
          result = await runOnce(token);
        }
      }

      setWorkLogs(result.allLogs);
      return result.stats;
    } catch (err) {
      console.error('Drive 載入失敗:', err);
      return { ok: false, total: 0, individual: 0, skipped: 0, parsedFiles: 0, parseErrors: 0, logs: 0, error: err?.message || String(err) };
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, setWorkLogs, setLoading]);

  /** 手動上傳工時 Excel（同樣只接受個人版） */
  const handleWorkLogUpload = useCallback(async (fileList) => {
    setLoading(true, '正在解析上傳的檔案...');
    try {
      let allLogs = [];
      let skipped = 0;
      for (const file of fileList) {
        if (classifyFileType(file.name) !== 'individual') {
          console.info(`[upload] 跳過非個人版檔案: ${file.name}`);
          skipped += 1;
          continue;
        }
        const buffer = await file.arrayBuffer();
        const logs = parseWorkbook(buffer, file.name);
        allLogs = allLogs.concat(logs);
      }
      if (skipped > 0) {
        console.warn(`[upload] 共跳過 ${skipped} 個非個人版檔案`);
      }
      appendWorkLogs(allLogs);
    } catch (err) {
      console.error('上傳解析失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [appendWorkLogs, setLoading]);

  /** 手動上傳薪資表 */
  const handleSalaryUpload = useCallback(async (fileList) => {
    setLoading(true, '正在解析薪資表...');
    try {
      for (const file of fileList) {
        const buffer = await file.arrayBuffer();
        const records = parseSalarySheet(buffer);
        setSalaryData(records);
      }
    } catch (err) {
      console.error('薪資表解析失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [setSalaryData, setLoading]);

  return { loadFromDrive, handleWorkLogUpload, handleSalaryUpload };
}
