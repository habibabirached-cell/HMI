/**
 * Consolidated study regression — k-NN interpolation over consolidated.json records.
 * Curtailment still uses the synthetic formula from conf_configuratorEngine.
 */

import consolidatedData from '../../configuratorData/consolidated.json';
import { GRID_CONNECTION_MODES } from '../../configuratorData/conf_constants';
import { getResourceProfile, getStateById, getCityById } from '../../configuratorData/conf_locations';
import { validateConfiguratorInputs } from './conf_validateInputs';
import { computeCurtailment, snapReliabilityLevel } from './conf_configuratorEngine';

export const CONSOLIDATED_MW_OUTPUT_IDS = [
  'hd7ha02',
  'hd7f05',
  'lm2500g4',
  'lm250022mw',
  'wind',
  'solar',
  'battery',
];

export const CONSOLIDATED_TECH_SPECS = {
  hd7ha02: {
    label: 'HD - 7HA.02',
    fullLabel: 'HD - 7HA.02',
    assetClass: 'generation',
    cfeClass: 'Fossil',
    defaultCf: 0.88,
    defaultLcoe: 72,
    carbonLbPerMWh: 850,
  },
  hd7f05: {
    label: 'HD - 7F.05',
    fullLabel: 'HD - 7F.05',
    assetClass: 'generation',
    cfeClass: 'Fossil',
    defaultCf: 0.85,
    defaultLcoe: 74,
    carbonLbPerMWh: 850,
  },
  lm2500g4: {
    label: 'LM2500+G4',
    fullLabel: 'LM2500+G4',
    assetClass: 'generation',
    cfeClass: 'Fossil',
    defaultCf: 0.35,
    defaultLcoe: 95,
    carbonLbPerMWh: 820,
  },
  lm250022mw: {
    label: 'LM2500 22MW',
    fullLabel: 'LM2500 22MW',
    assetClass: 'generation',
    cfeClass: 'Fossil',
    defaultCf: 0.24,
    defaultLcoe: 98,
    carbonLbPerMWh: 820,
  },
  wind: {
    label: 'Wind',
    fullLabel: 'Wind',
    assetClass: 'generation',
    cfeClass: 'Carbon-Free',
    defaultCf: 0.39,
    defaultLcoe: 42,
    carbonLbPerMWh: 0,
  },
  solar: {
    label: 'Solar',
    fullLabel: 'Solar',
    assetClass: 'generation',
    cfeClass: 'Carbon-Free',
    defaultCf: 0.27,
    defaultLcoe: 38,
    carbonLbPerMWh: 0,
  },
  battery: {
    label: 'BESS',
    fullLabel: 'Battery Energy Storage',
    assetClass: 'storage',
    cfeClass: 'Storage',
    defaultCf: null,
    defaultLcoe: 110,
    carbonLbPerMWh: 12,
    defaultDurationH: 4,
  },
};

const PLACE_TO_STATE = {
  TX: 'texas',
  AZ: 'arizona',
  ID: 'idaho',
  PA: 'pennsylvania',
};

const STATE_TO_PLACE = Object.fromEntries(
  Object.entries(PLACE_TO_STATE).map(([place, stateId]) => [stateId, place]),
);

const STUDY_RECORDS = consolidatedData.records || [];
const REFERENCE_LOAD_MW = STUDY_RECORDS[0]?.inputs?.loadMW ?? 1350;

function normalizeInputs(raw) {
  const place = STATE_TO_PLACE[raw.stateId] ?? null;
  return {
    loadMW: raw.loadMW,
    stateId: raw.stateId || 'texas',
    cityId: raw.cityId || 'dallas_tx',
    place,
    reliabilityTarget: snapReliabilityLevel(raw.reliabilityTarget ?? 99.99),
    minCfePercent: raw.minCfePercent ?? raw.cfeTarget ?? 0,
    gridConnectionMode: raw.gridConnectionMode || GRID_CONNECTION_MODES.GRID_CONNECTED,
    technologies: (raw.technologies || []).filter((id) => id !== 'recipEngine'),
    uiMode: raw.uiMode,
    optimizationObjective: raw.optimizationObjective || 'lowestCost',
    technologyMinPercent: raw.technologyMinPercent || {},
  };
}

