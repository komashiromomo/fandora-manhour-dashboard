/**
 * Fandora V2 主題與版面 Tweaks
 *
 * - theme: 'cyan' | 'warm' | 'dark'
 * - density: 'spacious' | 'compact' | 'dense'
 * - collapsed: 側欄是否收合
 * - showCost: admin 是否顯示成本欄位
 *
 * 寫進 <html data-theme=... data-density=...> 給 fandora-tokens.css / app.css 切換變數
 * 設定持久化在 localStorage。
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const LS_KEY = 'fandora_v2_tweaks';
const LS_CUSTOM_IPS = 'fandora_custom_ip_list';
const DEFAULTS = {
  theme: 'cyan',
  density: 'spacious',
  collapsed: false,
  showCost: true,
  weeklyReminder: true,
  autoSyncMinutes: 30, // 0=關閉，其他數字為分鐘數
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [tweaks, setTweaks] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return DEFAULTS;
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return DEFAULTS;
    }
  });

  const setTweak = useCallback((key, value) => {
    setTweaks((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // 自訂 IP 清單（合併 KNOWN_IP_LIST 形成完整白名單）
  const [customIPs, setCustomIPsState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_CUSTOM_IPS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addCustomIP = useCallback((ip) => {
    const trimmed = String(ip || '').trim();
    if (!trimmed) return;
    setCustomIPsState((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      try {
        localStorage.setItem(LS_CUSTOM_IPS, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeCustomIP = useCallback((ip) => {
    setCustomIPsState((prev) => {
      const next = prev.filter((x) => x !== ip);
      try {
        localStorage.setItem(LS_CUSTOM_IPS, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    document.documentElement.setAttribute('data-density', tweaks.density);
  }, [tweaks.theme, tweaks.density]);

  return (
    <ThemeContext.Provider
      value={{ ...tweaks, setTweak, customIPs, addCustomIP, removeCustomIP }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
