import React from 'react';
import { useData } from '../data/DataContext';
import AnalysisView from '../components/AnalysisView';

export default function WorkTypePage() {
  const { filteredLogs, filteredSalary, availableMonths } = useData();
  return (
    <AnalysisView
      logs={filteredLogs}
      salary={filteredSalary}
      allMonths={availableMonths}
      config={{
        groupBy: 'task',
        itemLabel: '工作項目',
        eyebrow: 'WORK TYPE',
        secondaryKey: 'ipProject',
        secondaryLabel: '主要投入 IP',
        peopleLabel: '執行人員',
        showCost: true,
      }}
    />
  );
}
