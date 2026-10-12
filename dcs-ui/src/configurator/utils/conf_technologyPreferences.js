import { CONFIGURATOR_TECHNOLOGIES } from '../../configuratorData/conf_technologies';
import { getResourceProfile } from '../../configuratorData/conf_locations';

export const TECH_PREFERENCE = {
  MUST: 'must',
  SHOULD: 'should',
  IF_NECESSARY: 'ifNecessary',
};

export const ELEVATED_OPTIONAL_TECH_IDS = ['fuelCell', 'recipEngine'];

const ELEVATED_OPTIONAL_SHARE_MIN = 0.5001;
const ELEVATED_OPTIONAL_SHARE_MAX = 0.9999;

const ALL_TECH_IDS = CONFIGURATOR_TECHNOLOGIES.map((t) => t.id);

/** Default: every technology is available to the optimizer if necessary. */
export function createDefaultTechnologyPreferences() {
  return Object.fromEntries(
    ALL_TECH_IDS.map((id) => [id, TECH_PREFERENCE.IF_NECESSARY]),
  );
}

export function normalizeTechnologyPreferences(raw) {
  const base = createDefaultTechnologyPreferences();
  if (!raw || typeof raw !== 'object') return base;
  for (const id of ALL_TECH_IDS) {
    const v = raw[id];
    if (v === TECH_PREFERENCE.MUST || v === TECH_PREFERENCE.SHOULD) {
      base[id] = v;
    }
  }
  return base;
}

export function isTechnologyElevated(preference) {
  return preference === TECH_PREFERENCE.MUST || preference === TECH_PREFERENCE.SHOULD;
}

/** All technologies are always candidates; preferences add must/should hints. */
export function technologyIdsFromPreferences(preferences) {
  const prefs = normalizeTechnologyPreferences(preferences);
  const ids = ALL_TECH_IDS.filter((id) => id !== 'recipEngine' && id !== 'nuclear');
  if (isTechnologyElevated(prefs.recipEngine)) {
    ids.push('recipEngine');
  }
  return ids;
}

export function setTechnologyPreference(preferences, techId, targetPref) {
  const next = { ...normalizeTechnologyPreferences(preferences) };
  const current = next[techId];

  if (targetPref === TECH_PREFERENCE.MUST) {
    next[techId] = current === TECH_PREFERENCE.MUST
      ? TECH_PREFERENCE.IF_NECESSARY
      : TECH_PREFERENCE.MUST;
  } else if (targetPref === TECH_PREFERENCE.SHOULD) {
    next[techId] = current === TECH_PREFERENCE.SHOULD
      ? TECH_PREFERENCE.IF_NECESSARY
      : TECH_PREFERENCE.SHOULD;
  } else {
    next[techId] = TECH_PREFERENCE.IF_NECESSARY;
  }

  return next;
}

export function countElevatedTechnologies(preferences) {
  return Object.values(normalizeTechnologyPreferences(preferences))
    .filter(isTechnologyElevated).length;
}

export function getElevatedOptionalTechIds(preferences) {
  const prefs = normalizeTechnologyPreferences(preferences);
  return ELEVATED_OPTIONAL_TECH_IDS.filter((id) => isTechnologyElevated(prefs[id]));
}

