import React, { useEffect, useMemo, useState } from 'react';
import { postDataVisHeatmap } from '../api/conf_dataVisApi';
import DataVisColumnSelect from '../components/DataVisColumnSelect';
import DataVisPlot from '../components/DataVisPlot';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

export default function DataVisHeatmapTab({ filters, defaults, columnStats }) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const [x, setX] = useState(defaults?.heatmap?.x || numericCols[0]);
  const [y, setY] = useState(defaults?.heatmap?.y || numericCols[1]);
  const [z, setZ] = useState(defaults?.heatmap?.z || numericCols[2]);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!x || !y || !z) return;
    let cancelled = false;
    postDataVisHeatmap({ filters, x, y, z, agg: 'mean' })
      .then((res) => {
        if (!cancelled) setPayload(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, x, y, z]);

  const plotData = useMemo(() => {
    if (!payload?.z?.length) return [];
    return [
      {
        type: 'heatmap',
        x: payload.x,
        y: payload.y,
        z: payload.z,
        colorscale: 'Turbo',
        colorbar: { title: payload.z_label },
      },
    ];
  }, [payload]);

  return (
    <div className="dataVis-tabPanel">
      <div className="dataVis-toolbar">
        <DataVisColumnSelect label="X (bins)" id="dataVis-hm-x" value={x} options={numericCols} onChange={setX} />
        <DataVisColumnSelect label="Y (bins)" id="dataVis-hm-y" value={y} options={numericCols} onChange={setY} />
        <DataVisColumnSelect label="Z (mean)" id="dataVis-hm-z" value={z} options={numericCols} onChange={setZ} />
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {!payload && !error && <p className="dataVis-muted">Loading heatmap…</p>}
      {payload && (
        <div className="dataVis-chartBlock">
          <DataVisPlot
            data={plotData}
            layout={{
              title: { text: `Mean ${payload.z_label}`, font: { size: 16 } },
              xaxis: { title: payload.x_label, tickangle: -45 },
              yaxis: { title: payload.y_label },
              height: Math.max(420, Math.round(window.innerHeight * 0.52)),
            }}
          />
        </div>
      )}
    </div>
  );
}
