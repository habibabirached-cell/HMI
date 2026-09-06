/**
 * Build Plotly traces for ensemble charts where each axis/series may come from a different member scenario.
 * Rows are aligned by index (0..n-1) across members, like a virtual join on row number.
 */
import { ENSEMBLE_COLUMN_SEP, parseEnsembleColumnSelections } from './simulationLazyApi';
import { cellFloat, findColumnKey } from './csvRowAccess';
import {
  buildScatterMarkerStyle,
  buildTraceLineStyle,
  DEFAULT_CHART_COLORS,
  getChartXThreshold,
  getChartSimulationStartAt,
  resolveVariableStyle,
} from './chartVariableStyles';

export function getCrossMemberBindingsForChart(chart) {
  const parts = [chart.xColumn, chart.yColumn, ...(chart.yColumns || [])].filter(
    (x) => x != null && x !== '',
  );
  if (!parts.length) return null;
  return parseEnsembleColumnSelections(parts)?.items ?? null;
}

export function crossMemberDataReady(chart, ensembleMemberSimulationData) {
  if (!chart?.ensembleCrossMember || !ensembleMemberSimulationData) {
    return false;
  }
  const items = getCrossMemberBindingsForChart(chart);
  if (!items?.length) {
    return false;
  }
  for (const { simId, column } of items) {
    const rows = ensembleMemberSimulationData[simId];
    if (!rows?.length) {
      return false;
    }
    if (column && findColumnKey(rows[0], column) == null) {
      return false;
    }
  }
  return true;
}

/** X member’s row count for layout / uirevision when no single merged table exists. */
export function crossMemberReferenceLength(chart, ensembleMemberSimulationData) {
  const items = getCrossMemberBindingsForChart(chart);
  if (!items?.length) return 0;
  const { simId } = items[0];
  return ensembleMemberSimulationData?.[simId]?.length ?? 0;
}

/** For Plotly layout / uirevision: one member’s row array (X axis) when there is no merged table. */
export function layoutDataForEnsembleCrossChart(chart, memberData) {
  const items = getCrossMemberBindingsForChart(chart);
  if (!items?.length) return [];
  return memberData?.[items[0].simId] || [];
}

