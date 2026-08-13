import React from 'react';
import { CONFIGURATOR_TECHNOLOGIES } from '../../configuratorData/conf_technologies';

function TechIcon({ type }) {
  const paths = {
    turbine: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="4" fill="currentColor" />
        <path d="M16 4 L18 14 L14 14 Z" fill="currentColor" />
        <path d="M28 18 L18 16 L20 20 Z" fill="currentColor" />
        <path d="M4 18 L14 16 L12 20 Z" fill="currentColor" />
      </svg>
    ),
    aero: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <ellipse cx="16" cy="16" rx="12" ry="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="16" r="3" fill="currentColor" />
      </svg>
    ),
    solar: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6" y="10" width="20" height="12" rx="2" fill="currentColor" opacity="0.85" />
        <line x1="16" y1="4" x2="16" y2="8" stroke="currentColor" strokeWidth="2" />
        <line x1="16" y1="24" x2="16" y2="28" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    wind: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 6 L18 16 L14 16 Z" fill="currentColor" />
        <path d="M24 20 L16 18 L18 22 Z" fill="currentColor" />
        <path d="M8 20 L16 18 L14 22 Z" fill="currentColor" />
      </svg>
    ),
    battery: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6" y="10" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="24" y="14" width="3" height="4" fill="currentColor" />
        <rect x="10" y="14" width="4" height="4" fill="currentColor" />
      </svg>
    ),
    fuelcell: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="8" y="8" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 16 H20 M16 12 V20" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    recip: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="8" y="12" width="16" height="10" rx="2" fill="currentColor" opacity="0.8" />
        <rect x="12" y="8" width="8" height="4" fill="currentColor" />
      </svg>
    ),
  };
  return <span className="conf-tech-tile__icon">{paths[type] || paths.turbine}</span>;
}

export default function ConfTechnologyTiles({ selectedIds, onChange }) {
  const toggle = (id) => {
    const set = new Set(selectedIds);
    if (set.has(id)) {
      if (set.size <= 1) return;
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange([...set]);
  };

  const selectAll = () => onChange(CONFIGURATOR_TECHNOLOGIES.map((t) => t.id));
  const clearAll = () => onChange([CONFIGURATOR_TECHNOLOGIES[0].id]);

  return (
    <div className="conf-tech-tiles">
      <div className="conf-tech-tiles__actions">
        <button type="button" className="conf-link-btn" onClick={selectAll}>Select All</button>
        <button type="button" className="conf-link-btn" onClick={clearAll}>Clear</button>
      </div>
      <div className="conf-tech-tiles__grid">
        {CONFIGURATOR_TECHNOLOGIES.map((tech) => {
          const selected = selectedIds.includes(tech.id);
          return (
            <button
              key={tech.id}
              type="button"
              className={`conf-tech-tile${selected ? ' conf-tech-tile--selected' : ''}`}
              onClick={() => toggle(tech.id)}
              aria-pressed={selected}
            >
              <TechIcon type={tech.icon} />
              <span className="conf-tech-tile__label">{tech.label}</span>
              {selected && <span className="conf-tech-tile__check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
