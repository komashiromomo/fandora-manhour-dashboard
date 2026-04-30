/**
 * 專案分析頁 — Fandora V2 設計風格
 */
import { useMemo, useState } from 'react';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import {
  KPICard,
  Card,
  Donut,
  Treemap,
  TopList,
  Empty,
} from '../components/v2';
import FilterToolbar from '../components/FilterToolbar';
import ProjectDetail from '../components/ProjectDetail';
import IpMisrecordWarning from '../components/IpMisrecordWarning';
import { useData } from '../data/DataContext';
import { roundHours } from '../utils/dates';
import { calcProjectCost } from '../utils/costCalculator';
import { useTheme } from '../components/ThemeProvider';

const IP_PALETTE = [
  '#00A4C6', '#FF9900', '#9B59B6', '#2BB673', '#E14D4D',
  '#3498DB', '#F1C40F', '#1ABC9C', '#E67E22', '#34495E',
];

export default function ProjectPage() {
  const { filteredLogs, salaryData } = useData();
  const { showCost } = useTheme();
  const [selectedProject, setSelectedProject] = useState(null);

  const projectStats = useMemo(() => {
    const grouped = groupBy(filteredLogs, 'ipProject');
    return orderBy(
      Object.entries(grouped).map(([project, logs]) => ({
        project,
        hours: roundHours(sumBy(logs, 'hours')),
        employeeCount: new Set(logs.map((l) => l.employee)).size,
        departments: [...new Set(logs.map((l) => l.department))],
        taskCount: new Set(logs.map((l) => l.task)).size,
      })),
      'hours',
      'desc'
    );
  }, [filteredLogs]);

  const projectCosts = useMemo(
    () => calcProjectCost(filteredLogs, salaryData),
    [filteredLogs, salaryData]
  );

  const statsWithCost = useMemo(
    () =>
      projectStats.map((p) => ({
        ...p,
        cost: Math.round(projectCosts[p.project] || 0),
      })),
    [projectStats, projectCosts]
  );

  const ipProjects = statsWithCost.filter((p) => p.project !== '非授權IP');
  const nonIpProject = statsWithCost.find((p) => p.project === '非授權IP');

  const totalHours = sumBy(statsWithCost, 'hours');
  const ipHours = sumBy(ipProjects, 'hours');
  const nonIpHours = nonIpProject?.hours || 0;
  const ipPct = totalHours > 0 ? Math.round((ipHours * 100) / totalHours) : 0;

  const treemapData = useMemo(
    () =>
      ipProjects.slice(0, 12).map((p, i) => ({
        name: p.project,
        value: p.hours,
        color: IP_PALETTE[i % IP_PALETTE.length],
        onClick: () => setSelectedProject(p.project),
      })),
    [ipProjects]
  );

  const topList = useMemo(
    () =>
      ipProjects.map((p, i) => ({
        label: p.project,
        value: p.hours,
        color: IP_PALETTE[i % IP_PALETTE.length],
        onClick: () => setSelectedProject(p.project),
      })),
    [ipProjects]
  );

  if (filteredLogs.length === 0) {
    return (
      <>
        <div className="hero-decor" />
        <div className="page-hero">
          <div>
            <div className="eyebrow">PROJECTS</div>
            <h1>專案分析</h1>
            <p className="sub">逐一檢視每個授權 IP 的工時投入與成本配置。</p>
          </div>
        </div>
        <Empty title="暫無數據" desc="請先到「設定」頁從 Drive 載入工時資料。" />
      </>
    );
  }

  return (
    <>
      <div className="hero-decor" />
      <div className="page-hero">
        <div>
          <div className="eyebrow">PROJECTS</div>
          <h1>專案分析</h1>
          <p className="sub">
            目前追蹤 {ipProjects.length} 個授權 IP，總工時 {Math.round(ipHours).toLocaleString()} 小時，
            佔總工時 {ipPct}%。
          </p>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 'var(--gap)' }}>
        <FilterToolbar />
      </div>

      <IpMisrecordWarning />

      <div className="grid grid-4" style={{ marginBottom: 'var(--gap)' }}>
        <KPICard label="授權 IP 數" value={ipProjects.length} unit="個" />
        <KPICard label="授權 IP 工時" value={Math.round(ipHours).toLocaleString()} unit="小時" />
        <KPICard label="非授權工時" value={Math.round(nonIpHours).toLocaleString()} unit="小時" sparkColor="#E14D4D" />
        <KPICard label="授權佔比" value={`${ipPct}%`} sparkColor="#2BB673" />
      </div>

      <div className="grid grid-12">
        <Card col={4} title="授權 vs 非授權" sub="工時佔比">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '8px 0' }}>
            <Donut
              data={[
                { value: ipHours, color: 'var(--accent)' },
                { value: nonIpHours, color: 'var(--fg-muted)' },
              ]}
              size={140}
            />
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 14 }}>
                <div className="eyebrow" style={{ fontSize: 11, color: 'var(--fg-3)' }}>授權 IP</div>
                <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                  {ipPct}%
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ fontSize: 11, color: 'var(--fg-3)' }}>非授權</div>
                <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 700, color: 'var(--fg-2)' }}>
                  {100 - ipPct}%
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card col={8} title="授權 IP 工時排行" sub={`${ipProjects.length} 個 IP · 點擊查看詳細`}>
          <TopList items={topList} maxHeight={520} />
        </Card>

        <Card col={12} title="IP 工時 Treemap" sub="區塊面積 = 工時佔比">
          <Treemap data={treemapData} />
        </Card>

        <Card col={12} title="全部專案統計" sub={`${statsWithCost.length} 項`}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>專案 / 授權 IP</th>
                  <th className="num">工時</th>
                  <th className="num">參與人數</th>
                  <th>參與部門</th>
                  <th className="num">工作項目數</th>
                  {showCost && <th className="num">估算成本</th>}
                </tr>
              </thead>
              <tbody>
                {statsWithCost.map((p) => (
                  <tr
                    key={p.project}
                    onClick={() => setSelectedProject(p.project)}
                    style={{ cursor: 'pointer' }}
                    title="點擊查看進階分析"
                  >
                    <td>
                      <span
                        className="ip-swatch"
                        style={{
                          background:
                            p.project === '非授權IP'
                              ? 'var(--fg-muted)'
                              : IP_PALETTE[
                                  ipProjects.findIndex((x) => x.project === p.project) %
                                    IP_PALETTE.length
                                ],
                          marginRight: 8,
                        }}
                      />
                      <span
                        style={{
                          textDecoration: 'underline',
                          textDecorationColor: 'transparent',
                          transition: 'text-decoration-color .15s',
                        }}
                      >
                        {p.project}
                      </span>
                    </td>
                    <td className="num">{p.hours.toLocaleString()}</td>
                    <td className="num">{p.employeeCount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.departments.slice(0, 3).map((d) => (
                          <span key={d} className="tag">
                            {d}
                          </span>
                        ))}
                        {p.departments.length > 3 && (
                          <span className="tag">+{p.departments.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="num">{p.taskCount}</td>
                    {showCost && <td className="num">{p.cost ? `$${p.cost.toLocaleString()}` : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ProjectDetail project={selectedProject} onClose={() => setSelectedProject(null)} />
    </>
  );
}
