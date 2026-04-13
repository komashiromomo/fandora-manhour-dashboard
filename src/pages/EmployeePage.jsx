import React, { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import ChartContainer from '../components/ChartContainer';
import Collapsible from '../components/Collapsible';
import DataTable from '../components/DataTable';
import { CHART_COLORS } from '../shared/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import _ from 'lodash-es';

export default function EmployeePage() {
  const { filteredLogs } = useData();
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const employeeList = useMemo(() => _.uniq(filteredLogs.map(l => l.name)).sort(), [filteredLogs]);

  const tableData = useMemo(() => {
    const grouped = _.groupBy(filteredLogs, 'name');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, dept: logs[0]?.dept || '',
      hours: _.sumBy(logs, 'hours'),
      taskCount: _.uniqBy(logs, 'task').length,
    })).sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  const selectedLogs = useMemo(() => {
    if (selectedEmployee === 'all') return [];
    return filteredLogs.filter(l => l.name === selectedEmployee);
  }, [filteredLogs, selectedEmployee]);

  const selectedInfo = useMemo(() => {
    if (!selectedLogs.length) return null;
    return {
      name: selectedEmployee, dept: selectedLogs[0]?.dept || '',
      hours: _.sumBy(selectedLogs, 'hours'),
      taskCount: _.uniqBy(selectedLogs, 'task').length,
    };
  }, [selectedLogs, selectedEmployee]);

  const taskDistribution = useMemo(() => {
    const grouped = _.groupBy(selectedLogs, 'task');
    return Object.entries(grouped).map(([name, logs]) => ({
      name, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => b.hours - a.hours);
  }, [selectedLogs]);

  const monthlyTrend = useMemo(() => {
    const grouped = _.groupBy(selectedLogs, 'month');
    return Object.entries(grouped).map(([month, logs]) => ({
      month, hours: _.sumBy(logs, 'hours'),
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [selectedLogs]);

  const mostDiverse = useMemo(() => {
    let max = { name: '', count: 0 };
    const grouped = _.groupBy(filteredLogs, 'name');
    for (const [name, logs] of Object.entries(grouped)) {
      const count = _.uniqBy(logs, 'task').length;
      if (count > max.count) max = { name, count };
    }
    return max;
  }, [filteredLogs]);
  const topHours = tableData[0];

  const top5Trend = useMemo(() => {
    const top5 = tableData.slice(0, 5).map(t => t.name);
    const logs = filteredLogs.filter(l => top5.includes(l.name));
    const months = _.uniq(logs.map(l => l.month)).sort();
    return months.map(m => {
      const row = { month: m };
      top5.forEach(name => { row[name] = _.sumBy(logs.filter(l => l.month === m && l.name === name), 'hours'); });
      return row;
    });
  }, [filteredLogs, tableData]);
  const top5Names = tableData.slice(0, 5).map(t => t.name);

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: '部門', dataIndex: 'dept', key: 'dept' },
    { title: '工時', dataIndex: 'hours', key: 'hours', sorter: (a, b) => a.hours - b.hours, render: v => v.toFixed(1) },
    { title: '工作類型數', dataIndex: 'taskCount', key: 'taskCount', sorter: (a, b) => a.taskCount - b.taskCount },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}>
          <option value="all">全部員工</option>
          {employeeList.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {selectedEmployee === 'all' ? (
        <DataTable columns={columns} dataSource={tableData} rowKey="name" />
      ) : (
        <>
          {selectedInfo && (
            <div style={infoCardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div><div style={infoLabel}>姓名</div><div style={infoValue}>{selectedInfo.name}</div></div>
                <div><div style={infoLabel}>部門</div><div style={infoValue}>{selectedInfo.dept}</div></div>
                <div><div style={infoLabel}>總工時</div><div style={infoValue}>{selectedInfo.hours.toFixed(1)} 小時</div></div>
                <div><div style={infoLabel}>工作分類數</div><div style={infoValue}>{selectedInfo.taskCount} 種</div></div>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            <ChartContainer title="工作項目工時分佈" height={Math.max(300, taskDistribution.length * 35)}>
              <BarChart data={taskDistribution} layout="vertical">
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                <Tooltip formatter={v => v.toLocaleString()} />
                <Bar dataKey="hours" fill={CHART_COLORS[0]} name="工時" />
              </BarChart>
            </ChartContainer>
            <ChartContainer title="月度工時趨勢" height={300}>
              <BarChart data={monthlyTrend}>
                <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
                <Tooltip formatter={v => v.toLocaleString()} />
                <Bar dataKey="hours" fill={CHART_COLORS[2]} name="工時" />
              </BarChart>
            </ChartContainer>
          </div>
        </>
      )}

      <Collapsible title="進階分析" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={cardStyle}><div style={cardLabel}>最多元員工</div><div style={cardValue}>{mostDiverse.name || '-'}</div><div style={cardSub}>{mostDiverse.count ? `${mostDiverse.count} 種工作項目` : ''}</div></div>
          <div style={cardStyle}><div style={cardLabel}>最高工時員工</div><div style={cardValue}>{topHours?.name || '-'}</div><div style={cardSub}>{topHours ? `${topHours.hours.toFixed(1)} 小時` : ''}</div></div>
        </div>
        {top5Names.length > 0 && (
          <ChartContainer title="Top 5 員工月度趨勢" height={300}>
            <LineChart data={top5Trend}>
              <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
              {top5Names.map((name, i) => <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ChartContainer>
        )}
      </Collapsible>
    </div>
  );
}

const infoCardStyle = { background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const infoLabel = { fontSize: 12, color: '#999', marginBottom: 4 };
const infoValue = { fontSize: 18, fontWeight: 600, color: '#333' };
const cardStyle = { background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' };
const cardLabel = { fontSize: 12, color: '#999', marginBottom: 4 };
const cardValue = { fontSize: 18, fontWeight: 600, color: '#333' };
const cardSub = { fontSize: 12, color: '#666', marginTop: 4 };
