import {
  DATAVIS_CFE_COL,
  DATAVIS_LOAD_COMPLIANCE_COL,
} from './dataVisColumnDisplayLabel';

const BASE = `${process.env.PUBLIC_URL || ''}/configurator/parcoords-axis`;

/** Realistic-style axis art (SVG) keyed to Waco parallel dimension columns. */
export const DATAVIS_PARCOORDS_AXIS_ICONS = {
  'Solar AC Nameplate (MWac)': { src: `${BASE}/solar.svg`, alt: 'Solar photovoltaic array' },
  'Wind Nameplate (MWac)': { src: `${BASE}/wind.svg`, alt: 'Wind turbine' },
  'BESS power Nameplate (MW)': { src: `${BASE}/bess.svg`, alt: 'Battery energy storage' },
  '7HA Unit #': { src: `${BASE}/gas-turbine-7ha.svg`, alt: 'Heavy-duty gas turbine' },
  'LM2500 Unit #': { src: `${BASE}/gas-turbine-lm2500.svg`, alt: 'Aeroderivative gas turbine' },
  'Project LCOE ($/MWh)': { src: `${BASE}/lcoe.svg`, alt: 'Levelized cost of electricity' },
  [DATAVIS_LOAD_COMPLIANCE_COL]: { src: `${BASE}/uptime.svg`, alt: 'Data center uptime' },
  [DATAVIS_CFE_COL]: { src: `${BASE}/carbon-free.svg`, alt: 'Carbon-free power' },
};

export function parcoordsAxisIconForColumn(columnKey) {
  return DATAVIS_PARCOORDS_AXIS_ICONS[columnKey] || null;
}
