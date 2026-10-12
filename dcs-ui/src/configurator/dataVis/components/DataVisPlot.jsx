import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

const DEFAULT_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: '#f8fafc',
  font: { color: '#1f2933', size: 14 },
  margin: { l: 56, r: 24, t: 40, b: 52 },
  coloraxis: { colorbar: { tickfont: { color: '#1f2933', size: 13 } } },
};

export default function DataVisPlot({ data, layout, config, className, style }) {
  const mergedLayout = useMemo(
    () => ({
      ...DEFAULT_LAYOUT,
      ...layout,
      xaxis: {
        gridcolor: 'rgba(31,41,51,0.12)',
        linecolor: '#5f6b7a',
        tickfont: { size: 13, color: '#1f2933' },
        titlefont: { size: 14, color: '#1f2933' },
        ...layout?.xaxis,
      },
      yaxis: {
        gridcolor: 'rgba(31,41,51,0.12)',
        linecolor: '#5f6b7a',
        tickfont: { size: 13, color: '#1f2933' },
        titlefont: { size: 14, color: '#1f2933' },
        ...layout?.yaxis,
      },
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
      useResizeHandler
    />
  );
}