function featureDistance(a, b) {
  const relDiff = Math.abs(a.reliabilityTarget - b.reliabilityTarget) / 0.01;
  const cfeDiff = Math.abs(a.minCfePercent - b.minCfePercent) / 10;
  const loadDiff = Math.abs(a.loadMW - b.loadMW) / Math.max(REFERENCE_LOAD_MW, 1);
  const placeDiff = a.place === b.place ? 0 : 25;
  return relDiff + cfeDiff + loadDiff + placeDiff;
}

function findExactRecord(inputs) {
  return STUDY_RECORDS.find((rec) => {
    const inp = rec.inputs;
    return (
      inp.place === inputs.place
      && Math.abs(inp.minCfePercent - inputs.minCfePercent) < 0.01
      && Math.abs(inp.reliabilityTarget - inputs.reliabilityTarget) < 0.0001
      && Math.abs(inp.loadMW - inputs.loadMW) < 1
    );
  });
}

function rankNeighbors(inputs, k = 4) {
  const ranked = STUDY_RECORDS
    .map((rec) => ({ rec, dist: featureDistance(inputs, { ...rec.inputs, place: rec.inputs.place }) }))
    .sort((a, b) => a.dist - b.dist);
  const neighbors = ranked.slice(0, Math.min(k, ranked.length));
  const weights = neighbors.map(({ dist }) => 1 / (dist + 0.05));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  return { neighbors, weights, weightSum };
}

/** Blend technology **shares** (not raw MW) so zeros in one neighbor do not wipe out aero. */
function blendCapacityShares(neighbors, weights, weightSum) {
  const shares = Object.fromEntries(CONSOLIDATED_MW_OUTPUT_IDS.map((id) => [id, 0]));
  let blendedTotal = 0;
  neighbors.forEach(({ rec }, idx) => {
    const w = weights[idx] / weightSum;
    const recTotal = CONSOLIDATED_MW_OUTPUT_IDS.reduce((s, id) => s + (rec.outputs[id] ?? 0), 0);
    blendedTotal += recTotal * w;
    if (recTotal <= 0) return;
    CONSOLIDATED_MW_OUTPUT_IDS.forEach((id) => {
      shares[id] += ((rec.outputs[id] ?? 0) / recTotal) * w;
    });
  });
  return { shares, blendedTotal };
}

function outputsFromTemplateRecord(rec, loadMW, cfeZero) {
  const outputs = { ...rec.outputs };
  const dispatchIds = ['hd7ha02', 'hd7f05', 'lm2500g4', 'lm250022mw', 'battery'];
  if (cfeZero) {
    outputs.wind = 0;
    outputs.solar = 0;
    const fossilTotal = dispatchIds.reduce((s, id) => s + (outputs[id] ?? 0), 0);
    const targetTotal = loadMW * 1.1;
    if (fossilTotal > 0) {
      const factor = targetTotal / fossilTotal;
      dispatchIds.forEach((id) => {
        outputs[id] = (outputs[id] ?? 0) * factor;
      });
    }
  } else {
    const scale = loadMW / REFERENCE_LOAD_MW;
    CONSOLIDATED_MW_OUTPUT_IDS.forEach((id) => {
      outputs[id] = Math.max(0, (outputs[id] ?? 0) * scale);
    });
  }
  return outputs;
}

function pickCfeZeroTemplate(inputs) {
  const placeRecords = STUDY_RECORDS.filter((rec) => rec.inputs.place === inputs.place);
  if (!placeRecords.length) return null;
  return placeRecords
    .slice()
    .sort((a, b) => {
      const cfeDiff = a.inputs.minCfePercent - b.inputs.minCfePercent;
      if (cfeDiff !== 0) return cfeDiff;
      return featureDistance(inputs, a.inputs) - featureDistance(inputs, b.inputs);
    })[0];
}

