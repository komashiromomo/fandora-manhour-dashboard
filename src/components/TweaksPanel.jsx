/**
 * Tweaks 浮動面板 — 切主題（cyan/warm/dark）/ 密度 / 收合 / 顯示成本
 * 使用 ThemeProvider 的 setTweak 持久化到 localStorage
 *
 * 設計：右下角浮動圓鈕（FAB），點開後一個 Ant Design Drawer，
 * 內部是 design 風格的 segmented + toggle。
 */
import React, { useState } from 'react';
import { Drawer } from 'antd';
import { useTheme } from './ThemeProvider';
import Icon from './Icon';

function Section({ label }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: 'var(--fg-3)',
        fontFamily: 'var(--font-latin)',
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      {label}
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="seg" style={{ width: '100%' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={value === opt.value ? 'on' : ''}
          onClick={() => onChange(opt.value)}
          style={{ flex: 1, padding: '7px 12px' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          border: 'none',
          background: value ? 'var(--accent)' : 'var(--bg-page-alt)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background .15s',
        }}
        aria-checked={value}
        role="switch"
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transition: 'left .15s cubic-bezier(.2,.8,.2,1)',
          }}
        />
      </button>
    </div>
  );
}

export default function TweaksPanel() {
  const [open, setOpen] = useState(false);
  const {
    theme, density, collapsed, showCost, weeklyReminder, autoSyncMinutes,
    style, season, showLeaves, setTweak,
  } = useTheme();

  return (
    <>
      {/* 右下角浮動 FAB */}
      <button
        onClick={() => setOpen(true)}
        title="調整介面"
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 999,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: 'var(--shadow-brand, 0 8px 24px rgba(0,164,198,0.28))',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          transition: 'transform .15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Icon name="settings" size={20} />
      </button>

      <Drawer
        title="介面設定"
        placement="right"
        width={320}
        onClose={() => setOpen(false)}
        open={open}
        styles={{
          body: { padding: '16px 20px' },
          header: { padding: '16px 20px', borderBottom: '1px solid var(--border-1)' },
        }}
      >
        <Section label="設計風格" />
        <Segmented
          value={style}
          options={[
            { value: 'simple', label: '✨ 簡潔' },
            { value: 'island', label: '🌿 動森' },
          ]}
          onChange={(v) => setTweak('style', v)}
        />

        {style === 'island' && (
          <>
            <div style={{ height: 12 }} />
            <Segmented
              value={season}
              options={[
                { value: 'spring', label: '🌸 春' },
                { value: 'summer', label: '☀️ 夏' },
                { value: 'autumn', label: '🍂 秋' },
                { value: 'winter', label: '❄️ 冬' },
              ]}
              onChange={(v) => setTweak('season', v)}
            />
            <div style={{ height: 6 }} />
            <Toggle
              label="飄落樹葉動畫"
              value={showLeaves}
              onChange={(v) => setTweak('showLeaves', v)}
            />
          </>
        )}

        <Section label="主題色系（簡潔）" />
        <Segmented
          value={theme}
          options={[
            { value: 'cyan', label: '冷色' },
            { value: 'warm', label: '暖色' },
            { value: 'dark', label: '深色' },
          ]}
          onChange={(v) => setTweak('theme', v)}
        />

        <Section label="版面密度" />
        <Segmented
          value={density}
          options={[
            { value: 'spacious', label: '寬鬆' },
            { value: 'compact', label: '平衡' },
            { value: 'dense', label: '密集' },
          ]}
          onChange={(v) => setTweak('density', v)}
        />

        <Section label="側欄" />
        <Toggle label="收合側欄" value={collapsed} onChange={(v) => setTweak('collapsed', v)} />

        <Section label="權限欄位" />
        <Toggle
          label="顯示成本欄位（admin）"
          value={showCost}
          onChange={(v) => setTweak('showCost', v)}
        />

        <Section label="提醒" />
        <Toggle
          label="每週工時記錄健檢提醒"
          value={weeklyReminder}
          onChange={(v) => setTweak('weeklyReminder', v)}
        />

        <Section label="背景同步" />
        <Segmented
          value={String(autoSyncMinutes)}
          options={[
            { value: '0', label: '關閉' },
            { value: '15', label: '15 分' },
            { value: '30', label: '30 分' },
            { value: '60', label: '1 時' },
            { value: '240', label: '4 時' },
          ]}
          onChange={(v) => setTweak('autoSyncMinutes', parseInt(v, 10))}
        />
        <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 6, lineHeight: 1.5 }}>
          每 N 分鐘從 Drive 自動拉新資料（不打擾、不彈視窗）。token 過期會靜默放棄這次。
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--border-1)',
            fontSize: 11,
            color: 'var(--fg-3)',
            lineHeight: 1.6,
          }}
        >
          設定會保存到瀏覽器 localStorage，下次回來會記得你的偏好。
        </div>
      </Drawer>
    </>
  );
}
