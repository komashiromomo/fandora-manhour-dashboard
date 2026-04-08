import { useMemo } from 'react';
import { Row, Col, Spin, Empty } from 'antd';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DataTable from '../components/DataTable';
import ChartCard from '../components/ChartCard';
import FilterToolbar from '../components/FilterToolbar';
import { useData } from '../data/DataContext';
import { roundHours } from '../utils/dates';
import { calcDeptCost } from '../utils/costCalculator';
import { CHART_COLORS } from '../config/constants';
import { groupBy, sumBy, orderBy, uniqBy } from 'lodash-es';

export default function DepartmentPage() {
  const { filteredLogs, salaryData, isLoading } = useData();

  const deptCosts = useMemo(() => calcDeptCost(filteredLogs, salaryData), [filteredLogs, salaryData]);

  // ===== 部門統計 =====
  const deptStats = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'department');
    return orderBy(
      Object.entries(grouped).map(([dept, logs]) => ({
        key: dept,
        dept: dept || '未知部門',
        cost: Math.round(deptCosts[dept] || 0),
        employeeCount: new Set(logs.map(l => l.employee)).size,
        hours: roundHours(sumBy(logs, 'hours')),
        projectCount: new Set(
          logs.filter(l => l.ipProject !== '非授權IP').map(l => l.ipProject)
        ).size,
      })),
      'hours',
      'desc'
    );
  }, [filteredLogs, deptCosts]);

  // ===== 部門工時分佈（圓餅圖） =====
  const deptPieData = useMemo(() => {
    return deptStats.map(d => ({
      name: d.dept,
      value: d.hours,
    }));
  }, [deptStats]);

  // ===== 部門員工明細（橫條圖） =====
  const deptEmployeeData = useMemo(() => {
    return deptStats.slice(0, 10).map(d => ({
      dept: d.dept,
      count: d.employeeCount,
    }));
  }, [deptStats]);

  // ===== 表格列定義 =====
  const columns = [
    {
      title: '部門',
      dataIndex: 'dept',
      key: 'dept',
      width: 140,
    },
    {
      title: '員工數',
      dataIndex: 'employeeCount',
      key: 'employeeCount',
    },
    {
      title: '工時（小時）',
      dataIndex: 'hours',
      key: 'hours',
      render: h => h || 0,
    },
    {
      title: '授權IP數',
      dataIndex: 'projectCount',
      key: 'projectCount',
    },
    {
      title: '估算成本',
      dataIndex: 'cost',
      key: 'cost',
      render: v => v ? `$${v.toLocaleString()}` : '--',
      sorter: (a, b) => a.cost - b.cost,
    },
  ];

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

      {/* 部門統計表 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <ChartCard title="部門統計">
            <DataTable columns={columns} dataSource={deptStats} rowKey="key" />
          </ChartCard>
        </Col>
      </Row>

      {/* 部門工時分佈圓餅圖 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <ChartCard title="部門工時分佈">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deptPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                >
                  {deptPieData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        {/* 部門員工數橫條圖 */}
        <Col xs={24} lg={12}>
          <ChartCard title="各部門員工人數">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={deptEmployeeData}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="dept" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
}
