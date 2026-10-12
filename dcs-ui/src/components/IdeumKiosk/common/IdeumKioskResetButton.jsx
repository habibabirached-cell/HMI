import React from 'react';
import './IdeumKioskChromeButtons.css';
import './IdeumKioskResetButton.css';

/** Maingear blank-canvas reset — icon matches {@link IdeumKioskHomeButton} chrome. */
export default function IdeumKioskResetButton({
  onReset,
  visible = true,
  className = '',
  style,
}) {
  if (!visible || !onReset) return null;
  return (
    <button
      type="button"
      className={`ideum-kiosk-reset${className ? ` ${className}` : ''}`}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onReset?.();
      }}
      aria-label="Reset Maingear screens"
      title="Reset Maingear screens (blank display)"
    >
      <span className="ideum-kiosk-reset__icon" aria-hidden>
        <svg viewBox="0 0 24 24" focusable="false">
          <rect
            x="4.5"
            y="3.75"
            width="15"
            height="11.25"
            rx="1.35"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.45"
          />
          <rect
            x="6.35"
            y="5.6"
            width="11.3"
            height="7.55"
            rx="0.65"
            className="ideum-kiosk-reset__screen"
          />
          <path
            d="M12 15.35v1.9M9.1 18.85h5.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeLinecap="round"
          />
          <path
            d="M16.15 6.35a3.15 3.15 0 1 0-1.05 2.05"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d="M17 4.85v2h-1.95"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
