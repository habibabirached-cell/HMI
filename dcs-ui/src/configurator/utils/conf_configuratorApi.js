/**
 * Configurator API client — backend when available, else record provider (training JSON / synthetic).
 */

import { API_BASE_URL } from '../../apiConfig';
import { generateConfiguratorResult as generateLocal } from './conf_recordProvider';

export async function generateConfiguratorResult(inputs, { preferBackend = false } = {}) {
  if (preferBackend && API_BASE_URL !== undefined) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/configurator/generate`, {
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
    } catch (_) {
      /* fall through */
    }
  }
  return generateLocal(inputs);
}

function normalizePayload(inputs) {
  return {
    ...inputs,
    minCfePercent: inputs.minCfePercent ?? inputs.cfeTarget ?? 0,
    gridConnectionMode: inputs.gridConnectionMode ?? 'grid-connected',
  };
}

export { loadTrainingRecords, getTrainingRecordCount } from './conf_recordProvider';

export const GENERATION_STATUS_MESSAGES = [
  'Evaluating technology portfolio…',
  'Checking availability constraint…',
  'Balancing minimum carbon-free energy…',
  'Running least-cost sizing…',
];
