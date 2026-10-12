/** Build backend filter specs from UI range map. */

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
