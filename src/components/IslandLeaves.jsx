/**
 * 動森島嶼風的飄落葉子背景
 * 只在 style=island 且 showLeaves=true 時 render；隨季節換色
 */
import React from 'react';
import { useTheme } from './ThemeProvider';

const SEASON_COLORS = {
  spring: ['#7CC576', '#FFB7C5', '#FFC89A', '#9FE0EF', '#FFE48A'],
  summer: ['#5BAE5B', '#7FC8D8', '#FFE48A', '#74C8DD', '#FFB7C5'],
  autumn: ['#D9885B', '#E36B7A', '#F4C430', '#A87858', '#FFC89A'],
  winter: ['#A6D8E8', '#7A6BC2', '#E0A6CC', '#9FE0EF', '#FFFFFF'],
};

export default function IslandLeaves() {
  const { style, season, showLeaves } = useTheme();
  if (style !== 'island' || !showLeaves) return null;
  const colors = SEASON_COLORS[season] || SEASON_COLORS.spring;
  return (
    <div className="island-leaves" aria-hidden>
      {colors.map((c, i) => (
        <svg
          key={i}
          className="island-leaf"
          width={28 + i * 2}
          height={28 + i * 2}
          viewBox="0 0 40 40"
        >
          <path
            d="M5 35 Q 5 5 35 5 Q 35 35 5 35 Z"
            fill={c}
            stroke="#3D2E1E"
            strokeWidth="2"
          />
        </svg>
      ))}
    </div>
  );
}