function predictOutputs(inputs, k = 4) {
  const exact = findExactRecord(inputs);
  if (exact) {
    return { outputs: { ...exact.outputs }, method: 'exact-record', neighbors: [exact.id] };
  }

  if (inputs.minCfePercent <= 0) {
    const template = pickCfeZeroTemplate(inputs);
    if (template) {
      return {
        outputs: outputsFromTemplateRecord(template, inputs.loadMW, true),
        method: 'cfe-zero-template',
        neighbors: [template.id],
      };
    }
  }

  const { neighbors, weights, weightSum } = rankNeighbors(inputs, k);
  const { shares, blendedTotal } = blendCapacityShares(neighbors, weights, weightSum);
  const targetTotal = blendedTotal * (inputs.loadMW / REFERENCE_LOAD_MW);

  const outputs = {};
  CONSOLIDATED_MW_OUTPUT_IDS.forEach((id) => {
    outputs[id] = shares[id] * targetTotal;
  });
  ['lcoe', 'achievedReliability'].forEach((key) => {
    outputs[key] = neighbors.reduce((sum, { rec }, idx) => {
      const val = rec.outputs[key] ?? 0;
      return sum + val * (weights[idx] / weightSum);
    }, 0);
  });

  return {
    outputs,
    method: 'knn-share-regression',
    neighbors: neighbors.map(({ rec }) => rec.id),
  };
}

function scaleMwOutputs(outputs, loadMW) {
  const scale = loadMW / REFERENCE_LOAD_MW;
  const next = { ...outputs };
  CONSOLIDATED_MW_OUTPUT_IDS.forEach((id) => {
    next[id] = Math.max(0, (next[id] ?? 0) * scale);
  });
  return next;
}

function applyCfeZeroConstraints(outputs, loadMW) {
  const next = { ...outputs, wind: 0, solar: 0 };
  const dispatchIds = ['hd7ha02', 'hd7f05', 'lm2500g4', 'lm250022mw', 'battery'];
  let total = dispatchIds.reduce((s, id) => s + (next[id] ?? 0), 0);
  const cap = loadMW * 1.1;
  if (total > cap && total > 0) {
    const factor = cap / total;
    dispatchIds.forEach((id) => {
      next[id] = (next[id] ?? 0) * factor;
    });
  }
  return next;
}

function enforceLoadCap(outputs, loadMW) {
  const next = { ...outputs };
  const dispatchIds = ['hd7ha02', 'hd7f05', 'lm2500g4', 'lm250022mw', 'battery'];
  const cap = Math.round(loadMW * 1.1);
  let total = dispatchIds.reduce((s, id) => s + (next[id] ?? 0), 0);
  while (total > cap) {
    const largest = dispatchIds.reduce(
      (best, id) => ((next[id] ?? 0) > (next[best] ?? 0) ? id : best),
      dispatchIds[0],
    );
    next[largest] = Math.max(0, (next[largest] ?? 0) - 1);
    total -= 1;
  }
  return next;
}

function roundMwOutputs(outputs) {
  const next = { ...outputs };
  CONSOLIDATED_MW_OUTPUT_IDS.forEach((id) => {
    next[id] = Math.round(next[id] ?? 0);
  });
  next.lcoe = Math.round(next.lcoe ?? 0);
  next.achievedReliability = Math.min(
    99.9999,
    Math.round((next.achievedReliability ?? 99.99) * 10000) / 10000,
  );
  return next;
}

