/** Technology definitions — supports future equipment-model hierarchy. */

export const CONFIGURATOR_TECHNOLOGIES = [
  {
    id: 'heavyDutyGT',
    label: 'Heavy-Duty Gas Turbine',
    shortLabel: 'Heavy Duty GT',
    assetClass: 'generation',
    category: 'dispatchable',
    icon: 'turbine',
    defaultLcoe: 72,
    defaultCf: 0.88,
    carbonLbPerMWh: 850,
    cfeClass: 'Fossil',
    leadTime: {
      typicalModel: '7HA-class heavy-duty frame',
      typicalLeadTimeMonths: '18–24',
      lastUpdated: '2026-01-15',
      disclaimer: 'Indicative only — confirm with GE Vernova Gas Power.',
    },
    futureModels: ['7HA.03', '7HA.02', '6F.03', '6C.03'],
  },
  {
    id: 'aeroderivativeGT',
    label: 'Aeroderivative Gas Turbine',
    shortLabel: 'Aero GT',
    assetClass: 'generation',
    category: 'dispatchable',
    icon: 'aero',
    defaultLcoe: 95,
    defaultCf: 0.24,
    carbonLbPerMWh: 820,
    cfeClass: 'Fossil',
    leadTime: {
      typicalModel: 'LM6000 / LM2500 class',
      typicalLeadTimeMonths: '12–18',
      lastUpdated: '2026-01-15',
      disclaimer: 'Indicative only — confirm with GE Vernova Gas Power.',
    },
    futureModels: ['LM2500', 'LM6000'],
  },
  {
    id: 'solar',
    label: 'Solar',
    shortLabel: 'Solar',
    assetClass: 'generation',
    category: 'renewable',
    icon: 'solar',
    defaultLcoe: 38,
    defaultCf: 0.27,
    carbonLbPerMWh: 0,
    cfeClass: 'Carbon-Free',
    leadTime: {
      typicalModel: 'Utility-scale PV array',
      typicalLeadTimeMonths: '9–14',
      lastUpdated: '2026-01-15',
      disclaimer: 'Indicative EPC schedule — site-dependent.',
    },
    futureModels: [],
  },
  {
    id: 'wind',
    label: 'Wind',
    shortLabel: 'Wind',
    assetClass: 'generation',
    category: 'renewable',
    icon: 'wind',
    defaultLcoe: 42,
    defaultCf: 0.39,
    carbonLbPerMWh: 0,
    cfeClass: 'Carbon-Free',
    leadTime: {
      typicalModel: 'Onshore wind farm',
      typicalLeadTimeMonths: '12–20',
      lastUpdated: '2026-01-15',
      disclaimer: 'Indicative — permitting and interconnection vary.',
    },
    futureModels: [],
  },
  {
    id: 'battery',
    label: 'Battery Energy Storage',
    shortLabel: 'Battery',
    assetClass: 'storage',
    category: 'storage',
    icon: 'battery',
    defaultLcoe: 110,
    defaultCf: null,
    utilizationMetric: 'cyclesPerDay',
    carbonLbPerMWh: 12,
    cfeClass: 'Storage',
    defaultDurationH: 4,
    leadTime: {
      typicalModel: 'Grid-scale BESS',
      typicalLeadTimeMonths: '10–16',
      lastUpdated: '2026-01-15',
      disclaimer: 'Indicative — not used in optimizer for MVP.',
    },
    futureModels: [],
  },
  {
    id: 'nuclear',
    label: 'Nuclear Energy',
    shortLabel: 'Nuclear',
    assetClass: 'generation',
    category: 'dispatchable',
    icon: 'nuclear',
    defaultLcoe: 78,
    defaultCf: 0.92,
    carbonLbPerMWh: 0,
    cfeClass: 'Carbon-Free',
    leadTime: {
      typicalModel: 'GE Hitachi BWRX-300 SMR',
      typicalLeadTimeMonths: '36–60',
      lastUpdated: '2026-03-15',
      disclaimer: 'Indicative only — confirm with GE Vernova Nuclear.',
    },
    futureModels: ['BWRX-300'],
  },
  {
    id: 'fuelCell',
    label: 'Fuel Cell',
    shortLabel: 'Fuel Cell',
    assetClass: 'generation',
    category: 'dispatchable',
    icon: 'fuelcell',
    defaultLcoe: 105,
    defaultCf: 0.72,
    carbonLbPerMWh: 420,
    cfeClass: 'Low-Carbon',
    leadTime: {
      typicalModel: 'Solid-oxide / hydrogen-ready FC',
      typicalLeadTimeMonths: '14–22',
      lastUpdated: '2026-01-15',
      disclaimer: 'Indicative only — confirm with GE Vernova.',
    },
    futureModels: [],
  },
  {
    id: 'recipEngine',
    label: 'Reciprocating Engine',
    shortLabel: 'Recip Engine',
    assetClass: 'generation',
    category: 'dispatchable',
    icon: 'recip',
    defaultLcoe: 88,
    defaultCf: 0.35,
    carbonLbPerMWh: 780,
    cfeClass: 'Fossil',
    leadTime: {
      typicalModel: 'Reciprocating engine genset',
      typicalLeadTimeMonths: '8–14',
      lastUpdated: '2026-01-15',
      disclaimer: 'Indicative only — confirm with GE Vernova.',
    },
    futureModels: [],
  },
];

export const DEFAULT_TECHNOLOGY_IDS = [
  'heavyDutyGT',
  'aeroderivativeGT',
  'solar',
  'wind',
  'battery',
];

export function getTechnologyById(id) {
  return CONFIGURATOR_TECHNOLOGIES.find((t) => t.id === id);
}

export function getGenerationTechnologies() {
  return CONFIGURATOR_TECHNOLOGIES.filter((t) => t.assetClass === 'generation');
}

export function getStorageTechnologies() {
  return CONFIGURATOR_TECHNOLOGIES.filter((t) => t.assetClass === 'storage');
}

export function isGenerationTechnology(id) {
  return getTechnologyById(id)?.assetClass === 'generation';
}

export function isStorageTechnology(id) {
  return getTechnologyById(id)?.assetClass === 'storage';
}
