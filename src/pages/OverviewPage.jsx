import React, { useMemo } from 'react';
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
import Collapsible from '../components/Collapsible';

export default function OverviewPage() {
  const { filteredLogs, monthlyCostMap, projectCosts } = useData();

  // ===== KPI computations =====
  const totalHours = useMemo(
    () => _.sumBy(filteredLogs, 'hours'),
    [filteredLogs]
  );

  const employeeCount = useMemo(
    () => _.uniqBy(filteredLogs, 'name').length,
    [filteredLogs]
  );

  const taskCount = useMemo(
    () => _.uniqBy(filteredLogs, 'task').length,
    [filteredLogs]
  );

  const avgHoursPerPerson = useMemo(
    () => (employeeCount ? totalHours / employeeCount : 0),
    [totalHours, employeeCount]
  );

  const filteredMonths = useMemo(
    () => _.uniq(filteredLogs.map((l) => l.month)),
    [filteredLogs]
  );

  const totalCost = useMemo(
    () => filteredMonths.reduce((sum, m) => sum + (monthlyCostMap[m] || 0), 0),
    [filteredMonths, monthlyCostMap]
  );

  const avgHourlyCost = useMemo(
    () => (totalHours ? totalCost / totalHours : 0),
    [totalCost, totalHours]
  );

  const kpiItems = useMemo(() => [
    { label: '總工時', value: totalHours.toFixed(1), unit: '小時' },
    { label: '員工人數', value: employeeCount, unit: '人' },
    { label: '專案數量', value: taskCount, unit: '個' },
    { label: '平均每人工時', value: avgHoursPerPerson.toFixed(1), unit: '小時' },
    { label: '總管理費用', value: totalCost.toLocaleString(), unit: 'NTD' },
    { label: '平均時薪成本', value: avgHourlyCost.toFixed(1), unit: 'NTD/小時' },
  ], [totalHours, employeeCount, taskCount, avgHoursPerPerson, totalCost, avgHourlyCost]);

  // ===== Chart data =====

  // 1. 月度工時對比
  const monthlyData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'month');
    return Object.entries(grouped)
      .map(([month, logs]) => ({ month, hours: _.sumBy(logs, 'hours') }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredLogs]);

  // 2. 專案工時分佈 (PieChart) - exclude 非授權IP
  const projectHoursData = useMemo(() => {
    const filtered = filteredLogs.filter((l) => l.ipProject !== '非授權IP');
    const grouped = _.groupBy(filtered, 'ipProject');
    return Object.entries(grouped)
      .map(([name, logs]) => ({ name, hours: _.sumBy(logs, 'hours') }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  // 3. 工作項目工時 - top 10
  const taskHoursData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'task');
    return Object.entries(grouped)
      .map(([name, logs]) => ({ name, hours: _.sumBy(logs, 'hours') }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [filteredLogs]);

  // 4. 員工工時排名
  const employeeHoursData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'name');
    return Object.entries(grouped)
      .map(([name, logs]) => ({ name, hours: _.sumBy(logs, 'hours') }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  // 5. 部門工時排名
  const deptHoursData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'dept');
    return Object.entries(grouped)
      .map(([name, logs]) => ({ name, hours: _.sumBy(logs, 'hours') }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  // 6. 專案費用排行 - top 10
  const projectCostData = useMemo(() => {
    return [...projectCosts]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [projectCosts]);

  // ===== Advanced Analysis =====

  const busiestProject = useMemo(() => {
    if (!projectHoursData.length) return null;
    return projectHoursData[0];
  }, [projectHoursData]);

  const mostVersatileEmployee = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'name');
    let best = null;
    let maxTasks = 0;
    for (const [name, logs] of Object.entries(grouped)) {
      const uniqueTasks = _.uniqBy(logs, 'task').length;
      if (uniqueTasks > maxTasks) {
        maxTasks = uniqueTasks;
        best = { name, taskCount: uniqueTasks };
      }
    }
    return best;
  }, [filteredLogs]);

  const highestHoursEmployee = useMemo(() => {
    if (!employeeHoursData.length) return null;
    return employeeHoursData[0];
  }, [employeeHoursData]);

  // Top 5 授權IP月度趨勢
  const ipTrendData = useMemo(() => {
    const ipLogs = filteredLogs.filter((l) => l.ipProject !== '非授權IP');
    const byIp = _.groupBy(ipLogs, 'ipProject');
    const ipTotals = Object.entries(byIp)
      .map(([ip, logs]) => ({ ip, total: _.sumBy(logs, 'hours') }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topIps = ipTotals.map((t) => t.ip);
    const allMonths = _.uniq(ipLogs.map((l) => l.month)).sort();

    return {
      months: allMonths.map((month) => {
        const row = { month };
        for (const ip of topIps) {
          const logs = ipLogs.filter((l) => l.month === month && l.ipProject === ip);
          row[ip] = _.sumBy(logs, 'hours');
        }
        return row;
      }),
      ips: topIps,
    };
  }, [filteredLogs]);

  return (
    <div>
      <KPIGrid items={kpiItems} />

      <div style={{ marginTop: 24 }}>
        {/* 1. 月度工時對比 */}
        <ChartContainer title="月度工時對比" height={300}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill={CHART_COLORS[0]} />
          </BarChart>
        </ChartContainer>

        {/* 2. 專案工時分佈 */}
        <ChartContainer title="專案工時分佈" height={300}>
          <PieChart>
            <Pie
              data={projectHoursData}
              dataKey="hours"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {projectHoursData.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ChartContainer>

        {/* 3. 工作項目工時 */}
        <ChartContainer title="工作項目工時" height={Math.max(300, taskHoursData.length * 35)}>
          <BarChart data={taskHoursData} layout="vertical">
            <YAxis type="category" dataKey="name" width={150} />
            <XAxis type="number" />
            <Tooltip />
            <Bar dataKey="hours" fill={CHART_COLORS[1]} />
          </BarChart>
        </ChartContainer>

        {/* 4. 員工工時排名 */}
        <ChartContainer title="員工工時排名" height={Math.max(300, employeeHoursData.length * 35)}>
          <BarChart data={employeeHoursData} layout="vertical">
            <YAxis type="category" dataKey="name" width={150} />
            <XAxis type="number" />
            <Tooltip />
            <Bar dataKey="hours" fill={CHART_COLORS[2]} />
          </BarChart>
        </ChartContainer>

        {/* 5. 部門工時排名 */}
        <ChartContainer title="部門工時排名" height={Math.max(300, deptHoursData.length * 35)}>
          <BarChart data={deptHoursData} layout="vertical">
            <YAxis type="category" dataKey="name" width={150} />
            <XAxis type="number" />
            <Tooltip />
            <Bar dataKey="hours" fill={CHART_COLORS[3]} />
          </BarChart>
        </ChartContainer>

        {/* 6. 專案費用排行 */}
        <ChartContainer title="專案費用排行" height={Math.max(300, projectCostData.length * 35)}>
          <BarChart data={projectCostData} layout="vertical">
            <YAxis type="category" dataKey="name" width={150} />
            <XAxis type="number" />
            <Tooltip />
            <Bar dataKey="cost" fill={CHART_COLORS[4]} />
          </BarChart>
        </ChartContainer>

        {/* 進階分析 */}
        <Collapsible title="進階分析">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {busiestProject && (
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <strong>最繁忙專案：</strong>{busiestProject.name}（{busiestProject.hours.toFixed(1)} 小時）
              </div>
            )}
            {mostVersatileEmployee && (
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <strong>最多元員工：</strong>{mostVersatileEmployee.name}（參與 {mostVersatileEmployee.taskCount} 項工作）
              </div>
            )}
            {highestHoursEmployee && (
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <strong>最高工時員工：</strong>{highestHoursEmployee.name}（{highestHoursEmployee.hours.toFixed(1)} 小時）
              </div>
            )}
          </div>

          {ipTrendData.ips.length > 0 && (
            <ChartContainer title="Top 5 授權IP月度趨勢" height={350}>
              <LineChart data={ipTrendData.months}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {ipTrendData.ips.map((ip, idx) => (
                  <Line
                    key={ip}
                    type="monotone"
                    dataKey={ip}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </Collapsible>
      </div>
    </div>
  );
}
