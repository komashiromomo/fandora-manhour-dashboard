/**
 * 每週工時記錄健檢提醒
 *
 * 邏輯：
 * - 每週第一次打開 dashboard（自上次顯示已過 7 天）時，若偵測到 IP 名稱被誤填到工作項目欄
 *   就自動彈 Modal 列出誤填明細
 * - localStorage 記錄上次顯示時間
 * - 使用者可在 Tweaks panel 關閉這項提醒
 *
 * 沒有 IP 誤填或還沒到一週週期就完全靜默。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from 'antd';
import { groupBy, sumBy, orderBy } from 'lodash-es';
import { useData } from '../data/DataContext';
import { isKnownIP } from '../utils/names';
import { roundHours } from '../utils/dates';
import { useTheme } from './ThemeProvider';

const LS_LAST_SHOWN = 'fandora_misrecord_last_shown';
const LS_SNOOZE_UNTIL = 'fandora_misrecord_snooze_until';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export default function WeeklyMisrecordReminder() {
  const { workLogs } = useData();
  const { weeklyReminder } = useTheme();
  const [open, setOpen] = useState(false);

  const ipLikeLogs = useMemo(
    () => workLogs.filter((l) => isKnownIP(l.workType)),
    [workLogs]
  );

  const culprits = useMemo(() => {
    if (ipLikeLogs.length === 0) return [];
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

  const totalHours = useMemo(() => sumBy(culprits, 'hours'), [culprits]);
  const employeeCount = useMemo(
    () => new Set(culprits.map((c) => c.employee)).size,
    [culprits]
  );

  // mount + workLogs 變動時檢查是否該彈
  useEffect(() => {
    if (!weeklyReminder) return; // tweaks 關閉
    if (workLogs.length === 0 || culprits.length === 0) return;

    const now = Date.now();
    const snoozeUntil = parseInt(localStorage.getItem(LS_SNOOZE_UNTIL) || '0', 10);
    if (now < snoozeUntil) return; // 還在 snooze 期內

    const lastShown = parseInt(localStorage.getItem(LS_LAST_SHOWN) || '0', 10);
    if (now - lastShown >= ONE_WEEK_MS) {
      setOpen(true);
    }
  }, [workLogs.length, culprits.length, weeklyReminder]);

  const markShown = () => {
    localStorage.setItem(LS_LAST_SHOWN, String(Date.now()));
  };

  const handleAcknowledge = () => {
    markShown();
    setOpen(false);
  };

  const handleSnoozeMonth = () => {
    markShown();
    localStorage.setItem(LS_SNOOZE_UNTIL, String(Date.now() + ONE_MONTH_MS));
    setOpen(false);
  };

  if (culprits.length === 0) return null;

  return (
    <Modal
      open={open}
      onCancel={handleAcknowledge}
      width={720}
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
            ⚠ WEEKLY HEALTH CHECK
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            本週工時記錄健檢
          </div>
        </div>
      }
      footer={[
        <button
          key="snooze"
          className="btn"
          onClick={handleSnoozeMonth}
          style={{ marginRight: 8 }}
        >
          一個月內不再提醒
        </button>,
        <button key="ok" className="btn btn--primary" onClick={handleAcknowledge}>
          我知道了，本週已查看
        </button>,
      ]}
    >
      <div
        style={{
          padding: 14,
          marginBottom: 16,
          background: 'rgba(242,153,74,0.08)',
          border: '1px solid rgba(242,153,74,0.4)',
          borderRadius: 10,
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        本週發現 <b>{employeeCount}</b> 位員工把 IP 名稱填到「工作項目」欄，
        共 <b>{Math.round(totalHours).toLocaleString()}</b> 小時。
        請提醒以下員工：「工作項目」應該填動作（設計、出貨、商開、開會等），
        IP 名稱要填在「授權IP」欄。
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>員工</th>
              <th>部門</th>
              <th>誤記為</th>
              <th className="num">時數</th>
              <th>月份</th>
            </tr>
          </thead>
          <tbody>
            {culprits.map((c, i) => (
              <tr key={`${c.employee}-${c.workType}-${i}`}>
                <td style={{ fontWeight: 600 }}>{c.employee}</td>
                <td>
                  <span className="tag">{c.department}</span>
                </td>
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

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.6 }}>
        這個提醒每 7 天自動跳一次。可在右下角設定面板（齒輪圖示）關閉。
      </div>
    </Modal>
  );
}
