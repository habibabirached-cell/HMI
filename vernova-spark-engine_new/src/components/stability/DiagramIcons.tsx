import React from 'react';

export const PlantIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M10 90 L10 50 L30 50 L30 30 L45 30 L45 40 L60 40 L60 50 L90 50 L90 90 Z" />
    <path d="M70 50 Q75 30 85 50" strokeDasharray="2 2" />
    <path d="M20 50 L20 20 M25 50 L25 25" />
    <rect x="15" y="70" width="10" height="10" />
    <rect x="35" y="70" width="10" height="10" />
    <rect x="55" y="70" width="10" height="10" />
    <rect x="75" y="70" width="10" height="10" />
  </svg>
);

export const TowerIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M50 10 L30 90 M50 10 L70 90" />
    <path d="M40 50 L60 50" />
    <path d="M35 70 L65 70" />
    <path d="M45 30 L55 30" />
    <path d="M15 35 L85 35" />
    <path d="M25 55 L75 55" />
    <path d="M35 70 L50 30 L65 70" />
    <path d="M40 50 L50 10 L60 50" />
  </svg>
);

export const GFLBessIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="10" y="20" width="80" height="70" rx="4" />
    <path d="M30 30 L30 80 M50 30 L50 80 M70 30 L70 80" />
    <path d="M20 45 L35 35 L25 55 L40 45" stroke="var(--primary)" />
    <path d="M40 45 L55 35 L45 55 L60 45" stroke="var(--primary)" />
    <path d="M60 45 L75 35 L65 55 L80 45" stroke="var(--primary)" />
    <path d="M50 20 L50 5" />
  </svg>
);

export const GFMBessIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="10" y="20" width="80" height="70" rx="4" stroke="var(--primary)" />
    <path d="M30 30 L30 80 M50 30 L50 80 M70 30 L70 80" stroke="var(--primary)" />
    <path d="M20 45 L35 35 L25 55 L40 45" stroke="var(--primary)" />
    <path d="M40 45 L55 35 L45 55 L60 45" stroke="var(--primary)" />
    <path d="M60 45 L75 35 L65 55 L80 45" stroke="var(--primary)" />
    <path d="M50 20 L50 5" />
  </svg>
);

export const SynconIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="20" y="30" width="60" height="40" rx="10" />
    <path d="M10 40 L20 40 M10 60 L20 60" />
    <path d="M80 40 L90 40 M80 60 L90 60" />
    <rect x="35" y="40" width="30" height="20" rx="5" />
    <path d="M50 30 L50 5" />
  </svg>
);

export const StatcomIcon = ({ className = '', isGFM = false }: { className?: string; isGFM?: boolean }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="20" y="20" width="60" height="50" />
    <path d="M20 70 L50 20 L80 70" />
    <path d="M35 50 Q50 35 65 50 T80 50" />
    <path d="M50 20 L50 5" />
    <rect x="40" y="70" width="20" height="20" fill={isGFM ? "transparent" : "var(--primary)"} stroke={isGFM ? "currentColor" : "none"} />
    <path d="M30 75 L30 90 M70 75 L70 90" />
    <path d="M25 90 L75 90 M35 95 L65 95" />
  </svg>
);