function buildSteppedRowIndices(
  nMin,
  items,
  memberData,
  simulationRunning,
  simulationTime,
  sampleStep,
  rigid = false,
  xThreshold = null,
  simulationStartAt = null,
) {
  let rowIdx = Array.from({ length: nMin }, (_, i) => i);
  if (!rigid && simulationRunning && simulationTime !== undefined) {
    const x0 = items[0];
    const rows = memberData[x0.simId];
    const startAt = simulationStartAt ?? 0;
    rowIdx = rowIdx.filter((i) => {
      const v = cellFloat(rows[i], x0.column);
      return !Number.isNaN(v) && v >= startAt && v <= simulationTime;
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
  const step = sampleStep > 1 ? sampleStep : 1;
  if (step > 1) {
    rowIdx = rowIdx.filter((_, j) => j % step === 0);
  }
  return rowIdx;
}

function mapYForIndices(rowIdx, simId, column, memberData) {
  const rows = memberData[simId];
  return rowIdx.map((i) => cellFloat(rows[i], column) || 0);
}

function mapXForIndices(rowIdx, simId, column, memberData) {
  const rows = memberData[simId];
  return rowIdx.map((i) => cellFloat(rows[i], column) || 0);
}

/**
 * @param {object} params
 * @param {object} params.chart
 * @param {Record<string, object[]>} params.memberData
 * @param {number} [params.sampleStep]
 * @param {boolean} [params.simulationRunning]
 * @param {number} [params.simulationTime]
 * @param {Set<number>|Set} [params.selectedRowIndices]
 * @param {string} [params.lineColor]
 */
export function buildCross2dTraces({
  chart,
  memberData,
  sampleStep = 1,
  simulationRunning,
  simulationTime,
  selectedRowIndices,
  lineColor = '#005E60',
}) {
  const items = getCrossMemberBindingsForChart(chart);
  if (!items || items.length < 2) {
    return [];
  }
  const lens = items.map(({ simId }) => memberData[simId]?.length ?? 0);
  const nMin = Math.min(...lens);
  if (nMin <= 0) {
    return [];
  }
  const [xb, yb] = [items[0], items[1]];
  const yKey = chart.yColumn || yb.column;
  const style = buildTraceLineStyle(chart, yKey, 0);
  const rigid = resolveVariableStyle(chart, yKey, 0).rigid;
  const xThreshold = getChartXThreshold(chart);
  const rowIdx = buildSteppedRowIndices(
    nMin,
    items,
    memberData,
    simulationRunning,
    simulationTime,
    sampleStep,
    rigid,
    xThreshold,
    getChartSimulationStartAt(chart),
  );
  const xValues = mapXForIndices(rowIdx, xb.simId, xb.column, memberData);
  const yValues = mapYForIndices(rowIdx, yb.simId, yb.column, memberData);
  const hasSelection = selectedRowIndices && selectedRowIndices.size > 0;
  const selectedSet = selectedRowIndices instanceof Set ? selectedRowIndices : new Set(selectedRowIndices || []);
  const traceColor = style.color || lineColor;
  return [
    {
      x: xValues,
      y: yValues,
      customdata: rowIdx,
      type: 'scatter',
      mode: 'lines+markers',
      name: chart.componentName,
      line: style.line,
      marker: buildScatterMarkerStyle({
        lineColor: traceColor,
        intensity: style.intensity,
        sampledRowIndices: rowIdx,
        selectedSet,
        hasSelection,
      }),
    },
  ];
}

/**
 * nD: first binding = X, rest = Y traces.
 */
export function buildCrossNdTraces({
  chart,
  memberData,
  sampleStep = 1,
  simulationRunning,
  simulationTime,
  selectedRowIndices,
}) {
  const items = getCrossMemberBindingsForChart(chart);
  if (!items || items.length < 2) return [];
  const nMin = Math.min(...items.map(({ simId }) => memberData[simId]?.length ?? 0));
  if (nMin <= 0) return [];
  const [xItem, ...yItems] = items;
  const xThreshold = getChartXThreshold(chart);
  const hasSelection = selectedRowIndices && selectedRowIndices.size > 0;
  const selectedSet = selectedRowIndices instanceof Set ? selectedRowIndices : new Set(selectedRowIndices || []);

  return yItems.map((yb, index) => {
    const yKey = chart.yColumns?.[index] ?? yb.column;
    const style = buildTraceLineStyle(chart, yKey, index);
    const rigid = resolveVariableStyle(chart, yKey, index).rigid;
    const rowIdx = buildSteppedRowIndices(
      nMin,
      items,
      memberData,
      simulationRunning,
      simulationTime,
      sampleStep,
      rigid,
      xThreshold,
      getChartSimulationStartAt(chart),
    );
    const xValues = mapXForIndices(rowIdx, xItem.simId, xItem.column, memberData);
    const yValues = mapYForIndices(rowIdx, yb.simId, yb.column, memberData);
    const yLabel = chart.legendLabels?.[yKey] ?? yKey;
    return {
      x: xValues,
      y: yValues,
      customdata: rowIdx,
      type: 'scatter',
      mode: 'lines+markers',
      name: yLabel,
      line: style.line,
      marker: buildScatterMarkerStyle({
        lineColor: style.color,
        intensity: style.intensity,
        sampledRowIndices: rowIdx,
        selectedSet,
        hasSelection,
      }),
    };
  });
}

/**
 * Stacked nD: same as generateStackedNdChartData but Y columns may live on different members; X is row 0’s column.
 * `groupFn` = (yColumns, splitBy, manualGroupBreaks) => groups
 */
export function buildCrossStackedNdTraces({
  chart,
  memberData,
  sampleStep = 1,
  simulationRunning,
  simulationTime,
  selectedRowIndices,
  groupFn,
}) {
  const items = getCrossMemberBindingsForChart(chart);
  if (!items || items.length < 2) return [];
  const nMin = Math.min(...items.map(({ simId }) => memberData[simId]?.length ?? 0));
  if (nMin <= 0) return [];
  const [xItem, ...yItems] = items;
  const yColsQ = chart.yColumns || [];
  const yLabelToItem = new Map();
  for (let j = 0; j < yItems.length; j += 1) {
    yLabelToItem.set(yColsQ[j] || yItems[j].column, yItems[j]);
  }
  const groups = groupFn(yColsQ, chart.splitBy || 'phase', chart.manualGroupBreaks);
  if (!groups.length) return [];
  const xThreshold = getChartXThreshold(chart);
  const hasSelection = selectedRowIndices && selectedRowIndices.size > 0;
  const selectedSet = selectedRowIndices instanceof Set ? selectedRowIndices : new Set(selectedRowIndices || []);
  const traces = [];
  groups.forEach((grp, gIdx) => {
    const yAxis = gIdx === 0 ? 'y' : `y${gIdx + 1}`;
    grp.cols.forEach((yColKey, colIdx) => {
      const yb = yLabelToItem.get(yColKey);
      if (!yb) return;
      const style = buildTraceLineStyle(chart, yColKey, colIdx);
      const rigid = resolveVariableStyle(chart, yColKey, colIdx).rigid;
      const traceRowIdx = buildSteppedRowIndices(
        nMin,
        items,
        memberData,
        simulationRunning,
        simulationTime,
        sampleStep,
        rigid,
        xThreshold,
        getChartSimulationStartAt(chart),
      );
      const traceX = mapXForIndices(traceRowIdx, xItem.simId, xItem.column, memberData);
      const yValues = mapYForIndices(traceRowIdx, yb.simId, yb.column, memberData);
      const traceName = chart.legendLabels?.[yColKey] ?? yColKey;
      traces.push({
        x: traceX,
        y: yValues,
        customdata: traceRowIdx,
        type: 'scatter',
        mode: 'lines+markers',
        name: traceName,
        xaxis: 'x',
        yaxis: yAxis,
        line: style.line,
        marker: buildScatterMarkerStyle({
          lineColor: style.color,
          intensity: style.intensity,
          sampledRowIndices: traceRowIdx,
          selectedSet,
          hasSelection,
        }),
      });
      });
  });
  return traces;
}

/** Multi-line: timeColumn = items[0], one trace per component. X always from the time column at i. */
export function buildCrossMultiLineTraces({
  chart,
  memberData,
  sampleStep = 1,
  simulationRunning,
  simulationTime,
  selectedRowIndices,
}) {
  const tq = chart.timeColumn;
  const compCols = (chart.components || []).map((c) => c.columnName).filter(Boolean);
  if (!tq || !compCols.length) return [];
  const allStrings = [tq, ...compCols].filter(Boolean);
  const items = parseEnsembleColumnSelections(allStrings)?.items;
  if (!items || items.length < 2) return [];
  const nMin = Math.min(...items.map(({ simId }) => memberData[simId]?.length ?? 0));
  if (nMin <= 0) return [];
  const [tItem, ...yItems] = items;
  const xThreshold = getChartXThreshold(chart);
  const hasSelection = selectedRowIndices && selectedRowIndices.size > 0;
  const selectedSet = selectedRowIndices instanceof Set ? selectedRowIndices : new Set(selectedRowIndices || []);
  return (chart.components || []).map((comp, index) => {
    const yb = yItems[index];
    if (!yb) return null;
    const colKey = comp.columnName;
    const style = buildTraceLineStyle(chart, colKey, index);
    const rigid = resolveVariableStyle(chart, colKey, index).rigid;
    const rowIdx = buildSteppedRowIndices(
      nMin,
      items,
      memberData,
      simulationRunning,
      simulationTime,
      sampleStep,
      rigid,
      xThreshold,
      getChartSimulationStartAt(chart),
    );
    const xValues = mapXForIndices(rowIdx, tItem.simId, tItem.column, memberData);
    const yValues = mapYForIndices(rowIdx, yb.simId, yb.column, memberData);
    return {
      x: xValues,
      y: yValues,
      customdata: rowIdx,
      type: 'scatter',
      mode: 'lines+markers',
      name: comp.name,
      line: style.line,
      marker: buildScatterMarkerStyle({
        lineColor: style.color,
        intensity: style.intensity,
        sampledRowIndices: rowIdx,
        selectedSet,
        hasSelection,
      }),
    };
  }).filter(Boolean);
}

function sliceCrossMemberColumnLabel(column) {
  const idx = column.indexOf(ENSEMBLE_COLUMN_SEP);
  return idx >= 0 ? column.slice(idx + ENSEMBLE_COLUMN_SEP.length).trim() : column;
}

/** One pie trace: slices from one row across members (aligned by row index); updates with playback time on X. */
export function buildCrossPieTraces({ chart, memberData, simulationRunning, simulationTime }) {
  const items = getCrossMemberBindingsForChart(chart);
  if (!items || items.length < 2) return [];
  const lens = items.map(({ simId }) => memberData[simId]?.length ?? 0);
  const nMin = Math.min(...lens);
  if (nMin <= 0) return [];

  const xItem = items[0];
  const yItems = items.slice(1);
  const xThreshold = getChartXThreshold(chart);
  const simulationStartAt = getChartSimulationStartAt(chart);

  let rowIndex = 0;
  let bestTime = -Infinity;
  const rows = memberData[xItem.simId];
  if (simulationRunning && simulationTime !== undefined) {
    for (let i = 0; i < nMin; i++) {
      const xv = cellFloat(rows[i], xItem.column);
      if (Number.isNaN(xv)) continue;
      if (xThreshold != null && xv <= xThreshold) continue;
      if (xv < simulationStartAt) continue;
      if (xv <= simulationTime && xv >= bestTime) {
        bestTime = xv;
        rowIndex = i;
      }
    }
    if (bestTime === -Infinity) return [];
  } else if (xThreshold != null) {
    let found = false;
    for (let i = 0; i < nMin; i++) {
      const xv = cellFloat(rows[i], xItem.column);
      if (!Number.isNaN(xv) && xv > xThreshold) {
        rowIndex = i;
        found = true;
        break;
      }
    }
    if (!found) return [];
  }

  const labels = yItems.map(({ column }) => sliceCrossMemberColumnLabel(column));
  let values = yItems.map(({ simId, column }) => {
    const v = cellFloat(memberData[simId][rowIndex], column);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  });
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) values = values.map(() => 1 / Math.max(1, values.length));

  return [
    {
      type: 'pie',
      labels,
      values,
      marker: {
        colors: DEFAULT_CHART_COLORS.slice(0, Math.max(labels.length, 1)),
      },
      textinfo: 'label+percent',
      hovertemplate:
        '<b>%{label}</b><br>%{percent}<br>value %{value}<extra></extra>',
      textfont: { color: '#fff', size: 12 },
    },
  ];
}
