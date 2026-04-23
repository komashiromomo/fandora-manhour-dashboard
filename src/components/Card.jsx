import React from 'react';

/**
 * Surface container — white bg, 1px gray-200 border, 12px radius.
 */
export function Card({ children, flush, className, style, ...rest }) {
  return (
    <div className={`card${flush ? ' card--flush' : ''}${className ? ' ' + className : ''}`} style={style} {...rest}>
      {children}
    </div>
  );
}

export function CardHead({ title, subtitle, right, children }) {
  return (
    <div className="card__head">
      <div>
        {title && <div className="card__title">{title}</div>}
        {subtitle && <div className="card__sub">{subtitle}</div>}
        {children}
      </div>
      {right && <div className="cluster">{right}</div>}
    </div>
  );
}

export default Card;
