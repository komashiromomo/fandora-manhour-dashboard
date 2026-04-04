import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import _ from 'lodash-es';
import { CHART_COLORS } from '../shared/constants';
import { useData } from '../data/DataContext';
import KPIGrid from '../components/KPIGrid';
import ChartContainer from '../components/ChartContainer';
import DataTable from '../components/DataTable';
import Collapsible from '../components/Collapsible';

export default function ProjectPage() {
  const { filteredLogs, projectCosts } = useData();
  const [selectedProject, setSelectedProject] = useState('all');

  // ── Filter: exclude 非授權IP from logs ──
  const authorizedLogs = useMemo(
    () => filteredLogs.filter((l) => l.ipProject !== '非授權IP'),
    [filteredLogs],
  );

  // ── Unique project names for dropdown ──
  const projectNames = useMemo(
    () => _.uniq(authorizedLogs.map((l) => l.ipProject)).sort(),
    [authorizedLogs],
  );

  // ── KPI Cards ──
  const totalCost = useMemo(() => _.sumBy(projectCosts, 'cost'), [projectCosts]);
  const avgCost = projectCosts.length > 0 ? Math.round(totalCost / projectCosts.length) : 0;
  const topProject = projectCosts[0];

  const kpiItems = [
    { label: '專案總費用', value: totalCost.toLocaleString(), unit: 'NTD' },
    {
      label: '最高費用專案',
      value: topProject ? `${topProject.name} (${topProject.cost.toLocaleString()})` : '-',
    },
    { label: '平均專案費用', value: avgCost.toLocaleString(), unit: 'NTD' },
  ];

  // ── Chart 1: Top 20 授權IP工時 ──
  const top20Hours = useMemo(() => {
    const grouped = _.groupBy(authorizedLogs, 'ipProject');
    return _.orderBy(
      Object.entries(grouped).map(([name, logs]) => ({
        name,
        hours: _.sumBy(logs, 'hours'),
      })),
      'hours',
      'desc',
    ).slice(0, 20);
  }, [authorizedLogs]);

  // ── Chart 2: 授權IP 成本分攤排行 Top 10 ──
  const top10Cost = useMemo(() => projectCosts.slice(0, 10), [projectCosts]);

  // ── Table: 授權IP彙總 ──
  const tableData = useMemo(() => {
    const logsByProject = _.groupBy(authorizedLogs, 'ipProject');
    return projectCosts.map((p) => {
      const logs = logsByProject[p.name] || [];
      const employees = _.uniq(logs.map((l) => l.name));
      const depts = _.uniq(logs.map((l) => l.dept));
      const tasks = _.uniq(logs.map((l) => l.task));
      return {
        ...p,
        hourlyCost: p.hours > 0 ? Math.round(p.cost / p.hours) : 0,
        employees: employees.join(', '),
        employeeCount: employees.length,
        deptCount: depts.length,
        taskCount: tasks.length,
      };
    });
  }, [projectCosts, authorizedLogs]);

  const tableColumns = [
    { title: '授權IP', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: '總工時',
      dataIndex: 'hours',
      key: 'hours',
      sorter: (a, b) => a.hours - b.hours,
      render: (v) => v.toFixed(2),
    },
    {
      title: '分攤費用',
      dataIndex: 'cost',
      key: 'cost',
      sorter: (a, b) => a.cost - b.cost,
      render: (v) => v.toLocaleString(),
    },
    {
      title: '時薪成本',
      dataIndex: 'hourlyCost',
      key: 'hourlyCost',
      sorter: (a, b) => a.hourlyCost - b.hourlyCost,
      render: (v) => v.toLocaleString(),
    },
    { title: '參與員工', dataIndex: 'employees', key: 'employees', width: 200 },
    { title: '部門數', dataIndex: 'deptCount', key: 'deptCount', sorter: (a, b) => a.deptCount - b.deptCount },
    { title: '工作項目數', dataIndex: 'taskCount', key: 'taskCount', sorter: (a, b) => a.taskCount - b.taskCount },
  ];

  // ── Selected project detail ──
  const selectedLogs = useMemo(() => {
    if (selectedProject === 'all') return [];
    return authorizedLogs.filter((l) => l.ipProject === selectedProject);
  }, [authorizedLogs, selectedProject]);

  const employeePieData = useMemo(() => {
    if (!selectedLogs.length) return [];
    const grouped = _.groupBy(selectedLogs, 'name');
    return Object.entries(grouped).map(([name, logs]) => ({
      name,
      hours: Math.round(_.sumBy(logs, 'hours') * 100) / 100,
    }));
  }, [selectedLogs]);

  const deptPieData = useMemo(() => {
    if (!selectedLogs.length) return [];
    const grouped = _.groupBy(selectedLogs, 'dept');
    return Object.entries(grouped).map(([name, logs]) => ({
      name,
      hours: Math.round(_.sumBy(logs, 'hours') * 100) / 100,
    }));
  }, [selectedLogs]);

  // ── Advanced: top cost & most members ──
  const highestCostProject = topProject;
  const mostMembersProject = useMemo(() => {
    const logsByProject = _.groupBy(authorizedLogs, 'ipProject');
    let best = { name: '-', count: 0 };
    for (const [name, logs] of Object.entries(logsByProject)) {
      const count = _.uniq(logs.map((l) => l.name)).length;
      if (count > best.count) best = { name, count };
    }
    return best;
  }, [authorizedLogs]);

  // ── Advanced: Top 5 IP 月度趨勢 ──
  const monthlyTrendData = useMemo(() => {
    const top5Names = projectCosts.slice(0, 5).map((p) => p.name);
    const top5Logs = authorizedLogs.filter((l) => top5Names.includes(l.ipProject));
    const grouped = _.groupBy(top5Logs, 'month');
    const months = _.sortBy(Object.keys(grouped));
    return months.map((month) => {
      const row = { month };
      const monthLogs = grouped[month] || [];
      for (const pName of top5Names) {
        row[pName] = Math.round(
          _.sumBy(monthLogs.filter((l) => l.ipProject === pName), 'hours') * 100,
        ) / 100;
      }
      return row;
    });
  }, [authorizedLogs, projectCosts]);

  const top5Names = useMemo(() => projectCosts.slice(0, 5).map((p) => p.name), [projectCosts]);

  const barHeight1 = Math.max(300, top20Hours.length * 32);
  const barHeight2 = Math.max(300, top10Cost.length * 36);

  return (
    <div>
      {/* KPI */}
      <KPIGrid items={kpiItems} />

      {/* Filter */}
      <div style={{ margin: '16px 0' }}>
        <label style={{ marginRight: 8, fontWeight: 'bold' }}>專案篩選：</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="all">全部</option>
          {projectNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Chart 1: Top 20 授權IP工時 */}
      <ChartContainer title="Top 20 授權IP工時" height={barHeight1}>
        <BarChart data={top20Hours} layout="vertical" margin={{ left: 100, right: 20 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => `${v.toFixed(2)} hr`} />
          <Bar dataKey="hours" fill={CHART_COLORS[0]} />
        </BarChart>
      </ChartContainer>

      {/* Chart 2: 授權IP 成本分攤排行 */}
      <ChartContainer title="授權IP 成本分攤排行" height={barHeight2}>
        <BarChart data={top10Cost} layout="vertical" margin={{ left: 100, right: 20 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => `${v.toLocaleString()} NTD`} />
          <Bar dataKey="cost" fill={CHART_COLORS[1]} />
        </BarChart>
      </ChartContainer>

      {/* Table: 授權IP彙總 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>授權IP彙總</h3>
        <DataTable columns={tableColumns} dataSource={tableData} rowKey="name" />
      </div>

      {/* Selected project detail */}
      {selectedProject !== 'all' && selectedLogs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>{selectedProject} - 詳細分析</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ChartContainer title="員工工時分佈" height={300}>
              <PieChart>
                <Pie
                  data={employeePieData}
                  dataKey="hours"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {employeePieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v.toFixed(2)} hr`} />
              </PieChart>
            </ChartContainer>

            <ChartContainer title="部門工時分佈" height={300}>
              <PieChart>
                <Pie
                  data={deptPieData}
                  dataKey="hours"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {deptPieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v.toFixed(2)} hr`} />
              </PieChart>
            </ChartContainer>
          </div>
        </div>
      )}

      {/* Advanced Analysis */}
      <Collapsible title="進階分析">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>最高成本專案</div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>
              {highestCostProject ? `${highestCostProject.name} - ${highestCostProject.cost.toLocaleString()} NTD` : '-'}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>最多團隊成員專案</div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>
              {mostMembersProject.name} - {mostMembersProject.count} 人
            </div>
          </div>
        </div>

        <ChartContainer title="Top 5 IP 月度趨勢" height={350}>
          <LineChart data={monthlyTrendData} margin={{ left: 20, right: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {top5Names.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </Collapsible>
    </div>
  );
}