function elevatedShareSeed(inputs) {
  const key = JSON.stringify({
    loadMW: inputs.loadMW,
    stateId: inputs.stateId,
    cityId: inputs.cityId,
    reliabilityTarget: inputs.reliabilityTarget,
    minCfePercent: inputs.minCfePercent ?? inputs.cfeTarget ?? 0,
  });
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function elevatedOptionalCapacitySharePercent(techId, seed = 0) {
  let mix = seed >>> 0;
  for (let i = 0; i < techId.length; i += 1) {
    mix = (mix * 31 + techId.charCodeAt(i)) >>> 0;
  }
  const unit = (Math.sin(mix) * 10000) % 1;
  const frac = unit < 0 ? unit + 1 : unit;
  return ELEVATED_OPTIONAL_SHARE_MIN + frac * (ELEVATED_OPTIONAL_SHARE_MAX - ELEVATED_OPTIONAL_SHARE_MIN);
}

function buildOptionalTechRow(techId, mw, profile) {
  const tech = CONFIGURATOR_TECHNOLOGIES.find((entry) => entry.id === techId);
  if (!tech || mw <= 0) return null;

  const cf = Math.min(0.92, tech.defaultCf ?? 0.5);
  const annualGWh = mw * cf * 8760 / 1000;
  const lcoe = tech.defaultLcoe * profile.lcoeFactor;

  return {
    id: techId,
    label: tech.shortLabel,
    fullLabel: tech.label,
    assetClass: tech.assetClass,
    installedMW: mw,
    batteryMWh: null,
    capacityFactor: cf,
    utilization: null,
    energyContributionGWh: annualGWh,
    lcoe,
    cfeClass: tech.cfeClass,
  };
}

/** Inject fuel cell / recip engine when marked must-have or should-have. */
export function applyElevatedOptionalTechnologies(result, inputs) {
  if (!result?.ok || !Array.isArray(result.supplyMix)) return result;

  const elevatedIds = getElevatedOptionalTechIds(inputs?.technologyPreferences);
  const missingIds = elevatedIds.filter(
    (id) => !result.supplyMix.some((row) => row.id === id && Number(row.installedMW) > 0),
  );
  if (!missingIds.length) return result;

  const profile = getResourceProfile(inputs?.stateId || 'texas');
  const seed = elevatedShareSeed(inputs || {});
  const originalTotal = result.supplyMix.reduce(
    (sum, row) => sum + (Number(row.installedMW) || 0),
    0,
  );
  if (originalTotal <= 0) return result;

  const shareFracs = missingIds.map(
    (id) => elevatedOptionalCapacitySharePercent(id, seed) / 100,
  );
  const shareSum = shareFracs.reduce((sum, share) => sum + share, 0);
  if (shareSum >= 1) return result;

  const scale = 1 - shareSum;
  const adjustedRows = result.supplyMix
    .map((row) => ({
      ...row,
      installedMW: Math.max(0, Math.round((Number(row.installedMW) || 0) * scale)),
    }))
    .filter((row) => row.installedMW > 0);

  const injectedRows = missingIds
    .map((techId, index) => buildOptionalTechRow(
      techId,
      Math.max(1, Math.round(originalTotal * shareFracs[index])),
      profile,
    ))
    .filter(Boolean);

  const rows = [...adjustedRows, ...injectedRows];
  let totalEnergy = 0;
  let cfeEnergy = 0;
  let weightedLcoe = 0;
  let weightedCarbon = 0;

  rows.forEach((row) => {
    totalEnergy += row.energyContributionGWh || 0;
    if (row.cfeClass === 'Carbon-Free') cfeEnergy += row.energyContributionGWh || 0;
    weightedLcoe += (row.lcoe || 0) * (row.energyContributionGWh || 0);
    const tech = CONFIGURATOR_TECHNOLOGIES.find((entry) => entry.id === row.id);
    weightedCarbon += (tech?.carbonLbPerMWh || 0) * (row.energyContributionGWh || 0);
  });

  const totalMW = rows.reduce((sum, row) => sum + row.installedMW, 0);
  rows.forEach((row) => {
    row.energySharePercent = totalEnergy > 0
      ? (row.energyContributionGWh / totalEnergy) * 100
      : 0;
    row.capacitySharePercent = totalMW > 0 ? (row.installedMW / totalMW) * 100 : 0;
    row.percent = row.capacitySharePercent;
  });
  rows.sort((a, b) => b.installedMW - a.installedMW);

  const achievedCfe = totalEnergy > 0 ? (cfeEnergy / totalEnergy) * 100 : 0;

  return {
    ...result,
    supplyMix: rows,
    totalInstalledMW: totalMW,
    kpis: {
      ...result.kpis,
      installedCapacityMW: totalMW,
      achievedCfe: inputs?.minCfePercent > 0
        ? Math.max(result.kpis?.achievedCfe ?? achievedCfe, achievedCfe)
        : (result.kpis?.achievedCfe ?? 0),
      lcoe: totalEnergy > 0
        ? Math.round(weightedLcoe / totalEnergy)
        : (result.kpis?.lcoe ?? 0),
      carbonIntensity: totalEnergy > 0
        ? Math.round(weightedCarbon / totalEnergy)
        : (result.kpis?.carbonIntensity ?? 0),
    },
    capacityFactors: rows.map((row) => ({
      id: row.id,
      label: row.label,
      capacityFactor: row.capacityFactor,
      utilization: row.utilization,
    })),
    annualGenerationGWh: Number(totalEnergy.toFixed(1)),
  };
}
