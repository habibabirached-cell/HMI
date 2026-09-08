/**
 * Display-time → data-time mapping for “play with loop” mode.
 * After the first forward leg to t_end, clones the last t_loop seconds by alternating
 * retro and forward replay while display time T keeps increasing.
 */

import { cellFloat } from './csvRowAccess';
import {
  getChartSimulationStartAt,
  hasExplicitSimulationStartAt,
} from './chartVariableStyles';

export const DEFAULT_CHART_T_LOOP = 3;

export function getChartLoopT(chart) {
  const t = chart?.axisRange?.tLoop;
  if (t != null && t !== '' && Number.isFinite(Number(t)) && Number(t) > 0) {
    return Number(t);
  }
  return DEFAULT_CHART_T_LOOP;
}

export function hasExplicitChartLoopT(chart) {
  const t = chart?.axisRange?.tLoop;
  return t != null && t !== '' && Number.isFinite(Number(t)) && Number(t) > 0;
}

/** Loop window start: saved Start simulation at, else file minimum. */
export function getChartLoopStartAt(chart, dataBounds = null) {
  if (hasExplicitSimulationStartAt(chart)) {
    return getChartSimulationStartAt(chart, dataBounds);
  }
  if (dataBounds && Number.isFinite(dataBounds.min)) {
    return dataBounds.min;
  }
  return getChartSimulationStartAt(chart, dataBounds);
}

/** Loop window end: last time in the chart data file. */
export function getChartLoopEndAt(chart, dataBounds = null) {
  if (dataBounds && Number.isFinite(dataBounds.max)) {
    return dataBounds.max;
  }
  return null;
}

export function getChartLoopBounds(chart, dataBounds = null) {
  const tStart = getChartLoopStartAt(chart, dataBounds);
  const tEnd = getChartLoopEndAt(chart, dataBounds);
  const tLoop = getChartLoopT(chart);
  const replayStart =
    tEnd != null ? Math.max(tStart, tEnd - tLoop) : tStart;
  return { tStart, tEnd, tLoop, replayStart };
}

/**
 * Locked X window for loop play — slides forward once T passes xMax (does not grow from 0).
 */
export function resolveLoopVisibleXWindow(chart, ar, simulationTime, dataBounds = null) {
  if (!ar?.xLocked || simulationTime == null || !Number.isFinite(simulationTime)) {
    return null;
  }
  const tStart = getChartLoopStartAt(chart, dataBounds);
  const tEnd = getChartLoopEndAt(chart, dataBounds);
  let xMin =
    ar.xMin != null && Number.isFinite(Number(ar.xMin)) ? Number(ar.xMin) : tStart;
  let xMax =
    ar.xMax != null && Number.isFinite(Number(ar.xMax)) ? Number(ar.xMax) : tEnd;
  if (xMin == null || xMax == null || !Number.isFinite(xMin) || !Number.isFinite(xMax)) {
    return null;
  }
  if (xMax <= xMin) {
    xMax = xMin + Math.max(1, (tEnd ?? xMin + 10) - xMin);
  }
  if (simulationTime > xMax) {
    const shift = simulationTime - xMax;
    xMin += shift;
    xMax += shift;
  }
  return { xMin, xMax };
}

