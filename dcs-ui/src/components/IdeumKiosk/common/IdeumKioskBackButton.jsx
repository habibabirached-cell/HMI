import React from 'react';
import './IdeumKioskChromeButtons.css';

/** Navigate up one level — icon matches {@link IdeumKioskHomeButton} chrome. */
export default function IdeumKioskBackButton({
  onBack,
  visible = true,
  className = '',
  style,
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className={`ideum-kiosk-back${className ? ` ${className}` : ''}`}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onBack?.();
      }}
      aria-label="Back"
      title="Back"
    >
      <span className="ideum-kiosk-back__icon" aria-hidden>
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M15 5.5 8.5 12 15 18.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
