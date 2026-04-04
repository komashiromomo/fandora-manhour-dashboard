import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import _ from 'lodash-es';
import { CHART_COLORS } from '../shared/constants';
import { useData } from '../data/DataContext';
import DataTable from '../components/DataTable';
import ChartContainer from '../components/ChartContainer';
import Collapsible from '../components/Collapsible';

export default function EmployeePage() {
  const { filteredLogs } = useData();
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  // All unique employee names
  const employeeNames = useMemo(
    () => _.sortBy(_.uniq(filteredLogs.map((l) => l.name))),
    [filteredLogs],
  );

  // Grouped data per employee: { name, dept, hours, taskCount }
  const employeeSummary = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'name');
    return _.map(grouped, (logs, name) => ({
      key: name,
      name,
      dept: logs[0]?.dept ?? '-',
      hours: _.round(_.sumBy(logs, 'hours'), 2),
      taskCount: _.uniqBy(logs, 'task').length,
    }));
  }, [filteredLogs]);

  // Detail data for selected employee
  const selectedData = useMemo(() => {
    if (selectedEmployee === 'all') return null;
    const logs = filteredLogs.filter((l) => l.name === selectedEmployee);
    if (logs.length === 0) return null;

    const name = selectedEmployee;
    const dept = logs[0]?.dept ?? '-';
    const totalHours = _.round(_.sumBy(logs, 'hours'), 2);
    const uniqueTasks = _.uniqBy(logs, 'task').length;

    // Task breakdown (horizontal bar)
    const taskData = _(logs)
      .groupBy('task')
      .map((items, task) => ({ task, hours: _.round(_.sumBy(items, 'hours'), 2) }))
      .orderBy('hours', 'desc')
      .value();

    // Monthly trend (vertical bar)
    const monthlyData = _(logs)
      .groupBy('month')
      .map((items, month) => ({ month, hours: _.round(_.sumBy(items, 'hours'), 2) }))
      .orderBy('month')
      .value();

    return { name, dept, totalHours, uniqueTasks, taskData, monthlyData };
  }, [filteredLogs, selectedEmployee]);

  // ===== Advanced analysis =====
  // Most diverse employee (most unique tasks)
  const mostDiverse = useMemo(() => {
    if (employeeSummary.length === 0) return null;
    return _.maxBy(employeeSummary, 'taskCount');
  }, [employeeSummary]);

  // Highest hours employee
  const highestHours = useMemo(() => {
    if (employeeSummary.length === 0) return null;
    return _.maxBy(employeeSummary, 'hours');
  }, [employeeSummary]);

  // Top 5 employees monthly trend for LineChart
  const top5MonthlyTrend = useMemo(() => {
    const top5 = _.orderBy(employeeSummary, 'hours', 'desc').slice(0, 5);
    const top5Names = top5.map((e) => e.name);

    const top5Logs = filteredLogs.filter((l) => top5Names.includes(l.name));
    const byMonth = _.groupBy(top5Logs, 'month');

    return _.map(byMonth, (logs, month) => {
      const row = { month };
      for (const n of top5Names) {
        row[n] = _.round(
          _.sumBy(
            logs.filter((l) => l.name === n),
            'hours',
          ),
          2,
        );
      }
      return row;
    }).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredLogs, employeeSummary]);

  const top5Names = useMemo(
    () => _.orderBy(employeeSummary, 'hours', 'desc').slice(0, 5).map((e) => e.name),
    [employeeSummary],
  );

  // ===== Table columns =====
  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: '部門', dataIndex: 'dept', key: 'dept', sorter: (a, b) => a.dept.localeCompare(b.dept) },
    {
      title: '工時',
      dataIndex: 'hours',
      key: 'hours',
      sorter: (a, b) => a.hours - b.hours,
      defaultSortOrder: 'descend',
      render: (v) => v.toFixed(2),
    },
    {
      title: '工作類型數',
      dataIndex: 'taskCount',
      key: 'taskCount',
      sorter: (a, b) => a.taskCount - b.taskCount,
    },
  ];

  return (
    <div>
      {/* Filter */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ marginRight: 8, fontWeight: 'bold' }}>選擇員工：</label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc', minWidth: 160 }}
        >
          <option value="all">全部</option>
          {employeeNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* All employees view */}
      {selectedEmployee === 'all' && (
        <DataTable columns={columns} dataSource={employeeSummary} rowKey="name" />
      )}

      {/* Selected employee detail */}
      {selectedEmployee !== 'all' && selectedData && (
        <div>
          {/* Info card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              { label: '姓名', value: selectedData.name },
              { label: '部門', value: selectedData.dept },
              { label: '總工時', value: `${selectedData.totalHours} 小時` },
              { label: '工作分類數', value: selectedData.uniqueTasks },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Task distribution - horizontal bar */}
          <ChartContainer
            title="各工作項目工時分佈"
            height={Math.max(300, selectedData.taskData.length * 36)}
          >
            <BarChart data={selectedData.taskData} layout="vertical" margin={{ left: 120 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="task" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v} 小時`, '工時']} />
              <Bar dataKey="hours" fill={CHART_COLORS[0]} name="工時" />
            </BarChart>
          </ChartContainer>

          {/* Monthly trend - vertical bar */}
          <ChartContainer title="月度工時趨勢">
            <BarChart data={selectedData.monthlyData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => [`${v} 小時`, '工時']} />
              <Bar dataKey="hours" fill={CHART_COLORS[1]} name="工時" />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Advanced Analysis */}
      <Collapsible title="進階分析">
        {/* Most diverse employee */}
        {mostDiverse && (
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>最多元員工</div>
            <div>
              {mostDiverse.name}（{mostDiverse.dept}）— {mostDiverse.taskCount} 種工作類型
            </div>
          </div>
        )}

        {/* Highest hours employee */}
        {highestHours && (
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>最高工時員工</div>
            <div>
              {highestHours.name}（{highestHours.dept}）— {highestHours.hours} 小時
            </div>
          </div>
        )}

        {/* Top 5 monthly trend LineChart */}
        {top5MonthlyTrend.length > 0 && (
          <ChartContainer title="Top 5 員工月度趨勢" height={350}>
            <LineChart data={top5MonthlyTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {top5Names.map((name, idx) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </Collapsible>
    </div>
  );
}
