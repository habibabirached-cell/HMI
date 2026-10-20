export const ROW_ID_COL = 'dataVis_row_id';
export const MAX_TABLE_COLUMNS = 15;

export const FALLBACK_VISIBLE_COLUMNS = [
  'Solar AC Nameplate (MWac)',
  'Wind Nameplate (MWac)',
  'BESS power Nameplate (MW)',
  '7HA Unit #',
  'LM2500 Unit #',
  'Project LCOE ($/MWh)',
  'Annual Load Compliance (%)',
  'Carbon Free Energy (%)',
];

export function resolveInitialTableColumns(defaults, parallelDimensions) {
  const dims = parallelDimensions?.length
    ? parallelDimensions
    : defaults?.parallel_dimensions;
  if (Array.isArray(dims) && dims.length) {
    return dims.filter((c) => c !== ROW_ID_COL).slice(0, MAX_TABLE_COLUMNS);
  }
  return FALLBACK_VISIBLE_COLUMNS;
}

/** Columns shown in table + scatter hover (row id first). */
export function tableDisplayColumns(visibleColumns) {
  const cols = (visibleColumns || []).filter((c) => c && c !== ROW_ID_COL);
  return [ROW_ID_COL, ...cols];
}

export function formatDataVisCell(v, column) {
  if (v == null) return '—';
  if (typeof v === 'number') {
    const isPercent = column?.includes('(%)') || column?.includes('Compliance');
    const isUnitCount = column?.includes('Unit #');
    const maxFrac = isUnitCount ? 0 : isPercent ? 4 : 2;
    return Number(v).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFrac,
    });
  }
  return String(v);
}
