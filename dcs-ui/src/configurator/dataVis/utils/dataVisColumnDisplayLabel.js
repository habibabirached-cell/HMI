export const DATAVIS_LOAD_COMPLIANCE_COL = 'Year 1 Load Compliance (%)';
export const DATAVIS_CFE_COL = 'Carbon Free Energy (%)';

export const DATAVIS_UNIT_COUNT_COLUMNS = ['7HA Unit #', 'LM2500 Unit #'];

/** Two-line parallel-coords titles (line 1 = name, line 2 = unit or qualifier). */
const DATAVIS_PARALLEL_AXIS_LABEL_LINES = {
  'Solar AC Nameplate (MWac)': ['Solar Power', '(MW)'],
  'Wind Nameplate (MWac)': ['Wind Power', '(MW)'],
  'BESS power Nameplate (MW)': ['BESS Power', '(MW)'],
  '7HA Unit #': ['Number of', '7HA Units'],
  'LM2500 Unit #': ['Number of', 'LM2500 Units'],
  'Project LCOE ($/MWh)': ['LCOE', '($/MW)'],
  [DATAVIS_LOAD_COMPLIANCE_COL]: ['Data Center', 'Uptime'],
  [DATAVIS_CFE_COL]: ['Percent Carbon Free', 'Power'],
};

export function dataVisParallelAxisLabelLines(columnKey) {
  const lines = DATAVIS_PARALLEL_AXIS_LABEL_LINES[columnKey];
  if (lines?.length) return lines;
  return [columnKey];
}

/** Plotly parcoords supports `<br>` in dimension labels (via convertToTspans). */
export function dataVisParallelAxisLabel(columnKey) {
  return dataVisParallelAxisLabelLines(columnKey).join('<br>');
}

export function dataVisParallelAxisLabelMenu(columnKey) {
  return dataVisParallelAxisLabelLines(columnKey).join(' ');
}
