import React from 'react';
import { useData } from '../data/DataContext';
import AnalysisView from '../components/AnalysisView';

export default function ProjectPage() {
  const { filteredLogs, filteredSalary, availableMonths } = useData();
  return (
    <AnalysisView
      logs={filteredLogs}
      salary={filteredSalary}
      allMonths={availableMonths}
      config={{
        groupBy: 'ipProject',
        itemLabel: 'IP 專案',
        eyebrow: 'IP PROJECT',
        secondaryKey: 'task',
        secondaryLabel: '工作項目組成',
        peopleLabel: '參與人員',
        showCost: true,
        excludeIP: true,
      }}
    />
  );
}