/** Build sorted { t, i, row } pairs for binary search (skip NaN). */
export function buildSortedTimeIndex(indexed, timeCol) {
  const out = [];
  for (const { row, i } of indexed) {
    const t = cellFloat(row, timeCol);
    if (!Number.isNaN(t)) out.push({ t, i, row });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

/** Rows in [replayStart, tEnd] used for loop cloning. */
export function sliceLoopSegment(sorted, replayStart, tEnd) {
  return sorted.filter(
    (e) => e.t >= replayStart - 1e-9 && e.t <= tEnd + 1e-9,
  );
}

/**
 * Walk loop segment row-by-row: display X advances by each row's native Δt (not a fixed 0.1s).
 * Retro until ΣΔt ≥ t_loop, then forward to t_end, repeat.
 */
export function walkLoopPathToDisplayTime(loopSeg, tEnd, tLoop, targetDisplayTime) {
  if (!loopSeg.length || targetDisplayTime == null || targetDisplayTime <= tEnd) {
    return null;
  }
  if (loopSeg.length === 1) {
    return loopSeg[0];
  }

  let displayX = tEnd;
  let rowIdx = loopSeg.length - 1;
  let phase = 'retro';
  let retroAccum = 0;
  let lastEntry = loopSeg[rowIdx];
  let guard = 0;
  const maxSteps = loopSeg.length * Math.ceil((targetDisplayTime - tEnd) / Math.max(tLoop, 0.001)) * 4 + 1000;

  while (displayX < targetDisplayTime - 1e-9 && guard < maxSteps) {
    guard += 1;
    if (phase === 'retro') {
      if (rowIdx <= 0 || retroAccum >= tLoop - 1e-9) {
        phase = 'forward';
        retroAccum = 0;
        continue;
      }
      const dt = loopSeg[rowIdx].t - loopSeg[rowIdx - 1].t;
      if (dt <= 0) {
        rowIdx -= 1;
        continue;
      }
      displayX += dt;
      retroAccum += dt;
      rowIdx -= 1;
      lastEntry = loopSeg[rowIdx];
    } else {
      if (rowIdx >= loopSeg.length - 1) {
        phase = 'retro';
        retroAccum = 0;
        continue;
      }
      const dt = loopSeg[rowIdx + 1].t - loopSeg[rowIdx].t;
      if (dt <= 0) {
        rowIdx += 1;
        continue;
      }
      displayX += dt;
      rowIdx += 1;
      lastEntry = loopSeg[rowIdx];
    }
  }
  return lastEntry;
}

/** Map display T → data time (for pie / single-row charts). Optional displayOrigin shifts a post-switch segment. */
export function mapDisplayTimeToDataTime(
  T,
  bounds,
  sorted = null,
  timeCol = null,
  displayOrigin = null,
) {
  const { tStart, tEnd, tLoop, replayStart } = bounds;
  if (tEnd == null || !Number.isFinite(T)) return null;

  if (displayOrigin != null && Number.isFinite(displayOrigin)) {
    const forwardSpan = tEnd - tStart;
    const effectiveDisplayEnd = displayOrigin + forwardSpan;
    if (T < displayOrigin) return null;
    if (T <= effectiveDisplayEnd) return tStart + (T - displayOrigin);
    if (sorted?.length && timeCol) {
      const loopSeg = sliceLoopSegment(sorted, replayStart, tEnd);
      const entry = walkLoopPathToDisplayTime(loopSeg, effectiveDisplayEnd, tLoop, T);
      return entry?.t ?? null;
    }
    const offset = T - effectiveDisplayEnd;
    const cycleLen = 2 * tLoop;
    let pos = offset % cycleLen;
    if (pos < 0) pos += cycleLen;
    if (pos <= tLoop) return Math.max(tStart, tEnd - pos);
    return Math.min(tEnd, replayStart + (pos - tLoop));
  }

  if (T < tStart) return null;
  if (T <= tEnd) return T;

  if (sorted?.length && timeCol) {
    const loopSeg = sliceLoopSegment(sorted, replayStart, tEnd);
    const entry = walkLoopPathToDisplayTime(loopSeg, tEnd, tLoop, T);
    return entry?.t ?? null;
  }

  // Fallback linear map when row index unavailable.
  const offset = T - tEnd;
  const cycleLen = 2 * tLoop;
  let pos = offset % cycleLen;
  if (pos < 0) pos += cycleLen;
  if (pos <= tLoop) return Math.max(tStart, tEnd - pos);
  return Math.min(tEnd, replayStart + (pos - tLoop));
}

/** Nearest row in sorted time index. */
export function nearestInSortedTimeIndex(sorted, dataT) {
  if (!sorted.length || dataT == null || !Number.isFinite(dataT)) return null;
  if (dataT <= sorted[0].t) return sorted[0];
  if (dataT >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1];

  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].t < dataT) lo = mid + 1;
    else hi = mid - 1;
  }
  const right = sorted[Math.min(lo, sorted.length - 1)];
  const left = sorted[Math.max(lo - 1, 0)];
  return Math.abs(right.t - dataT) < Math.abs(left.t - dataT) ? right : left;
}

