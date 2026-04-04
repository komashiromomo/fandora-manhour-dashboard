import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import _ from 'lodash-es';
import { CHART_COLORS } from '../shared/constants';
import { useData } from '../data/DataContext';
import ChartContainer from '../components/ChartContainer';
import DataTable from '../components/DataTable';
import Collapsible from '../components/Collapsible';

export default function WorkTypePage() {
  const { filteredLogs, workTypeCosts } = useData();
  const [selectedTask, setSelectedTask] = useState('all');

  // All unique tasks from filteredLogs
  const allTasks = useMemo(
    () => _.uniq(filteredLogs.map((l) => l.task)).sort(),
    [filteredLogs]
  );

  // ===== Chart: Top 20 tasks by hours =====
  const top20Data = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'task');
    const items = Object.entries(grouped).map(([task, logs]) => ({
      task,
      hours: Math.round(_.sumBy(logs, 'hours') * 100) / 100,
    }));
    return _.orderBy(items, 'hours', 'desc').slice(0, 20);
  }, [filteredLogs]);

  const barChartHeight = Math.max(300, top20Data.length * 32);

  // ===== Table data =====
  const tableData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'task');
    return Object.entries(grouped).map(([task, logs]) => {
      const hours = Math.round(_.sumBy(logs, 'hours') * 100) / 100;
      const costInfo = workTypeCosts[task] || { cost: 0, hours: 0 };
      const cost = costInfo.cost;
      const uniqueNames = _.uniq(logs.map((l) => l.name));
      const uniqueDepts = _.uniq(logs.map((l) => l.dept));
      const uniqueIPs = _.uniq(
        logs.map((l) => l.ipProject).filter((ip) => ip !== '非授權IP')
      );
      return {
        task,
        hours,
        cost,
        hourlyCost: hours > 0 ? Math.round(cost / hours) : 0,
        memberCount: uniqueNames.length,
        depts: uniqueDepts.join(', '),
        ips: uniqueIPs.join(', '),
      };
    });
  }, [filteredLogs, workTypeCosts]);

  const tableColumns = [
    { title: '工作項目', dataIndex: 'task', key: 'task', sorter: (a, b) => a.task.localeCompare(b.task) },
    { title: '工時', dataIndex: 'hours', key: 'hours', sorter: (a, b) => a.hours - b.hours, defaultSortOrder: 'descend' },
    { title: '分攤費用', dataIndex: 'cost', key: 'cost', sorter: (a, b) => a.cost - b.cost, render: (v) => `$${v.toLocaleString()}` },
    { title: '時薪成本', dataIndex: 'hourlyCost', key: 'hourlyCost', sorter: (a, b) => a.hourlyCost - b.hourlyCost, render: (v) => `$${v.toLocaleString()}` },
    { title: '參與人數', dataIndex: 'memberCount', key: 'memberCount', sorter: (a, b) => a.memberCount - b.memberCount },
    { title: '涉及部門', dataIndex: 'depts', key: 'depts' },
    { title: '相關授權IP', dataIndex: 'ips', key: 'ips' },
  ];

  // ===== Selected task detail =====
  const selectedLogs = useMemo(
    () => (selectedTask === 'all' ? [] : filteredLogs.filter((l) => l.task === selectedTask)),
    [filteredLogs, selectedTask]
  );

  const employeeDistribution = useMemo(() => {
    if (selectedTask === 'all') return [];
    const grouped = _.groupBy(selectedLogs, 'name');
    return _.orderBy(
      Object.entries(grouped).map(([name, logs]) => ({
        name,
        hours: Math.round(_.sumBy(logs, 'hours') * 100) / 100,
      })),
      'hours',
      'desc'
    );
  }, [selectedLogs, selectedTask]);

  const monthlyTrend = useMemo(() => {
    if (selectedTask === 'all') return [];
    const grouped = _.groupBy(selectedLogs, 'month');
    return _.orderBy(
      Object.entries(grouped).map(([month, logs]) => ({
        month,
        hours: Math.round(_.sumBy(logs, 'hours') * 100) / 100,
      })),
      'month',
      'asc'
    );
  }, [selectedLogs, selectedTask]);

  const employeeChartHeight = Math.max(300, employeeDistribution.length * 32);

  // ===== Advanced analysis =====
  const advancedStats = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'task');

    // Most hours
    let maxHoursTask = { task: '-', hours: 0 };
    // Most collaborators
    let maxCollabTask = { task: '-', count: 0 };
    // Most IPs
    let maxIPTask = { task: '-', count: 0 };

    for (const [task, logs] of Object.entries(grouped)) {
      const hours = _.sumBy(logs, 'hours');
      if (hours > maxHoursTask.hours) {
        maxHoursTask = { task, hours: Math.round(hours * 100) / 100 };
      }

      const uniqueNames = _.uniq(logs.map((l) => l.name)).length;
      if (uniqueNames > maxCollabTask.count) {
        maxCollabTask = { task, count: uniqueNames };
      }

      const uniqueIPs = _.uniq(
        logs.map((l) => l.ipProject).filter((ip) => ip !== '非授權IP')
      ).length;
      if (uniqueIPs > maxIPTask.count) {
        maxIPTask = { task, count: uniqueIPs };
      }
    }

    return { maxHoursTask, maxCollabTask, maxIPTask };
  }, [filteredLogs]);

  return (
    <div>
      {/* Filter */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontWeight: 'bold' }}>工作項目：</label>
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="all">全部</option>
          {allTasks.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Bar chart: Top 20 tasks by hours */}
      <ChartContainer title="工作項目工時" height={barChartHeight}>
        <BarChart data={top20Data} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="task" width={110} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(val) => [`${val} 小時`, '工時']} />
          <Bar dataKey="hours" fill={CHART_COLORS[0]} />
        </BarChart>
      </ChartContainer>

      {/* Summary table */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>工作項目彙總</div>
        <DataTable
          columns={tableColumns}
          dataSource={tableData}
          rowKey="task"
        />
      </div>

      {/* Selected task detail */}
      {selectedTask !== 'all' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            {selectedTask} - 詳細分析
          </div>

          {/* Employee distribution (horizontal bar) */}
          <ChartContainer title="員工工時分佈" height={employeeChartHeight}>
            <BarChart
              data={employeeDistribution}
              layout="vertical"
              margin={{ left: 80, right: 20, top: 5, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(val) => [`${val} 小時`, '工時']} />
              <Bar dataKey="hours" fill={CHART_COLORS[1]} />
            </BarChart>
          </ChartContainer>

          {/* Monthly trend (vertical bar) */}
          <ChartContainer title="月度工時趨勢" height={300}>
            <BarChart data={monthlyTrend} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip formatter={(val) => [`${val} 小時`, '工時']} />
              <Bar dataKey="hours" fill={CHART_COLORS[3]} />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Advanced analysis */}
      <Collapsible title="進階分析">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>最耗時工作項目</div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>{advancedStats.maxHoursTask.task}</div>
            <div style={{ fontSize: 14, color: '#555' }}>{advancedStats.maxHoursTask.hours} 小時</div>
          </div>
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>最多協作者的工作項目</div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>{advancedStats.maxCollabTask.task}</div>
            <div style={{ fontSize: 14, color: '#555' }}>{advancedStats.maxCollabTask.count} 人</div>
          </div>
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>橫跨最多IP的工作項目</div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>{advancedStats.maxIPTask.task}</div>
            <div style={{ fontSize: 14, color: '#555' }}>{advancedStats.maxIPTask.count} 個IP</div>
          </div>
        </div>
      </Collapsible>
    </div>
  );
}
