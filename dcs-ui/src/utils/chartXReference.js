/** Fixed vertical reference line at X (e.g. frequency = 21 Hz). */
export function getChartXReference(chart) {
  const t = chart?.axisRange?.xReference;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Vertical reference line(s) at axisRange.xReference. */
export function applyXReferenceLayout(layout, chart) {
  const x0 = getChartXReference(chart);
  if (x0 == null || !layout) return layout;

  const refShape = {
    type: 'line',
    xref: 'x',
    yref: 'paper',
    x0,
    x1: x0,
    y0: 0,
    y1: 1,
    line: { color: '#e040fb', width: 2, dash: 'dash' },
    layer: 'above',
  };

  return {
    ...layout,
    shapes: [...(layout.shapes || []), refShape],
  };
}
