import React, { useEffect, useMemo, useState } from 'react';
import WallBezelShell, { useWallBezelSplit } from '../../components/conf_WallBezelShell';
import DataVisDoeTab from '../tabs/DataVisDoeTab';
import { HistogramSlot } from '../tabs/DataVisHistogramTab';
import DataVisParallelTab from '../tabs/DataVisParallelTab';
import DataVisTableTab from '../tabs/DataVisTableTab';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

const DATAVIS_QUAD_SPLIT_KEY = 'dcs-dataVis-quad-split';

const QUAD_HISTOGRAM_DEFAULTS = [
  'Project LCOE ($/MWh)',
  'Year 1 Load Compliance (%)',
  'Solar AC Nameplate (MWac)',
  'Carbon Free Energy (%)',
];

function DataVisQuadPane({ title, children }) {
  return (
    <section className="dataVis-quadSlot" aria-label={title}>
      <header className="dataVis-quadSlot__head">{title}</header>
      <div className="dataVis-quadSlot__body">{children}</div>
    </section>
  );
}

function QuadHistogramGrid({ filters, columnStats }) {
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
      next[index] = col;
      return next;
    });
  };

  return (
    <div className="dataVis-quadHistogramGrid">
      {columns.map((col, index) => (
        <HistogramSlot
          key={`quad-hist-${index}`}
          slotLabel={`Hist ${index + 1}`}
          column={col}
          onSelectColumn={setColumnAt(index)}
          numericCols={numericCols}
          filters={filters}
          compact
        />
      ))}
    </div>
  );
}

export default function DataVisQuadLayout({ filters, meta, onSelectRowIds }) {
  const { split, setSplit, resetSplit } = useWallBezelSplit(DATAVIS_QUAD_SPLIT_KEY);

  return (
    <WallBezelShell
      split={split}
      setSplit={setSplit}
      resetSplit={resetSplit}
      shellClassName="dataVis-quadShell"
    >
      <DataVisQuadPane title="DOE Explorer">
        <DataVisDoeTab filters={filters} compact />
      </DataVisQuadPane>

      <DataVisQuadPane title="Parallel coordinates">
        <DataVisParallelTab
          filters={filters}
          defaults={meta.defaults}
          columnStats={meta.column_stats}
          compact
        />
      </DataVisQuadPane>

      <DataVisQuadPane title="Histograms">
        <QuadHistogramGrid filters={filters} columnStats={meta.column_stats} />
      </DataVisQuadPane>

      <DataVisQuadPane title="Table">
        <DataVisTableTab
          filters={filters}
          columnStats={meta.column_stats}
          onSelectRowIds={onSelectRowIds}
          compact
        />
      </DataVisQuadPane>
    </WallBezelShell>
  );
}
