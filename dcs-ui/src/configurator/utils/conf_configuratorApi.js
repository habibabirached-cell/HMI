/**
 * Configurator API client — calls backend when available, falls back to local engine.
 */

import { API_BASE_URL } from '../../apiConfig';
import { runConfiguratorEngine } from './conf_configuratorEngine';

export async function generateConfiguratorResult(inputs, { preferBackend = false } = {}) {
  if (preferBackend && API_BASE_URL !== undefined) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/configurator/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      if (res.ok) {
        const data = await res.json();
        return { ...data, source: 'backend' };
      }
    } catch (_) {
      /* fall through to local engine */
    }
  }
  const result = runConfiguratorEngine(inputs);
  return { ...result, source: 'local' };
}

export const GENERATION_STATUS_MESSAGES = [
  'Evaluating technology portfolio…',
  'Checking reliability target…',
  'Balancing carbon-free generation…',
  'Sizing generation assets…',
];