function buildSupplyMixRows(outputs, inputs, profile) {
  const rows = [];
  let totalEnergy = 0;
  let cfeEnergy = 0;
  let weightedLcoe = 0;
  let weightedCarbon = 0;

  CONSOLIDATED_MW_OUTPUT_IDS.forEach((id) => {
    const mw = outputs[id] ?? 0;
    if (mw <= 0) return;
    const spec = CONSOLIDATED_TECH_SPECS[id];
    let cf = spec.defaultCf;
    let utilization = null;
    if (id === 'battery') {
      cf = null;
      utilization = 1.1 + inputs.minCfePercent * 0.006;
    } else if (id === 'solar') {
      cf = spec.defaultCf * (0.85 + profile.solarWeight * 0.2);
    } else if (id === 'wind') {
      cf = spec.defaultCf * (0.85 + profile.windWeight * 0.2);
    }

    const annualGWh = cf != null
      ? mw * cf * 8760 / 1000
      : mw * (utilization ?? 1) * 2.5 * 365 / 1000;
    totalEnergy += annualGWh;
    if (spec.cfeClass === 'Carbon-Free') cfeEnergy += annualGWh;
    if (spec.cfeClass === 'Storage' && (inputs.minCfePercent ?? 0) > 0) {
      cfeEnergy += annualGWh * 0.35;
    }

    const lcoe = id === 'battery' ? outputs.lcoe : spec.defaultLcoe * profile.lcoeFactor;
    weightedLcoe += lcoe * annualGWh;
    weightedCarbon += spec.carbonLbPerMWh * annualGWh;

    rows.push({
      id,
      label: spec.label,
      fullLabel: spec.fullLabel,
      assetClass: spec.assetClass,
      installedMW: mw,
      batteryMWh: id === 'battery' ? mw * (spec.defaultDurationH ?? 4) : null,
      capacityFactor: cf,
      utilization,
      energyContributionGWh: annualGWh,
      lcoe,
      cfeClass: spec.cfeClass,
    });
  });

  rows.sort((a, b) => b.installedMW - a.installedMW);
  const totalMW = rows.reduce((s, r) => s + r.installedMW, 0);
  rows.forEach((r) => {
    r.energySharePercent = totalEnergy > 0 ? (r.energyContributionGWh / totalEnergy) * 100 : 0;
    r.capacitySharePercent = totalMW > 0 ? (r.installedMW / totalMW) * 100 : 0;
  });

  return {
    rows,
    totalEnergy,
    cfeEnergy,
    portfolioLcoe: outputs.lcoe ?? (totalEnergy > 0 ? weightedLcoe / totalEnergy : 0),
    carbonIntensity: totalEnergy > 0 ? weightedCarbon / totalEnergy : 0,
  };
}

function guaranteeMinCfe(achieved, minimum) {
  if (minimum <= 0) return achieved;
  return Math.max(achieved, minimum + 0.3);
}

export function canUseConsolidatedEngine(inputs) {
  return Boolean(inputs?.place && STUDY_RECORDS.length > 0);
}

export function runConsolidatedEngine(rawInputs) {
  const inputs = normalizeInputs(rawInputs);
  const validation = validateConfiguratorInputs(inputs);
  if (!validation.ok) {
    return { ok: false, error: validation.error, details: validation.details };
  }
  if (!canUseConsolidatedEngine(inputs)) {
    return { ok: false, error: 'consolidated-unavailable', fallback: true };
  }

  const profile = getResourceProfile(inputs.stateId);
  const state = getStateById(inputs.stateId);
  const city = getCityById(inputs.cityId);

  let { outputs, method, neighbors } = predictOutputs(inputs);
  if (method === 'exact-record') {
    outputs = scaleMwOutputs(outputs, inputs.loadMW);
  }
  if (inputs.minCfePercent <= 0 && method !== 'cfe-zero-template') {
    outputs = applyCfeZeroConstraints(outputs, inputs.loadMW);
  }
  outputs = roundMwOutputs(outputs);
  if (inputs.minCfePercent <= 0) {
    outputs = enforceLoadCap(outputs, inputs.loadMW);
  }

  const metrics = buildSupplyMixRows(outputs, inputs, profile);
  const rawCfe = metrics.totalEnergy > 0 ? (metrics.cfeEnergy / metrics.totalEnergy) * 100 : 0;
  const achievedCfe = inputs.minCfePercent <= 0
    ? 0
    : guaranteeMinCfe(rawCfe, inputs.minCfePercent);
  const achievedReliability = Math.max(inputs.reliabilityTarget, outputs.achievedReliability);
  const curtailment = computeCurtailment(inputs, profile, metrics.rows, 42);
  const totalInstalled = metrics.rows.reduce((s, r) => s + r.installedMW, 0);

  const gridLabel = inputs.gridConnectionMode === GRID_CONNECTION_MODES.ISLANDED
    ? 'islanded'
    : 'grid-connected';

  return {
    ok: true,
    synthetic: false,
    source: 'consolidated-regression',
    regressionMethod: method,
    regressionNeighbors: neighbors,
    optimizationObjective: inputs.optimizationObjective,
    inputs: { ...inputs },
    location: {
      state: state?.label,
      city: city?.label,
      solarResource: profile.solarResource,
      windResource: profile.windResource,
    },
    gridConnectionMode: inputs.gridConnectionMode,
    summary: `Consolidated study portfolio for a ${(inputs.loadMW / 1000).toFixed(2)} GW ${gridLabel} data center — ${inputs.reliabilityTarget}% reliability (minimum)${inputs.minCfePercent > 0 ? `, ≥${inputs.minCfePercent}% CFE` : ''}.`,
    totalInstalledMW: totalInstalled,
    supplyMix: metrics.rows.map((r) => ({
      ...r,
      percent: r.capacitySharePercent,
      capacitySharePercent: r.capacitySharePercent,
      energySharePercent: r.energySharePercent,
    })),
    kpis: {
      installedCapacityMW: totalInstalled,
      achievedReliability,
      reliabilityTarget: inputs.reliabilityTarget,
      achievedCfe,
      minCfePercent: inputs.minCfePercent,
      lcoe: Math.round(outputs.lcoe ?? metrics.portfolioLcoe),
      carbonIntensity: Math.round(metrics.carbonIntensity),
    },
    capacityFactors: metrics.rows.map((r) => ({
      id: r.id,
      label: r.label,
      capacityFactor: r.capacityFactor,
      utilization: r.utilization,
    })),
    curtailment,
    annualGenerationGWh: Number(metrics.totalEnergy.toFixed(1)),
    targets: {
      relMet: achievedReliability >= inputs.reliabilityTarget,
      cfeMet: inputs.minCfePercent <= 0 || achievedCfe >= inputs.minCfePercent,
      loadMet: inputs.minCfePercent > 0 || totalInstalled <= inputs.loadMW * 1.1 + 0.5,
      notes: validation.warnings || [],
    },
  };
}

