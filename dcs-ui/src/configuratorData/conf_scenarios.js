/** Example preset scenarios for live demonstrations. */

import { createDefaultTechnologyPreferences } from '../configurator/utils/conf_technologyPreferences';
import {
  createDefaultTechnologyCapex,
  ideumConfiguratorTechnologyIds,
} from '../configurator/utils/conf_technologyCapex';

const DEFAULT_TECH_PREFS = createDefaultTechnologyPreferences();

export const CONFIGURATOR_PRESET_SCENARIOS = [
  {
    id: 'hyperscale-texas',
    label: 'Hyperscale / Texas',
    inputs: {
      loadMW: 1300,
      stateId: 'texas',
      cityId: 'dallas_tx',
      reliabilityTarget: 99.999,
      minCfePercent: 60,
      technologies: ['heavyDutyGT', 'aeroderivativeGT', 'solar', 'wind', 'battery'],
    },
  },
  {
    id: 'solar-heavy-arizona',
    label: 'Solar-Heavy / Arizona',
    inputs: {
      loadMW: 500,
      stateId: 'arizona',
      cityId: 'phoenix_az',
      reliabilityTarget: 99.99,
      minCfePercent: 75,
      technologies: ['heavyDutyGT', 'solar', 'battery'],
    },
  },
  {
    id: 'high-reliability-virginia',
    label: 'High Availability / Virginia',
    inputs: {
      loadMW: 1000,
      stateId: 'virginia',
      cityId: 'northern_virginia',
      reliabilityTarget: 99.999,
      minCfePercent: 40,
      technologies: ['heavyDutyGT', 'aeroderivativeGT', 'solar', 'battery'],
    },
  },
  {
    id: 'renewable-iowa',
    label: 'Renewable-Leaning / Iowa',
    inputs: {
      loadMW: 750,
      stateId: 'iowa',
      cityId: 'des_moines_ia',
      reliabilityTarget: 99.99,
      minCfePercent: 80,
      gridConnectionMode: 'grid-connected',
      technologies: ['heavyDutyGT', 'wind', 'solar', 'battery'],
    },
  },
  {
    id: 'nevada-solar-battery',
    label: 'Desert Solar / Nevada',
    inputs: {
      loadMW: 600,
      stateId: 'nevada',
      cityId: 'las_vegas_nv',
      reliabilityTarget: 99.99,
      minCfePercent: 70,
      technologies: ['heavyDutyGT', 'solar', 'battery'],
    },
  },
  {
    id: 'california-clean',
    label: 'California Clean Grid',
    inputs: {
      loadMW: 900,
      stateId: 'california',
      cityId: 'san_jose_ca',
      reliabilityTarget: 99.99,
      minCfePercent: 85,
      technologies: ['heavyDutyGT', 'aeroderivativeGT', 'solar', 'wind', 'battery', 'fuelCell'],
    },
  },
  {
    id: 'ny-reliability',
    label: 'Northeast Availability / NY',
    inputs: {
      loadMW: 450,
      stateId: 'new_york',
      cityId: 'schenectady_ny',
      reliabilityTarget: 99.999,
      minCfePercent: 55,
      technologies: ['heavyDutyGT', 'fuelCell', 'solar', 'battery'],
    },
  },
  {
    id: 'houston-midscale',
    label: 'Midscale / Houston',
    inputs: {
      loadMW: 350,
      stateId: 'texas',
      cityId: 'houston_tx',
      reliabilityTarget: 99.9,
      minCfePercent: 45,
      technologies: ['heavyDutyGT', 'aeroderivativeGT', 'solar', 'battery'],
    },
  },
  {
    id: 'virginia-hyperscale',
    label: 'Hyperscale / Northern Virginia',
    inputs: {
      loadMW: 1200,
      stateId: 'virginia',
      cityId: 'northern_virginia',
      reliabilityTarget: 99.999,
      minCfePercent: 50,
      technologies: ['heavyDutyGT', 'aeroderivativeGT', 'solar', 'wind', 'battery'],
    },
  },
  {
    id: 'iowa-wind-heavy',
    label: 'Wind-Heavy / Iowa',
    inputs: {
      loadMW: 650,
      stateId: 'iowa',
      cityId: 'des_moines_ia',
      reliabilityTarget: 99.99,
      minCfePercent: 90,
      technologies: ['heavyDutyGT', 'wind', 'battery'],
    },
  },
  {
    id: 'arizona-edge',
    label: 'Edge Data Center / Phoenix',
    inputs: {
      loadMW: 150,
      stateId: 'arizona',
      cityId: 'phoenix_az',
      reliabilityTarget: 99.99,
      minCfePercent: 65,
      technologies: ['aeroderivativeGT', 'solar', 'battery', 'recipEngine'],
    },
  },
  {
    id: 'texas-gas-peaking',
    label: 'Gas-Peaking / Texas',
    inputs: {
      loadMW: 800,
      stateId: 'texas',
      cityId: 'houston_tx',
      reliabilityTarget: 99.999,
      minCfePercent: 25,
      technologies: ['heavyDutyGT', 'aeroderivativeGT', 'recipEngine', 'battery'],
    },
  },
  {
    id: 'california-max-cfe',
    label: 'Max CFE Challenge / California',
    inputs: {
      loadMW: 1100,
      stateId: 'california',
      cityId: 'san_jose_ca',
      reliabilityTarget: 99.99,
      minCfePercent: 95,
      technologies: ['heavyDutyGT', 'solar', 'wind', 'battery'],
    },
  },
];

export const CONFIGURATOR_DEFAULT_INPUTS = {
  loadMW: 1000,
  stateId: 'texas',
  cityId: 'dallas_tx',
  reliabilityTarget: 99.99,
  minCfePercent: 60,
  gridConnectionMode: 'grid-connected',
  uiMode: 'basic',
  optimizationObjective: 'lowestCost',
  technologyMinPercent: {},
  technologyPreferences: DEFAULT_TECH_PREFS,
  technologyCapex: createDefaultTechnologyCapex(),
  technologies: ideumConfiguratorTechnologyIds(),
};
