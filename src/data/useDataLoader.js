import { useState, useCallback } from 'react';
import { getApiKey, getFolderId, getCostSheetId, listFiles, downloadFile, fetchCostSheet } from '../api/gdrive';
import { classifyFile, parseAllStaffFile, parseIndividualFile } from '../utils/excelParser';
import { parseSalaryExcel } from '../utils/salaryParser';
import { CACHE_KEY_WORK, CACHE_KEY_SALARY, CACHE_KEY_DATE } from '../shared/constants';

/**
 * 資料載入 hook
 */
export function useDataLoader() {
  const [workLogs, setWorkLogs] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const loadDataFromGDrive = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiKey = getApiKey();
      const folderId = getFolderId();

      setLoadingMessage('正在列出檔案...');
      const files = await listFiles(folderId, apiKey);
      console.log(`[dataLoader] 找到 ${files.length} 個檔案`);

      const allLogs = [];
      const coveredMonths = new Set();

      // Phase 1: 全員工總表優先
      const allStaffFiles = files.filter(f => classifyFile(f.name) === 'allStaff');
      for (const file of allStaffFiles) {
        setLoadingMessage(`正在載入: ${file.name}`);
        const buffer = await downloadFile(file.id, apiKey);
        const logs = parseAllStaffFile(buffer, file.name);
        allLogs.push(...logs);
        logs.forEach(l => { if (l.month) coveredMonths.add(l.month); });
      }

      // Phase 2: 個人表只補缺月份
      const individualFiles = files.filter(f => classifyFile(f.name) === 'individual');
      for (const file of individualFiles) {
        setLoadingMessage(`正在載入: ${file.name}`);
        const buffer = await downloadFile(file.id, apiKey);
        const logs = parseIndividualFile(buffer, file.name);
        const uncoveredLogs = logs.filter(l => !coveredMonths.has(l.month));
        allLogs.push(...uncoveredLogs);
        console.log(`[dataLoader] 個人表 ${file.name}: ${uncoveredLogs.length}/${logs.length} 筆（排除已涵蓋月份）`);
      }

      // Phase 3: 薪資表
      let salary = [];
      try {
        const costSheetId = getCostSheetId();
        if (costSheetId) {
          setLoadingMessage('正在載入薪資資料...');
          const costBuffer = await fetchCostSheet(costSheetId, apiKey);
          salary = parseSalaryExcel(costBuffer);
        }
      } catch (err) {
        console.warn('[dataLoader] 薪資表載入失敗:', err.message);
      }

      setWorkLogs(allLogs);
      setSalaryData(salary);

      try {
        localStorage.setItem(CACHE_KEY_WORK, JSON.stringify(allLogs));
        localStorage.setItem(CACHE_KEY_SALARY, JSON.stringify(salary));
        localStorage.setItem(CACHE_KEY_DATE, new Date().toISOString());
      } catch (e) {
        console.warn('[dataLoader] 快取儲存失敗:', e.message);
      }

      console.log(`[dataLoader] 載入完成: ${allLogs.length} 筆工時, ${salary.length} 筆薪資, 涵蓋 ${coveredMonths.size} 個月`);
      setLoadingMessage('');
    } catch (err) {
      console.error('[dataLoader] 載入失敗:', err);
      setLoadingMessage(`載入失敗: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_WORK);
      const cachedSalary = localStorage.getItem(CACHE_KEY_SALARY);
      if (cached) {
        const logs = JSON.parse(cached);
        setWorkLogs(logs);
        console.log(`[dataLoader] 從快取恢復 ${logs.length} 筆工時`);
        if (cachedSalary) {
          const salary = JSON.parse(cachedSalary);
          setSalaryData(salary);
          console.log(`[dataLoader] 從快取恢復 ${salary.length} 筆薪資`);
        }
        return true;
      }
    } catch (e) {
      console.warn('[dataLoader] 快取讀取失敗:', e.message);
    }
    return false;
  }, []);

  const handleWorkLogUpload = useCallback(async (files) => {
    let count = 0;
    const newLogs = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const type = classifyFile(file.name);
      let logs = [];
      if (type === 'allStaff') logs = parseAllStaffFile(buffer, file.name);
      else if (type === 'individual') logs = parseIndividualFile(buffer, file.name);
      else logs = parseAllStaffFile(buffer, file.name);
      newLogs.push(...logs);
      count += logs.length;
    }
    setWorkLogs(prev => {
      const merged = [...prev, ...newLogs];
      try { localStorage.setItem(CACHE_KEY_WORK, JSON.stringify(merged)); } catch {}
      return merged;
    });
    return count;
  }, []);

  const handleSalaryUpload = useCallback(async (files) => {
    let allRecords = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const records = parseSalaryExcel(buffer);
      allRecords.push(...records);
    }
    setSalaryData(allRecords);
    try { localStorage.setItem(CACHE_KEY_SALARY, JSON.stringify(allRecords)); } catch {}
    return allRecords.length;
  }, []);

  const clearAllData = useCallback(() => {
    setWorkLogs([]);
    setSalaryData([]);
    localStorage.removeItem(CACHE_KEY_WORK);
    localStorage.removeItem(CACHE_KEY_SALARY);
    localStorage.removeItem(CACHE_KEY_DATE);
    console.log('[dataLoader] 所有資料已清除');
  }, []);

  return {
    workLogs, setWorkLogs, salaryData, setSalaryData,
    loadDataFromGDrive, loadFromCache,
    handleWorkLogUpload, handleSalaryUpload,
    clearAllData, isLoading, loadingMessage,
  };
}