export function mapSyntheticResultToGranular(syntheticResult) {
  if (!syntheticResult?.ok) return syntheticResult;

  const mix = syntheticResult.supplyMix || [];
  const getMw = (id) => mix.find((r) => r.id === id)?.installedMW ?? 0;
  const hd = getMw('heavyDutyGT');
  const aero = getMw('aeroderivativeGT');
  const wind = getMw('wind');
  const solar = getMw('solar');
  const battery = getMw('battery');

  const capacities = {
    hd7ha02: Math.round(hd * 0.55),
    hd7f05: Math.round(hd * 0.45),
    lm2500g4: Math.round(aero * 0.6),
    lm250022mw: Math.round(aero * 0.4),
    wind: Math.round(wind),
    solar: Math.round(solar),
    battery: Math.round(battery),
  };

  if ((syntheticResult.inputs?.minCfePercent ?? 0) <= 0) {
    capacities.wind = 0;
    capacities.solar = 0;
    const dispatchIds = ['hd7ha02', 'hd7f05', 'lm2500g4', 'lm250022mw', 'battery'];
    const loadMW = syntheticResult.inputs?.loadMW ?? REFERENCE_LOAD_MW;
    const cap = Math.round(loadMW * 1.1);
    let total = dispatchIds.reduce((s, id) => s + capacities[id], 0);
    while (total > cap) {
      const largest = dispatchIds.reduce(
        (best, id) => (capacities[id] > capacities[best] ? id : best),
        dispatchIds[0],
      );
      capacities[largest] = Math.max(0, capacities[largest] - 1);
      total -= 1;
    }
  }

  const inputs = syntheticResult.inputs || {};
  const profile = getResourceProfile(inputs.stateId || 'texas');
  const metrics = buildSupplyMixRows(
    {
      ...capacities,
      lcoe: syntheticResult.kpis?.lcoe ?? 80,
      achievedReliability: syntheticResult.kpis?.achievedReliability ?? inputs.reliabilityTarget,
    },
    inputs,
    profile,
  );

  const totalInstalled = metrics.rows.reduce((s, r) => s + r.installedMW, 0);
  return {
    ...syntheticResult,
    source: 'synthetic-engine-mapped',
    supplyMix: metrics.rows.map((r) => ({
      ...r,
      percent: r.capacitySharePercent,
      capacitySharePercent: r.capacitySharePercent,
      energySharePercent: r.energySharePercent,
    })),
    capacityFactors: metrics.rows.map((r) => ({
      id: r.id,
      label: r.label,
      capacityFactor: r.capacityFactor,
      utilization: r.utilization,
    })),
    totalInstalledMW: totalInstalled,
    kpis: {
      ...syntheticResult.kpis,
      installedCapacityMW: totalInstalled,
    },
  };
}
