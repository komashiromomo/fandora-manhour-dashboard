import { useCallback } from 'react';
import { useData } from './DataContext';
import { useAuth } from '../auth/AuthContext';
import { listAllSpreadsheets, exportSheetAsXlsx, getFolderId } from '../api/gdrive';
import { parseWorkbook } from '../utils/excelParser';
import { parseSalarySheet } from '../utils/salaryParser';
import { classifyFileType } from '../utils/names';

export function useDataLoader() {
  const { setWorkLogs, appendWorkLogs, setSalaryData, setLoading } = useData();
  const { accessToken } = useAuth();

  /** 從 Google Drive 載入所有工時資料（只抓個人版，排除全員工每月整理版本） */
  const loadFromDrive = useCallback(async () => {
    const folderId = getFolderId();
    if (!folderId || !accessToken) return;

    setLoading(true, '正在掃描 Google Drive...');
    try {
      const allFiles = await listAllSpreadsheets(folderId, accessToken);
      const individualFiles = allFiles.filter(
        (f) => classifyFileType(f.name) === 'individual'
      );
      const skipped = allFiles.length - individualFiles.length;
      if (skipped > 0) {
        console.info(`[loadFromDrive] 跳過 ${skipped} 個非個人版檔案（全員工/其他）`);
      }

      let allLogs = [];
      for (let i = 0; i < individualFiles.length; i++) {
        const file = individualFiles[i];
        setLoading(true, `正在解析 ${file.name} (${i + 1}/${individualFiles.length})`);
        try {
          const buffer = await exportSheetAsXlsx(file.id, accessToken);
          const logs = parseWorkbook(buffer, file.name);
          allLogs = allLogs.concat(logs);
        } catch (err) {
          console.warn(`解析失敗: ${file.name}`, err);
        }
      }

      setWorkLogs(allLogs);
    } catch (err) {
      console.error('Drive 載入失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, setWorkLogs, setLoading]);

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
