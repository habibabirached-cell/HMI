import React from 'react';
import { clampFilterBinCount, FILTER_BIN_MAX, FILTER_BIN_MIN } from '../utils/dataVisHistogramBins';

export default function DataVisBinStepper({
  binCount,
  onChange,
  compact = false,
  className = '',
  ariaLabel = 'Histogram bin count',
}) {
  const value = clampFilterBinCount(binCount);
  const step = compact ? 2 : 4;

  return (
    <div
      className={`dataVis-binStepper${compact ? ' dataVis-binStepper--compact' : ''}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
    >
      {!compact ? <span className="dataVis-binStepper__label">Bins</span> : null}
      <button
        type="button"
        className="dataVis-binStepper__btn"
        onClick={() => onChange(value - step)}
        disabled={value <= FILTER_BIN_MIN}
        aria-label="Fewer bins"
      >
        −
      </button>
      <span className="dataVis-binStepper__value" title={`${FILTER_BIN_MIN}–${FILTER_BIN_MAX} bins`}>
        {value}
      </span>
      <button
        type="button"
        className="dataVis-binStepper__btn"
        onClick={() => onChange(value + step)}
        disabled={value >= FILTER_BIN_MAX}
        aria-label="More bins"
      >
        +
      </button>
    </div>
  );
}
