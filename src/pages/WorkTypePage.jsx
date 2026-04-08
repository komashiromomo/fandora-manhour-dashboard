import React, { useMemo } from 'react';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../data/DataContext';
import FilterToolbar from '../components/FilterToolbar';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import { CHART_COLORS } from '../config/constants';
import { roundHours } from '../utils/dates';

export default function WorkTypePage() {
  const { filteredLogs } = useData();

  const workTypeStats = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'workType');
    const total = sumBy(filteredLogs, 'hours');
    return orderBy(
      Object.entries(grouped).map(([workType, logs]) => ({
        key: workType,
        workType,
        hours: roundHours(sumBy(logs, 'hours')),
        percent: total > 0 ? roundHours((sumBy(logs, 'hours') / total) * 100) : 0,
        employeeCount: new Set(logs.map(l => l.employee)).size,
        projects: [...new Set(logs.map(l => l.ipProject))].join(', '),
      })),
      'hours', 'desc'
    );
  }, [filteredLogs]);

  const pieData = useMemo(() => {
    const top10 = workTypeStats.slice(0, 10);
    const others = workTypeStats.slice(10);
    const otherHours = sumBy(others, 'hours');
    const data = top10.map(w => ({ name: w.workType, value: w.hours }));
    if (otherHours > 0) data.push({ name: '其他', value: roundHours(otherHours) });
    return data;
  }, [workTypeStats]);

  const columns = [
    { title: '工作項目', dataIndex: 'workType', key: 'workType' },
    { title: '工時', dataIndex: 'hours', key: 'hours', sorter: (a, b) => a.hours - b.hours },
    { title: '佔比 %', dataIndex: 'percent', key: 'percent' },
    { title: '參與人數', dataIndex: 'employeeCount', key: 'employeeCount' },
    { title: '關聯IP項目', dataIndex: 'projects', key: 'projects' },
  ];

  const isEmpty = filteredLogs.length === 0;

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <FilterToolbar />

      <ChartCard title="工作項目分佈（Top 10）" isEmpty={isEmpty} height={300}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}h`}>
              {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="工作項目工時排行" isEmpty={workTypeStats.length === 0} height={Math.max(250, workTypeStats.length * 30)}>
        <ResponsiveContainer width="100%" height={Math.max(250, workTypeStats.length * 30)}>
          <BarChart data={workTypeStats.slice(0, 20)} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="workType" width={110} />
            <Tooltip />
            <Bar dataKey="hours" fill={CHART_COLORS[0]} name="工時" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="工作項目統計表" isEmpty={isEmpty}>
        <DataTable columns={columns} dataSource={workTypeStats} />
      </ChartCard>
    </div>
  );
}
