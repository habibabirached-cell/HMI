import React, { useEffect, useMemo, useState } from 'react';
import { postDataVisParallel } from '../api/conf_dataVisApi';
import DataVisPlot from '../components/DataVisPlot';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

export default function DataVisParallelTab({ filters, defaults, columnStats }) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const defaultDims = defaults?.parallel_dimensions || numericCols.slice(0, 6);
  const [dimensions, setDimensions] = useState(defaultDims);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dimensions?.length) return;
    let cancelled = false;
    postDataVisParallel({
      filters,
      dimensions,
      color: 'Project LCOE ($/MWh)',
      max_rows: 2000,
    })
      .then((res) => {
        if (!cancelled) setPayload(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, dimensions]);

  const plotData = useMemo(() => {
    if (!payload) return [];
    const dims = payload.dimensions || [];
    const line = {
      type: 'parcoords',
      line: {
        color: payload.color || dims.map(() => 0),
        colorscale: 'Viridis',
        showscale: Boolean(payload.color),
        cmin: payload.color ? Math.min(...payload.color.filter((v) => v != null)) : undefined,
        cmax: payload.color ? Math.max(...payload.color.filter((v) => v != null)) : undefined,
      },
      dimensions: dims.map((key) => ({
        label: key,
        values: payload.values[key],
      })),
    };
    return [line];
  }, [payload]);

  const toggleDim = (col) => {
    setDimensions((prev) => {
      if (prev.includes(col)) return prev.filter((c) => c !== col);
      if (prev.length >= 8) return prev;
      return [...prev, col];
    });
  };

  return (
    <div className="dataVis-tabPanel">
      <p className="dataVis-muted">Select up to 8 numeric dimensions (parallel coordinates).</p>
      <div className="dataVis-chipRow">
        {numericCols.map((col) => (
          <button
            key={col}
            type="button"
            className={`dataVis-chip ${dimensions.includes(col) ? 'dataVis-chip--on' : ''}`}
            onClick={() => toggleDim(col)}
          >
            {col}
          </button>
        ))}
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {!payload && !error && <p className="dataVis-muted">Loading parallel coords…</p>}
      {payload && (
        <div className="dataVis-chartBlock">
          <DataVisPlot
            data={plotData}
            layout={{
              title: { text: 'Parallel coordinates', font: { size: 16 } },
              height: Math.max(440, Math.round(window.innerHeight * 0.55)),
            }}
          />
        </div>
      )}
    </div>
  );
}
