import React from 'react';
import './Ideum05NavLayer.css';

/** Ideum05 touch-table Live RTDS — sends cluster command to Maingear. */
export default function Ideum05LiveRtdsButton({ onLiveRtds, visible = true }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="ideum05-nav-live-rtds"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onLiveRtds?.();
      }}
      aria-label="Live RTDS"
    >
      Live RTDS
    </button>
  );
}
