/** Plotly histogram drag-brush → range band for backend filters. */

export function readHistogramBrushRange(eventData, selectedPoints) {
  if (eventData) {
    const sel = eventData.selections?.[0];
    if (sel && sel.x0 != null && sel.x1 != null) {
      return { min: Math.min(sel.x0, sel.x1), max: Math.max(sel.x0, sel.x1) };
    }
    const x0 = eventData['selections[0].x0'];
    const x1 = eventData['selections[0].x1'];
    if (x0 != null && x1 != null) {
      return { min: Math.min(x0, x1), max: Math.max(x0, x1) };
    }
  }
  if (selectedPoints?.length) {
    const xs = selectedPoints.map((p) => p.x).filter((v) => Number.isFinite(v));
    if (xs.length) {
      return { min: Math.min(...xs), max: Math.max(...xs) };
    }
  }
  return null;
}

export function readBrushFromPlotlySelectEvent(event) {
  const xr = event?.range?.x;
  if (Array.isArray(xr) && xr.length >= 2) {
    return { min: Math.min(xr[0], xr[1]), max: Math.max(xr[0], xr[1]) };
  }
  return readHistogramBrushRange(event, event?.points);
}

export function normalizeHistogramBand(band, axisDomain) {
  if (!band || (band.min == null && band.max == null)) {
    return { min: null, max: null };
  }
  let min = Number(band.min);
  let max = Number(band.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: null, max: null };
  }
  if (min > max) [min, max] = [max, min];
  const span =
    axisDomain && Number.isFinite(axisDomain.max - axisDomain.min)
      ? Math.max(axisDomain.max - axisDomain.min, 1e-9)
      : Math.max(Math.abs(max - min), 1e-9);
  if (max - min < span * 0.002) {
    const mid = (min + max) / 2;
    const half = span * 0.01;
    min = mid - half;
    max = mid + half;
  }
  if (axisDomain) {
    min = Math.max(min, axisDomain.min);
    max = Math.min(max, axisDomain.max);
  }
  if (max < min) return { min: null, max: null };
  return { min, max };
}
