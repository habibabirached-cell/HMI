/**
 * Configurator API client — backend when available, else record provider (training JSON / synthetic).
 */

import { API_BASE_URL } from '../../apiConfig';
import { generateConfiguratorResult as generateLocal } from './conf_recordProvider';

function normalizePayload(inputs) {
  const { dataVisFilters, ...rest } = inputs || {};
  const payload = {
    ...rest,
    minCfePercent: inputs.minCfePercent ?? inputs.cfeTarget ?? 0,
    maxCfePercent: inputs.maxCfePercent ?? 100,
    minSolarMW: inputs.minSolarMW ?? 0,
    maxSolarMW: inputs.maxSolarMW ?? 4000,
    minWindMW: inputs.minWindMW ?? 0,
    maxWindMW: inputs.maxWindMW ?? 3000,
    gridConnectionMode: inputs.gridConnectionMode ?? 'grid-connected',
  };
  if (Array.isArray(dataVisFilters)) {
    payload.dataVisFilters = dataVisFilters;
  }
  return payload;
}

/** Prefer same-origin /api when the UI dev server proxies to the backend (e.g. :3003 → :5000). */
export function resolveConfiguratorApiBase() {
  const envBase = API_BASE_URL;
  if (typeof window === 'undefined') return envBase;
  if (envBase === '') return '';

  try {
    const api = new URL(envBase);
    const page = window.location;
    const apiPort = api.port || (api.protocol === 'https:' ? '443' : '80');
    const pagePort = page.port || (page.protocol === 'https:' ? '443' : '80');
    if (
      api.hostname === page.hostname
      && apiPort === '5000'
      && pagePort !== '5000'
      && pagePort !== '80'
      && pagePort !== '443'
    ) {
      return '';
    }
    if (
      api.hostname === 'localhost'
      && apiPort === '5000'
      && page.hostname === 'localhost'
      && pagePort !== '5000'
    ) {
      return '';
    }
  } catch (_) {
    /* use envBase */
  }
  return envBase;
}

function formatApiErrorDetail(detail) {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item)))
      .join('; ');
  }
  if (typeof detail === 'object' && detail.error) return String(detail.error);
  return String(detail);
}

async function postConfiguratorGenerate(inputs, { pipeline = 'legacy' } = {}) {
  const base = resolveConfiguratorApiBase();
  const query = pipeline && pipeline !== 'legacy' ? `?pipeline=${encodeURIComponent(pipeline)}` : '';
  const path = `/api/configurator/generate${query}`;
  const url = base ? `${base}${path}` : path;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizePayload(inputs)),
  });
  if (res.ok) {
    const data = await res.json();
    if (data && data.ok === false) {
      return {
        ok: false,
        error: data.error || 'Configuration could not be generated.',
        details: data.details,
      };
    }
    return { ...data, ok: data.ok !== false, source: data.source || 'backend' };
  }
  const err = await res.json().catch(() => ({}));
  const message = formatApiErrorDetail(err.detail) || `Generate failed (${res.status})`;
  return { ok: false, error: message, details: Array.isArray(err.detail) ? err.detail : undefined };
}

export async function generateConfiguratorResult(inputs, { preferBackend = false } = {}) {
  if (preferBackend) {
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
  if (preferBackend) {
    try {
      return await postConfiguratorGenerate(inputs, { pipeline: 'martin' });
    } catch (e) {
      return {
        ok: false,
        error: e?.message || 'Could not reach the configurator API. Is the backend running?',
      };
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
