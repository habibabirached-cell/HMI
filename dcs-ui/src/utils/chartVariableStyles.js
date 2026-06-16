/**
 * Per-variable chart styling: color, intensity, rigid (full trace) vs progressive playback.
 */

import { cellFloat } from './csvRowAccess';

export const DEFAULT_CHART_COLORS = [
  '#005E60',
  '#FF6B35',
  '#4ECDC4',
  '#F7B731',
  '#5F27CD',
  '#00D2FF',
  '#C23616',
  '#0FB9B1',
];

export function defaultColorForIndex(index) {
  return DEFAULT_CHART_COLORS[Math.abs(index) % DEFAULT_CHART_COLORS.length];
}

/** Column keys used for y-axis traces on a chart card. */
export function getChartVariableKeys(chart) {
  if (!chart) return [];
  if (chart.yColumns?.length) return chart.yColumns;
  if (chart.yColumn) return [chart.yColumn];
  if (chart.isMultiComponent && chart.components?.length) {
    return chart.components.map((c) => c.columnName).filter(Boolean);
  }
  return [];
}

/** Charts that show a multi-trace legend (nD, stacked nD, multi-component). */
export function chartHasMultiTraceLegend(chart) {
  if (!chart) return false;
  if (chart.isMultiComponent && (chart.components?.length ?? 0) > 1) return true;
  if (chart.chartType === 'stacked-nd' && chart.yColumns?.length) return true;
  if (chart.chartType === 'nd' && chart.yColumns?.length > 1) return true;
  return false;
}

const LEGEND_XANCHORS = new Set(['auto', 'left', 'center', 'right']);
const LEGEND_YANCHORS = new Set(['auto', 'top', 'middle', 'bottom']);

/** Load saved legend position from charts_to_display / .sim.json. */
export function normalizeLegendPositionFromDef(def) {
  const p = def?.legend_position;
  if (!p || typeof p !== 'object') return undefined;
  const x = Number(p.x);
  const y = Number(p.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return {
    x,
    y,
    xanchor: LEGEND_XANCHORS.has(p.xanchor) ? p.xanchor : 'right',
    yanchor: LEGEND_YANCHORS.has(p.yanchor) ? p.yanchor : 'top',
  };
}

/** Serialize legend position for charts_to_display. */
export function compactLegendPositionForSave(pos) {
  if (!pos || typeof pos !== 'object') return null;
  const x = Number(pos.x);
  const y = Number(pos.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const out = { x, y };
  if (pos.xanchor && LEGEND_XANCHORS.has(pos.xanchor)) out.xanchor = pos.xanchor;
  if (pos.yanchor && LEGEND_YANCHORS.has(pos.yanchor)) out.yanchor = pos.yanchor;
  return out;
}

/** Merge Plotly relayout legend keys into a saved position object. */
export function legendPositionFromRelayout(relayout, current) {
  const base = current ?? { x: 0.99, y: 0.99, xanchor: 'right', yanchor: 'top' };
  const next = { ...base };
  if (relayout?.['legend.x'] != null) next.x = relayout['legend.x'];
  if (relayout?.['legend.y'] != null) next.y = relayout['legend.y'];
  if (relayout?.['legend.xanchor'] != null) next.xanchor = relayout['legend.xanchor'];
  if (relayout?.['legend.yanchor'] != null) next.yanchor = relayout['legend.yanchor'];
  return next;
}

export function defaultVariableStyle(index) {
  return {
    color: defaultColorForIndex(index),
    intensity: 1,
    rigid: false,
  };
}

function clampIntensity(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0.05, n));
}

export function resolveVariableStyle(chart, colKey, index) {
  const saved = chart?.variableStyles?.[colKey];
  const base = defaultVariableStyle(index);
  return {
    color: typeof saved?.color === 'string' && saved.color.trim() ? saved.color.trim() : base.color,
    intensity: clampIntensity(saved?.intensity ?? base.intensity),
    rigid: saved?.rigid === true,
  };
}

