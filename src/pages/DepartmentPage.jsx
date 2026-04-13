import React, { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import KPIGrid from '../components/KPIGrid';
import ChartContainer from '../components/ChartContainer';
import Collapsible from '../components/Collapsible';
import DataTable from '../components/DataTable';
import { CHART_COLORS } from '../shared/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import _ from 'lodash-es';

export default function DepartmentPage() {
  const { filteredLogs, deptCosts } = useData();
  const [selectedDept, setSelectedDept] = useState('all');

  const largestDept = useMemo(() => _.maxBy(deptCosts, 'memberCount'), [deptCosts]);
  const busiestDept = useMemo(() => _.maxBy(deptCosts, 'hours'), [deptCosts]);

  const kpiItems = [
    { label: '部門總數', value: deptCosts.length, unit: '個' },
    { label: '最大部門', value: largestDept?.name || '-', unit: largestDept ? `${largestDept.memberCount} 人` : '' },
    { label: '最忙部門', value: busiestDept?.name || '-', unit: busiestDept ? `${busiestDept.hours.toFixed(0)} 小時` : '' },
  ];

  const deptList = useMemo(() => deptCosts.map(d => d.name), [deptCosts]);
  const chartData = useMemo(() => deptCosts.map(d => ({ name: d.name, hours: d.hours })), [deptCosts]);

  const selectedLogs = useMemo(() => {
    if (selectedDept === 'all') return [];
    return filteredLogs.filter(l => l.dept === selectedDept);
  }, [filteredLogs, selectedDept]);

  const memberData = useMemo(() => {
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

  const mostEfficient = useMemo(() => {
    let max = { name: '', ratio: 0 };
    for (const d of deptCosts) {
      if (d.memberCount > 0) {
        const ratio = d.hours / d.memberCount;
        if (ratio > max.ratio) max = { name: d.name, ratio };
      }
    }
    return max;
  }, [deptCosts]);

  const allDeptTrend = useMemo(() => {
    const deptNames = deptCosts.map(d => d.name);
    const months = _.uniq(filteredLogs.map(l => l.month)).sort();
    return months.map(m => {
      const row = { month: m };
      deptNames.forEach(dept => { row[dept] = _.sumBy(filteredLogs.filter(l => l.month === m && l.dept === dept), 'hours'); });
      return row;
    });
  }, [filteredLogs, deptCosts]);
  const deptNames = deptCosts.map(d => d.name);

  const columns = [
    { title: '部門', dataIndex: 'name', key: 'name' },
    { title: '總工時', dataIndex: 'hours', key: 'hours', sorter: (a, b) => a.hours - b.hours, render: v => v.toFixed(1) },
    { title: '分攤費用', dataIndex: 'cost', key: 'cost', sorter: (a, b) => a.cost - b.cost, render: v => `NTD ${Math.round(v).toLocaleString()}` },
    { title: '人均費用', key: 'perCapita', render: (_, r) => r.memberCount > 0 ? `NTD ${Math.round(r.cost / r.memberCount).toLocaleString()}` : '-' },
    { title: '成員數', dataIndex: 'memberCount', key: 'memberCount', sorter: (a, b) => a.memberCount - b.memberCount },
    { title: '平均工時', key: 'avgHours', render: (_, r) => r.memberCount > 0 ? (r.hours / r.memberCount).toFixed(1) : '-' },
  ];

  return (
    <div>
      <KPIGrid items={kpiItems} />

      <div style={{ marginBottom: 24 }}>
        <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}>
          <option value="all">全部部門</option>
          {deptList.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <ChartContainer title="部門工時" height={Math.max(300, chartData.length * 50)}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" fontSize={12} />
          <YAxis dataKey="name" type="category" width={100} fontSize={12} />
          <Tooltip formatter={v => v.toLocaleString()} />
          <Bar dataKey="hours" fill={CHART_COLORS[0]} name="工時" />
        </BarChart>
      </ChartContainer>

      <DataTable columns={columns} dataSource={deptCosts} rowKey="name" />

      {selectedDept !== 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          <ChartContainer title={`${selectedDept} - 成員工時分佈`} height={Math.max(300, memberData.length * 35)}>
            <BarChart data={memberData} layout="vertical">
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="name" type="category" width={80} fontSize={12} />
              <Tooltip formatter={v => v.toLocaleString()} />
              <Bar dataKey="hours" fill={CHART_COLORS[2]} name="工時" />
            </BarChart>
          </ChartContainer>
          <ChartContainer title={`${selectedDept} - 月度趨勢`} height={300}>
            <BarChart data={monthlyTrend}>
              <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
              <Tooltip formatter={v => v.toLocaleString()} />
              <Bar dataKey="hours" fill={CHART_COLORS[3]} name="工時" />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      <Collapsible title="進階分析" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={cardStyle}><div style={cardLabel}>最大部門</div><div style={cardValue}>{largestDept?.name || '-'}</div><div style={cardSub}>{largestDept ? `${largestDept.memberCount} 人` : ''}</div></div>
          <div style={cardStyle}><div style={cardLabel}>最忙碌部門</div><div style={cardValue}>{busiestDept?.name || '-'}</div><div style={cardSub}>{busiestDept ? `${busiestDept.hours.toFixed(0)} 小時` : ''}</div></div>
          <div style={cardStyle}><div style={cardLabel}>最高效部門</div><div style={cardValue}>{mostEfficient.name || '-'}</div><div style={cardSub}>{mostEfficient.ratio ? `人均 ${mostEfficient.ratio.toFixed(1)} 小時` : ''}</div></div>
        </div>
        {deptNames.length > 0 && (
          <ChartContainer title="所有部門月度趨勢" height={300}>
            <LineChart data={allDeptTrend}>
              <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
              {deptNames.map((name, i) => <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />)}
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
