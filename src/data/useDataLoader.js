import { useCallback } from 'react';
import { useData } from './DataContext';
import { useAuth } from '../auth/AuthContext';
import { listAllSpreadsheets, exportSheetAsXlsx, getFolderId } from '../api/gdrive';
import { fetchUserRole } from '../api/permissions';
import * as XLSX from 'xlsx';

export function useDataLoader() {
  const { setWorkLogs, appendWorkLogs, setSalaryData, setLoading } = useData();
  const { accessToken } = useAuth();

  /** 從 Google Drive 載入所有工時資料 */
  const loadFromDrive = useCallback(async () => {
    const folderId = getFolderId();
    if (!folderId || !accessToken) return;

    setLoading(true, '正在掃描 Google Drive...');
    try {
      const files = await listAllSpreadsheets(folderId, accessToken);
      let allLogs = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setLoading(true, `正在解析 ${file.name} (${i + 1}/${files.length})`);
        try {
          const buffer = await exportSheetAsXlsx(file.id, accessToken);
          // Placeholder: parseWorkbook will be implemented separately
          // const logs = parseWorkbook(buffer, file.name);
          // allLogs = allLogs.concat(logs);
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

  /** 手動上傳工時 Excel */
  const handleWorkLogUpload = useCallback(async (fileList) => {
    setLoading(true, '正在解析上傳的檔案...');
    try {
      let allLogs = [];
      for (const file of fileList) {
        const buffer = await file.arrayBuffer();
        // Placeholder: parseWorkbook will be implemented separately
        // const logs = parseWorkbook(buffer, file.name);
        // allLogs = allLogs.concat(logs);
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
        // Placeholder: parseSalarySheet will be implemented separately
        // const records = parseSalarySheet(buffer);
        // setSalaryData(records);
      }
    } catch (err) {
      console.error('薪資表解析失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [setSalaryData, setLoading]);

  return { loadFromDrive, handleWorkLogUpload, handleSalaryUpload };
}