/** Parse #rgb / #rrggbb to { r, g, b }. */
function parseHexColor(hex) {
  const h = String(hex || '').trim().replace(/^#/, '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length >= 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return { r: 0, g: 94, b: 96 };
}

export function applyIntensityToColor(hex, intensity) {
  const { r, g, b } = parseHexColor(hex);
  const a = clampIntensity(intensity);
  return `rgba(${r},${g},${b},${a})`;
}

export function isVariableRigid(chart, colKey) {
  return chart?.variableStyles?.[colKey]?.rigid === true;
}

/** Minimum X (time) — points with x ≤ threshold are hidden when set. */
export function getChartXThreshold(chart) {
  const t = chart?.axisRange?.xThreshold;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function rowPassesXThreshold(row, xColumn, xThreshold) {
  if (xThreshold == null || !xColumn) return true;
  const xv = cellFloat(row, xColumn);
  return !Number.isNaN(xv) && xv > xThreshold;
}

/**
 * Filter + decimate rows for one trace. Rigid traces ignore simulationTime.
 */
export function sampleIndexedRowsForVariable({
  indexed,
  chart,
  colKey,
  index,
  xColumn,
  simulationRunning,
  simulationTime,
  sampleStep = 1,
}) {
  const { rigid } = resolveVariableStyle(chart, colKey, index);
  let filtered = indexed;
  if (!rigid && simulationRunning && simulationTime !== undefined && xColumn) {
    filtered = indexed.filter(({ row }) => {
      const xVal = cellFloat(row, xColumn);
      return !Number.isNaN(xVal) && xVal <= simulationTime;
    });
  }
  const xThr = getChartXThreshold(chart);
  if (xThr != null && xColumn) {
    filtered = filtered.filter(({ row }) => rowPassesXThreshold(row, xColumn, xThr));
  }
  const step = sampleStep > 1 ? sampleStep : 1;
  const sampled = step > 1 ? filtered.filter((_, i) => i % step === 0) : filtered;
  return {
    sampledData: sampled.map(({ row }) => row),
    sampledRowIndices: sampled.map(({ i }) => i),
  };
}

export function buildScatterMarkerStyle({
  lineColor,
  intensity,
  sampledRowIndices,
  selectedSet,
  hasSelection,
  baseMarkerOpacity = 0.7,
}) {
  const markerColor = applyIntensityToColor(lineColor, intensity);
  if (hasSelection) {
    return {
      color: sampledRowIndices.map((ri) =>
        selectedSet.has(ri) ? '#FFD700' : markerColor,
      ),
      size: sampledRowIndices.map((ri) => (selectedSet.has(ri) ? 10 : 4)),
      opacity: sampledRowIndices.map((ri) => (selectedSet.has(ri) ? 1 : 0.15)),
    };
  }
  return {
    color: markerColor,
    size: 4,
    opacity: clampIntensity(intensity) * baseMarkerOpacity,
  };
}

export function buildTraceLineStyle(chart, colKey, index) {
  const { color, intensity } = resolveVariableStyle(chart, colKey, index);
  return {
    color,
    intensity,
    line: {
      color: applyIntensityToColor(color, intensity),
      width: 2,
    },
  };
}

/** Seed editor state from chart + variable keys. */
export function seedVariableStylesForEditor(chart, yKeys) {
  return Object.fromEntries(
    yKeys.map((k, i) => {
      const resolved = resolveVariableStyle(chart, k, i);
      return [k, { color: resolved.color, intensity: resolved.intensity, rigid: resolved.rigid }];
    }),
  );
}

/** Persist only non-default entries. */
export function compactVariableStylesForSave(variableStyles, yKeys) {
  if (!variableStyles || !yKeys?.length) return undefined;
  const out = {};
  yKeys.forEach((k, i) => {
    const v = variableStyles[k];
    if (!v) return;
    const def = defaultVariableStyle(i);
    const entry = {};
    if (v.color && v.color !== def.color) entry.color = v.color;
    if (clampIntensity(v.intensity) !== def.intensity) entry.intensity = clampIntensity(v.intensity);
    if (v.rigid === true) entry.rigid = true;
    if (Object.keys(entry).length) out[k] = entry;
  });
  return Object.keys(out).length ? out : undefined;
}

export function normalizeVariableStylesFromDef(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k || !v || typeof v !== 'object') continue;
    const entry = {};
    if (typeof v.color === 'string' && v.color.trim()) entry.color = v.color.trim();
    if (v.intensity != null) entry.intensity = clampIntensity(v.intensity);
    if (v.rigid === true) entry.rigid = true;
    if (Object.keys(entry).length) out[k] = entry;
  }
  return Object.keys(out).length ? out : undefined;
}
