import React from 'react';
import './IdeumKioskChromeButtons.css';

/** Return to Ideum07 / Ideum08 kiosk root menu. */
export default function IdeumKioskHomeButton({
  onHome,
  visible = true,
  className = '',
  style,
}) {
  if (!visible || !onHome) return null;
  return (
    <button
      type="button"
      className={`ideum-kiosk-home${className ? ` ${className}` : ''}`}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onHome?.();
      }}
      aria-label="Home"
      title="Home"
    >
      <span className="ideum-kiosk-home__icon" aria-hidden>
        ⌂
      </span>
    </button>
  );
}
