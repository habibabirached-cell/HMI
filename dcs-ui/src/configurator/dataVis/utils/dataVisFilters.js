/** Build backend filter specs from UI range map. */

const ROW_ID_COL = 'dataVis_row_id';
const EMPTY_FILTER_LIST = [];

export function buildRangeFilters(rangeMap) {
  if (!rangeMap) return [];
  return Object.entries(rangeMap)
    .filter(([, band]) => band && (band.min != null || band.max != null))
    .map(([column, band]) => ({
      column,
      op: 'range',
      min: band.min ?? undefined,
      max: band.max ?? undefined,
    }));
}

export function buildExcludedRowFilters(excludedRowIds) {
  if (!excludedRowIds?.length) return EMPTY_FILTER_LIST;
  return [{ column: ROW_ID_COL, op: 'nin', values: excludedRowIds }];
}

/** Session dataset = workbook minus erased rows (not histogram/parcoords/scatter filters). */
export function buildSessionUniverseFilters(excludedRowIds) {
  return buildExcludedRowFilters(excludedRowIds);
}

export function withSessionUniverseFilters(filters, excludedRowIds) {
  const extra = buildExcludedRowFilters(excludedRowIds);
  if (!extra.length) return filters || [];
  return [...(filters || []), ...extra];
}

/** Full view filters: histogram + parcoords + scatter + session row erasures. */
export function buildDataVisFilters(
  rangeMap,
  parcoordsRangeMap = null,
  scatterRowIds = null,
  excludedRowIds = null,
) {
  const base = buildRangeFilters(rangeMap);
  const extra = buildRangeFilters(parcoordsRangeMap);
  let combined = [...base, ...extra, ...buildExcludedRowFilters(excludedRowIds)];
  if (scatterRowIds == null) return combined;
  if (!scatterRowIds.length) {
    return [...combined, { column: ROW_ID_COL, op: 'in', values: [-1] }];
  }
  return [...combined, { column: ROW_ID_COL, op: 'in', values: scatterRowIds }];
}

export function hasActiveViewFilters(ranges, parcoordsRangeMap, scatterRowIds) {
  if (scatterRowIds != null) return true;
  if (buildRangeFilters(parcoordsRangeMap).length) return true;
  if (buildRangeFilters(ranges).length) return true;
  return false;
}

export function excludeColumnFromRangeMap(rangeMap, column) {
  if (!rangeMap) return {};
  const { [column]: _removed, ...rest } = rangeMap;
  return rest;
}

/** Gray baseline for quad histograms: other histogram bands only (not parcoords / scatter). */
export function buildHistogramBaselineFilters(ranges, column) {
  return buildRangeFiltersExcluding(ranges, column);
}

/** Cross-filter marginals + parcoords brushes (exclude one histogram column's own band). */
export function buildOverlayFilters(rangeMap, parcoordsRangeMap, excludeColumn) {
  const base = buildRangeFiltersExcluding(rangeMap, excludeColumn);
  const extra = buildRangeFilters(parcoordsRangeMap);
  return [...base, ...extra];
}

export function buildRangeFiltersExcluding(rangeMap, excludeColumn) {
  if (!rangeMap) return [];
  return Object.entries(rangeMap)
    .filter(([column, band]) => column !== excludeColumn && band && (band.min != null || band.max != null))
    .map(([column, band]) => ({
      column,
      op: 'range',
      min: band.min ?? undefined,
      max: band.max ?? undefined,
    }));
}

export function numericColumnsFromStats(columnStats) {
  if (!columnStats) return [];
  return columnStats.filter((s) => s.numeric).map((s) => s.column);
}

export function statsByColumn(columnStats) {
  const map = {};
  (columnStats || []).forEach((s) => {
    map[s.column] = s;
  });
  return map;
}

/** Fixed [min, max] for parallel-coords axes (full dataset stats, not filtered rows). */
export function parallelAxisRangeFromStats(stat) {
  if (!stat || stat.min == null || stat.max == null) return undefined;
  let lo = Number(stat.min);
  let hi = Number(stat.max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;
  if (lo === hi) {
    const pad = Math.max(Math.abs(lo) * 1e-6, 1e-9);
    lo -= pad;
    hi += pad;
  }
  return [lo, hi];
}

const AXIS_PADDING_DIVISOR = 30;

/** [lo, hi] with small symmetric margin (≈ span/30 each side). */
export function axisRangeWithPadding(lo, hi, paddingDivisor = AXIS_PADDING_DIVISOR) {
  const nLo = Number(lo);
  const nHi = Number(hi);
  if (!Number.isFinite(nLo) || !Number.isFinite(nHi)) return undefined;
  let low = nLo;
  let high = nHi;
  if (low === high) {
    const pad = Math.max(Math.abs(low) * 1e-6, 1e-9);
    low -= pad;
    high += pad;
  }
  const span = Math.max(high - low, 1e-9);
  const pad = span / paddingDivisor;
  return [low - pad, high + pad];
}

export function axisRangeWithPaddingFromStats(stat, paddingDivisor = AXIS_PADDING_DIVISOR) {
  if (!stat || stat.min == null || stat.max == null) return undefined;
  return axisRangeWithPadding(stat.min, stat.max, paddingDivisor);
}

export function axisRangeWithPaddingFromPair(pair, paddingDivisor = AXIS_PADDING_DIVISOR) {
  if (!Array.isArray(pair) || pair.length !== 2) return undefined;
  return axisRangeWithPadding(pair[0], pair[1], paddingDivisor);
}

/** 2D scatter default axis range from column stats (filtered session stats when rows erased). */
export function scatterAxisRangeForColumn(_columnKey, stat) {
  return axisRangeWithPaddingFromStats(stat);
}

export function allColumnsFromStats(columnStats) {
  return (columnStats || []).map((s) => s.column).sort((a, b) => a.localeCompare(b));
}
