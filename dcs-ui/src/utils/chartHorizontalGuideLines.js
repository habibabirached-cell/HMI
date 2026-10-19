/** Dashed horizontal limits (voltage, frequency) that stay on the plot. */

export function horizontalLinesFromChartDef(chartDef) {
  if (!Array.isArray(chartDef?.horizontal_lines)) return null;
  const lines = [];
  for (const row of chartDef.horizontal_lines) {
    const y = Number(row?.y);
    if (!Number.isFinite(y)) continue;
    lines.push({
      y,
      label: row?.label != null && String(row.label).trim() ? String(row.label).trim() : String(y),
    });
  }
  return lines.length ? lines : null;
}

function columnKeys(col) {
  const keys = [col];
  const split = String(col).split(' — ');
  if (split.length > 1) keys.push(split[split.length - 1]);
  return keys;
}

function dataYExtent(chart, rows) {
  const cols = [...(chart?.yColumns || []), chart?.yColumn].filter(Boolean);
  let min = Infinity;
  let max = -Infinity;
  if (!Array.isArray(rows) || !cols.length) return null;
  for (const row of rows) {
    for (const col of cols) {
      for (const key of columnKeys(col)) {
        const v = Number(row?.[key]);
        if (!Number.isFinite(v)) continue;
        min = Math.min(min, v);
        max = Math.max(max, v);
        break;
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

export function applyHorizontalGuideLinesLayout(layout, chart, rows) {
  const lines = Array.isArray(chart?.horizontalLines) ? chart.horizontalLines : [];
  const ys = lines.map((line) => Number(line?.y)).filter((y) => Number.isFinite(y));
  if (!layout?.yaxis || !ys.length) return layout;

  const shapes = ys.map((y) => ({
    type: 'line',
    xref: 'paper',
    yref: 'y',
    x0: 0,
    x1: 1,
    y0: y,
    y1: y,
    line: { color: '#f4f1ea', width: 1.5, dash: 'dash' },
    layer: 'above',
  }));
  const annotations = lines.map((line) => ({
    xref: 'paper',
    yref: 'y',
    x: 0.99,
    y: Number(line.y),
    xanchor: 'right',
    yanchor: 'bottom',
    text: line.label || String(line.y),
    showarrow: false,
    font: { family: 'Arial, sans-serif', size: 12, color: '#f4f1ea' },
  }));

  const yaxis = { ...layout.yaxis };
  if (!chart?.axisRange?.yLocked) {
    const extent = dataYExtent(chart, rows);
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (extent) {
      yMin = Math.min(yMin, extent.min);
      yMax = Math.max(yMax, extent.max);
    }
    const pad = Math.max((yMax - yMin) * 0.08, Math.abs(yMax) * 0.002, 0.002);
    yaxis.autorange = false;
    yaxis.range = [yMin - pad, yMax + pad];
  }

  return {
    ...layout,
    yaxis,
    shapes: [...(layout.shapes || []), ...shapes],
    annotations: [...(layout.annotations || []), ...annotations],
  };
}
