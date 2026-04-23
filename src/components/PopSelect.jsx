import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

/**
 * Custom dropdown styled as a pill. Replaces native <select>.
 * Props: label, value, options[{value,label}], onSelect, formatValue, icon
 */
export default function PopSelect({ label, value, options, onSelect, formatValue, icon = 'chevron' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const display = formatValue ? formatValue(value) : value;
  const isActive = value !== undefined && value !== 'all' && value !== '';

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        type="button"
        className={'filter-pill' + (isActive ? ' filter-pill--active' : '')}
        onClick={() => setOpen(o => !o)}
      >
        {label && <span className="filter-pill__label">{label}</span>}
        <span>{display}</span>
        <Icon name={icon} size={14} />
      </button>
      {open && (
        <div className="popover">
          {options.map(opt => (
            <div
              key={opt.value}
              className={'popover__item' + (opt.value === value ? ' popover__item--active' : '')}
              onClick={() => { onSelect(opt.value); setOpen(false); }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <span className="popover__check"><Icon name="check" size={14} /></span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
