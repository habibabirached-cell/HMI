import React, { useEffect, useMemo, useState } from 'react';
import {
  buildRangeFiltersExcluding,
  numericColumnsFromStats,
  statsByColumn,
} from '../utils/dataVisFilters';
import DataVisColumnChipMenu from './DataVisColumnChipMenu';
import DataVisFilterMiniHistogram from './DataVisFilterMiniHistogram';

const DEFAULT_FILTER_COLUMNS = [
  'Project LCOE ($/MWh)',
  'Year 1 Load Compliance (%)',
  'Solar AC Nameplate (MWac)',
  'Wind Nameplate (MWac)',
  'BESS power Nameplate (MW)',
];

const MAX_FILTER_HISTOGRAMS = 12;

export default function DataVisFilterBar({ columnStats, ranges, onChange, filteredCount, totalCount }) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const statMap = useMemo(() => statsByColumn(columnStats), [columnStats]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_FILTER_COLUMNS);

  useEffect(() => {
    if (!numericCols.length) return;
    setVisibleColumns((prev) => {
      const kept = prev.filter((c) => numericCols.includes(c));
      if (kept.length) return kept;
      const defaults = DEFAULT_FILTER_COLUMNS.filter((c) => numericCols.includes(c));
      return defaults.length ? defaults : numericCols.slice(0, 5);
    });
  }, [numericCols]);

  const displayColumns = useMemo(
    () => visibleColumns.filter((c) => numericCols.includes(c)),
    [numericCols, visibleColumns],
  );

  const filtersByColumn = useMemo(() => {
    const map = {};
    displayColumns.forEach((col) => {
      map[col] = buildRangeFiltersExcluding(ranges, col);
    });
    return map;
  }, [displayColumns, ranges]);

  const filterKeysByColumn = useMemo(() => {
    const map = {};
    Object.entries(filtersByColumn).forEach(([col, filters]) => {
      map[col] = JSON.stringify(filters);
    });
    return map;
  }, [filtersByColumn]);

  const toggleColumn = (col) => {
    setVisibleColumns((prev) => {
      if (prev.includes(col)) {
        const next = prev.filter((c) => c !== col);
        if (!next.length) return prev;
        if (ranges[col]) {
          const { [col]: _removed, ...rest } = ranges;
          onChange(rest);
        }
        return next;
      }
      if (prev.length >= MAX_FILTER_HISTOGRAMS) return prev;
      return [...prev, col];
    });
  };

  const reset = () => onChange({});

  const setBand = (column, band) => {
    onChange({
      ...ranges,
      [column]: band,
    });
  };

  return (
    <section className="dataVis-filterBar" aria-label="Dataset filters">
      <header className="dataVis-filterBar__head">
        <span className="dataVis-filterBar__title">Filters</span>
        <span className="dataVis-filterBar__count">
          {filteredCount != null ? `${filteredCount} / ${totalCount} rows` : ''}
        </span>
        <span className="dataVis-filterBar__sep" aria-hidden>
          ·
        </span>
        <DataVisColumnChipMenu
          columns={numericCols}
          mode="multi"
          selectedMulti={visibleColumns}
          maxSelected={MAX_FILTER_HISTOGRAMS}
          buttonText="Choose columns"
          menuHint={`Green = histogram shown. Click to add or remove (max ${MAX_FILTER_HISTOGRAMS}).`}
          onToggle={toggleColumn}
        />
        <span className="dataVis-filterBar__sep" aria-hidden>
          ·
        </span>
        <span className="dataVis-filterBar__help">
          Drag a mini histogram to filter — highlight only, no zoom.
        </span>
        <button type="button" className="dataVis-filterBar__reset" onClick={reset}>
          Clear all
        </button>
      </header>
      <div
        className="dataVis-filterBar__grid dataVis-filterBar__grid--histograms"
        style={{
          gridTemplateColumns: `repeat(${Math.max(displayColumns.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {displayColumns.map((col) => {
          const st = statMap[col];
          return (
            <DataVisFilterMiniHistogram
              key={col}
              column={col}
              axisMin={st?.min}
              axisMax={st?.max}
              filtersKey={filterKeysByColumn[col]}
              filters={filtersByColumn[col]}
              band={ranges[col] || {}}
              onBandChange={(band) => setBand(col, band)}
            />
          );
        })}
      </div>
    </section>
  );
}
