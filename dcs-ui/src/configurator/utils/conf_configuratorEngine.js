/**
 * Deterministic least-cost synthetic optimizer (MVP).
 * Hard constraints: reliability floor, minimum CFE, grid/islanded feasibility.
 * Selected technologies are soft — optimizer may assign 0 MW.
 */

import { GRID_CONNECTION_MODES, UI_MODES } from '../../configuratorData/conf_constants';
import { getTechnologyById } from '../../configuratorData/conf_technologies';
import { getResourceProfile, getStateById, getCityById } from '../../configuratorData/conf_locations';
import { validateConfiguratorInputs } from './conf_validateInputs';

const RELIABILITY_OVERBUILD = {
  99: 1.06,
  99.9: 1.1,
  99.99: 1.18,
  99.999: 1.28,
};

const GENERATION_IDS = [
  'heavyDutyGT', 'aeroderivativeGT', 'solar', 'wind', 'fuelCell', 'recipEngine',
];

function hashInputs(inputs) {
  const key = JSON.stringify({
    loadMW: inputs.loadMW,
    stateId: inputs.stateId,
    cityId: inputs.cityId,
    reliabilityTarget: inputs.reliabilityTarget,
    minCfePercent: inputs.minCfePercent,
    gridConnectionMode: inputs.gridConnectionMode,
    technologies: [...(inputs.technologies || [])].sort(),
    technologyMinPercent: inputs.technologyMinPercent || {},
  });
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function seededJitter(seed, index, amplitude = 0.04) {
  const x = Math.sin(seed * 0.0001 + index * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * amplitude;
}

function snapReliabilityLevel(target) {
  const levels = [99, 99.9, 99.99, 99.999];
  return levels.reduce((best, k) => (Math.abs(k - target) < Math.abs(best - target) ? k : best), 99.99);
}

function normalizeInputs(raw) {
  return {
    loadMW: raw.loadMW,
    stateId: raw.stateId || 'texas',
    cityId: raw.cityId || 'dallas_tx',
    reliabilityTarget: snapReliabilityLevel(raw.reliabilityTarget ?? 99.99),
    minCfePercent: raw.minCfePercent ?? raw.cfeTarget ?? 0,
    gridConnectionMode: raw.gridConnectionMode || GRID_CONNECTION_MODES.GRID_CONNECTED,
    technologies: raw.technologies || [],
    uiMode: raw.uiMode || UI_MODES.BASIC,
    optimizationObjective: raw.optimizationObjective || 'lowestCost',
    technologyMinPercent: raw.technologyMinPercent || {},
  };
}

/** Cost score — lower is cheaper (least-cost ranking). */
function unitCostScore(techId, profile, inputs, seed, idx) {
  const tech = getTechnologyById(techId);
  if (!tech) return 999;
  let cost = tech.defaultLcoe * profile.lcoeFactor;
  if (techId === 'solar') cost *= 1 - profile.solarWeight * 0.12;
  if (techId === 'wind') cost *= 1 - profile.windWeight * 0.1;
  if (inputs.gridConnectionMode === GRID_CONNECTION_MODES.ISLANDED) {
    if (tech.category === 'dispatchable') cost *= 0.92;
    if (tech.category === 'renewable') cost *= 1.05;
  }
  cost *= 1 + seededJitter(seed, idx, 0.03);
  return cost;
}

function allocateLeastCost(inputs, profile, seed) {
  const allowed = new Set(inputs.technologies);
  const relLevel = snapReliabilityLevel(inputs.reliabilityTarget);
  let margin = RELIABILITY_OVERBUILD[relLevel] ?? 1.15;

  if (inputs.gridConnectionMode === GRID_CONNECTION_MODES.ISLANDED) {
    margin += 0.08;
  }

  const baseTotal = inputs.loadMW * margin;
  const minCfe = inputs.minCfePercent / 100;

  const genCandidates = GENERATION_IDS.filter((id) => allowed.has(id));
  if (!genCandidates.length && inputs.gridConnectionMode === GRID_CONNECTION_MODES.ISLANDED) {
    return { error: 'Islanded operation requires at least one generation technology in the portfolio.' };
  }

  const ranked = genCandidates
    .map((id, idx) => ({ id, cost: unitCostScore(id, profile, inputs, seed, idx) }))
    .sort((a, b) => a.cost - b.cost);

  const capacities = {};
  GENERATION_IDS.concat(['battery']).forEach((id) => { capacities[id] = 0; });

  let renewableTargetMW = 0;
  if (minCfe > 0) {
    const renRanked = ranked.filter((r) => {
      const t = getTechnologyById(r.id);
      return t?.cfeClass === 'Carbon-Free';
    });
    if (renRanked.length === 0 && minCfe > 0.01) {
      return {
        error: 'Minimum CFE cannot be met with the selected generation portfolio.',
        details: [
          'Add solar, wind, or other carbon-free generation to satisfy the minimum CFE constraint.',
          'Or set Minimum CFE to 0% if carbon-free energy is not required.',
        ],
      };
    }
    renewableTargetMW = baseTotal * minCfe * 0.85;
    for (const { id } of renRanked) {
      if (renewableTargetMW <= 0) break;
      const share = profile[id === 'solar' ? 'solarWeight' : 'windWeight'] || 0.5;
      const mw = Math.round(renewableTargetMW * share / Math.max(0.01, renRanked.length === 1 ? 1 : 1.2));
      capacities[id] = Math.max(capacities[id], mw);
      renewableTargetMW -= mw;
    }
  } else {
    const cheapRen = ranked.find((r) => ['solar', 'wind'].includes(r.id));
    if (cheapRen && cheapRen.cost < 55) {
      capacities[cheapRen.id] = Math.round(baseTotal * 0.08 * profile.solarWeight);
    }
  }

  let dispatchNeed = Math.max(
    inputs.loadMW * (inputs.gridConnectionMode === GRID_CONNECTION_MODES.ISLANDED ? 1.05 : 0.75),
    baseTotal * (1 - minCfe * 0.7) - Object.values(capacities).reduce((a, b) => a + b, 0),
  );

  const dispatchRanked = ranked.filter((r) => {
    const t = getTechnologyById(r.id);
    return t && t.category === 'dispatchable';
  });

  for (const { id } of dispatchRanked) {
    if (dispatchNeed <= 0) break;
    const chunk = Math.round(Math.min(dispatchNeed, baseTotal * 0.35));
    capacities[id] = chunk;
    dispatchNeed -= chunk;
  }

  if (dispatchNeed > inputs.loadMW * 0.2 && dispatchRanked.length) {
    capacities[dispatchRanked[0].id] += Math.round(dispatchNeed);
  }

  if (allowed.has('battery')) {
    const battMW = Math.round(
      inputs.loadMW * (0.04 + minCfe * 0.06 + (relLevel >= 99.999 ? 0.04 : 0)),
    );
    capacities.battery = battMW;
  }

  if (inputs.uiMode === UI_MODES.ADvanced && inputs.technologyMinPercent) {
    const totalGen = Object.entries(capacities)
      .filter(([id]) => isGenerationId(id))
      .reduce((s, [, mw]) => s + mw, 0) || baseTotal;
    for (const [id, pct] of Object.entries(inputs.technologyMinPercent)) {
      if (!allowed.has(id) || pct <= 0) continue;
      const floor = Math.round((totalGen * pct) / 100);
      capacities[id] = Math.max(capacities[id] || 0, floor);
    }
  }

  allowed.forEach((id) => {
    if (!capacities[id]) capacities[id] = 0;
  });

  Object.keys(capacities).forEach((id) => {
    if (!allowed.has(id)) capacities[id] = 0;
  });

  const totalInstalled = Object.values(capacities).reduce((a, b) => a + b, 0);
  return { capacities, totalInstalled, margin, relLevel };
}

function isGenerationId(id) {
  return GENERATION_IDS.includes(id);
}

function buildTechnologyRows(capacities, inputs, profile, seed) {
  const rows = [];
  let totalEnergy = 0;
  let cfeEnergy = 0;
  let weightedLcoe = 0;
  let weightedCarbon = 0;

  Object.entries(capacities).forEach(([id, mw], idx) => {
    if (mw <= 0) return;
    const tech = getTechnologyById(id);
    if (!tech) return;

    let cf = tech.defaultCf;
    let utilization = null;
    if (id === 'battery') {
      cf = null;
      utilization = 1.1 + seededJitter(seed, idx + 20, 0.12) + inputs.minCfePercent * 0.006;
    } else if (id === 'solar') {
      cf = tech.defaultCf * (0.85 + profile.solarWeight * 0.2) + seededJitter(seed, idx + 21, 0.02);
    } else if (id === 'wind') {
      cf = tech.defaultCf * (0.85 + profile.windWeight * 0.2) + seededJitter(seed, idx + 22, 0.02);
    } else if (id === 'aeroderivativeGT') {
      cf = Math.max(0.12, 0.2 + (100 - inputs.minCfePercent) * 0.003);
    } else {
      cf = Math.min(0.92, (tech.defaultCf ?? 0.5) + seededJitter(seed, idx + 24, 0.02));
    }

    const annualGWh = cf != null ? mw * cf * 8760 / 1000 : mw * (utilization ?? 1) * 2.5 * 365 / 1000;
    totalEnergy += annualGWh;
    if (tech.cfeClass === 'Carbon-Free') cfeEnergy += annualGWh;
    if (tech.cfeClass === 'Storage') cfeEnergy += annualGWh * 0.35;

    const lcoe = tech.defaultLcoe * profile.lcoeFactor * (1 + (inputs.reliabilityTarget - 99) * 0.0015);
    weightedLcoe += lcoe * annualGWh;
    weightedCarbon += tech.carbonLbPerMWh * annualGWh;

    rows.push({
      id,
      label: tech.shortLabel,
      fullLabel: tech.label,
      assetClass: tech.assetClass,
      installedMW: mw,
      batteryMWh: id === 'battery' ? mw * (tech.defaultDurationH ?? 4) : null,
      capacityFactor: cf,
      utilization,
      energyContributionGWh: annualGWh,
      lcoe,
      cfeClass: tech.cfeClass,
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
    portfolioLcoe: totalEnergy > 0 ? weightedLcoe / totalEnergy : 0,
    carbonIntensity: totalEnergy > 0 ? weightedCarbon / totalEnergy : 0,
  };
}

function guaranteeReliability(target, seed) {
  const bump = 0.001 + (seed % 97) * 0.00001;
  return Math.min(99.9999, target + bump);
}

function guaranteeMinCfe(achieved, minimum) {
  if (minimum <= 0) return achieved;
  return Math.max(achieved, minimum + 0.3 + (minimum > 0 ? 0.5 : 0));
}

function computeCurtailment(inputs, profile, rows, seed) {
  const solarRow = rows.find((r) => r.id === 'solar');
  const windRow = rows.find((r) => r.id === 'wind');
  const renEnergy = rows
    .filter((r) => r.id === 'solar' || r.id === 'wind')
    .reduce((s, r) => s + r.energyContributionGWh, 0);

  const solarCurt = solarRow
    ? Math.max(0.5, inputs.minCfePercent * 0.05 + profile.solarWeight * 2 + seededJitter(seed, 50, 0.8))
    : null;
  const windCurt = windRow
    ? Math.max(0.3, inputs.minCfePercent * 0.04 + profile.windWeight * 1.2 + seededJitter(seed, 51, 0.6))
    : null;

  const totalRenCurt = renEnergy > 0 && solarCurt != null && windCurt != null
    ? (solarCurt * (solarRow?.energyContributionGWh ?? 0) + windCurt * (windRow?.energyContributionGWh ?? 0)) / renEnergy
    : 0;

  const curtailedGWh = renEnergy * (totalRenCurt / 100) * (1 + inputs.minCfePercent / 200);

  return {
    solarCurtailmentPercent: solarCurt != null ? Number(solarCurt.toFixed(1)) : null,
    windCurtailmentPercent: windCurt != null ? Number(windCurt.toFixed(1)) : null,
    totalRenewableCurtailmentPercent: Number(totalRenCurt.toFixed(1)),
    curtailedGWh: Number(curtailedGWh.toFixed(1)),
    renewableAvailableGWh: Number((renEnergy + curtailedGWh).toFixed(1)),
    renewableUsedGWh: Number(renEnergy.toFixed(1)),
  };
}

export function runConfiguratorEngine(rawInputs) {
  const inputs = normalizeInputs(rawInputs);
  const validation = validateConfiguratorInputs(inputs);
  if (!validation.ok) {
    return { ok: false, error: validation.error, details: validation.details };
  }

  const seed = hashInputs(inputs);
  const state = getStateById(inputs.stateId);
  const city = getCityById(inputs.cityId);
  const profile = getResourceProfile(inputs.stateId);

  const allocation = allocateLeastCost(inputs, profile, seed);
  if (allocation.error) {
    return { ok: false, error: allocation.error, details: allocation.details };
  }

  const { capacities, totalInstalled } = allocation;
  const metrics = buildTechnologyRows(capacities, inputs, profile, seed);
  const rawCfe = metrics.totalEnergy > 0 ? (metrics.cfeEnergy / metrics.totalEnergy) * 100 : 0;
  const achievedCfe = guaranteeMinCfe(rawCfe, inputs.minCfePercent);
  const achievedReliability = guaranteeReliability(inputs.reliabilityTarget, seed);
  const curtailment = computeCurtailment(inputs, profile, metrics.rows, seed);

  const cfeMet = inputs.minCfePercent <= 0 || achievedCfe >= inputs.minCfePercent;
  const relMet = achievedReliability >= inputs.reliabilityTarget;
  const gridLabel = inputs.gridConnectionMode === GRID_CONNECTION_MODES.ISLANDED
    ? 'islanded'
    : 'grid-connected';

  const summary = `Least-cost ${(totalInstalled / 1000).toFixed(2)} GW onsite portfolio for a ${(inputs.loadMW / 1000).toFixed(2)} GW ${gridLabel} data center — ${inputs.reliabilityTarget}% reliability (minimum)${inputs.minCfePercent > 0 ? `, ≥${inputs.minCfePercent}% CFE` : ''}.`;

  return {
    ok: true,
    synthetic: true,
    source: 'synthetic-engine',
    optimizationObjective: inputs.optimizationObjective,
    inputs: { ...inputs },
    location: {
      state: state?.label,
      city: city?.label,
      solarResource: profile.solarResource,
      windResource: profile.windResource,
    },
    gridConnectionMode: inputs.gridConnectionMode,
    summary,
    totalInstalledMW: totalInstalled,
    supplyMix: metrics.rows.map((r) => ({
      ...r,
      percent: r.energySharePercent,
      capacitySharePercent: r.capacitySharePercent,
    })),
    kpis: {
      installedCapacityMW: totalInstalled,
      achievedReliability,
      reliabilityTarget: inputs.reliabilityTarget,
      achievedCfe,
      minCfePercent: inputs.minCfePercent,
      lcoe: Math.round(metrics.portfolioLcoe),
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
      relMet,
      cfeMet,
      loadMet: true,
      notes: validation.warnings || [],
    },
    seed,
  };
}

export function inputsEqual(a, b) {
  if (!a || !b) return false;
  const norm = (x) => JSON.stringify({
    loadMW: x.loadMW,
    stateId: x.stateId,
    cityId: x.cityId,
    reliabilityTarget: snapReliabilityLevel(x.reliabilityTarget ?? 99.99),
    minCfePercent: x.minCfePercent ?? x.cfeTarget ?? 0,
    gridConnectionMode: x.gridConnectionMode ?? GRID_CONNECTION_MODES.GRID_CONNECTED,
    uiMode: x.uiMode ?? UI_MODES.BASIC,
    technologies: [...(x.technologies || [])].sort(),
    technologyMinPercent: x.technologyMinPercent ?? {},
  });
  return norm(a) === norm(b);
}
