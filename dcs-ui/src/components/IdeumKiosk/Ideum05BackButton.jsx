import React from 'react';
import './Ideum05NavLayer.css';

/** Shared back control for Ideum05 menu and control surfaces. */
export default function Ideum05BackButton({ onBack, visible = true }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="ideum05-nav-back"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onBack?.();
      }}
      aria-label="Back"
    >
      ← Back
    </button>
  );
}
