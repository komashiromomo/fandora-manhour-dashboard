import React from 'react';
import { useData } from '../data/DataContext';
import AnalysisView from '../components/AnalysisView';

export default function DepartmentPage() {
  const { filteredLogs, filteredSalary, availableMonths } = useData();
  return (
    <AnalysisView
      logs={filteredLogs}
      salary={filteredSalary}
      allMonths={availableMonths}
      config={{
        groupBy: 'dept',
        itemLabel: '部門',
        eyebrow: 'DEPARTMENT',
        secondaryKey: 'task',
        secondaryLabel: '部門工作結構',
        peopleLabel: '部門成員',
        showCost: true,
      }}
    />
  );
}
