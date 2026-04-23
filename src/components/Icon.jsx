import React from 'react';

/**
 * Stroke-icon set, 18×18 default, stroke-width 1.75 (matches design system).
 * Names: grid, folder, tag, user, users, gear, calendar, filter, refresh,
 *        chevron, chevronLeft, chevronRight, check, up, down, search,
 *        download, menu, plug, doc, logout, trend, spark, pin, close, plus, external
 */
export default function Icon({ name, size = 18, className, style }) {
  const s = {
    width: size,
    height: size,
    stroke: 'currentColor',
    fill: 'none',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...style,
  };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" />,
    tag: <><path d="M3 12V3h9l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1.2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></>,
    users: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 11a4 4 0 0 0 0-8" /><path d="M22 21c0-3-2-5-5-6" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    filter: <path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z" />,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    chevronLeft: <path d="m15 6-6 6 6 6" />,
    check: <path d="m5 12 5 5L20 7" />,
    up: <path d="m6 15 6-6 6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    plug: <><path d="M9 3v6M15 3v6" /><path d="M6 9h12v3a6 6 0 0 1-12 0V9Z" /><path d="M12 17v4" /></>,
    doc: <><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5" /></>,
    logout: <><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
    trend: <><path d="M3 17 9 11l4 4 8-8" /><path d="M14 7h7v7" /></>,
    spark: <path d="M3 16 8 11l4 4 3-3 6 6" />,
    pin: <><path d="M12 3v10" /><path d="M8 7h8" /><path d="M9 13h6l-3 8-3-8Z" /></>,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    external: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" style={s} className={className}>
      {paths[name] || null}
    </svg>
  );
}
