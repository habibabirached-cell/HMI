/** Shared configurator constants — inputs, modes, future optimization objectives. */

export const RELIABILITY_LEVELS = [
  { value: 99, label: '99%', sub: 'Two Nines' },
  { value: 99.9, label: '99.9%', sub: 'Three Nines' },
  { value: 99.99, label: '99.99%', sub: 'Four Nines' },
  { value: 99.999, label: '99.999%', sub: 'Five Nines' },
  { value: 99.9999, label: '99.9999%', sub: 'Six Nines' },
];

export const MIN_CFE_PRESETS = [0, 50, 75, 80, 100];

export const GRID_CONNECTION_MODES = {
  GRID_CONNECTED: 'grid-connected',
  ISLANDED: 'islanded',
};

export const UI_MODES = {
  BASIC: 'basic',
  ADVANCED: 'advanced',
};

/** MVP uses lowest-cost only; others reserved for future customer objective selector. */
export const OPTIMIZATION_OBJECTIVES = {
  LOWEST_COST: 'lowestCost',
  FASTEST_SPEED_TO_POWER: 'fastestSpeedToPower',
  HIGHEST_RELIABILITY: 'highestReliability',
  LOWEST_CARBON: 'lowestCarbon',
};

export const DEFAULT_OPTIMIZATION_OBJECTIVE = OPTIMIZATION_OBJECTIVES.LOWEST_COST;
