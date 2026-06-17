import { ENSEMBLE_COLUMN_SEP } from './simulationLazyApi';
import { normalizePlaybackTimeRange } from './playbackTimeRange';

const TIME_X_LABEL_RE = /^time\s*,?\s*seconds?$/i;

function normalizeXLabel(label) {
  return String(label ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function chartXColumn(chart) {
  if (!chart) return '';
  if (chart.isMultiComponent && chart.chartType === 'multi-line-chart') {
    return chart.timeColumn || chart.xColumn || '';
  }
  return chart.xColumn || '';
}

function isTimeColumnName(columnName) {
  if (!columnName) return false;
  const col = String(columnName).trim().toLowerCase();
  if (col === 't') return true;
  const qualifiedSuffix = `${ENSEMBLE_COLUMN_SEP}t`.toLowerCase();
  if (col.endsWith(qualifiedSuffix)) return true;
  if (col === 'time (s)' || col === 'time (sec)' || col === 'time') return true;
  if (col.includes('time')) return true;
  return false;
}

function isTimeXLabel(label) {
  const norm = normalizeXLabel(label);
  if (!norm) return false;
  if (TIME_X_LABEL_RE.test(norm)) return true;
  if (norm === 'time' || norm === 'time (s)' || norm === 'time (sec)') return true;
  return false;
}

/** True for 2D / nD charts whose horizontal axis is simulation time (seconds). */
export function isTimeBasedChart(chart) {
  if (!chart) return false;
  const type = chart.chartType;
  const isTargetType =
    type === '2d' ||
    type === 'nd' ||
    type === 'stacked-nd' ||
    (chart.isMultiComponent && type === 'multi-line-chart');
  if (!isTargetType) return false;
  if (isTimeXLabel(chart.xLabel)) return true;
  return isTimeColumnName(chartXColumn(chart));
}

export function applyPlaybackRangeToCharts(charts, rawRange) {
  const range = normalizePlaybackTimeRange(rawRange);
  const next = (charts || []).map((chart) => {
    if (!isTimeBasedChart(chart)) return chart;
    const prev = chart.axisRange || {};
    return {
      ...chart,
      axisRange: {
        ...prev,
        xLocked: true,
        xMin: range.t1,
        xMax: range.t2,
      },
    };
  });
  return { range, charts: next };
}
