import React from 'react';
import Icon from './Icon';

/**
 * Secondary control bar with eyebrow + heading + desc + optional CTA.
 */
export default function ControlBar({ eyebrow, title, desc, showExport, onExport }) {
  return (
    <div className="controlbar">
      <div className="controlbar__title">
        <div>
          <div className="controlbar__eyebrow">{eyebrow}</div>
          <div className="controlbar__heading">{title}</div>
        </div>
      </div>
      <div className="controlbar__spacer" />
      <div className="cluster">
        <span className="muted">{desc}</span>
        {showExport && (
          <>
            <span className="muted">·</span>
            <button type="button" className="btn" onClick={onExport}>
              <Icon name="download" size={14} />匯出 CSV
            </button>
          </>
        )}
      </div>
    </div>
  );
}
