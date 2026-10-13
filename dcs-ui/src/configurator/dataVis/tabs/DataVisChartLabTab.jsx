import React, { useEffect, useMemo, useState } from 'react';
import { postDataVisScatter } from '../api/conf_dataVisApi';
import DataVisColumnSelect from '../components/DataVisColumnSelect';
import DataVisPlot from '../components/DataVisPlot';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

const COLOR_DIM = 'rgba(170, 178, 188, 0.28)';
const COLOR_HIGHLIGHT = '#00695c';

function rowIdsFromSelection(event, payload) {
  const fromCustom = event?.points
    ?.map((p) => p.customdata)
    .filter((id) => id != null && Number.isFinite(Number(id)));
  if (fromCustom?.length) return fromCustom.map(Number);

  const idxs = event?.points?.map((p) => p.pointIndex).filter((i) => Number.isInteger(i));
  if (idxs?.length && payload?.row_ids) {
    return idxs.map((i) => payload.row_ids[i]).filter((id) => id != null);
  }
  return [];
}

export function ScatterSlot({
  slotLabel,
  x,
  y,
  color,
  onXChange,
  onYChange,
  onColorChange,
  numericCols,
  plotContextFilters = [],
  highlightRowIds = null,
  onScatterRowIdsChange,
  compact = false,
}) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  const highlightSet = useMemo(() => {
    if (!highlightRowIds?.length) return null;
    return new Set(highlightRowIds);
  }, [highlightRowIds]);

  useEffect(() => {
    if (!x || !y) return undefined;
    let cancelled = false;
    setPayload(null);
    setError(null);
    postDataVisScatter({
      filters: plotContextFilters,
      x,
      y,
      color: color || undefined,
      max_points: compact ? 2500 : 5000,
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
  }, [color, compact, plotContextFilters, x, y]);

  const plotData = useMemo(() => {
    if (!payload) return [];
    const rowIds = payload.row_ids || [];
    const useDim = highlightSet != null;
    const colorValues = payload.color;
    const markerColors = rowIds.map((id, i) => {
      if (!useDim || highlightSet.has(id)) {
        if (colorValues && colorValues[i] != null) return colorValues[i];
        return COLOR_HIGHLIGHT;
      }
      return COLOR_DIM;
    });
    const sizes = rowIds.map((id) => (useDim && !highlightSet.has(id) ? 4 : compact ? 6 : 7));

    return [
      {
        type: 'scattergl',
        mode: 'markers',
        x: payload.x,
        y: payload.y,
        customdata: rowIds,
        marker: {
          size: sizes,
          opacity: useDim ? 0.9 : 0.78,
          color: markerColors,
          colorscale: colorValues && !useDim ? 'Viridis' : undefined,
          showscale: Boolean(colorValues) && !useDim && !compact,
          colorbar: compact ? undefined : { title: payload.color_label || '' },
        },
        text: rowIds.map((id) => `Row ${id}`),
        hovertemplate: `${payload.x_label}: %{x}<br>${payload.y_label}: %{y}<extra>%{text}</extra>`,
      },
    ];
  }, [compact, highlightSet, payload]);

  const chartHeight = compact
    ? Math.max(150, Math.round(window.innerHeight * 0.17))
    : Math.max(420, Math.round(window.innerHeight * 0.52));

  const fieldClass = compact ? 'dataVis-field dataVis-field--compact' : 'dataVis-field';

  const applyScatterSelection = (event) => {
    if (!onScatterRowIdsChange || !payload) return;
    const ids = rowIdsFromSelection(event, payload);
    if (!ids.length) return;
    onScatterRowIdsChange(ids);
  };

  return (
    <section className="dataVis-scatterSlot" aria-label={slotLabel}>
      <div className="dataVis-scatterSlot__head">
        <h3 className="dataVis-sectionTitle">{slotLabel}</h3>
        <div className="dataVis-scatterSlot__axes">
          <DataVisColumnSelect
            label="X"
            id={`${slotLabel}-x`}
            value={x}
            options={numericCols}
            onChange={onXChange}
            className={fieldClass}
          />
          <DataVisColumnSelect
            label="Y"
            id={`${slotLabel}-y`}
            value={y}
            options={numericCols}
            onChange={onYChange}
            className={fieldClass}
          />
          {!compact ? (
            <label className={fieldClass} htmlFor={`${slotLabel}-color`}>
              <span className="dataVis-field__label">Color</span>
              <select
                id={`${slotLabel}-color`}
                value={color || '__none__'}
                onChange={(e) => onColorChange(e.target.value === '__none__' ? '' : e.target.value)}
              >
                <option value="__none__">None</option>
                {numericCols.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={fieldClass} htmlFor={`${slotLabel}-color`}>
              <span className="dataVis-field__label">C</span>
              <select
                id={`${slotLabel}-color`}
                value={color || '__none__'}
                onChange={(e) => onColorChange(e.target.value === '__none__' ? '' : e.target.value)}
              >
                <option value="__none__">—</option>
                {numericCols.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.length > 18 ? `${opt.slice(0, 16)}…` : opt}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {!payload && !error && x && y && <p className="dataVis-muted">Loading…</p>}
      {payload && (
        <div className="dataVis-chartBlock dataVis-chartBlock--scatter">
          <DataVisPlot
            data={plotData}
            layout={{
              title: compact
                ? undefined
                : { text: `${payload.y_label} vs ${payload.x_label}`, font: { size: 16 } },
              margin: compact ? { l: 40, r: 8, t: 8, b: 36 } : undefined,
              dragmode: onScatterRowIdsChange ? 'select' : false,
              selectdirection: 'any',
              xaxis: {
                title: compact ? { text: payload.x_label, font: { size: 10 } } : payload.x_label,
                tickfont: compact ? { size: 9 } : undefined,
                fixedrange: false,
                autorange: true,
              },
              yaxis: {
                title: compact ? { text: payload.y_label, font: { size: 10 } } : payload.y_label,
                tickfont: compact ? { size: 9 } : undefined,
                fixedrange: false,
                autorange: true,
              },
              height: chartHeight,
            }}
            config={{ displayModeBar: false, responsive: true, scrollZoom: false }}
            style={{ minHeight: compact ? chartHeight : undefined }}
            onSelected={onScatterRowIdsChange ? applyScatterSelection : undefined}
            onDeselect={onScatterRowIdsChange ? () => onScatterRowIdsChange(null) : undefined}
          />
        </div>
      )}
    </section>
  );
}

export default function DataVisChartLabTab({
  plotContextFilters = [],
  highlightRowIds = null,
  onScatterRowIdsChange,
  defaults,
  columnStats,
}) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const scatterDefaults = defaults?.scatter || {};
  const [x, setX] = useState(scatterDefaults.x || numericCols[0]);
  const [y, setY] = useState(scatterDefaults.y || numericCols[1]);
  const [color, setColor] = useState(scatterDefaults.color || '');

  useEffect(() => {
    if (!numericCols.length) return;
    setX((prev) => (numericCols.includes(prev) ? prev : numericCols[0]));
    setY((prev) => {
      if (numericCols.includes(prev)) return prev;
      return numericCols[1] || numericCols[0];
    });
  }, [numericCols]);

  return (
    <div className="dataVis-tabPanel">
      <ScatterSlot
        slotLabel="Scatter"
        x={x}
        y={y}
        color={color}
        onXChange={setX}
        onYChange={setY}
        onColorChange={setColor}
        numericCols={numericCols}
        plotContextFilters={plotContextFilters}
        highlightRowIds={highlightRowIds}
        onScatterRowIdsChange={onScatterRowIdsChange}
        compact={false}
      />
    </div>
  );
}
