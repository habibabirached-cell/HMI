import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

function normalizeAxis(axis, tickFont) {
  const base = {
    gridcolor: 'rgba(31,41,51,0.12)',
    linecolor: '#5f6b7a',
    tickfont: { size: tickFont.size, color: '#1f2933' },
    ...(axis || {}),
  };
  const rawTitle = axis?.title;
  if (rawTitle != null && typeof rawTitle === 'string') {
    base.title = {
      text: rawTitle,
      standoff: 18,
      font: { size: 15, color: '#1f2933' },
    };
  } else if (rawTitle && typeof rawTitle === 'object') {
    base.title = {
      standoff: 18,
      font: { size: 15, color: '#1f2933' },
      ...rawTitle,
    };
  }
  return base;
}

const DEFAULT_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: '#f8fafc',
  font: { color: '#1f2933', size: 14 },
  margin: { l: 64, r: 24, t: 48, b: 88 },
  coloraxis: { colorbar: { tickfont: { color: '#1f2933', size: 13 } } },
};

export default function DataVisPlot({
  data,
  layout,
  config,
  className,
  style,
  useResizeHandler = true,
  onRelayout,
  onRestyle,
  onInitialized,
  onPurge,
  onUpdate,
  onSelected,
  onDeselect,
}) {
  const mergedLayout = useMemo(
    () => ({
      ...DEFAULT_LAYOUT,
      ...layout,
      xaxis: normalizeAxis(layout?.xaxis, { size: 13 }),
      yaxis: normalizeAxis(layout?.yaxis, { size: 13 }),
    }),
    [layout],
  );

  return (
    <Plot
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 320, ...style }}
      data={data}
      layout={mergedLayout}
      config={{
        displayModeBar: true,
        responsive: true,
        displaylogo: false,
        ...config,
      }}
      useResizeHandler={useResizeHandler}
      onRelayout={onRelayout}
      onRestyle={onRestyle}
      onInitialized={onInitialized}
      onPurge={onPurge}
      onUpdate={onUpdate}
      onSelected={onSelected}
      onDeselect={onDeselect}
    />
  );
}
