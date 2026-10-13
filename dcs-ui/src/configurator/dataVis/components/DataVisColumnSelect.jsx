import React from 'react';

export default function DataVisColumnSelect({ label, value, options, onChange, id, className = 'dataVis-field' }) {
  return (
    <label className={className} htmlFor={id}>
      <span className="dataVis-field__label">{label}</span>
      <select id={id} value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
