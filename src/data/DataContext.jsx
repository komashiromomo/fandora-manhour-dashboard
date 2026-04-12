import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useDataLoader } from './useDataLoader';
import { buildMonthlyCostMap, getAvailableMonths, filterLogsByMonth } from '../utils/dataTransformer';
import { calcProjectCosts, calcWorkTypeCosts, calcDeptCosts } from '../utils/costCalculator';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const {
    workLogs, salaryData,
    loadDataFromGDrive, loadFromCache,
    handleWorkLogUpload, handleSalaryUpload,
    clearAllData, isLoading, loadingMessage,
  } = useDataLoader();

  const [selectedMonth, setSelectedMonth] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadFromCache();
  }, [loadFromCache]);

  const availableMonths = useMemo(() => getAvailableMonths(workLogs), [workLogs]);

  const filteredLogs = useMemo(
    () => filterLogsByMonth(workLogs, selectedMonth, dateFrom, dateTo),
    [workLogs, selectedMonth, dateFrom, dateTo]
  );

  const filteredSalary = useMemo(() => {
    if (selectedMonth === 'all') return salaryData;
    return salaryData.filter(r => r.月份 === selectedMonth);
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
    workLogs, salaryData,
    filteredLogs, filteredSalary,
    selectedMonth, setSelectedMonth,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    monthlyCostMap, projectCosts, workTypeCosts, deptCosts,
    loadData: loadDataFromGDrive,
    loadFromCache,
    handleWorkLogUpload, handleSalaryUpload,
    clearData: clearAllData,
    isLoading, loadingMessage,
    availableMonths,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
