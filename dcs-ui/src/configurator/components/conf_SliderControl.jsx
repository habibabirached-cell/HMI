import React from 'react';
import ConfInfoTooltip from './conf_InfoTooltip';

export default function ConfSliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  marks = [],
  helperText,
  tooltip,
  suffix = '',
}) {
  return (
    <div className="conf-field conf-slider">
      <div className="conf-field__header">
        <label className="conf-field__label">{label}</label>
        {tooltip && <ConfInfoTooltip text={tooltip} />}
      </div>
      <div className="conf-slider__readout">
        <strong>{formatValue ? formatValue(value) : value}{suffix}</strong>
      </div>
      {helperText && <p className="conf-field__helper">{helperText}</p>}
      <input
        type="range"
        className="conf-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {marks.length > 0 && (
        <div className="conf-slider__marks">
          {marks.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`conf-slider__mark${Math.abs(m.value - value) < step ? ' conf-slider__mark--active' : ''}`}
              onClick={() => onChange(m.value)}
            >
              <span>{m.label}</span>
              {m.sub && <small>{m.sub}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
