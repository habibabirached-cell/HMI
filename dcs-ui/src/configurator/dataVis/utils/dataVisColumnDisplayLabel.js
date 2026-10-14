export const DATAVIS_LOAD_COMPLIANCE_COL = 'Year 1 Load Compliance (%)';
export const DATAVIS_CFE_COL = 'Carbon Free Energy (%)';

/** Explore Data wall — shorter parallel-coords / picker labels (column keys unchanged). */
export function dataVisExploreWallAxisLabel(columnKey) {
  if (columnKey === DATAVIS_LOAD_COMPLIANCE_COL) return 'Availability';
  if (columnKey === DATAVIS_CFE_COL) return 'Carbon Free';
  return columnKey;
}
