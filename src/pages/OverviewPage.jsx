import React, { useMemo } from 'react';
import { useData } from '../data/DataContext';
import KPIGrid from '../components/KPIGrid';
import ChartContainer from '../components/ChartContainer';
import Collapsible from '../components/Collapsible';
import { CHART_COLORS } from '../shared/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import _ from 'lodash-es';

export default function OverviewPage() {
  const { filteredLogs, monthlyCostMap, projectCosts, selectedMonth } = useData();

  const totalHours = useMemo(() => _.sumBy(filteredLogs, 'hours'), [filteredLogs]);
  const employeeCount = useMemo(() => _.uniqBy(filteredLogs, 'name').length, [filteredLogs]);
  const taskCount = useMemo(() => _.uniqBy(filteredLogs, 'task').length, [filteredLogs]);
  const avgHoursPerPerson = employeeCount > 0 ? totalHours / employeeCount : 0;

  const totalCost = useMemo(() => {
    if (selectedMonth === 'all') return Object.values(monthlyCostMap).reduce((a, b) => a + b, 0);
    return monthlyCostMap[selectedMonth] || 0;
  }, [monthlyCostMap, selectedMonth]);

  const avgHourlyCost = totalHours > 0 ? totalCost / totalHours : 0;

  const kpiItems = [
    { label: '總工時', value: totalHours, unit: '小時' },
    { label: '員工人數', value: employeeCount, unit: '人' },
    { label: '專案數量', value: taskCount, unit: '個' },
    { label: '平均每人工時', value: Math.round(avgHoursPerPerson * 100) / 100, unit: '小時' },
    { label: '總管理費用', value: Math.round(totalCost), unit: 'NTD' },
    { label: '平均時薪成本', value: Math.round(avgHourlyCost * 100) / 100, unit: 'NTD/小時' },
  ];

  const monthlyData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'month');
    return Object.entries(grouped).map(([month, logs]) => ({
      month, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredLogs]);

  const projectHoursData = useMemo(() => {
    const ipLogs = filteredLogs.filter(l => l.ipProject !== '非授權IP');
    const grouped = _.groupBy(ipLogs, 'ipProject');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  const taskTop10 = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'task');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => b.hours - a.hours).slice(0, 10);
  }, [filteredLogs]);

  const employeeRanking = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'name');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  const deptData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'dept');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  const costTop10 = useMemo(() => projectCosts.slice(0, 10), [projectCosts]);

  const busiestProject = projectHoursData[0];
  const mostDiverseEmployee = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'name');
    let max = { name: '', count: 0 };
    for (const [name, logs] of Object.entries(grouped)) {
      const count = _.uniqBy(logs, 'task').length;
      if (count > max.count) max = { name, count };
    }
    return max;
  }, [filteredLogs]);
  const topEmployee = employeeRanking[0];

  const ipTrend = useMemo(() => {
    const top5 = projectHoursData.slice(0, 5).map(p => p.name);
    const ipLogs = filteredLogs.filter(l => top5.includes(l.ipProject));
    const months = _.uniq(ipLogs.map(l => l.month)).sort();
    return months.map(m => {
      const row = { month: m };
      top5.forEach(ip => {
        row[ip] = _.sumBy(ipLogs.filter(l => l.month === m && l.ipProject === ip), 'hours');
      });
      return row;
    });
  }, [filteredLogs, projectHoursData]);
  const top5IPs = projectHoursData.slice(0, 5).map(p => p.name);

  return (
    <div>
      <KPIGrid items={kpiItems} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        <ChartContainer title="月度工時對比" height={300}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="hours" fill={CHART_COLORS[0]} name="工時" />
          </BarChart>
        </ChartContainer>

        <ChartContainer title="專案工時分佈" height={300}>
          <PieChart>
            <Pie data={projectHoursData.slice(0, 10)} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {projectHoursData.slice(0, 10).map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => v.toLocaleString()} />
          </PieChart>
        </ChartContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        <ChartContainer title="工作項目工時 Top 10" height={Math.max(300, taskTop10.length * 35)}>
          <BarChart data={taskTop10} layout="vertical">
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" width={120} fontSize={12} />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="hours" fill={CHART_COLORS[1]} name="工時" />
          </BarChart>
        </ChartContainer>

        <ChartContainer title="員工工時排名" height={Math.max(300, employeeRanking.length * 35)}>
          <BarChart data={employeeRanking} layout="vertical">
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" width={80} fontSize={12} />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="hours" fill={CHART_COLORS[2]} name="工時" />
          </BarChart>
        </ChartContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        <ChartContainer title="部門工時排名" height={Math.max(300, deptData.length * 35)}>
          <BarChart data={deptData} layout="vertical">
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" width={100} fontSize={12} />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="hours" fill={CHART_COLORS[3]} name="工時" />
          </BarChart>
        </ChartContainer>

        <ChartContainer title="專案費用排行 Top 10" height={Math.max(300, costTop10.length * 35)}>
          <BarChart data={costTop10} layout="vertical">
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" width={120} fontSize={12} />
            <Tooltip formatter={(v) => `NTD ${v.toLocaleString()}`} />
            <Bar dataKey="cost" fill={CHART_COLORS[4]} name="費用" />
          </BarChart>
        </ChartContainer>
      </div>

      <Collapsible title="進階分析" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={cardStyle}>
            <div style={cardLabel}>最繁忙專案</div>
            <div style={cardValue}>{busiestProject?.name || '-'}</div>
            <div style={cardSub}>{busiestProject ? `${busiestProject.hours.toLocaleString()} 小時` : ''}</div>
          </div>
          <div style={cardStyle}>
            <div style={cardLabel}>最多元員工</div>
            <div style={cardValue}>{mostDiverseEmployee.name || '-'}</div>
            <div style={cardSub}>{mostDiverseEmployee.count ? `${mostDiverseEmployee.count} 種工作項目` : ''}</div>
          </div>
          <div style={cardStyle}>
            <div style={cardLabel}>最高工時員工</div>
            <div style={cardValue}>{topEmployee?.name || '-'}</div>
            <div style={cardSub}>{topEmployee ? `${topEmployee.hours.toLocaleString()} 小時` : ''}</div>
          </div>
        </div>

        {top5IPs.length > 0 && (
          <ChartContainer title="Top 5 授權IP 月度趨勢" height={300}>
            <LineChart data={ipTrend}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {top5IPs.map((ip, i) => (
                <Line key={ip} type="monotone" dataKey={ip} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
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
