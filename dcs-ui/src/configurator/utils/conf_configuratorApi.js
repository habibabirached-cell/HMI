/**
 * Configurator API client — backend when available, else record provider (training JSON / synthetic).
 */

import { API_BASE_URL } from '../../apiConfig';
import { generateConfiguratorResult as generateLocal } from './conf_recordProvider';

function normalizePayload(inputs) {
  return {
    ...inputs,
    minCfePercent: inputs.minCfePercent ?? inputs.cfeTarget ?? 0,
    gridConnectionMode: inputs.gridConnectionMode ?? 'grid-connected',
  };
}

async function postConfiguratorGenerate(inputs, { pipeline = 'legacy' } = {}) {
  const query = pipeline && pipeline !== 'legacy' ? `?pipeline=${encodeURIComponent(pipeline)}` : '';
  const res = await fetch(`${API_BASE_URL}/api/configurator/generate${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizePayload(inputs)),
  });
  if (res.ok) {
    const data = await res.json();
    return { ...data, source: data.source || 'backend' };
  }
  const err = await res.json().catch(() => ({}));
  if (err.detail) {
    return { ok: false, error: typeof err.detail === 'string' ? err.detail : err.detail.error };
  }
  return { ok: false, error: `Generate failed (${res.status})` };
}

export async function generateConfiguratorResult(inputs, { preferBackend = false } = {}) {
  if (preferBackend && API_BASE_URL !== undefined) {
    try {
      return await postConfiguratorGenerate(inputs, { pipeline: 'legacy' });
    } catch (_) {
      /* fall through */
    }
  }
  return generateLocal(inputs);
}

/** Martin Waco DOE study — filter + minimum LCOE (backend required for real data). */
export async function generateMartinConfiguratorResult(inputs, { preferBackend = true } = {}) {
  if (preferBackend && API_BASE_URL !== undefined) {
    try {
      return await postConfiguratorGenerate(inputs, { pipeline: 'martin' });
    } catch (_) {
      /* fall through */
    }
  }
  return {
    ok: false,
    error: 'Martin configuration requires the backend with Waco study data.',
  };
}

export { loadTrainingRecords, getTrainingRecordCount } from './conf_recordProvider';

export const GENERATION_STATUS_MESSAGES = [
  'Evaluating technology portfolio…',
  'Checking availability constraint…',
  'Balancing minimum carbon-free energy…',
  'Running least-cost sizing…',
];
