/**
 * IP 清單管理 — Settings 頁的一個 Card
 *
 * - 顯示系統內建 IP（KNOWN_IP_LIST，不可刪）
 * - 顯示使用者自訂 IP（可刪）
 * - 從 workLogs 偵測「Drive 上實際出現過的 IP」，標示哪些尚未列入清單，提供「一鍵加入」
 * - 自訂新增（input）
 *
 * 持久化到 localStorage 'fandora_custom_ip_list'（透過 ThemeProvider 管理）
 */
import React, { useMemo, useState } from 'react';
import { Card } from './v2';
import { useTheme } from './ThemeProvider';
import { useData } from '../data/DataContext';
import { KNOWN_IP_LIST } from '../config/constants';
import { roundHours } from '../utils/dates';
import { sumBy } from 'lodash-es';

const SENTINEL = '非授權IP';

export default function IpListManager() {
  const { customIPs, addCustomIP, removeCustomIP, sheetIPs, sheetAliasMap } = useTheme();
  const { workLogs } = useData();
  const [newIp, setNewIp] = useState('');

  // 從 workLogs 偵測實際出現過的 IP（ipProject 欄）
  const detectedIPs = useMemo(() => {
    const map = new Map();
    workLogs.forEach((l) => {
      const ip = l.ipProject;
      if (!ip || ip === SENTINEL) return;
      if (!map.has(ip)) map.set(ip, { ip, hours: 0, employees: new Set() });
      const entry = map.get(ip);
      entry.hours += l.hours;
      entry.employees.add(l.employee);
    });
    return Array.from(map.values())
      .map((e) => ({ ip: e.ip, hours: roundHours(e.hours), employees: e.employees.size }))
      .sort((a, b) => b.hours - a.hours);
  }, [workLogs]);

  // 「未列入清單」= Drive 出現但 KNOWN + sheet + custom 都沒收
  const knownSet = useMemo(
    () => new Set([...KNOWN_IP_LIST, ...sheetIPs, ...customIPs]),
    [customIPs, sheetIPs]
  );
  const undeclaredIPs = useMemo(
    () => detectedIPs.filter((d) => !knownSet.has(d.ip)),
    [detectedIPs, knownSet]
  );

  const handleAdd = () => {
    if (!newIp.trim()) return;
    addCustomIP(newIp);
    setNewIp('');
  };

  return (
    <Card
      col={12}
      title="IP 清單管理"
      sub={`系統內建 ${KNOWN_IP_LIST.length} · Sheet ${sheetIPs.length} · 自訂 ${customIPs.length} · Drive 偵測 ${detectedIPs.length}`}
    >
      {/* Drive 偵測但未列入 — 最重要，置頂 */}
      {undeclaredIPs.length > 0 && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: 'rgba(242,153,74,0.08)',
            border: '1px solid rgba(242,153,74,0.4)',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            ⚠ Drive 偵測到 {undeclaredIPs.length} 個 IP 尚未列入清單
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 8 }}>
            這些 IP 出現在「授權 IP」欄但不在系統內建或自訂清單中。加入後，誤填工作項目偵測就會涵蓋它們。
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {undeclaredIPs.map((d) => (
              <button
                key={d.ip}
                className="btn"
                onClick={() => addCustomIP(d.ip)}
                style={{
                  padding: '4px 10px',
                  height: 'auto',
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                title={`加入清單（${d.hours} 小時 · ${d.employees} 位員工使用過）`}
              >
                <span style={{ fontWeight: 600 }}>+ {d.ip}</span>
                <span style={{ color: 'var(--fg-3)' }}>
                  {d.hours}h · {d.employees}人
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 自訂新增 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="新增自訂 IP 名稱"
          style={{
            flex: 1,
            height: 36,
            padding: '0 12px',
            border: '1px solid var(--border-1)',
            borderRadius: 10,
            fontSize: 13,
            background: 'var(--bg-surface)',
            color: 'var(--fg-1)',
            outline: 'none',
          }}
        />
        <button className="btn btn--primary" onClick={handleAdd} disabled={!newIp.trim()}>
          新增
        </button>
      </div>

      {/* 自訂 IP 清單 */}
      {customIPs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--fg-3)',
              fontFamily: 'var(--font-latin)',
              marginBottom: 8,
            }}
          >
            自訂 IP（{customIPs.length}）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {customIPs.map((ip) => (
              <span
                key={ip}
                className="tag"
                style={{
                  background: 'var(--accent-tint)',
                  color: 'var(--accent)',
                  fontSize: 12,
                  padding: '4px 8px 4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {ip}
                <button
                  onClick={() => removeCustomIP(ip)}
                  style={{
                    width: 18,
                    height: 18,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 0,
                  }}
                  title="刪除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 從 Google Sheet 載入的 IP（不可在此刪除，需到 sheet 內改） */}
      {sheetIPs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontFamily: 'var(--font-latin)',
              marginBottom: 8,
            }}
          >
            從 Google Sheet 載入的 IP（{sheetIPs.length}）
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 8, lineHeight: 1.5 }}>
            來自 IP 清單 Sheet。要修改請直接編輯該 sheet，然後按「重新整理」或等下次同步。
            {Object.keys(sheetAliasMap || {}).length > 0 &&
              ` 內含 ${Object.keys(sheetAliasMap).length} 個別名歸併。`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sheetIPs.map((ip) => (
              <span
                key={ip}
                className="tag"
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  background: 'var(--accent-tint)',
                  color: 'var(--accent)',
                }}
                title={sheetAliasMap?.[ip] ? `別名 → ${sheetAliasMap[ip]}` : '主名'}
              >
                {ip}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 系統內建 IP（不可刪） */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
            fontFamily: 'var(--font-latin)',
            marginBottom: 8,
          }}
        >
          系統內建 IP（{KNOWN_IP_LIST.length}）
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {KNOWN_IP_LIST.map((ip) => (
            <span
              key={ip}
              className="tag"
              style={{ fontSize: 12, padding: '4px 8px' }}
              title="系統內建（請改 src/config/constants.js）"
            >
              {ip}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
