import React, { useEffect, useMemo, useState } from 'react';
import { postDataVisScatter } from '../api/conf_dataVisApi';
import DataVisColumnSelect from '../components/DataVisColumnSelect';
import DataVisPlot from '../components/DataVisPlot';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

export default function DataVisChartLabTab({ filters, defaults, columnStats }) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const [x, setX] = useState(defaults?.scatter?.x || numericCols[0]);
  const [y, setY] = useState(defaults?.scatter?.y || numericCols[1]);
  const [color, setColor] = useState(defaults?.scatter?.color || '');
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!x || !y) return;
    let cancelled = false;
    postDataVisScatter({
      filters,
      x,
      y,
      color: color || undefined,
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
  }, [filters, x, y, color]);

  const plotData = useMemo(() => {
    if (!payload) return [];
    const trace = {
      type: 'scattergl',
      mode: 'markers',
      x: payload.x,
      y: payload.y,
      marker: {
        size: 7,
        opacity: 0.75,
        color: payload.color || '#5ecfff',
        colorscale: 'Viridis',
        showscale: Boolean(payload.color),
        colorbar: { title: payload.color_label || '' },
      },
      text: (payload.row_ids || []).map((id) => `Row ${id}`),
      hovertemplate: `${payload.x_label}: %{x}<br>${payload.y_label}: %{y}<extra>%{text}</extra>`,
    };
    return [trace];
  }, [payload]);

  return (
    <div className="dataVis-tabPanel">
      <div className="dataVis-toolbar">
        <DataVisColumnSelect label="X" id="dataVis-scatter-x" value={x} options={numericCols} onChange={setX} />
        <DataVisColumnSelect label="Y" id="dataVis-scatter-y" value={y} options={numericCols} onChange={setY} />
        <label className="dataVis-field" htmlFor="dataVis-scatter-color">
          <span className="dataVis-field__label">Color</span>
          <select
            id="dataVis-scatter-color"
            value={color || '__none__'}
            onChange={(e) => setColor(e.target.value === '__none__' ? '' : e.target.value)}
          >
            <option value="__none__">None</option>
            {numericCols.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {!payload && !error && <p className="dataVis-muted">Loading scatter…</p>}
      {payload && (
        <div className="dataVis-chartBlock">
          <DataVisPlot
            data={plotData}
            layout={{
              title: { text: `${payload.y_label} vs ${payload.x_label}`, font: { size: 16 } },
              xaxis: { title: payload.x_label },
              yaxis: { title: payload.y_label },
              height: Math.max(420, Math.round(window.innerHeight * 0.52)),
            }}
          />
        </div>
      )}
    </div>
  );
}
