import {
  DATAVIS_CFE_COL,
  DATAVIS_LOAD_COMPLIANCE_COL,
} from './dataVisColumnDisplayLabel';

export const EXPLORE_WALL_GREEN_ENERGY_KEYS = [
  'Solar AC Nameplate (MWac)',
  'Wind Nameplate (MWac)',
  'BESS power Nameplate (MW)',
];

export const EXPLORE_WALL_CARBON_ENERGY_KEYS = ['7HA Unit #', 'LM2500 Unit #'];

const OUTCOME_KEYS = [DATAVIS_CFE_COL, 'Project LCOE ($/MWh)', DATAVIS_LOAD_COMPLIANCE_COL];

/** Explore Data: renewables → gas → carbon-free, LCOE, uptime (columns present in tier). */
export function orderExploreWallParallelDimensions(dims) {
  if (!Array.isArray(dims) || !dims.length) return [];
  const present = new Set(dims);
  const ordered = [];
  const push = (keys) => keys.forEach((k) => present.has(k) && ordered.push(k));
  push(EXPLORE_WALL_GREEN_ENERGY_KEYS);
  push(EXPLORE_WALL_CARBON_ENERGY_KEYS);
  push(OUTCOME_KEYS);
  dims.forEach((k) => {
    if (!ordered.includes(k)) ordered.push(k);
  });
  return ordered;
}

/** @returns {'green' | 'carbon' | null} */
export function exploreWallAxisEnergyKind(columnKey) {
  if (EXPLORE_WALL_GREEN_ENERGY_KEYS.includes(columnKey)) return 'green';
  if (EXPLORE_WALL_CARBON_ENERGY_KEYS.includes(columnKey)) return 'carbon';
  return null;
}

function indexSpan(dimensionKeys, keys) {
  const indices = dimensionKeys
    .map((k, i) => (keys.includes(k) ? i : -1))
    .filter((i) => i >= 0);
  if (!indices.length) return null;
  return { from: Math.min(...indices), to: Math.max(...indices) };
}

/** Header merge spans for swim-lane row (axis indices in plot order). */
export function exploreWallSwimlaneSpec(dimensionKeys) {
  const energyKeys = [
    ...EXPLORE_WALL_GREEN_ENERGY_KEYS,
    ...EXPLORE_WALL_CARBON_ENERGY_KEYS,
  ];
  return {
    energy: indexSpan(dimensionKeys, energyKeys),
    green: indexSpan(dimensionKeys, EXPLORE_WALL_GREEN_ENERGY_KEYS),
    carbon: indexSpan(dimensionKeys, EXPLORE_WALL_CARBON_ENERGY_KEYS),
    outcomes: indexSpan(dimensionKeys, OUTCOME_KEYS),
  };
}
