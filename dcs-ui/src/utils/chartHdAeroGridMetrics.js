import { cellFloat, findColumnKey } from './csvRowAccess';
import { collectChartYKeys } from './chartDangerYThreshold';
import { sampleIndexedRowsForVariable } from './chartVariableStyles';
import {
  chartIsFrequencyGoodnessChart,
  FREQ_GREEN_HI,
  FREQ_GREEN_LO,
  FREQ_ORANGE_HI_HI,
  FREQ_RED_HIGH_HZ,
  FREQ_RED_LOW_HZ,
  FREQ_STABILITY_LIMIT_HZ,
  isFrequencyColumnKey,
} from './chartFrequencyGoodnessBands';

/** Design limit from Juhi / Habib (Hz/s). */
export const ROCOF_LIMIT_HZ_S = 1.5;

/** Nominal-to-red-line span used for stability margin (Hz). */
export const STABILITY_MARGIN_SPAN_HZ = FREQ_STABILITY_LIMIT_HZ;

/** RoCoF estimated over this window (s). */
export const ROCOF_WINDOW_SEC = 0.25;

export function primaryHdFrequencyColumnKey(chart) {
  const keys = collectChartYKeys(chart).filter(isFrequencyColumnKey);
  if (!keys.length) return null;
  return keys.find((k) => /HD_freq/i.test(k)) ?? keys[0];
}

function rowsToTimeSeries(rows, xCol, yKey) {
  return rows
    .map((row) => ({
      t: cellFloat(row, xCol),
      hz: cellFloat(row, findColumnKey(row, yKey) ?? yKey),
    }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.hz))
    .sort((a, b) => a.t - b.t);
}

function minHzInSeries(points) {
  if (!points.length) return null;
  return points.reduce((min, p) => Math.min(min, p.hz), Infinity);
}

function maxHzInSeries(points) {
  if (!points.length) return null;
  return points.reduce((max, p) => Math.max(max, p.hz), -Infinity);
}

function rocofHzPerSec(points, tNow, windowSec = ROCOF_WINDOW_SEC) {
  if (tNow == null || !Number.isFinite(tNow) || !points.length) return null;
  const tBefore = tNow - windowSec;
  let pNow = null;
  let pEarlier = null;
  for (const p of points) {
    if (p.t <= tNow + 1e-9) pNow = p;
    if (p.t <= tBefore + 1e-9) pEarlier = p;
  }
  if (!pNow || !pEarlier || Math.abs(pNow.t - pEarlier.t) < 1e-9) return 0;
  return Math.abs((pNow.hz - pEarlier.hz) / (pNow.t - pEarlier.t));
}

/** 100% stable at nominal; 0% stable at either red line (±1.5 Hz). */
function stabilityMarginPercents(minHz, maxHz) {
  if (STABILITY_MARGIN_SPAN_HZ <= 0) {
    return { marginUsedPct: 0, marginRemainingPct: 100 };
  }

  const lowerHeadroom = Number.isFinite(minHz) ? minHz - FREQ_RED_LOW_HZ : Infinity;
  const upperHeadroom = Number.isFinite(maxHz) ? FREQ_RED_HIGH_HZ - maxHz : Infinity;
  const headroomHz = Math.max(0, Math.min(lowerHeadroom, upperHeadroom));
  const marginRemainingPct = Math.min(
    100,
    Math.max(0, (headroomHz / STABILITY_MARGIN_SPAN_HZ) * 100),
  );
  return {
    marginUsedPct: 100 - marginRemainingPct,
    marginRemainingPct,
  };
}

function rocofStatus(rocof) {
  if (rocof == null || !Number.isFinite(rocof)) return { level: 'unknown', label: '—' };
  if (rocof >= ROCOF_LIMIT_HZ_S) return { level: 'bad', label: 'EXCEEDS LIMIT' };
  if (rocof >= ROCOF_LIMIT_HZ_S * 0.6) return { level: 'warn', label: 'ELEVATED' };
  return { level: 'ok', label: 'OK' };
}

/**
 * Live RoCoF + stability margin for HD Frequency chart.
 * @returns {{
 *   rocofHzS: number,
 *   rocofLimitHzS: number,
 *   rocofStatus: { level: string, label: string },
 *   marginUsedPct: number,
 *   marginRemainingPct: number,
 *   minFreqHz: number|null,
 * }|null}
 */
