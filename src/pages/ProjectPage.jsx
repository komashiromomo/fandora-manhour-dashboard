import React, { useMemo } from 'react';
import { Row, Col, Empty } from 'antd';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../data/DataContext';
import FilterToolbar from '../components/FilterToolbar';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import { CHART_COLORS } from '../config/constants';
import { roundHours } from '../utils/dates';
import { calcProjectCost } from '../utils/costCalculator';

export default function ProjectPage() {
  const { filteredLogs, salaryData } = useData();

  const projectStats = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'ipProject');
    return orderBy(
      Object.entries(grouped).map(([project, logs]) => ({
        key: project,
        project,
        hours: roundHours(sumBy(logs, 'hours')),
        employeeCount: new Set(logs.map(l => l.employee)).size,
        departments: [...new Set(logs.map(l => l.department))].join(', '),
        taskCount: new Set(logs.map(l => l.task)).size,
      })),
      'hours', 'desc'
    );
  }, [filteredLogs]);

  // Phase 3: 成本分攤
  const projectCosts = useMemo(() => calcProjectCost(filteredLogs, salaryData), [filteredLogs, salaryData]);
  const statsWithCost = projectStats.map(p => ({
    ...p,
    cost: Math.round(projectCosts[p.project] || 0),
  }));
  const ipProjects = statsWithCost.filter(p => p.project !== '非授權IP');

  const ipVsNonIp = useMemo(() => {
    const ipHours = sumBy(ipProjects, 'hours');
    const nonIpHours = projectStats.find(p => p.project === '非授權IP')?.hours || 0;
    return [
      { name: '授權IP', value: roundHours(ipHours) },
      { name: '非授權IP', value: roundHours(nonIpHours) },
    ];
  }, [projectStats, ipProjects]);

  const columns = [
    { title: '專案（授權IP）', dataIndex: 'project', key: 'project' },
    { title: '工時', dataIndex: 'hours', key: 'hours', sorter: (a, b) => a.hours - b.hours },
    { title: '參與人數', dataIndex: 'employeeCount', key: 'employeeCount' },
    { title: '參與部門', dataIndex: 'departments', key: 'departments' },
    { title: '工作項目數', dataIndex: 'taskCount', key: 'taskCount' },
    { title: '估算成本', dataIndex: 'cost', key: 'cost', render: v => v ? `$${v.toLocaleString()}` : '--', sorter: (a, b) => a.cost - b.cost },
  ];

  const isEmpty = filteredLogs.length === 0;

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <FilterToolbar />

      <ChartCard title="授權IP vs 非授權IP 工時佔比" isEmpty={isEmpty} height={250}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={ipVsNonIp} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}h`}>
              {ipVsNonIp.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="授權IP 專案工時排行" isEmpty={ipProjects.length === 0} height={Math.max(250, ipProjects.length * 35)}>
        <ResponsiveContainer width="100%" height={Math.max(250, ipProjects.length * 35)}>
          <BarChart data={ipProjects.slice(0, 15)} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="project" width={90} />
            <Tooltip />
            <Bar dataKey="hours" fill={CHART_COLORS[0]} name="工時" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="全部專案統計表" isEmpty={isEmpty}>
        <DataTable columns={columns} dataSource={statsWithCost} />
      </ChartCard>
    </div>
  );
}
