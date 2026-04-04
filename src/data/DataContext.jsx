import React, { createContext, useContext, useState, useMemo } from 'react';
import { buildMonthlyCostMap, getAvailableMonths, filterLogsByMonth } from '../utils/dataTransformer';
import { calcProjectCosts, calcWorkTypeCosts, calcDeptCosts } from '../utils/costCalculator';
import { useDataLoader } from './useDataLoader';

const DataContext = createContext(null);

/**
 * DataProvider wraps the app and provides all data state + computed values.
 */
export function DataProvider({ children }) {
  const [workLogs, setWorkLogs] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const {
    loadData,
    loadFromCache,
    handleWorkLogUpload,
    handleSalaryUpload,
    clearData: clearLoader,
    isLoading,
    loadingMessage,
  } = useDataLoader(setWorkLogs, setSalaryData);

  const clearData = () => {
    setWorkLogs([]);
    setSalaryData([]);
    setSelectedMonth('all');
    setDateFrom('');
    setDateTo('');
    clearLoader();
  };

  const availableMonths = useMemo(() => getAvailableMonths(workLogs), [workLogs]);

  const filteredLogs = useMemo(
    () => filterLogsByMonth(workLogs, selectedMonth, dateFrom, dateTo),
    [workLogs, selectedMonth, dateFrom, dateTo]
  );

  const filteredSalary = useMemo(() => {
    if (selectedMonth === 'all') return salaryData;
    return salaryData.filter((r) => r.月份 === selectedMonth);
  }, [salaryData, selectedMonth]);

  const monthlyCostMap = useMemo(() => buildMonthlyCostMap(salaryData), [salaryData]);

  const projectCosts = useMemo(
    () => calcProjectCosts(filteredLogs, monthlyCostMap),
    [filteredLogs, monthlyCostMap]
  );

  const workTypeCosts = useMemo(
    () => calcWorkTypeCosts(filteredLogs, monthlyCostMap),
    [filteredLogs, monthlyCostMap]
  );

  const deptCosts = useMemo(
    () => calcDeptCosts(filteredLogs, monthlyCostMap),
    [filteredLogs, monthlyCostMap]
  );

  const value = {
    // Raw data
    workLogs,
    salaryData,
    // Filtered data
    filteredLogs,
    filteredSalary,
    // Filters
    selectedMonth,
    setSelectedMonth,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    // Computed
    monthlyCostMap,
    projectCosts,
    workTypeCosts,
    deptCosts,
    availableMonths,
    // Actions
    loadData,
    loadFromCache,
    handleWorkLogUpload,
    handleSalaryUpload,
    clearData,
    isLoading,
    loadingMessage,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Hook to consume DataContext.
 * @returns {ReturnType<typeof DataProvider>['value']}
 */
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
}
