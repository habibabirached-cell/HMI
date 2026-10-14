import React, { useEffect, useMemo, useState } from 'react';
import { HistogramSlot } from '../tabs/DataVisHistogramTab';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

export const QUAD_HISTOGRAM_DEFAULTS = [
  'Project LCOE ($/MWh)',
  'Year 1 Load Compliance (%)',
  'Solar AC Nameplate (MWac)',
  'Carbon Free Energy (%)',
];

export default function DataVisQuadHistogramGrid({
  gridId,
  filters,
  columnStats,
  parcoordsRanges,
  binCount,
  onBinCountChange,
  brushFilter = false,
  ranges = {},
  onRangesChange,
  sessionUniverseFilters = [],
}) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const [columns, setColumns] = useState(QUAD_HISTOGRAM_DEFAULTS);

  useEffect(() => {
    if (!numericCols.length) return;
    setColumns((prev) => {
      const next = prev.map((col, i) => {
        if (numericCols.includes(col)) return col;
        const fallback = QUAD_HISTOGRAM_DEFAULTS[i];
        if (fallback && numericCols.includes(fallback)) return fallback;
        return numericCols[i] || numericCols[0];
      });
      return next.every((c, i) => c === prev[i]) ? prev : next;
    });
  }, [numericCols]);

  const setColumnAt = (index) => (col) => {
    setColumns((prev) => {
      const next = [...prev];
      const prevCol = next[index];
      next[index] = col;
      if (brushFilter && onRangesChange && prevCol && prevCol !== col) {
        onRangesChange((prev) => {
          if (!prev?.[prevCol]) return prev;
          const { [prevCol]: _removed, ...rest } = prev;
          return rest;
        });
      }
      return next;
    });
  };

  const setBand = (column) => (band) => {
    if (!onRangesChange) return;
    onRangesChange((prev) => {
      const next = { ...(prev || {}), [column]: band };
      if (band?.min == null && band?.max == null) {
        const { [column]: _removed, ...rest } = next;
        return rest;
      }
      return next;
    });
  };

  return (
    <div className="dataVis-quadHistogramGrid">
      {columns.map((col, index) => (
        <HistogramSlot
          key={`${gridId}-hist-${index}-${col}`}
          slotLabel={`Hist ${index + 1}`}
          column={col}
          onSelectColumn={setColumnAt(index)}
          numericCols={numericCols}
          ranges={ranges}
          parcoordsRanges={parcoordsRanges}
          columnStats={columnStats}
          filters={filters}
          binCount={binCount}
          onBinCountChange={onBinCountChange}
          compact
          brushFilter={brushFilter}
          band={brushFilter ? ranges[col] || {} : undefined}
          onBandChange={brushFilter ? setBand(col) : undefined}
          sessionUniverseFilters={sessionUniverseFilters}
        />
      ))}
    </div>
  );
}
