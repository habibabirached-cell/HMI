import { cellFloat, findColumnKey } from './csvRowAccess';
import { getChartXThreshold, resolveVariableStyle } from './chartVariableStyles';
import { getCrossMemberBindingsForChart } from './ensembleCrossMemberChart';

/** Danger Y level — alert when any plotted Y at the playhead is >= this value. */
export function getChartDangerYThreshold(chart) {
  const t = chart?.axisRange?.dangerYThreshold;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rowEligibleForPlayhead(row, chart, simulationTime) {
  const xCol = chart.xColumn;
  if (simulationTime !== undefined && xCol) {
    const xv = cellFloat(row, xCol);
    if (Number.isNaN(xv) || xv > simulationTime) return false;
  }
  const xThr = getChartXThreshold(chart);
  if (xThr != null && xCol) {
    const xv = cellFloat(row, xCol);
    if (Number.isNaN(xv) || xv <= xThr) return false;
  }
  return true;
}

function yValueAtOrAbove(row, yKey, y0) {
  const col = findColumnKey(row, yKey) ?? yKey;
  const yv = cellFloat(row, col);
  return !Number.isNaN(yv) && yv >= y0;
}

/** Y column keys for threshold checks (2D / nD / multi-component). */
export function collectChartYKeys(chart) {
  if (chart.chartType === 'pie' && chart.yColumns?.length) {
    return chart.yColumns;
  }
  if (
    (chart.chartType === 'nd' || chart.chartType === 'stacked-nd') &&
    chart.yColumns?.length
  ) {
    return chart.yColumns;
  }
  if (chart.isMultiComponent && chart.components?.length) {
    return chart.components.map((c) => c.columnName).filter(Boolean);
  }
  if (chart.yColumn) return [chart.yColumn];
  return [];
}

function exceedsInRows(rows, chart, yKeys, simulationTime, y0) {
  for (const row of rows) {
    if (!rowEligibleForPlayhead(row, chart, simulationTime)) continue;
    for (let i = 0; i < yKeys.length; i++) {
      const yKey = yKeys[i];
      if (resolveVariableStyle(chart, yKey, i).rigid) continue;
      if (yValueAtOrAbove(row, yKey, y0)) return true;
    }
  }
  return false;
}

function filterCrossMemberRowIndices(items, memberData, simulationRunning, simulationTime, xThreshold) {
  const nMin = Math.min(
    ...items.map((it) => memberData[it.simId]?.length ?? 0),
  );
  if (!Number.isFinite(nMin) || nMin <= 0) return [];
  let rowIdx = Array.from({ length: nMin }, (_, i) => i);
  if (simulationRunning && simulationTime !== undefined && items[0]) {
    const x0 = items[0];
    const rows = memberData[x0.simId];
    rowIdx = rowIdx.filter((i) => {
      const v = cellFloat(rows[i], x0.column);
      return !Number.isNaN(v) && v <= simulationTime;
    });
  }
  if (xThreshold != null && items[0]) {
    const x0 = items[0];
    const rows = memberData[x0.simId];
    rowIdx = rowIdx.filter((i) => {
      const v = cellFloat(rows[i], x0.column);
      return !Number.isNaN(v) && v > xThreshold;
    });
  }
  return rowIdx;
}

function exceedsInCrossMember(chart, memberData, simulationRunning, simulationTime, y0) {
  const items = getCrossMemberBindingsForChart(chart);
  if (!items?.length) return false;
  const yItems = items.slice(1);
  if (!yItems.length && chart.yColumn) {
    const parsed = items;
    const yPart = parsed.find((it) => it.column === chart.yColumn) || parsed[1];
    if (yPart) yItems.push(yPart);
  }
  const yKeys = collectChartYKeys(chart);
  const rowIdx = filterCrossMemberRowIndices(
    items,
    memberData,
    simulationRunning,
    simulationTime,
    getChartXThreshold(chart),
  );
  for (const i of rowIdx) {
    for (let j = 0; j < yItems.length; j++) {
      const colKey = yKeys[j] ?? yItems[j].column;
      if (resolveVariableStyle(chart, colKey, j).rigid) continue;
      const it = yItems[j];
      const rows = memberData[it.simId];
      if (!rows?.[i]) continue;
      const yv = cellFloat(rows[i], it.column);
      if (!Number.isNaN(yv) && yv >= y0) return true;
    }
  }
  return false;
}

/**
 * True while simulation is running when a non-rigid (progressive) trace at the playhead
 * has Y >= dangerYThreshold. Rigid full-trace curves do not trigger the amber alert.
 */
export function chartExceedsDangerYThreshold({
  chart,
  simulationRunning,
  simulationTime,
  data,
  ensembleMemberSimulationData,
}) {
  const y0 = getChartDangerYThreshold(chart);
  if (y0 == null || !simulationRunning || simulationTime === undefined) {
    return false;
  }

  if (chart.ensembleCrossMember && ensembleMemberSimulationData) {
    return exceedsInCrossMember(
      chart,
      ensembleMemberSimulationData,
      simulationRunning,
      simulationTime,
      y0,
    );
  }

  const yKeys = collectChartYKeys(chart);
  if (!yKeys.length || !data?.length) return false;
  return exceedsInRows(data, chart, yKeys, simulationTime, y0);
}

/** Plotly y-axis refs that exist on this layout (for stacked subplots). */
function plotlyYRefsFromLayout(layout) {
  const refs = new Set(['y']);
  for (const key of Object.keys(layout || {})) {
    if (key === 'yaxis') refs.add('y');
    else if (/^yaxis\d+$/.test(key)) {
      const n = key.slice('yaxis'.length);
      refs.add(n ? `y${n}` : 'y');
    }
  }
  return [...refs];
}

/** Amber horizontal reference line(s) at danger Y. */
export function applyDangerYThresholdLayout(layout, chart) {
  const y0 = getChartDangerYThreshold(chart);
  if (y0 == null || !layout) return layout;

  const lineForYref = (yref) => ({
    type: 'line',
    xref: 'paper',
    yref,
    x0: 0,
    x1: 1,
    y0: y0,
    y1: y0,
    line: { color: '#ff9800', width: 2 },
    layer: 'above',
  });

  const yrefs = plotlyYRefsFromLayout(layout);
  const dangerShapes = yrefs.map(lineForYref);
  return {
    ...layout,
    shapes: [...(layout.shapes || []), ...dangerShapes],
  };
}

/** Chart types that use a numeric Y axis for danger threshold. */
export function chartSupportsDangerYThreshold(chart) {
  if (!chart) return false;
  if (chart.chartType === 'histogram' || chart.chartType === 'heatmap') return false;
  if (chart.chartType === 'pie') return false;
  return Boolean(
    chart.yColumn ||
      chart.yColumns?.length ||
      chart.components?.length ||
      chart.ensembleCrossMember,
  );
}
