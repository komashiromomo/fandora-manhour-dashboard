import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import _ from 'lodash-es';
import { CHART_COLORS } from '../shared/constants';
import { useData } from '../data/DataContext';
import KPIGrid from '../components/KPIGrid';
import ChartContainer from '../components/ChartContainer';
import DataTable from '../components/DataTable';
import Collapsible from '../components/Collapsible';

export default function DepartmentPage() {
  const { deptCosts, filteredLogs } = useData();
  const [selectedDept, setSelectedDept] = useState('all');

  // --- KPI ---
  const uniqueDepts = useMemo(() => _.uniqBy(deptCosts, 'name'), [deptCosts]);

  const largestDept = useMemo(() => {
    if (!deptCosts.length) return '-';
    return _.maxBy(deptCosts, 'memberCount')?.name || '-';
  }, [deptCosts]);

  const busiestDept = useMemo(() => {
    if (!deptCosts.length) return '-';
    return _.maxBy(deptCosts, 'hours')?.name || '-';
  }, [deptCosts]);

  const kpiItems = [
    { label: '部門總數', value: uniqueDepts.length, unit: '個' },
    { label: '最大部門', value: largestDept },
    { label: '最忙部門', value: busiestDept },
  ];

  // --- Unique depts for filter ---
  const deptNames = useMemo(() => _.uniq(deptCosts.map((d) => d.name)), [deptCosts]);

  // --- Bar chart data: dept hours ---
  const deptHoursData = useMemo(
    () => deptCosts.map((d) => ({ name: d.name, hours: d.hours })),
    [deptCosts],
  );

  // --- Table columns ---
  const tableColumns = [
    { title: '部門', dataIndex: 'name', key: 'name' },
    {
      title: '總工時',
      dataIndex: 'hours',
      key: 'hours',
      sorter: (a, b) => a.hours - b.hours,
      render: (v) => v.toLocaleString(),
    },
    {
      title: '分攤費用',
      dataIndex: 'cost',
      key: 'cost',
      sorter: (a, b) => a.cost - b.cost,
      render: (v) => `$${v.toLocaleString()}`,
    },
    {
      title: '人均費用',
      key: 'costPerMember',
      sorter: (a, b) =>
        (a.memberCount ? a.cost / a.memberCount : 0) -
        (b.memberCount ? b.cost / b.memberCount : 0),
      render: (_, row) =>
        row.memberCount ? `$${Math.round(row.cost / row.memberCount).toLocaleString()}` : '-',
    },
    {
      title: '成員數',
      dataIndex: 'memberCount',
      key: 'memberCount',
      sorter: (a, b) => a.memberCount - b.memberCount,
    },
    {
      title: '平均工時',
      key: 'avgHours',
      sorter: (a, b) =>
        (a.memberCount ? a.hours / a.memberCount : 0) -
        (b.memberCount ? b.hours / b.memberCount : 0),
      render: (_, row) =>
        row.memberCount ? (row.hours / row.memberCount).toFixed(1) : '-',
    },
  ];

  // --- Selected dept detail data ---
  const selectedDeptLogs = useMemo(() => {
    if (selectedDept === 'all') return [];
    return filteredLogs.filter((log) => log.dept === selectedDept);
  }, [filteredLogs, selectedDept]);

  const memberHoursData = useMemo(() => {
    if (!selectedDeptLogs.length) return [];
    const grouped = _.groupBy(selectedDeptLogs, 'name');
    return Object.entries(grouped)
      .map(([name, logs]) => ({
        name,
        hours: Math.round(_.sumBy(logs, 'hours') * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [selectedDeptLogs]);

  const monthlyTrendData = useMemo(() => {
    if (!selectedDeptLogs.length) return [];
    const grouped = _.groupBy(selectedDeptLogs, 'month');
    return Object.entries(grouped)
      .map(([month, logs]) => ({
        month,
        hours: Math.round(_.sumBy(logs, 'hours') * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [selectedDeptLogs]);

  // --- Advanced: analysis ---
  const mostMembersDept = largestDept;
  const mostHoursDept = busiestDept;

  const mostEfficientDept = useMemo(() => {
    if (!deptCosts.length) return '-';
    return _.maxBy(deptCosts, (d) => (d.memberCount ? d.hours / d.memberCount : 0))?.name || '-';
  }, [deptCosts]);

  // --- Advanced: all depts monthly trend ---
  const allDeptsMonthlyData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'month');
    const months = Object.keys(grouped).sort();
    return months.map((month) => {
      const row = { month };
      const logsInMonth = grouped[month] || [];
      const byDept = _.groupBy(logsInMonth, 'dept');
      for (const dept of deptNames) {
        row[dept] = byDept[dept]
          ? Math.round(_.sumBy(byDept[dept], 'hours') * 100) / 100
          : 0;
      }
      return row;
    });
  }, [filteredLogs, deptNames]);

  return (
    <div>
      {/* KPI Cards */}
      <KPIGrid items={kpiItems} />

      {/* Department Filter */}
      <div style={{ margin: '16px 0' }}>
        <label style={{ marginRight: 8, fontWeight: 'bold' }}>部門篩選：</label>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="all">全部</option>
          {deptNames.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Dept Hours BarChart */}
      <ChartContainer title="部門工時">
        <BarChart data={deptHoursData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="hours" fill={CHART_COLORS[0]} name="總工時" />
        </BarChart>
      </ChartContainer>

      {/* Dept Stats Table */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>部門統計</div>
        <DataTable columns={tableColumns} dataSource={deptCosts} rowKey="name" />
      </div>

      {/* Selected Department Detail */}
      {selectedDept !== 'all' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            {selectedDept} - 詳細分析
          </div>

          {/* Member Hours Distribution (Horizontal Bar) */}
          <ChartContainer title="成員工時分佈" height={Math.max(200, memberHoursData.length * 40)}>
            <BarChart data={memberHoursData} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="hours" fill={CHART_COLORS[1]} name="工時" />
            </BarChart>
          </ChartContainer>

          {/* Monthly Trend (Vertical Bar) */}
          <ChartContainer title="月度趨勢">
            <BarChart data={monthlyTrendData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill={CHART_COLORS[2]} name="工時" />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Advanced Analysis */}
      <Collapsible title="進階分析">
        <div style={{ marginBottom: 16 }}>
          <p><strong>最大部門（最多成員）：</strong>{mostMembersDept}</p>
          <p><strong>最忙碌部門（最多工時）：</strong>{mostHoursDept}</p>
          <p><strong>最高效部門（人均工時最高）：</strong>{mostEfficientDept}</p>
        </div>

        <ChartContainer title="所有部門月度趨勢">
          <LineChart data={allDeptsMonthlyData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            {deptNames.map((dept, i) => (
              <Line
                key={dept}
                type="monotone"
                dataKey={dept}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                name={dept}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </Collapsible>
    </div>
  );
}
