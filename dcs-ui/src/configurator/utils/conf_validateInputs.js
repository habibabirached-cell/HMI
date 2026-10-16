import { GRID_CONNECTION_MODES, UI_MODES } from '../../configuratorData/conf_constants';
import {
  CONFIGURATOR_TECHNOLOGIES,
  getGenerationTechnologies,
  getStorageTechnologies,
} from '../../configuratorData/conf_technologies';

function hasGenerationSelected(technologyIds) {
  const genIds = new Set(getGenerationTechnologies().map((t) => t.id));
  return technologyIds.some((id) => genIds.has(id));
}

/**
 * Validate configurator inputs before optimization (Basic + Advanced).
 * @returns {{ ok: true } | { ok: false, error: string, details?: string[] }}
 */
export function validateConfiguratorInputs(inputs) {
  const details = [];
  const techIds = inputs.technologies || [];
  const gridMode = inputs.gridConnectionMode || GRID_CONNECTION_MODES.GRID_CONNECTED;
  const minCfe = inputs.minCfePercent ?? inputs.cfeTarget ?? 0;

  if (inputs.loadMW == null || inputs.loadMW === '' || Number(inputs.loadMW) < 200) {
    return { ok: false, error: 'Choose a data center load (200 MW or 1000 MW).' };
  }

  if (inputs.loadMW > 1800) {
    return { ok: false, error: 'Data center load cannot exceed 1800 MW.' };
  }

  if (!techIds.length) {
    return {
      ok: false,
      error: 'Select at least one technology for the optimizer to consider.',
    };
  }

  const storageOnly = techIds.every((id) =>
    getStorageTechnologies().some((t) => t.id === id),
  );
  const hasGen = hasGenerationSelected(techIds);

  if (storageOnly) {
    if (gridMode !== GRID_CONNECTION_MODES.GRID_CONNECTED) {
      return {
        ok: false,
        error: 'A configuration cannot consist of storage alone without a grid connection.',
        details: [
          'Islanded sites require onsite generation — storage alone cannot serve load.',
          'Enable generation technologies or choose Grid-Connected mode.',
        ],
      };
    }
  }

  if (gridMode === GRID_CONNECTION_MODES.ISLANDED && !hasGen) {
    return {
      ok: false,
      error: 'Islanded operation requires at least one generation technology.',
      details: [
        'Without a grid connection, the data center must be served by onsite generation.',
        'Select one or more generation technologies (gas turbine, solar, wind, etc.).',
      ],
    };
  }

  if (gridMode === GRID_CONNECTION_MODES.GRID_CONNECTED && !hasGen && minCfe > 0) {
    details.push(
      'Grid-connected with a carbon-free minimum typically requires onsite renewables or storage — verify technology selection.',
    );
  }

  if (inputs.uiMode === UI_MODES.ADvanced && inputs.technologyMinPercent) {
    const mins = inputs.technologyMinPercent;
    const forcedGen = CONFIGURATOR_TECHNOLOGIES.filter(
      (t) => t.assetClass === 'generation' && (mins[t.id] ?? 0) > 0,
    );
    const genMinSum = forcedGen.reduce((s, t) => s + (mins[t.id] ?? 0), 0);
    if (genMinSum > 100) {
      return {
        ok: false,
        error: 'Forced minimum percentages exceed 100% in aggregate.',
        details: ['Reduce technology minimums so their total does not exceed 100%.'],
      };
    }
    for (const [id, pct] of Object.entries(mins)) {
      if (pct > 0 && !techIds.includes(id)) {
        return {
          ok: false,
          error: `Minimum allocation set for "${id}" but that technology is not selected.`,
        };
      }
    }
  }

  return details.length ? { ok: true, warnings: details } : { ok: true };
}
