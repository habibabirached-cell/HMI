/** Client-side bins for mini filter histograms (stable bars, no Plotly auto-bin quirks). */

const MAX_BINS = 14;

export function binNumericValues(values, maxBins = MAX_BINS, axisDomain = null) {
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
    return binOnFixedAxis(nums, axisLo, axisHi, maxBins);
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
  if (unique.length <= maxBins) {
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

  return binOnFixedAxis(nums, xMin, xMax, maxBins);
}

function binOnFixedAxis(nums, xMin, xMax, maxBins) {
  if (xMin === xMax) {
    return {
      x: [xMin],
      y: [nums.length],
      xMin,
      xMax,
      barWidth: Math.max(Math.abs(xMin) * 0.05, 1e-6),
    };
  }

  const nBins = Math.min(maxBins, Math.max(8, Math.round(Math.sqrt(Math.max(nums.length, 1)))));
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

function roundKey(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return n;
  if (Math.abs(n) >= 1000) return Math.round(n * 100) / 100;
  if (Math.abs(n) >= 1) return Math.round(n * 1000) / 1000;
  return Math.round(n * 1e6) / 1e6;
}
