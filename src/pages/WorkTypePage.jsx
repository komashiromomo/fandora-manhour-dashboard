import React, { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import ChartContainer from '../components/ChartContainer';
import Collapsible from '../components/Collapsible';
import DataTable from '../components/DataTable';
import { CHART_COLORS } from '../shared/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import _ from 'lodash-es';

export default function WorkTypePage() {
  const { filteredLogs, workTypeCosts } = useData();
  const [selectedTask, setSelectedTask] = useState('all');

  const tableData = useMemo(() => {
    return Object.entries(workTypeCosts).map(([name, { cost, hours }]) => {
      const logs = filteredLogs.filter(l => l.task === name);
      return {
        name, hours, cost,
        hourlyCost: hours > 0 ? cost / hours : 0,
        members: _.uniqBy(logs, 'name').length,
        depts: _.uniq(logs.map(l => l.dept)).filter(Boolean).join(', '),
        ips: _.uniq(logs.map(l => l.ipProject)).filter(l => l !== '非授權IP').join(', '),
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [workTypeCosts, filteredLogs]);

  const taskList = useMemo(() => tableData.map(t => t.name), [tableData]);
  const top20 = useMemo(() => tableData.slice(0, 20), [tableData]);

  const selectedLogs = useMemo(() => {
    if (selectedTask === 'all') return [];
    return filteredLogs.filter(l => l.task === selectedTask);
  }, [filteredLogs, selectedTask]);

  const employeeData = useMemo(() => {
    const grouped = _.groupBy(selectedLogs, 'name');
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

  const mostHours = tableData[0];
  const mostCollaborators = useMemo(() => {
    let max = { name: '', count: 0 };
    for (const t of tableData) { if (t.members > max.count) max = { name: t.name, count: t.members }; }
    return max;
  }, [tableData]);
  const mostIPs = useMemo(() => {
    let max = { name: '', count: 0 };
    for (const [name] of Object.entries(workTypeCosts)) {
      const logs = filteredLogs.filter(l => l.task === name);
      const count = _.uniq(logs.map(l => l.ipProject)).filter(l => l !== '非授權IP').length;
      if (count > max.count) max = { name, count };
    }
    return max;
  }, [workTypeCosts, filteredLogs]);

  const columns = [
    { title: '工作項目', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: '工時', dataIndex: 'hours', key: 'hours', sorter: (a, b) => a.hours - b.hours, render: v => v.toFixed(1) },
    { title: '分攤費用', dataIndex: 'cost', key: 'cost', sorter: (a, b) => a.cost - b.cost, render: v => `NTD ${Math.round(v).toLocaleString()}` },
    { title: '時薪成本', dataIndex: 'hourlyCost', key: 'hourlyCost', render: v => `NTD ${v.toFixed(0)}` },
    { title: '參與人數', dataIndex: 'members', key: 'members', sorter: (a, b) => a.members - b.members },
    { title: '涉及部門', dataIndex: 'depts', key: 'depts' },
    { title: '相關授權IP', dataIndex: 'ips', key: 'ips' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <select value={selectedTask} onChange={e => setSelectedTask(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}>
          <option value="all">全部工作項目</option>
          {taskList.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <ChartContainer title="工作項目工時 Top 20" height={Math.max(300, top20.length * 35)}>
        <BarChart data={top20} layout="vertical">
          <XAxis type="number" fontSize={12} />
          <YAxis dataKey="name" type="category" width={150} fontSize={12} />
          <Tooltip formatter={v => v.toLocaleString()} />
          <Bar dataKey="hours" fill={CHART_COLORS[0]} name="工時" />
        </BarChart>
      </ChartContainer>

      <DataTable columns={columns} dataSource={tableData} rowKey="name" />

      {selectedTask !== 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          <ChartContainer title={`${selectedTask} - 員工工時分佈`} height={Math.max(300, employeeData.length * 35)}>
            <BarChart data={employeeData} layout="vertical">
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="name" type="category" width={80} fontSize={12} />
              <Tooltip formatter={v => v.toLocaleString()} />
              <Bar dataKey="hours" fill={CHART_COLORS[2]} name="工時" />
            </BarChart>
          </ChartContainer>
          <ChartContainer title={`${selectedTask} - 月度工時趨勢`} height={300}>
            <BarChart data={monthlyTrend}>
              <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
              <Tooltip formatter={v => v.toLocaleString()} />
              <Bar dataKey="hours" fill={CHART_COLORS[3]} name="工時" />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      <Collapsible title="進階分析" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={cardStyle}><div style={cardLabel}>最耗時工作項目</div><div style={cardValue}>{mostHours?.name || '-'}</div><div style={cardSub}>{mostHours ? `${mostHours.hours.toFixed(1)} 小時` : ''}</div></div>
          <div style={cardStyle}><div style={cardLabel}>最多協作者</div><div style={cardValue}>{mostCollaborators.name || '-'}</div><div style={cardSub}>{mostCollaborators.count ? `${mostCollaborators.count} 人` : ''}</div></div>
          <div style={cardStyle}><div style={cardLabel}>橫跨最多IP</div><div style={cardValue}>{mostIPs.name || '-'}</div><div style={cardSub}>{mostIPs.count ? `${mostIPs.count} 個授權IP` : ''}</div></div>
        </div>
      </Collapsible>
    </div>
  );
}

const cardStyle = { background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' };
const cardLabel = { fontSize: 12, color: '#999', marginBottom: 4 };
const cardValue = { fontSize: 18, fontWeight: 600, color: '#333' };
const cardSub = { fontSize: 12, color: '#666', marginTop: 4 };
