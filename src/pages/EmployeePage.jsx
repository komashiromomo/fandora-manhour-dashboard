import React from 'react';
import { useData } from '../data/DataContext';
import AnalysisView from '../components/AnalysisView';

/**
 * Employee analysis — Privacy: no cost / salary columns.
 * Uses full filteredLogs (including 非授權IP) since this is personal-hour view.
 */
export default function EmployeePage() {
  const { filteredLogs, filteredSalary, availableMonths } = useData();
  return (
    <AnalysisView
      logs={filteredLogs}
      salary={filteredSalary}
      allMonths={availableMonths}
      config={{
        groupBy: 'name',
        itemLabel: '員工',
        eyebrow: 'EMPLOYEE',
        secondaryKey: 'task',
        secondaryLabel: '工作結構',
        peopleLabel: '合作同仁',
        showCost: false,
      }}
    />
  );
}
