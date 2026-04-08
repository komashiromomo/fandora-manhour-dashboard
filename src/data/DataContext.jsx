import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [workLogs, setWorkLogsState] = useState([]);
  const [salaryData, setSalaryDataState] = useState([]);
  const [isLoading, setIsLoadingState] = useState(false);
  const [loadingMessage, setLoadingMessageState] = useState('');
  const [filters, setFiltersState] = useState({
    month: 'all',
    dateFrom: '',
    dateTo: '',
  });

  // ===== 獨立 setter =====
  const setWorkLogs = useCallback((logs) => setWorkLogsState(logs), []);
  const appendWorkLogs = useCallback((logs) =>
    setWorkLogsState(prev => [...prev, ...logs]), []);
  const setSalaryData = useCallback((records) => setSalaryDataState(records), []);
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
    filteredLogs, availableMonths,
    setWorkLogs, appendWorkLogs, setSalaryData, setFilters,
    setLoading, clearAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
