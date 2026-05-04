import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const DataContext = createContext(null);

const LS_WORKLOGS = 'fandora_worklogs_cache';
const LS_SALARY = 'fandora_salary_cache';
const LS_LAST_SYNCED = 'fandora_last_synced_at';

// 已知的「不可能是真 IP」的污染字串（從舊 parser bug 殘留）
const POLLUTED_TAGS = new Set([
  '授權IP', '授權ip', '日期', '工作項目', '工作開始時間', '工作結束時間',
  '實際時數', '星期', '範例', '範例1', '範例2', '範例 1', '範例 2',
  '備註', '總計', '人事費', '房租場租', '硬體系統費用', '雜費',
]);

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const data = Array.isArray(parsed?.data) ? parsed.data : [];

    // workLogs cache：偵測 header / 範例字串污染。命中就 invalidate（強制下次重抓）
    if (key === LS_WORKLOGS && data.length > 0) {
      const hasPollution = data.some(
        (l) => l && (POLLUTED_TAGS.has(l.ipProject) || POLLUTED_TAGS.has(l.workType))
      );
      if (hasPollution) {
        console.warn(
          '[DataContext] cache 含 parser bug 殘留的污染資料（如 ipProject="授權IP"），自動清除以強制重抓'
        );
        localStorage.removeItem(key);
        localStorage.removeItem(LS_LAST_SYNCED);
        return [];
      }
    }
    return data;
  } catch {
    return [];
  }
};

const writeCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch (err) {
    // 容量超過 5MB 會 throw，靜默跳過
    console.warn(`[DataContext] cache ${key} failed:`, err?.message);
  }
};

export function DataProvider({ children }) {
  // 啟動時從 localStorage 恢復，避免 reload 都要重抓 Drive
  const [workLogs, setWorkLogsState] = useState(() => readCache(LS_WORKLOGS));
  const [salaryData, setSalaryDataState] = useState(() => readCache(LS_SALARY));
  const [isLoading, setIsLoadingState] = useState(false);
  const [loadingMessage, setLoadingMessageState] = useState('');
  const [lastSyncedAt, setLastSyncedAtState] = useState(() => {
    const raw = localStorage.getItem(LS_LAST_SYNCED);
    return raw ? parseInt(raw, 10) : null;
  });
  const [filters, setFiltersState] = useState({
    month: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const markSynced = useCallback(() => {
    const now = Date.now();
    setLastSyncedAtState(now);
    try {
      localStorage.setItem(LS_LAST_SYNCED, String(now));
    } catch {}
  }, []);

  // ===== 獨立 setter（同時寫 cache） =====
  const setWorkLogs = useCallback(
    (logs) => {
      setWorkLogsState(logs);
      writeCache(LS_WORKLOGS, logs);
      markSynced();
    },
    [markSynced]
  );
  const appendWorkLogs = useCallback((logs) => {
    setWorkLogsState((prev) => {
      const merged = [...prev, ...logs];
      writeCache(LS_WORKLOGS, merged);
      return merged;
    });
  }, []);
  const setSalaryData = useCallback((records) => {
    setSalaryDataState(records);
    writeCache(LS_SALARY, records);
  }, []);
  const setFilters = useCallback((partial) =>
    setFiltersState(prev => ({ ...prev, ...partial })), []);
  const setLoading = useCallback((loading, message = '') => {
    setIsLoadingState(loading);
    setLoadingMessageState(message);
  }, []);
  const clearAll = useCallback(() => {
    setWorkLogsState([]);
    setSalaryDataState([]);
    setFiltersState({ month: 'all', dateFrom: '', dateTo: '' });
    try {
      localStorage.removeItem(LS_WORKLOGS);
      localStorage.removeItem(LS_SALARY);
    } catch {}
  }, []);

  // ===== Derived: filteredLogs =====
  const filteredLogs = useMemo(() => {
    let logs = workLogs;
    // Filter by month
    if (filters.month && filters.month !== 'all') {
      logs = logs.filter(l => l.month === filters.month);
    }
    // Filter by date range
    if (filters.dateFrom) {
      logs = logs.filter(l => l.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      logs = logs.filter(l => l.date <= filters.dateTo);
    }
    // Exclude zero-hour entries
    logs = logs.filter(l => l.hours > 0);
    return logs;
  }, [workLogs, filters]);

  // ===== Available months (for filter dropdown) =====
  const availableMonths = useMemo(() => {
    const months = [...new Set(workLogs.map(l => l.month))].sort();
    return months;
  }, [workLogs]);

  const value = {
    workLogs, salaryData, isLoading, loadingMessage, filters,
    filteredLogs, availableMonths, lastSyncedAt,
    setWorkLogs, appendWorkLogs, setSalaryData, setFilters,
    setLoading, clearAll, markSynced,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
