/** Build backend filter specs from UI range map. */

const ROW_ID_COL = 'dataVis_row_id';

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

/** Full view filters: histogram bands + parcoords + optional scatter lasso row ids. */
export function buildDataVisFilters(rangeMap, parcoordsRangeMap = null, scatterRowIds = null) {
  const base = buildRangeFilters(rangeMap);
  const extra = buildRangeFilters(parcoordsRangeMap);
  const combined = [...base, ...extra];
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

export function allColumnsFromStats(columnStats) {
  return (columnStats || []).map((s) => s.column).sort((a, b) => a.localeCompare(b));
}
