import React from 'react';

export function SimPlayIcon({ className = 'btn-sim-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SimStopIcon({ className = 'btn-sim-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}

/** Play triangle with a circular loop arrow (start simulate with loop). */
export function SimPlayLoopIcon({ className = 'btn-sim-icon btn-sim-icon--loop' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4a8 8 0 1 1-7.75 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 10V4h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 8.5v7l6-3.5L9 8.5z" fill="currentColor" />
    </svg>
  );
}
