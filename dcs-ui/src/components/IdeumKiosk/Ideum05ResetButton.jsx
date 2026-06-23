import React from 'react';
import './Ideum05NavLayer.css';

/** Ideum05 touch-table reset — sends cluster reset to Maingear (blank canvas). */
export default function Ideum05ResetButton({ onReset, visible = true }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="ideum05-nav-reset"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onReset?.();
      }}
      aria-label="Reset"
    >
      Reset
    </button>
  );
}