export function computeHdAeroGridMetrics({
  chart,
  data,
  simulationTime,
  simulationRunning,
  simulationLoopMode = false,
  loopPlaybackState = null,
  dataBounds = null,
}) {
  if (!chartIsFrequencyGoodnessChart(chart) || !data?.length) return null;

  const xCol = chart.xColumn || chart.timeColumn;
  const yKey = primaryHdFrequencyColumnKey(chart);
  if (!xCol || !yKey) return null;

  const indexed = data.map((row, i) => ({ row, i }));
  let rowsUpToPlayhead = data;

  if (simulationRunning && simulationTime != null) {
    const { sampledData } = sampleIndexedRowsForVariable({
      indexed,
      chart,
      colKey: yKey,
      index: 0,
      xColumn: xCol,
      simulationRunning: true,
      simulationTime,
      sampleStep: 1,
      dataBounds,
      simulationLoopMode,
      loopPlaybackState,
    });
    if (sampledData?.length) rowsUpToPlayhead = sampledData;
  }

  const series = rowsToTimeSeries(rowsUpToPlayhead, xCol, yKey);
  if (!series.length) return null;

  const capTime =
    simulationRunning && simulationTime != null
      ? simulationTime
      : series[series.length - 1].t;
  const pointsToCap = series.filter((p) => p.t <= capTime + 1e-9);
  const capped = pointsToCap.length ? pointsToCap : series;
  const minHz = minHzInSeries(capped);
  const maxHz = maxHzInSeries(capped);
  const { marginUsedPct, marginRemainingPct } = stabilityMarginPercents(minHz, maxHz);
  const rocofHzS = rocofHzPerSec(series, capTime) ?? 0;

  return {
    rocofHzS,
    rocofLimitHzS: ROCOF_LIMIT_HZ_S,
    rocofStatus: rocofStatus(rocofHzS),
    marginUsedPct,
    marginRemainingPct,
    minFreqHz: Number.isFinite(minHz) ? minHz : null,
  };
}

export function chartSupportsHdAeroGridMetrics(chart) {
  return chartIsFrequencyGoodnessChart(chart);
}

/** HD Frequency lives in the bottom stacked subplot (Aero on y, HD on y2). */
export function hdFrequencySubplotYRef(chart) {
  if (chart?.chartType !== 'stacked-nd' || !chart.yColumns?.length) return 'y';
  const keys = collectChartYKeys(chart).filter(isFrequencyColumnKey);
  const hdIdx = keys.findIndex((k) => /HD_freq/i.test(k));
  if (hdIdx <= 0) return keys.length > 1 ? 'y2' : 'y';
  return `y${hdIdx + 1}`;
}

function metricsXAfterDisturbance(hdAeroChartEvents, chart) {
  const times = (hdAeroChartEvents || [])
    .map((ev) => Number(ev?.time))
    .filter(Number.isFinite);
  if (!times.length) return null;
  const lastEvent = Math.max(...times);
  const xMax = chart?.axisRange?.xMax;
  const cap = Number.isFinite(Number(xMax)) ? Number(xMax) : lastEvent + 2;
  return Math.min(lastEvent + 0.55, cap - 0.1);
}

function metricAnnotation({ yref, x, y, text, borderColor, fontSize = 11, borderpad = 3 }) {
  return {
    xref: 'x',
    yref,
    x,
    y,
    text,
    showarrow: false,
    xanchor: 'left',
    yanchor: 'middle',
    align: 'left',
    font: {
      family: 'Arial, sans-serif',
      size: fontSize,
      color: '#f0f0f0',
    },
    bgcolor: 'rgba(0, 0, 0, 0.82)',
    bordercolor: borderColor,
    borderwidth: 1,
    borderpad,
    opacity: 0.94,
  };
}

/** Large in-plot labels on the HD Frequency subplot, right of the CB event line. */
export function applyHdAeroGridMetricsLayout(layout, chart, ctx) {
  if (!layout || !chartSupportsHdAeroGridMetrics(chart)) return layout;

  const { hdAeroChartEvents, simulationRunning } = ctx || {};
  if (!simulationRunning) return layout;

  const x = metricsXAfterDisturbance(hdAeroChartEvents, chart);
  if (x == null) return layout;

  const metrics = computeHdAeroGridMetrics(ctx);
  if (!metrics) return layout;

  const yref = hdFrequencySubplotYRef(chart);
  const lowerOrangeMid = (FREQ_RED_LOW_HZ + FREQ_GREEN_LO) / 2;
  const upperOrangeMid = (FREQ_GREEN_HI + FREQ_ORANGE_HI_HI) / 2;

  const marginText = [
    '<b>Stability Margin</b>',
    `${metrics.marginUsedPct.toFixed(0)}% used · ${metrics.marginRemainingPct.toFixed(0)}% stable`,
  ].join('<br>');

  const rocofText = [
    '<b>RoCoF</b>',
    `${metrics.rocofHzS.toFixed(2)}/${metrics.rocofLimitHzS.toFixed(1)} Hz/s · ${metrics.rocofStatus.label}`,
  ].join('<br>');

  const rocofBorder =
    metrics.rocofStatus.level === 'bad'
      ? '#f44336'
      : metrics.rocofStatus.level === 'warn'
        ? '#ff9800'
        : '#4caf50';

  const annotations = [
    metricAnnotation({
      yref,
      x,
      y: lowerOrangeMid,
      text: marginText,
      borderColor: '#ff9800',
      fontSize: 13,
      borderpad: 5,
    }),
    metricAnnotation({
      yref,
      x,
      y: upperOrangeMid,
      text: rocofText,
      borderColor: rocofBorder,
      fontSize: 13,
      borderpad: 5,
    }),
  ];

  return {
    ...layout,
    annotations: [...(layout.annotations || []), ...annotations],
  };
}
