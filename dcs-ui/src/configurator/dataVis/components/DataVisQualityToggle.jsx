import React from 'react';
import {
  DATA_QUALITY_CLEAN,
  DATA_QUALITY_ORIGINAL,
} from '../utils/dataVisQualityMode';

export default function DataVisQualityToggle({
  mode = DATA_QUALITY_ORIGINAL,
  onChange,
  disabled = false,
  className = 'dataVis-qualityToggle',
  title = 'Session dataset: original workbook or rows with Year 1 load compliance ≥ 97%',
}) {
  return (
    <div className={className} role="group" aria-label="Data quality" title={title}>
      <button
        type="button"
        className={`${className}__btn${mode === DATA_QUALITY_CLEAN ? ` ${className}__btn--active` : ''}`}
        aria-pressed={mode === DATA_QUALITY_CLEAN}
        disabled={disabled}
        onClick={() => onChange?.(DATA_QUALITY_CLEAN)}
      >
        Clean data
      </button>
      <button
        type="button"
        className={`${className}__btn${mode === DATA_QUALITY_ORIGINAL ? ` ${className}__btn--active` : ''}`}
        aria-pressed={mode === DATA_QUALITY_ORIGINAL}
        disabled={disabled}
        onClick={() => onChange?.(DATA_QUALITY_ORIGINAL)}
      >
        Original data
      </button>
    </div>
  );
}
