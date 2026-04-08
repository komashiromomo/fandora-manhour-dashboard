import { useMemo } from 'react';
import { Row, Col, Spin, Empty } from 'antd';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import FilterToolbar from '../components/FilterToolbar';
import { useData } from '../data/DataContext';
import { roundHours, formatMonthDisplay } from '../utils/dates';
import { calcProjectCost } from '../utils/costCalculator';
import { CHART_COLORS } from '../config/constants';
import { groupBy, sumBy, orderBy } from 'lodash-es';

export default function OverviewPage() {
  const { filteredLogs, salaryData, isLoading } = useData();

  // ===== KPI 計算 =====
  const kpis = useMemo(() => {
    const totalHours = roundHours(sumBy(filteredLogs, 'hours'));
    const employees = new Set(filteredLogs.map(l => l.employee));
    const projects = new Set(
      filteredLogs
        .filter(l => l.ipProject !== '非授權IP')
        .map(l => l.ipProject)
    );
    const employeeCount = employees.size;
    const projectCount = projects.size;
    const avgHours = employeeCount > 0 ? roundHours(totalHours / employeeCount) : 0;

    // 薪資數據
    const totalSalary = sumBy(salaryData, 'salary');
    const avgCostPerHour = totalHours > 0 ? roundHours(totalSalary / totalHours) : 0;

    return {
      totalHours,
      employeeCount,
      projectCount,
      avgHours,
      totalSalary: totalSalary === 0 ? '--' : totalSalary.toLocaleString(),
      avgCostPerHour: totalHours === 0 ? '--' : avgCostPerHour,
    };
  }, [filteredLogs, salaryData]);

  // ===== 月度工時數據 =====
  const monthlyData = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'month');
    return orderBy(
      Object.entries(grouped).map(([month, logs]) => ({
        month: formatMonthDisplay(month),
        hours: roundHours(sumBy(logs, 'hours')),
      })),
      'month'
    );
  }, [filteredLogs]);

  // ===== Top 10 工作分類 =====
  const topTasks = useMemo(() => {
    const taskMap = {};
    filteredLogs.forEach(log => {
      const task = log.task || '未分類';
      taskMap[task] = (taskMap[task] || 0) + log.hours;
    });
    return orderBy(
      Object.entries(taskMap).map(([name, value]) => ({
        name,
        value: roundHours(value),
      })),
      'value',
      'desc'
    ).slice(0, 10);
  }, [filteredLogs]);

  // ===== 部門工時分佈 =====
  const deptData = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'department');
    return orderBy(
      Object.entries(grouped).map(([name, logs]) => ({
        name: name || '未知部門',
        hours: roundHours(sumBy(logs, 'hours')),
      })),
      'hours',
      'desc'
    );
  }, [filteredLogs]);

  // ===== 專案成本排行（Phase 3） =====
  const projectCostData = useMemo(() => {
    const costs = calcProjectCost(filteredLogs, salaryData);
    return orderBy(
      Object.entries(costs).map(([name, cost]) => ({
        name, cost: Math.round(cost),
      })),
      'cost', 'desc'
    ).slice(0, 10);
  }, [filteredLogs, salaryData]);

  if (isLoading) {
    return <Spin style={{ margin: '50px auto', display: 'block' }} />;
  }

  if (filteredLogs.length === 0) {
    return <Empty description="暫無數據，請先載入工時資料" />;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Filter Toolbar */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <FilterToolbar />
        </Col>
      </Row>

      {/* KPI 卡片行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={8} lg={4}>
          <KPICard title="總工時" value={kpis.totalHours} suffix="小時" />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KPICard title="員工人數" value={kpis.employeeCount} suffix="人" />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KPICard title="專案數量" value={kpis.projectCount} suffix="個" />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KPICard title="平均每人工時" value={kpis.avgHours} suffix="小時" />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KPICard title="總管理費用" value={kpis.totalSalary} suffix="元" />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KPICard title="平均時薪成本" value={kpis.avgCostPerHour} suffix="元" />
        </Col>
      </Row>

      {/* 圖表網格 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ChartCard title="各月工時對比">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard title="Top 10 工作分類">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topTasks}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                >
                  {topTasks.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        {projectCostData.length > 0 && (
          <Col xs={24} lg={12}>
            <ChartCard title="專案成本排行 Top 10">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectCostData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `$${v.toLocaleString()}`} />
                  <YAxis dataKey="name" type="category" width={90} />
                  <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                  <Bar dataKey="cost" fill={CHART_COLORS[4]} name="成本" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>
        )}

        <Col xs={24}>
          <ChartCard title="部門工時分佈">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={deptData}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="hours" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
}
