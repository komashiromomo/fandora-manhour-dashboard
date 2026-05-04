/**
 * 純前端 Hash Routing — 不依賴 react-router-dom
 *
 * URL 格式：
 *   #/                                          → overview
 *   #/{tab}                                      → 切 tab
 *   #/{tab}/{entityValue}                        → 開該 entity 的 detail Drawer
 *   #/{tab}/{entityValue}/{kind}:{value}         → drill 一層
 *   #/{tab}/{entityValue}/{kind}:{value}/{...}   → 多層 drill
 *
 * 範例：
 *   #/projects/老高與小茉/workType:商開設計/employee:余凱紓
 *   → tab=projects, entityValue=老高與小茉, drills=[{workType,商開設計},{employee,余凱紓}]
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const VALID_TABS = new Set([
  'overview',
  'projects',
  'departments',
  'employees',
  'workTypes',
  'settings',
]);

const VALID_DRILL_KINDS = new Set(['project', 'employee', 'department', 'workType', 'month']);

function parseHash() {
  const raw = (typeof window === 'undefined' ? '' : window.location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { tab: 'overview', entityValue: null, drills: [] };

  const parts = raw.split('/').filter(Boolean).map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });

  const tab = VALID_TABS.has(parts[0]) ? parts[0] : 'overview';
  const entityValue = parts[1] || null;
  const drills = parts
    .slice(2)
    .map((p) => {
      const idx = p.indexOf(':');
      if (idx < 0) return null;
      const kind = p.slice(0, idx);
      const value = p.slice(idx + 1);
      if (!VALID_DRILL_KINDS.has(kind) || !value) return null;
      return { kind, value };
    })
    .filter(Boolean);
  return { tab, entityValue, drills };
}

function encodeRoute({ tab, entityValue, drills = [] }) {
  let h = `/${tab || 'overview'}`;
  if (entityValue) h += `/${encodeURIComponent(entityValue)}`;
  drills.forEach((d) => {
    if (d?.kind && d?.value) h += `/${d.kind}:${encodeURIComponent(d.value)}`;
  });
  return h;
}

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [route, setRouteState] = useState(parseHash);

  useEffect(() => {
    const onHashChange = () => setRouteState(parseHash());
    window.addEventListener('hashchange', onHashChange);
    // 初始化 hash 確保 URL 與 state 一致
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#' + encodeRoute(parseHash()));
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setRoute = useCallback((next) => {
    const merged =
      typeof next === 'function'
        ? next(route)
        : { ...route, ...next };
    const newHash = encodeRoute(merged);
    const cur = (window.location.hash || '').replace(/^#/, '');
    if (cur !== newHash) {
      window.location.hash = newHash; // 觸發 hashchange
    } else {
      // hash 沒變但 state 物件可能不同 reference，仍要 sync state
      setRouteState(merged);
    }
  }, [route]);

  // 常用便捷操作
  const setTab = useCallback(
    (tab) => setRoute({ tab, entityValue: null, drills: [] }),
    [setRoute]
  );
  const openEntity = useCallback(
    (entityValue) => setRoute((r) => ({ ...r, entityValue, drills: [] })),
    [setRoute]
  );
  const closeEntity = useCallback(
    () => setRoute((r) => ({ ...r, entityValue: null, drills: [] })),
    [setRoute]
  );
  const pushDrill = useCallback(
    (kind, value) =>
      setRoute((r) => ({ ...r, drills: [...(r.drills || []), { kind, value }] })),
    [setRoute]
  );
  const popDrillsTo = useCallback(
    (level) => setRoute((r) => ({ ...r, drills: (r.drills || []).slice(0, level) })),
    [setRoute]
  );

  return (
    <RouteContext.Provider
      value={{ route, setRoute, setTab, openEntity, closeEntity, pushDrill, popDrillsTo }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be inside RouteProvider');
  return ctx;
}

// 把 tab 對應到該 page 開 detail 時的 entity kind
export const TAB_TO_KIND = {
  projects: 'project',
  employees: 'employee',
  departments: 'department',
  workTypes: 'workType',
};
