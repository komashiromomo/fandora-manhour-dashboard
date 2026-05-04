/**
 * 員工把 IP 名稱記入工作項目欄的警示
 * 自包含元件：所有 page 都可放入。內部用 useData() 計算，不需要 prop。
 *
 * Banner（橘色卡片）→ 點擊「誰寫錯」開 Drawer 顯示 culprit 表
 */
import React, { useMemo, useState } from 'react';
import { Drawer } from 'antd';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { useData } from '../data/DataContext';
import { isKnownIP } from '../utils/names';
import { roundHours } from '../utils/dates';
import { Card } from './v2';
import { useTheme } from './ThemeProvider';

export default function IpMisrecordWarning() {
  const { workLogs } = useData(); // 用全量 workLogs 看整體記錄狀況（不被 filter 限縮）
  const { customIPs } = useTheme();
  const [open, setOpen] = useState(false);

  const ipLikeLogs = useMemo(
    () => workLogs.filter((l) => isKnownIP(l.workType, customIPs)),
    [workLogs, customIPs]
  );

  const ipLikeWorkTypes = useMemo(() => {
    const grouped = groupBy(ipLikeLogs, 'workType');
    return orderBy(
      Object.entries(grouped).map(([wt, items]) => ({
        workType: wt,
        hours: roundHours(sumBy(items, 'hours')),
        employees: new Set(items.map((l) => l.employee)).size,
      })),
      'hours',
      'desc'
    );
  }, [ipLikeLogs]);

  const totalHours = sumBy(ipLikeWorkTypes, 'hours');

  // 員工 × workType 明細
  const culprits = useMemo(() => {
    const byKey = groupBy(ipLikeLogs, (l) => `${l.employee}__${l.workType}`);
    return orderBy(
      Object.entries(byKey).map(([key, logs]) => {
        const [employee, workType] = key.split('__');
        const months = [...new Set(logs.map((l) => l.month))].sort();
        return {
          employee,
          workType,
          department: logs[0]?.department || '—',
          hours: roundHours(sumBy(logs, 'hours')),
          monthCount: months.length,
          monthRange:
            months.length === 0
              ? '—'
              : months.length === 1
                ? months[0]
                : `${months[0]} ~ ${months[months.length - 1]}`,
        };
      }),
      ['hours'],
      ['desc']
    );
  }, [ipLikeLogs]);

  // 兇手榜（依員工加總）
  const culpritsByEmployee = useMemo(() => {
    const grouped = groupBy(culprits, 'employee');
    return orderBy(
      Object.entries(grouped).map(([employee, items]) => ({
        employee,
        department: items[0].department,
        totalHours: roundHours(sumBy(items, 'hours')),
        ipCount: items.length,
      })),
      'totalHours',
      'desc'
    );
  }, [culprits]);

  if (ipLikeWorkTypes.length === 0) return null;

  return (
    <>
      <div
        className="card"
        style={{
          marginBottom: 'var(--gap)',
          background: 'rgba(242,153,74,0.08)',
          borderColor: 'rgba(242,153,74,0.4)',
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            ⚠ {ipLikeWorkTypes.length} 個工作項目其實是 IP 名稱
            <span style={{ fontWeight: 400, color: 'var(--fg-3)', marginLeft: 8 }}>
              （共 {Math.round(totalHours).toLocaleString()} 小時，{culpritsByEmployee.length} 位員工）
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            員工把 IP 名稱（{ipLikeWorkTypes.slice(0, 3).map((s) => s.workType).join('、')}
            {ipLikeWorkTypes.length > 3 && '…'}）填到「工作項目」欄。
            「工作項目」應該填動作（設計、出貨、商開、開會等）。
          </div>
        </div>
        <button className="btn" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
          查看是誰寫錯 →
        </button>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="right"
        width="min(880px, 92vw)"
        title={
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--state-warn, #F2994A)',
                fontFamily: 'var(--font-latin)',
                fontWeight: 700,
              }}
            >
              ⚠ MISRECORDED ENTRIES
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
              工作項目欄誤填 IP 名稱
            </div>
          </div>
        }
        styles={{ body: { padding: 24, background: 'var(--bg-page-alt)' } }}
      >
        <div className="grid grid-12">
          <Card
            col={5}
            title="員工誤記排行"
            sub={`${culpritsByEmployee.length} 位 · ${Math.round(totalHours).toLocaleString()} 小時`}
          >
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>員工</th>
                    <th>部門</th>
                    <th className="num">總時數</th>
                    <th className="num">項目</th>
                  </tr>
                </thead>
                <tbody>
                  {culpritsByEmployee.map((c) => (
                    <tr key={c.employee}>
                      <td style={{ fontWeight: 600 }}>{c.employee}</td>
                      <td>
                        <span className="tag">{c.department}</span>
                      </td>
                      <td className="num">{c.totalHours.toLocaleString()}</td>
                      <td className="num">{c.ipCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card col={7} title="誤記明細" sub="員工 × 誤記為">
            <div className="tbl-wrap" style={{ maxHeight: 600, overflowY: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>員工</th>
                    <th>誤記為</th>
                    <th className="num">時數</th>
                    <th>月份範圍</th>
                  </tr>
                </thead>
                <tbody>
                  {culprits.map((c, i) => (
                    <tr key={`${c.employee}-${c.workType}-${i}`}>
                      <td style={{ fontWeight: 600 }}>{c.employee}</td>
                      <td>
                        <span
                          className="tag"
                          style={{
                            background: 'rgba(242,153,74,0.16)',
                            color: 'var(--state-warn, #F2994A)',
                          }}
                        >
                          {c.workType}
                        </span>
                      </td>
                      <td className="num">{c.hours.toLocaleString()}</td>
                      <td style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                        {c.monthRange}
                        {c.monthCount > 1 && ` · ${c.monthCount} 個月`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card col={12} title="誤記項目分布" sub={`${ipLikeWorkTypes.length} 個 IP 名稱`}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>工作項目（其實是 IP）</th>
                    <th className="num">時數</th>
                    <th className="num">員工數</th>
                  </tr>
                </thead>
                <tbody>
                  {ipLikeWorkTypes.map((s) => (
                    <tr key={s.workType}>
                      <td>
                        <span
                          className="tag"
                          style={{
                            background: 'rgba(242,153,74,0.16)',
                            color: 'var(--state-warn, #F2994A)',
                          }}
                        >
                          {s.workType}
                        </span>
                      </td>
                      <td className="num">{s.hours.toLocaleString()}</td>
                      <td className="num">{s.employees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </Drawer>
    </>
  );
}
