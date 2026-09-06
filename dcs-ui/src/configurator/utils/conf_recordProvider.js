/**
 * Provider layer: load pre-computed optimization records or fall back to synthetic engine.
 * Supports future ML model / MAPS training data ingestion.
 */

import { runConfiguratorEngine } from './conf_configuratorEngine';
import { runConsolidatedEngine, mapSyntheticResultToGranular } from './conf_consolidatedEngine';
import { applyElevatedOptionalTechnologies } from './conf_technologyPreferences';
import { validateConfiguratorInputs } from './conf_validateInputs';

let trainingRecords = [];

/**
 * Load an array of training records (JSON) into memory for lookup.
 * @param {object[]} records
 */
export function loadTrainingRecords(records) {
  trainingRecords = Array.isArray(records) ? records : [];
}

export function getTrainingRecordCount() {
  return trainingRecords.length;
}

function normalizeInputs(raw) {
  return {
    ...raw,
    minCfePercent: raw.minCfePercent ?? raw.cfeTarget ?? 0,
    gridConnectionMode: raw.gridConnectionMode ?? 'grid-connected',
    uiMode: raw.uiMode ?? 'basic',
    optimizationObjective: raw.optimizationObjective ?? 'lowestCost',
    technologyMinPercent: raw.technologyMinPercent ?? {},
    technologyPreferences: raw.technologyPreferences ?? {},
  };
}

function recordMatches(a, b) {
  const techA = [...(a.technologies || [])].sort().join(',');
  const techB = [...(b.technologies || [])].sort().join(',');
  return (
    a.loadMW === b.loadMW
    && a.reliabilityTarget === b.reliabilityTarget
    && (a.minCfePercent ?? 0) === (b.minCfePercent ?? 0)
    && a.gridConnectionMode === b.gridConnectionMode
    && techA === techB
  );
}

function trainingRecordToResult(record) {
  const { inputs, outputs } = record;
  return {
    ok: true,
    synthetic: record.provenance?.source !== 'MAPS',
    source: 'training-record',
    recordId: record.recordId,
    inputs,
    summary: outputs.summary || 'Architecture from validated optimization record.',
    totalInstalledMW: outputs.totalInstalledMW,
    supplyMix: outputs.supplyMix,
    kpis: {
      installedCapacityMW: outputs.totalInstalledMW,
      achievedReliability: outputs.achievedReliability,
      reliabilityTarget: inputs.reliabilityTarget,
      achievedCfe: outputs.achievedCfePercent,
      minCfePercent: inputs.minCfePercent,
      lcoe: outputs.lcoe,
      carbonIntensity: outputs.carbonIntensityLbPerMWh,
    },
    capacityFactors: outputs.capacityFactors || [],
    curtailment: outputs.curtailment,
    annualGenerationGWh: outputs.annualGenerationGWh,
    targets: outputs.targets,
    gridConnectionMode: inputs.gridConnectionMode,
    optimizationObjective: inputs.optimizationObjective,
  };
}

function finalizeConfiguratorResult(result, inputs) {
  if (!result?.ok) return result;
  return applyElevatedOptionalTechnologies(result, inputs);
}

/**
 * @param {object} rawInputs
 * @returns {object}
 */
export function generateConfiguratorResult(rawInputs) {
  const inputs = normalizeInputs(rawInputs);
  const validation = validateConfiguratorInputs(inputs);
  if (!validation.ok) {
    return { ok: false, error: validation.error, details: validation.details };
  }

  const match = trainingRecords.find((r) => recordMatches(r.inputs, inputs));
  if (match) {
    return finalizeConfiguratorResult(trainingRecordToResult(match), inputs);
  }

  const consolidated = runConsolidatedEngine(inputs);
  if (consolidated.ok) {
    const result = finalizeConfiguratorResult(consolidated, inputs);
    if (validation.warnings?.length) {
      result.warnings = validation.warnings;
    }
    return result;
  }

  const synthetic = runConfiguratorEngine(inputs);
  if (synthetic.ok) {
    const mapped = finalizeConfiguratorResult(mapSyntheticResultToGranular(synthetic), inputs);
    if (validation.warnings?.length) {
      mapped.warnings = validation.warnings;
    }
    return mapped;
  }
  return synthetic;
}
