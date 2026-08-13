/**
 * Deterministic synthetic configurator engine.
 * Same inputs always produce the same outputs.
 * Replace with real backend call later via conf_configuratorApi.js.
 */

import { getTechnologyById } from '../../configuratorData/conf_technologies';
import { getResourceProfile, getStateById, getCityById } from '../../configuratorData/conf_locations';

const RELIABILITY_MARGINS = {
  99.9: 1.08,
  99.99: 1.15,
  99.999: 1.26,
};

function hashInputs(inputs) {
  const key = JSON.stringify({
    loadMW: inputs.loadMW,
    stateId: inputs.stateId,
    cityId: inputs.cityId,
    reliabilityTarget: inputs.reliabilityTarget,
    cfeTarget: inputs.cfeTarget,
    technologies: [...(inputs.technologies || [])].sort(),
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

function nearestReliabilityMargin(target) {
  const keys = Object.keys(RELIABILITY_MARGINS).map(Number);
  return keys.reduce((best, k) => (
    Math.abs(k - target) < Math.abs(best - target) ? k : best
  ), 99.99);
}

function allocateMix(inputs, profile, seed) {
  const allowed = new Set(inputs.technologies || []);
  const cfeFrac = inputs.cfeTarget / 100;
  const relKey = nearestReliabilityMargin(inputs.reliabilityTarget);
  const margin = RELIABILITY_MARGINS[relKey] ?? 1.15;
  const baseTotal = inputs.loadMW * margin;

  const hasSolar = allowed.has('solar');
  const hasWind = allowed.has('wind');
  const hasBattery = allowed.has('battery');
  const hasHd = allowed.has('heavyDutyGT');
  const hasAero = allowed.has('aeroderivativeGT');
  const hasFuelCell = allowed.has('fuelCell');
  const hasRecip = allowed.has('recipEngine');

  const solarW = hasSolar ? profile.solarWeight : 0;
  const windW = hasWind ? profile.windWeight : 0;
  const renW = solarW + windW;

  let solarShare = 0;
  let windShare = 0;
  if (renW > 0) {
    solarShare = (cfeFrac * 0.55 * solarW) / renW;
    windShare = (cfeFrac * 0.55 * windW) / renW;
  }

  let batteryShare = hasBattery
    ? Math.min(0.14, 0.04 + cfeFrac * 0.08 + (relKey >= 99.999 ? 0.03 : 0))
    : 0;

  const dispatchableShare = Math.max(
    0.12,
    1 - solarShare - windShare - batteryShare,
  );

  let hdShare = 0;
  let aeroShare = 0;
  let fuelShare = 0;
  let recipShare = 0;

  const dispatchableIds = [
    hasHd && 'hd',
    hasAero && 'aero',
    hasFuelCell && 'fuel',
    hasRecip && 'recip',
  ].filter(Boolean);

  if (dispatchableIds.length === 0 && dispatchableShare > 0) {
    return { error: 'No dispatchable technology selected. Enable at least one firm generation source.' };
  }

  dispatchableIds.forEach((id, idx) => {
    const portion = dispatchableShare / dispatchableIds.length;
    const jitter = seededJitter(seed, idx + 10, 0.06);
    if (id === 'hd') hdShare = portion + jitter;
    if (id === 'aero') aeroShare = portion + jitter;
    if (id === 'fuel') fuelShare = portion + jitter;
    if (id === 'recip') recipShare = portion + jitter;
  });

  const raw = {
    heavyDutyGT: Math.max(0, hdShare),
    aeroderivativeGT: Math.max(0, aeroShare),
    solar: Math.max(0, solarShare + seededJitter(seed, 1)),
    wind: Math.max(0, windShare + seededJitter(seed, 2)),
    battery: Math.max(0, batteryShare + seededJitter(seed, 3)),
    fuelCell: Math.max(0, fuelShare),
    recipEngine: Math.max(0, recipShare),
  };

  const sumShares = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  const capacities = {};
  Object.entries(raw).forEach(([id, share]) => {
    if (!allowed.has(id)) {
      capacities[id] = 0;
      return;
    }
    capacities[id] = Math.round((share / sumShares) * baseTotal);
  });

  // Ensure disabled techs are exactly zero
  ['heavyDutyGT', 'aeroderivativeGT', 'solar', 'wind', 'battery', 'fuelCell', 'recipEngine'].forEach((id) => {
    if (!allowed.has(id)) capacities[id] = 0;
  });

  const totalInstalled = Object.values(capacities).reduce((a, b) => a + b, 0);
  return { capacities, totalInstalled, margin };
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
      utilization = 1.2 + seededJitter(seed, idx + 20, 0.15) + inputs.cfeTarget * 0.008;
    } else if (id === 'solar') {
      cf = tech.defaultCf * (0.85 + profile.solarWeight * 0.2) + seededJitter(seed, idx + 21, 0.02);
    } else if (id === 'wind') {
      cf = tech.defaultCf * (0.85 + profile.windWeight * 0.2) + seededJitter(seed, idx + 22, 0.02);
    } else if (id === 'aeroderivativeGT') {
      cf = Math.max(0.12, 0.18 + (100 - inputs.cfeTarget) * 0.003 + seededJitter(seed, idx + 23, 0.03));
    } else {
      cf = Math.min(0.92, (tech.defaultCf ?? 0.5) + seededJitter(seed, idx + 24, 0.03));
    }

    const annualGWh = cf != null ? mw * cf * 8760 / 1000 : mw * (utilization ?? 1) * 2.5 * 365 / 1000;
    totalEnergy += annualGWh;
    if (tech.cfeClass === 'Carbon-Free') cfeEnergy += annualGWh;
    if (tech.cfeClass === 'Storage') cfeEnergy += annualGWh * 0.35;

    const lcoe = tech.defaultLcoe * profile.lcoeFactor * (1 + (inputs.reliabilityTarget - 99.9) * 0.002);
    weightedLcoe += lcoe * annualGWh;
    weightedCarbon += tech.carbonLbPerMWh * annualGWh;

    const batteryMWh = id === 'battery' ? mw * (tech.defaultDurationH ?? 4) : null;

    rows.push({
      id,
      label: tech.shortLabel,
      fullLabel: tech.label,
      installedMW: mw,
      batteryMWh,
      capacityFactor: cf,
      utilization,
      energyContributionGWh: annualGWh,
      lcoe,
      cfeClass: tech.cfeClass,
      color: null,
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

function computeReliability(inputs, rows, margin) {
  const dispatchMW = rows
    .filter((r) => ['heavyDutyGT', 'aeroderivativeGT', 'fuelCell', 'recipEngine'].includes(r.id))
    .reduce((s, r) => s + r.installedMW, 0);
  const batteryMW = rows.find((r) => r.id === 'battery')?.installedMW ?? 0;
  const overbuild = dispatchMW / Math.max(inputs.loadMW, 1);
  const base = 99.85 + Math.min(0.12, (overbuild - 1) * 0.35) + Math.min(0.04, batteryMW / inputs.loadMW * 0.08);
  const relBoost = (margin - 1) * 0.08;
  return Math.min(99.9999, base + relBoost);
}

function computeCurtailment(inputs, profile, rows, seed) {
  const solarRow = rows.find((r) => r.id === 'solar');
  const windRow = rows.find((r) => r.id === 'wind');
  const renEnergy = rows
    .filter((r) => r.id === 'solar' || r.id === 'wind')
    .reduce((s, r) => s + r.energyContributionGWh, 0);

  const solarCurtail = solarRow
    ? Math.max(0.5, (inputs.cfeTarget - 40) * 0.06 + profile.solarWeight * 2 + seededJitter(seed, 50, 0.8))
    : 0;
  const windCurtail = windRow
    ? Math.max(0.3, (inputs.cfeTarget - 35) * 0.04 + profile.windWeight * 1.2 + seededJitter(seed, 51, 0.6))
    : 0;

  const totalRenCurtail = renEnergy > 0
    ? (solarCurtail * (solarRow?.energyContributionGWh ?? 0) + windCurtail * (windRow?.energyContributionGWh ?? 0))
      / renEnergy
    : 0;

  const curtailedGWh = renEnergy * (totalRenCurtail / 100) * (1 + inputs.cfeTarget / 200);

  return {
    solarCurtailmentPercent: solarRow ? Number(solarCurtail.toFixed(1)) : null,
    windCurtailmentPercent: windRow ? Number(windCurtail.toFixed(1)) : null,
    totalRenewableCurtailmentPercent: Number(totalRenCurtail.toFixed(1)),
    curtailedGWh: Number(curtailedGWh.toFixed(1)),
    renewableAvailableGWh: Number((renEnergy + curtailedGWh).toFixed(1)),
    renewableUsedGWh: Number(renEnergy.toFixed(1)),
  };
}

function evaluateTargets(inputs, achievedReliability, achievedCfe) {
  const relMet = achievedReliability >= inputs.reliabilityTarget - 0.001;
  const cfeMet = achievedCfe >= inputs.cfeTarget - 0.5;
  const loadMet = true;
  const notes = [];
  if (!relMet) notes.push('Consider enabling Battery Energy Storage or additional dispatchable generation.');
  if (!cfeMet) notes.push('Consider enabling additional renewable technologies or relaxing the CFE target.');
  return { relMet, cfeMet, loadMet, notes };
}

/**
 * @param {object} inputs
 * @returns {object} ConfigurationResult
 */
export function runConfiguratorEngine(inputs) {
  const seed = hashInputs(inputs);
  const state = getStateById(inputs.stateId);
  const city = getCityById(inputs.cityId);
  const profile = getResourceProfile(inputs.stateId);

  if (!inputs.technologies?.length) {
    return { ok: false, error: 'Select at least one technology.' };
  }

  const allocation = allocateMix(inputs, profile, seed);
  if (allocation.error) {
    return { ok: false, error: allocation.error };
  }

  const { capacities, totalInstalled, margin } = allocation;
  const metrics = buildTechnologyRows(capacities, inputs, profile, seed);
  const achievedReliability = computeReliability(inputs, metrics.rows, margin);
  const achievedCfe = metrics.totalEnergy > 0
    ? (metrics.cfeEnergy / metrics.totalEnergy) * 100
    : 0;
  const curtailment = computeCurtailment(inputs, profile, metrics.rows, seed);
  const targets = evaluateTargets(inputs, achievedReliability, achievedCfe);

  const summary = `A ${(totalInstalled / 1000).toFixed(2)} GW portfolio designed to support a ${(inputs.loadMW / 1000).toFixed(2)} GW ${state?.label ?? ''} data center at a ${inputs.reliabilityTarget}% reliability target and ${inputs.cfeTarget}% CFE target.`;

  return {
    ok: true,
    synthetic: true,
    inputs: { ...inputs },
    location: {
      state: state?.label,
      city: city?.label,
      solarResource: profile.solarResource,
      windResource: profile.windResource,
    },
    summary,
    totalInstalledMW: totalInstalled,
    supplyMix: metrics.rows.map((r) => ({
      ...r,
      percent: r.capacitySharePercent,
    })),
    kpis: {
      installedCapacityMW: totalInstalled,
      achievedReliability,
      reliabilityTarget: inputs.reliabilityTarget,
      achievedCfe,
      cfeTarget: inputs.cfeTarget,
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
    targets,
    seed,
  };
}

export function inputsEqual(a, b) {
  if (!a || !b) return false;
  return JSON.stringify({
    loadMW: a.loadMW,
    stateId: a.stateId,
    cityId: a.cityId,
    reliabilityTarget: a.reliabilityTarget,
    cfeTarget: a.cfeTarget,
    technologies: [...(a.technologies || [])].sort(),
  }) === JSON.stringify({
    loadMW: b.loadMW,
    stateId: b.stateId,
    cityId: b.cityId,
    reliabilityTarget: b.reliabilityTarget,
    cfeTarget: b.cfeTarget,
    technologies: [...(b.technologies || [])].sort(),
  });
}
