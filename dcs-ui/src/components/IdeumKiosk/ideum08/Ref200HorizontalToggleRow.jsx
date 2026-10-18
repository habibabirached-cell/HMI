import React from 'react';
import './Ref200MwSubmenu.css';

/** Large horizontal touch toggle — thumb right highlights the right label. */
export default function Ref200HorizontalToggleRow({
  zoom = 1,
  leftLabel,
  rightLabel,
  rightActive,
  onToggle,
  ariaLabel,
  rowClassName = '',
  disabled = false,
}) {
  return (
    <div
      className={`ideum07-ref200__toggle-row ideum08-ref200__toggle-row${rowClassName ? ` ${rowClassName}` : ''}`}
    >
      <span
        className={`ideum07-ref200__toggle-label ideum08-ref200__toggle-label${
          !rightActive ? ' ideum07-ref200__toggle-label--active' : ''
        }`}
      >
        {leftLabel}
      </span>
      <button
        type="button"
        role="switch"
        className={`ideum07-ref200__toggle ideum08-ref200__toggle${
          rightActive ? ' ideum07-ref200__toggle--on' : ''
        }`}
        aria-checked={rightActive}
        aria-disabled={disabled}
        disabled={disabled}
        aria-label={ariaLabel || `${leftLabel} or ${rightLabel}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          onToggle?.();
        }}
      >
        <span className="ideum07-ref200__toggle-thumb ideum08-ref200__toggle-thumb" aria-hidden />
      </button>
      <span
        className={`ideum07-ref200__toggle-label ideum08-ref200__toggle-label${
          rightActive ? ' ideum07-ref200__toggle-label--active' : ''
        }`}
      >
        {rightLabel}
      </span>
    </div>
  );
}