export function nearestRowIndexForDataTime(rows, timeCol, dataT) {
  if (!rows?.length || !timeCol || dataT == null || !Number.isFinite(dataT)) {
    return -1;
  }
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const v = cellFloat(rows[i], timeCol);
    if (Number.isNaN(v)) continue;
    const d = Math.abs(v - dataT);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function valueAtDataTime(rows, timeCol, valueCol, dataT) {
  const idx = nearestRowIndexForDataTime(rows, timeCol, dataT);
  if (idx < 0) return null;
  const v = cellFloat(rows[idx], valueCol);
  return Number.isNaN(v) ? null : v;
}

/**
 * Append loop extension samples using native row Δt (preserves signal period).
 */
function appendRowBasedLoopSamples(loopSeg, tEnd, tLoop, displayTime, pushSample) {
  if (!loopSeg.length || loopSeg.length < 2 || displayTime <= tEnd) return;

  let displayX = tEnd;
  let rowIdx = loopSeg.length - 1;
  let phase = 'retro';
  let retroAccum = 0;
  let guard = 0;
  const maxSteps =
    loopSeg.length * Math.ceil((displayTime - tEnd) / Math.max(tLoop, 0.001)) * 4 + 1000;

  while (displayX < displayTime - 1e-9 && guard < maxSteps) {
    guard += 1;
    if (phase === 'retro') {
      if (rowIdx <= 0 || retroAccum >= tLoop - 1e-9) {
        phase = 'forward';
        retroAccum = 0;
        continue;
      }
      const dt = loopSeg[rowIdx].t - loopSeg[rowIdx - 1].t;
      if (dt <= 0) {
        rowIdx -= 1;
        continue;
      }
      displayX += dt;
      retroAccum += dt;
      rowIdx -= 1;
      pushSample(displayX, loopSeg[rowIdx].t, loopSeg[rowIdx]);
    } else {
      if (rowIdx >= loopSeg.length - 1) {
        phase = 'retro';
        retroAccum = 0;
        continue;
      }
      const dt = loopSeg[rowIdx + 1].t - loopSeg[rowIdx].t;
      if (dt <= 0) {
        rowIdx += 1;
        continue;
      }
      displayX += dt;
      rowIdx += 1;
      pushSample(displayX, loopSeg[rowIdx].t, loopSeg[rowIdx]);
    }
  }
}

/**
 * Build { displayX, dataT, rowIndex, row } samples for progressive playback.
 * Loop leg steps through in-memory rows using each row's Δt (same as pre-t_end data).
 */
export function buildLoopPlaybackSamples({
  indexed,
  timeCol,
  displayTime,
  bounds,
  simulationLoopMode,
  visibleWindow = null,
  displayOrigin = null,
}) {
  const { tStart, tEnd, tLoop, replayStart } = bounds;
  if (tEnd == null || displayTime == null || !Number.isFinite(displayTime)) {
    return [];
  }

  const sorted = buildSortedTimeIndex(indexed, timeCol);
  const samples = [];
  const windowMin = visibleWindow?.xMin ?? null;
  const windowMax = visibleWindow?.xMax ?? null;

  const inWindow = (x) => {
    if (windowMin == null || windowMax == null) return true;
    return x >= windowMin - 1e-9 && x <= windowMax + 1e-9;
  };

  const pushSample = (displayX, dataT, entry) => {
    if (!entry?.row || !inWindow(displayX)) return;
    samples.push({
      displayX,
      dataT,
      rowIndex: entry.i,
      row: entry.row,
    });
  };

  if (displayOrigin != null && Number.isFinite(displayOrigin)) {
    if (displayTime < displayOrigin) return [];
    const forwardSpan = tEnd - tStart;
    const effectiveDisplayEnd = displayOrigin + forwardSpan;
    const forwardCap = Math.min(displayTime, effectiveDisplayEnd);
    for (const entry of sorted) {
      if (entry.t < tStart || entry.t > tEnd) continue;
      const displayX = displayOrigin + (entry.t - tStart);
      if (displayX > forwardCap + 1e-9) break;
      pushSample(displayX, entry.t, entry);
    }
    if (!simulationLoopMode || displayTime <= effectiveDisplayEnd) {
      return samples;
    }
    const loopSeg = sliceLoopSegment(sorted, replayStart, tEnd);
    appendRowBasedLoopSamples(loopSeg, effectiveDisplayEnd, tLoop, displayTime, pushSample);
    return samples;
  }

  if (displayTime < tStart) return [];

  const forwardCap = Math.min(displayTime, tEnd);
  for (const entry of sorted) {
    if (entry.t < tStart || entry.t > forwardCap) continue;
    pushSample(entry.t, entry.t, entry);
  }

  if (!simulationLoopMode || displayTime <= tEnd) {
    return samples;
  }

  const loopSeg = sliceLoopSegment(sorted, replayStart, tEnd);
  appendRowBasedLoopSamples(loopSeg, tEnd, tLoop, displayTime, pushSample);

  return samples;
}

export function effectivePlaybackCapTime(simulationTime, chart, dataBounds, simulationLoopMode) {
  if (simulationLoopMode) return simulationTime;
  const tEnd = getChartLoopEndAt(chart, dataBounds);
  if (tEnd == null || simulationTime == null) return simulationTime;
  return Math.min(simulationTime, tEnd);
}

export { valueAtDataTime };

export function resolveLoopPlaybackGlobalStart(openCharts, resolveBounds) {
  if (!openCharts?.length) return 0;
  let min = Infinity;
  for (const chart of openCharts) {
    const bounds = resolveBounds?.(chart) ?? null;
    const tStart = getChartLoopStartAt(chart, bounds);
    if (Number.isFinite(tStart)) min = Math.min(min, tStart);
  }
  return Number.isFinite(min) ? min : 0;
}
