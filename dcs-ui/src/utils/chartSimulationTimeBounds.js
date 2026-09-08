import { pickTimeColumn, parseEnsembleQualifiedColumn } from './simulationLazyApi';
import { cellFloat, findColumnKey } from './csvRowAccess';
import { getCrossMemberBindingsForChart } from './ensembleCrossMemberChart';

function resolveTimeColumnName(chart, sampleRow) {
  if (!sampleRow) return null;
  const candidates = [chart?.xColumn, chart?.timeColumn].filter(Boolean);
  for (const c of candidates) {
    const direct = findColumnKey(sampleRow, c);
    if (direct) return direct;
    const parsed = parseEnsembleQualifiedColumn(c);
    if (parsed?.column) {
      const raw = findColumnKey(sampleRow, parsed.column);
      if (raw) return raw;
    }
  }
  return pickTimeColumn(Object.keys(sampleRow));
}

function boundsFromRows(rows, timeCol) {
  if (!rows?.length || !timeCol) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const v = cellFloat(row, timeCol);
    if (!Number.isNaN(v)) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

/**
 * Min/max time (seconds) on the data source this chart reads during playback.
 * @param {object} chart
 * @param {{ simulationMetadata?, simulationData?, ensembleMemberSimulationData? }} ctx
 */
export function resolveChartDataTimeBounds(chart, ctx = {}) {
  const { simulationMetadata, simulationData, ensembleMemberSimulationData } = ctx;

  if (chart?.ensembleCrossMember && ensembleMemberSimulationData) {
    const items = getCrossMemberBindingsForChart(chart);
    if (!items?.length) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const { simId, column } of items) {
      const rows = ensembleMemberSimulationData[simId];
      if (!rows?.length) continue;
      const tc = findColumnKey(rows[0], column) || column;
      const b = boundsFromRows(rows, tc);
      if (!b) continue;
      min = Math.min(min, b.min);
      max = Math.max(max, b.max);
    }
    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max };
    return null;
  }

  let rows = null;
  if (chart?.ensembleSimId && ensembleMemberSimulationData?.[chart.ensembleSimId]?.length) {
    rows = ensembleMemberSimulationData[chart.ensembleSimId];
  } else if (simulationData?.length) {
    rows = simulationData;
  }

  if (rows?.length) {
    const tc = resolveTimeColumnName(chart, rows[0]);
    return boundsFromRows(rows, tc);
  }

  const tr = simulationMetadata?.timeRange;
  if (Number.isFinite(Number(tr?.min)) && Number.isFinite(Number(tr?.max))) {
    return { min: Number(tr.min), max: Number(tr.max) };
  }
  return null;
}
