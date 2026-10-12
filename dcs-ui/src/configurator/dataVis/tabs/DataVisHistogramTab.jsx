import React, { useEffect, useMemo, useState } from 'react';
import { postDataVisHistogram } from '../api/conf_dataVisApi';
import DataVisColumnChipMenu from '../components/DataVisColumnChipMenu';
import DataVisPlot from '../components/DataVisPlot';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

export function HistogramSlot({ slotLabel, column, onSelectColumn, numericCols, filters, compact = false }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!column) return undefined;
    let cancelled = false;
    setPayload(null);
    setError(null);
    postDataVisHistogram({ filters, column })
      .then((res) => {
        if (!cancelled) setPayload(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, column]);

  const plotData = useMemo(() => {
    if (!payload?.values?.length) return [];
    return [
      {
        type: 'histogram',
        x: payload.values,
        nbinsx: Math.min(40, Math.max(12, Math.round(Math.sqrt(payload.values.length)))),
        marker: { color: 'rgba(0, 105, 92, 0.82)', line: { color: '#004d40', width: 1 } },
        hovertemplate: 'Count=%{y}<extra></extra>',
      },
    ];
  }, [payload]);

  const chartHeight = compact
    ? Math.max(160, Math.round(window.innerHeight * 0.18))
    : Math.max(280, Math.round(window.innerHeight * 0.28));

  return (
    <section className="dataVis-histogramSlot" aria-label={slotLabel}>
      <div className="dataVis-histogramSlot__head">
        <h3 className="dataVis-sectionTitle">{slotLabel}</h3>
        <DataVisColumnChipMenu
          columns={numericCols}
          mode="single"
          selectedSingle={column}
          maxSelected={1}
          buttonText="Choose column"
          showMaxInButton={false}
          menuHint="Pick one numeric variable for this histogram."
          onSelect={onSelectColumn}
        />
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {!payload && !error && column && <p className="dataVis-muted">Loading histogram…</p>}
      {payload && (
        <div className="dataVis-chartBlock dataVis-chartBlock--histogram">
          <DataVisPlot
            data={plotData}
            layout={{
              title: {
                text: `${column} · ${payload.count} values (filtered)`,
                font: { size: 15 },
              },
              height: chartHeight,
              xaxis: { title: column },
              yaxis: { title: 'Count' },
              bargap: 0.04,
            }}
          />
        </div>
      )}
    </section>
  );
}

export default function DataVisHistogramTab({ filters, columnStats, compact = false }) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const [columnA, setColumnA] = useState('Project LCOE ($/MWh)');
  const [columnB, setColumnB] = useState('Solar AC Nameplate (MWac)');

  useEffect(() => {
    if (!numericCols.length) return;
    setColumnA((prev) => (numericCols.includes(prev) ? prev : numericCols[0]));
    setColumnB((prev) => {
      if (numericCols.includes(prev)) return prev;
      return numericCols[1] || numericCols[0];
    });
  }, [numericCols]);

  return (
    <div className={`dataVis-tabPanel dataVis-tabPanel--histogram${compact ? ' dataVis-tabPanel--compact' : ''}`}>
      <div className={compact ? 'dataVis-histogramGrid dataVis-histogramGrid--compact' : 'dataVis-histogramGrid'}>
        <HistogramSlot
          slotLabel={compact ? 'Hist 1' : 'Histogram 1'}
          column={columnA}
          onSelectColumn={setColumnA}
          numericCols={numericCols}
          filters={filters}
          compact={compact}
        />
        {!compact && (
        <HistogramSlot
          slotLabel="Histogram 2"
          column={columnB}
          onSelectColumn={setColumnB}
          numericCols={numericCols}
          filters={filters}
          compact={compact}
        />
        )}
      </div>
    </div>
  );
}
