import React, { useState } from 'react';
import {
  CONFIGURATOR_TECHNOLOGIES,
  getGenerationTechnologies,
  getStorageTechnologies,
} from '../../configuratorData/conf_technologies';

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
      </svg>
    ),
    wind: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 6 L18 16 L14 16 Z" fill="currentColor" />
      </svg>
    ),
    battery: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6" y="10" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="24" y="14" width="3" height="4" fill="currentColor" />
      </svg>
    ),
    fuelcell: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="8" y="8" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    recip: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="8" y="12" width="16" height="10" rx="2" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  };
  return <span className="conf-tech-tile__icon">{paths[type] || paths.turbine}</span>;
}

function TechTile({ tech, selected, onToggle }) {
  const [showLead, setShowLead] = useState(false);
  const lt = tech.leadTime;

  return (
    <button
      type="button"
      className={`conf-tech-tile${selected ? ' conf-tech-tile--selected' : ''}`}
      onClick={() => onToggle(tech.id)}
      aria-pressed={selected}
      onMouseEnter={() => setShowLead(true)}
      onMouseLeave={() => setShowLead(false)}
      onFocus={() => setShowLead(true)}
      onBlur={() => setShowLead(false)}
    >
      <TechIcon type={tech.icon} />
      <span className="conf-tech-tile__label">{tech.label}</span>
      {selected && <span className="conf-tech-tile__check" aria-hidden="true">✓</span>}
      {showLead && lt && (
        <span className="conf-tech-tile__lead-popup" role="tooltip">
          <strong>{lt.typicalModel}</strong>
          <span>Typical lead time: {lt.typicalLeadTimeMonths} months</span>
          <span>Updated: {lt.lastUpdated}</span>
          <em>{lt.disclaimer}</em>
        </span>
      )}
    </button>
  );
}

function TechSection({ title, helper, technologies, selectedIds, onChange }) {
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

  return (
    <div className="conf-tech-section">
      <h4>{title}</h4>
      {helper && <p className="conf-field__helper">{helper}</p>}
      <div className="conf-tech-tiles__grid">
        {technologies.map((tech) => (
          <TechTile
            key={tech.id}
            tech={tech}
            selected={selectedIds.includes(tech.id)}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}

export default function ConfTechnologyTiles({ selectedIds, onChange }) {
  const selectAll = () => onChange(CONFIGURATOR_TECHNOLOGIES.map((t) => t.id));
  const clearGen = () => {
    const storage = getStorageTechnologies().filter((t) => selectedIds.includes(t.id)).map((t) => t.id);
    if (storage.length) onChange(storage);
  };

  return (
    <div className="conf-tech-tiles">
      <div className="conf-tech-tiles__actions">
        <button type="button" className="conf-link-btn" onClick={selectAll}>Select All</button>
        <button type="button" className="conf-link-btn" onClick={clearGen}>Clear generation</button>
      </div>
      <p className="conf-field__helper">
        Selected technologies are options for the optimizer — not all will appear in the final architecture.
      </p>
      <TechSection
        title="Generation Technologies"
        helper="Gas, renewable, and other onsite generation assets."
        technologies={getGenerationTechnologies()}
        selectedIds={selectedIds}
        onChange={onChange}
      />
      <TechSection
        title="Energy Storage"
        helper="Storage supports reliability and renewables — it is not a generation source."
        technologies={getStorageTechnologies()}
        selectedIds={selectedIds}
        onChange={onChange}
      />
    </div>
  );
}
