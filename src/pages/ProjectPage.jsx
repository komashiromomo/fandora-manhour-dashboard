import React, { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import KPIGrid from '../components/KPIGrid';
import ChartContainer from '../components/ChartContainer';
import Collapsible from '../components/Collapsible';
import DataTable from '../components/DataTable';
import { CHART_COLORS } from '../shared/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import _ from 'lodash-es';

export default function ProjectPage() {
  const { filteredLogs, projectCosts } = useData();
  const [selectedProject, setSelectedProject] = useState('all');

  const ipLogs = useMemo(() => filteredLogs.filter(l => l.ipProject !== '非授權IP'), [filteredLogs]);

  const projectList = useMemo(() => _.uniq(ipLogs.map(l => l.ipProject)).sort(), [ipLogs]);

  const totalCost = useMemo(() => _.sumBy(projectCosts, 'cost'), [projectCosts]);
  const topProject = projectCosts[0];
  const avgCost = projectCosts.length > 0 ? totalCost / projectCosts.length : 0;

  const kpiItems = [
    { label: '專案總費用', value: Math.round(totalCost), unit: 'NTD' },
    { label: '最高費用專案', value: topProject ? topProject.name : '-', unit: topProject ? `NTD ${Math.round(topProject.cost).toLocaleString()}` : '' },
    { label: '平均專案費用', value: Math.round(avgCost), unit: 'NTD' },
  ];

  const ipHoursData = useMemo(() => {
    const grouped = _.groupBy(ipLogs, 'ipProject');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => b.hours - a.hours).slice(0, 20);
  }, [ipLogs]);

  const tableData = useMemo(() => {
    return projectCosts.map(pc => {
      const logs = ipLogs.filter(l => l.ipProject === pc.name);
      return {
        name: pc.name, hours: pc.hours, cost: pc.cost,
        hourlyCost: pc.hours > 0 ? pc.cost / pc.hours : 0,
        employees: _.uniqBy(logs, 'name').length,
        depts: _.uniqBy(logs, 'dept').length,
        tasks: _.uniqBy(logs, 'task').length,
      };
    });
  }, [projectCosts, ipLogs]);

  const selectedLogs = useMemo(() => {
    if (selectedProject === 'all') return [];
    return ipLogs.filter(l => l.ipProject === selectedProject);
  }, [ipLogs, selectedProject]);

  const employeeDistribution = useMemo(() => {
    const grouped = _.groupBy(selectedLogs, 'name');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => b.hours - a.hours);
  }, [selectedLogs]);

  const deptDistribution = useMemo(() => {
    const grouped = _.groupBy(selectedLogs, 'dept');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => b.hours - a.hours);
  }, [selectedLogs]);

  const mostMembers = useMemo(() => {
    let max = { name: '', count: 0 };
    for (const pc of projectCosts) {
      const logs = ipLogs.filter(l => l.ipProject === pc.name);
      const count = _.uniqBy(logs, 'name').length;
      if (count > max.count) max = { name: pc.name, count };
    }
    return max;
  }, [projectCosts, ipLogs]);

  const ipTrend = useMemo(() => {
    const top5 = projectCosts.slice(0, 5).map(p => p.name);
    const logs = ipLogs.filter(l => top5.includes(l.ipProject));
    const months = _.uniq(logs.map(l => l.month)).sort();
    return months.map(m => {
      const row = { month: m };
      top5.forEach(ip => { row[ip] = _.sumBy(logs.filter(l => l.month === m && l.ipProject === ip), 'hours'); });
      return row;
    });
  }, [ipLogs, projectCosts]);
  const top5Names = projectCosts.slice(0, 5).map(p => p.name);

  const columns = [
    { title: '授權IP', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: '總工時', dataIndex: 'hours', key: 'hours', sorter: (a, b) => a.hours - b.hours, render: v => v.toFixed(1) },
    { title: '分攤費用', dataIndex: 'cost', key: 'cost', sorter: (a, b) => a.cost - b.cost, render: v => `NTD ${Math.round(v).toLocaleString()}` },
    { title: '時薪成本', dataIndex: 'hourlyCost', key: 'hourlyCost', render: v => `NTD ${v.toFixed(0)}` },
    { title: '參與員工', dataIndex: 'employees', key: 'employees', sorter: (a, b) => a.employees - b.employees },
    { title: '部門數', dataIndex: 'depts', key: 'depts' },
    { title: '工作項目數', dataIndex: 'tasks', key: 'tasks' },
  ];

  return (
    <div>
      <KPIGrid items={kpiItems} />

      <div style={{ marginBottom: 24 }}>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}>
          <option value="all">全部專案</option>
          {projectList.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        <ChartContainer title="Top 20 授權IP工時" height={Math.max(300, ipHoursData.length * 35)}>
          <BarChart data={ipHoursData} layout="vertical">
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" width={120} fontSize={12} />
            <Tooltip formatter={v => v.toLocaleString()} />
            <Bar dataKey="hours" fill={CHART_COLORS[0]} name="工時" />
          </BarChart>
        </ChartContainer>

        <ChartContainer title="授權IP 成本分攤排行 Top 10" height={Math.max(300, Math.min(projectCosts.length, 10) * 35)}>
          <BarChart data={projectCosts.slice(0, 10)} layout="vertical">
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" width={120} fontSize={12} />
            <Tooltip formatter={v => `NTD ${Math.round(v).toLocaleString()}`} />
            <Bar dataKey="cost" fill={CHART_COLORS[1]} name="費用" />
          </BarChart>
        </ChartContainer>
      </div>

      <DataTable columns={columns} dataSource={tableData} rowKey="name" />

      {selectedProject !== 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          <ChartContainer title={`${selectedProject} - 員工工時分佈`} height={300}>
            <PieChart>
              <Pie data={employeeDistribution} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {employeeDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartContainer>
          <ChartContainer title={`${selectedProject} - 部門工時分佈`} height={300}>
            <PieChart>
              <Pie data={deptDistribution} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {deptDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartContainer>
        </div>
      )}

      <Collapsible title="進階分析" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={cardStyle}><div style={cardLabel}>最高成本專案</div><div style={cardValue}>{topProject?.name || '-'}</div><div style={cardSub}>{topProject ? `NTD ${Math.round(topProject.cost).toLocaleString()}` : ''}</div></div>
          <div style={cardStyle}><div style={cardLabel}>最多團隊成員專案</div><div style={cardValue}>{mostMembers.name || '-'}</div><div style={cardSub}>{mostMembers.count ? `${mostMembers.count} 人` : ''}</div></div>
        </div>
        {top5Names.length > 0 && (
          <ChartContainer title="Top 5 IP 月度趨勢" height={300}>
            <LineChart data={ipTrend}>
              <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
              {top5Names.map((name, i) => <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ChartContainer>
        )}
      </Collapsible>
    </div>
  );
}

const cardStyle = { background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' };
const cardLabel = { fontSize: 12, color: '#999', marginBottom: 4 };
const cardValue = { fontSize: 18, fontWeight: 600, color: '#333' };
const cardSub = { fontSize: 12, color: '#666', marginTop: 4 };
