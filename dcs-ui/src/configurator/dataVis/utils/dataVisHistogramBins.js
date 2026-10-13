/** Client-side bins for mini filter histograms (stable bars, no Plotly auto-bin quirks). */

export const FILTER_BIN_MIN = 4;
export const FILTER_BIN_MAX = 64;
export const FILTER_BIN_DEFAULT = 16;
export const FILTER_BINS_STORAGE_KEY = 'dcs-dataVis-filter-bin-count';

export function readStoredFilterBinCount() {
  try {
    const v = parseInt(localStorage.getItem(FILTER_BINS_STORAGE_KEY), 10);
    if (Number.isFinite(v) && v >= FILTER_BIN_MIN && v <= FILTER_BIN_MAX) return v;
  } catch {
    /* ignore */
  }
  return FILTER_BIN_DEFAULT;
}

export function clampFilterBinCount(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return FILTER_BIN_DEFAULT;
  return Math.min(FILTER_BIN_MAX, Math.max(FILTER_BIN_MIN, v));
}

export function binNumericValues(values, binCount = FILTER_BIN_DEFAULT, axisDomain = null) {
  const nBins = clampFilterBinCount(binCount);
  const nums = (values || []).filter((v) => Number.isFinite(Number(v))).map(Number);
  const axisLo =
    axisDomain?.min != null && Number.isFinite(Number(axisDomain.min))
      ? Number(axisDomain.min)
      : null;
  const axisHi =
    axisDomain?.max != null && Number.isFinite(Number(axisDomain.max))
      ? Number(axisDomain.max)
      : null;
  const useFixedAxis = axisLo != null && axisHi != null && axisHi >= axisLo;

  if (useFixedAxis) {
    return binOnFixedAxis(nums, axisLo, axisHi, nBins);
  }

  if (!nums.length) {
    return { x: [], y: [], xMin: 0, xMax: 1, barWidth: 1 };
  }

  const sorted = [...nums].sort((a, b) => a - b);
  const xMin = sorted[0];
  const xMax = sorted[sorted.length - 1];

  if (xMin === xMax) {
    return { x: [xMin], y: [nums.length], xMin, xMax, barWidth: Math.max(Math.abs(xMin) * 0.05, 1) };
  }

  const unique = [...new Set(sorted.map((v) => roundKey(v)))].sort((a, b) => a - b);
  if (unique.length <= nBins) {
    const counts = unique.map((u) => nums.filter((v) => roundKey(v) === u).length);
    const step = unique.length > 1 ? unique[1] - unique[0] : Math.max((xMax - xMin) * 0.08, 1e-6);
    return {
      x: unique,
      y: counts,
      xMin,
      xMax,
      barWidth: step * 0.85,
    };
  }

  return binOnFixedAxis(nums, xMin, xMax, nBins);
}

/** Aligned base + overlay counts on the same fixed axis (for gray/green histogram layers). */
export function binNumericOverlay(baseValues, overlayValues, binCount, axisDomain) {
  const base = binNumericValues(baseValues, binCount, axisDomain);
  if (!base.x?.length) {
    return { base, selected: base };
  }
  const selected = binNumericValues(overlayValues || [], binCount, {
    min: base.xMin,
    max: base.xMax,
  });
  return { base, selected };
}

function binOnFixedAxis(nums, xMin, xMax, nBins) {
  if (xMin === xMax) {
    return {
      x: [xMin],
      y: [nums.length],
      xMin,
      xMax,
      barWidth: Math.max(Math.abs(xMin) * 0.05, 1e-6),
    };
  }

  const span = xMax - xMin;
  const width = span / nBins;
  const counts = new Array(nBins).fill(0);
  for (const v of nums) {
    if (v < xMin || v > xMax) continue;
    let idx = Math.floor((v - xMin) / width);
    if (idx >= nBins) idx = nBins - 1;
    if (idx < 0) idx = 0;
    counts[idx] += 1;
  }
  const centers = counts.map((_, i) => xMin + (i + 0.5) * width);
  return { x: centers, y: counts, xMin, xMax, barWidth: width * 0.92 };
}

/** Nice x-axis tick positions for mini histograms (independent of bar count). */
export function computeNiceTicks(min, max, targetTickCount = 7) {
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];
  if (hi < lo) return [];
  if (lo === hi) return [lo];

  const span = hi - lo;
  const step = niceTickStep(span, targetTickCount);
  const start = Math.ceil(lo / step - 1e-12) * step;
  const ticks = [];
  const limit = hi + step * 0.001;
  for (let t = start, guard = 0; t <= limit && guard < 64; t += step, guard += 1) {
    if (t >= lo - step * 0.001 && t <= hi + step * 0.001) {
      ticks.push(roundTick(t, step));
    }
  }
  if (!ticks.length) return [lo, hi];
  if (ticks[0] > lo + step * 0.01) ticks.unshift(roundTick(lo, step));
  const last = ticks[ticks.length - 1];
  if (last < hi - step * 0.01) ticks.push(roundTick(hi, step));
  return ticks;
}

export function tickFormatForSpan(min, max) {
  const span = Math.abs(Number(max) - Number(min));
  if (!Number.isFinite(span)) return '.2f';
  if (span >= 500) return ',.0f';
  if (span >= 50) return ',.1f';
  if (span >= 5) return '.1f';
  if (span >= 0.5) return '.2f';
  return '.3f';
}

function niceTickStep(span, targetTickCount) {
  const count = Math.max(2, targetTickCount);
  const rough = span / (count - 1);
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const pow10 = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / pow10;
  if (norm <= 1) return pow10;
  if (norm <= 2) return 2 * pow10;
  if (norm <= 5) return 5 * pow10;
  return 10 * pow10;
}

function roundTick(value, step) {
  if (!Number.isFinite(step) || step <= 0) return value;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + (step < 1 ? 1 : 0));
  const factor = 10 ** Math.min(decimals, 6);
  return Math.round(value * factor) / factor;
}

function roundKey(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return n;
  if (Math.abs(n) >= 1000) return Math.round(n * 100) / 100;
  if (Math.abs(n) >= 1) return Math.round(n * 1000) / 1000;
  return Math.round(n * 1e6) / 1e6;
}
