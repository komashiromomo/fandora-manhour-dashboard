import { useMemo } from 'react';
import { Row, Col, Spin, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DataTable from '../components/DataTable';
import ChartCard from '../components/ChartCard';
import FilterToolbar from '../components/FilterToolbar';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { roundHours } from '../utils/dates';
import { CHART_COLORS } from '../config/constants';
import { groupBy, sumBy, orderBy } from 'lodash-es';

export default function EmployeePage() {
  const { filteredLogs, salaryData, isLoading } = useData();
  const { role } = useAuth();

  // ===== 員工統計表 =====
  const employeeStats = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'employee');
    return orderBy(
      Object.entries(grouped).map(([employee, logs]) => ({
        key: employee,
        employee,
        department: logs[0]?.department || '未知',
        hours: roundHours(sumBy(logs, 'hours')),
        taskCount: new Set(logs.map(l => l.task)).size,
        days: new Set(logs.map(l => l.date)).size,
      })),
      'hours',
      'desc'
    );
  }, [filteredLogs]);

  // ===== 薪資 map（Phase 3） =====
  const salaryMap = useMemo(() => {
    const map = {};
    salaryData.forEach(r => { map[r.employee] = (map[r.employee] || 0) + r.salary; });
    return map;
  }, [salaryData]);

  // ===== 表格列定義 =====
  const columns = [
    {
      title: '姓名',
      dataIndex: 'employee',
      key: 'employee',
      width: 120,
    },
    {
      title: '部門',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: '工時（小時）',
      dataIndex: 'hours',
      key: 'hours',
      render: h => h || 0,
    },
    {
      title: '任務數',
      dataIndex: 'taskCount',
      key: 'taskCount',
    },
    {
      title: '平均每日工時',
      dataIndex: 'avgDailyHours',
      key: 'avgDailyHours',
      render: (_, record) => {
        const avg = record.days > 0 ? roundHours(record.hours / record.days) : 0;
        return avg;
      },
    },
    // Phase 3: 時薪成本（僅 admin 可見）
    ...(role === 'admin' ? [{
      title: '時薪成本',
      key: 'costPerHour',
      render: (_, record) => {
        const salary = salaryMap[record.employee] || 0;
        if (!salary || record.hours <= 0) return '--';
        return `$${Math.round(salary / record.hours).toLocaleString()}`;
      },
      sorter: (a, b) => {
        const costA = (salaryMap[a.employee] || 0) / (a.hours || 1);
        const costB = (salaryMap[b.employee] || 0) / (b.hours || 1);
        return costA - costB;
      },
    }] : []),
  ];

  // ===== 員工工時橫條圖數據（Top 10） =====
  const chartData = useMemo(() => {
    return employeeStats.slice(0, 10).map(e => ({
      employee: e.employee,
      hours: e.hours,
    }));
  }, [employeeStats]);

  if (isLoading) {
    return <Spin style={{ margin: '50px auto', display: 'block' }} />;
  }

  if (filteredLogs.length === 0) {
    return <Empty description="暫無數據" />;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Filter Toolbar */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <FilterToolbar />
        </Col>
      </Row>

      {/* 員工統計表 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <ChartCard title="員工統計">
            <DataTable columns={columns} dataSource={employeeStats} rowKey="key" />
          </ChartCard>
        </Col>
      </Row>

      {/* 員工工時橫條圖 */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <ChartCard title="員工工時排行 Top 10">
            <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 40)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="employee" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="hours" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
}
