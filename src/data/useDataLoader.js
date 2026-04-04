import { useState, useCallback } from 'react';
import { listFiles, downloadFile, getApiKey, getFolderId, getCostSheetId, fetchCostSheet } from '../api/gdrive';
import { parseAllStaffFile, parseIndividualFile } from '../utils/excelParser';
import { parseSalaryExcel } from '../utils/salaryParser';
import { CACHE_KEY_WORK, CACHE_KEY_SALARY, CACHE_KEY_DATE } from '../shared/constants';

/**
 * Custom hook for loading data from Google Drive or local uploads.
 * @param {Function} setWorkLogs - state setter for work logs
 * @param {Function} setSalaryData - state setter for salary data
 */
export function useDataLoader(setWorkLogs, setSalaryData) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  /**
   * Load all data from Google Drive.
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiKey = getApiKey();
      const folderId = getFolderId();
      const costSheetId = getCostSheetId();

      // Step 1: List all xlsx files
      setLoadingMessage('正在列出雲端檔案...');
      const files = await listFiles(folderId, apiKey);

      // Step 2: Separate into allStaff and individual files
      const allStaffFiles = files.filter((f) => f.name.includes('Fandora工作日誌'));
      const individualFiles = files.filter((f) => f.name.includes('工作日誌_') && !f.name.includes('Fandora工作日誌'));

      let allLogs = [];
      const coveredMonths = new Set();

      // Step 3: Parse allStaff files first
      for (const file of allStaffFiles) {
        setLoadingMessage(`正在下載 ${file.name}...`);
        const buffer = await downloadFile(file.id, apiKey);
        const logs = parseAllStaffFile(buffer, file.name);
        allLogs.push(...logs);
        // Track covered months
        for (const log of logs) {
          if (log.month) coveredMonths.add(log.month);
        }
      }

      // Step 4: Parse individual files, skip months already covered
      for (const file of individualFiles) {
        setLoadingMessage(`正在下載 ${file.name}...`);
        const buffer = await downloadFile(file.id, apiKey);
        const logs = parseIndividualFile(buffer, file.name);
        // Only include logs from months not already covered by allStaff files
        const newLogs = logs.filter((log) => !coveredMonths.has(log.month));
        allLogs.push(...newLogs);
      }

      setWorkLogs(allLogs);

      // Step 5: Fetch and parse cost sheet
      setLoadingMessage('正在下載薪資資料...');
      const costBuffer = await fetchCostSheet(costSheetId, apiKey);
      const salary = parseSalaryExcel(costBuffer);
      setSalaryData(salary);

      // Step 6: Cache to localStorage
      try {
        localStorage.setItem(CACHE_KEY_WORK, JSON.stringify(allLogs));
        localStorage.setItem(CACHE_KEY_SALARY, JSON.stringify(salary));
        localStorage.setItem(CACHE_KEY_DATE, new Date().toISOString());
      } catch (e) {
        console.warn('Failed to cache data to localStorage:', e);
      }

      setLoadingMessage('載入完成');
    } catch (err) {
      setLoadingMessage(`載入失敗: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setWorkLogs, setSalaryData]);

  /**
   * Restore data from localStorage cache.
   * @returns {boolean} Whether cache was found and loaded
   */
  const loadFromCache = useCallback(() => {
    try {
      const workStr = localStorage.getItem(CACHE_KEY_WORK);
      const salaryStr = localStorage.getItem(CACHE_KEY_SALARY);
      if (workStr && salaryStr) {
        setWorkLogs(JSON.parse(workStr));
        setSalaryData(JSON.parse(salaryStr));
        return true;
      }
    } catch (e) {
      console.warn('Failed to load from cache:', e);
    }
    return false;
  }, [setWorkLogs, setSalaryData]);

  /**
   * Handle manually uploaded work log xlsx files.
   * @param {FileList|File[]} files
   */
  const handleWorkLogUpload = useCallback(async (files) => {
    setIsLoading(true);
    setLoadingMessage('正在解析上傳的工作日誌...');
    try {
      const allLogs = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        let logs;
        if (file.name.includes('Fandora工作日誌')) {
          logs = parseAllStaffFile(buffer, file.name);
        } else {
          logs = parseIndividualFile(buffer, file.name);
        }
        allLogs.push(...logs);
      }
      setWorkLogs((prev) => [...prev, ...allLogs]);
      setLoadingMessage(`已載入 ${allLogs.length} 筆工作紀錄`);
    } catch (err) {
      setLoadingMessage(`解析失敗: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setWorkLogs]);

  /**
   * Handle manually uploaded salary xlsx files.
   * @param {FileList|File[]} files
   */
  const handleSalaryUpload = useCallback(async (files) => {
    setIsLoading(true);
    setLoadingMessage('正在解析上傳的薪資資料...');
    try {
      const allSalary = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const records = parseSalaryExcel(buffer);
        allSalary.push(...records);
      }
      setSalaryData(allSalary);
      setLoadingMessage(`已載入 ${allSalary.length} 筆薪資紀錄`);
    } catch (err) {
      setLoadingMessage(`解析失敗: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setSalaryData]);

  /**
   * Clear all cached data.
   */
  const clearData = useCallback(() => {
    localStorage.removeItem(CACHE_KEY_WORK);
    localStorage.removeItem(CACHE_KEY_SALARY);
    localStorage.removeItem(CACHE_KEY_DATE);
    setLoadingMessage('');
  }, []);

  return {
    loadData,
    loadFromCache,
    handleWorkLogUpload,
    handleSalaryUpload,
    clearData,
    isLoading,
    loadingMessage,
  };
}
