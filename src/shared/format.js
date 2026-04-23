/**
 * Number formatting helpers matching the design system (Roboto numerics).
 */
export const fmtHours = (n) => {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('en-US');
};

export const fmtMoney = (n) => {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('en-US');
};

export const fmtCompact = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(num).toLocaleString('en-US');
};

export const pct = (num, den) => (den ? (num / den) * 100 : 0);
