import React, { useMemo } from 'react';
import { statsByColumn } from '../utils/dataVisFilters';

const FILTER_COLUMNS = [
  'Project LCOE ($/MWh)',
  'Year 1 Load Compliance (%)',
  'Solar AC Nameplate (MWac)',
  'Wind Nameplate (MWac)',
  'BESS power Nameplate (MW)',
];

export default function DataVisFilterBar({ columnStats, ranges, onChange, filteredCount, totalCount }) {
  const statMap = useMemo(() => statsByColumn(columnStats), [columnStats]);

  const update = (column, field, raw) => {
    const value = raw === '' ? null : Number(raw);
    const prev = ranges[column] || {};
    onChange({
      ...ranges,
      [column]: { ...prev, [field]: Number.isFinite(value) ? value : null },
    });
  };

  const reset = () => onChange({});

  return (
    <section className="dataVis-filterBar" aria-label="Dataset filters">
      <header className="dataVis-filterBar__head">
        <span className="dataVis-filterBar__title">Filters</span>
        <span className="dataVis-filterBar__count">
          {filteredCount != null ? `${filteredCount} / ${totalCount} rows` : ''}
        </span>
        <button type="button" className="dataVis-filterBar__reset" onClick={reset}>
          Clear
        </button>
      </header>
      <div className="dataVis-filterBar__grid">
        {FILTER_COLUMNS.map((col) => {
          const st = statMap[col];
          if (!st || !st.numeric) return null;
          const band = ranges[col] || {};
          return (
            <label key={col} className="dataVis-filterBar__field">
              <span className="dataVis-filterBar__label">{col}</span>
              <div className="dataVis-filterBar__inputs">
                <input
                  type="number"
                  placeholder={st.min != null ? String(st.min) : 'min'}
                  value={band.min ?? ''}
                  onChange={(e) => update(col, 'min', e.target.value)}
                />
                <span>–</span>
                <input
                  type="number"
                  placeholder={st.max != null ? String(st.max) : 'max'}
                  value={band.max ?? ''}
                  onChange={(e) => update(col, 'max', e.target.value)}
                />
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
