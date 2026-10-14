/**
 * Ideum (input) ↔ Maingear wall (output) configurator sync over Ethernet cluster.
 */

import { API_BASE_URL } from '../../apiConfig';
import {
  connectClusterWebSocket,
  isLocalClusterDev,
  resolveMaingearPeerPostBase,
} from '../../utils/clusterPeer';

export { isLocalClusterDev };

/** localStorage handoff when dev opens Martin preview in a new tab (sessionStorage is per-tab). */
export const PENDING_OPTIMIZED_INPUTS_KEY = 'dcs.configurator.pendingOptimizedInputs';

/** ?martinPreview=<tabKey> — new tab runs Preview/wall (tabKey matches localStorage payload) */
export const MARTIN_PREVIEW_URL_PARAM = 'martinPreview';

export function martinPreviewCrossTabStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

export function martinPreviewDoneStorageKey(tabKey) {
  return `dcs.configurator.martinPreviewDone.${tabKey}`;
}

export function martinPreviewRunningStorageKey(tabKey) {
  return `dcs.configurator.martinPreviewRunning.${tabKey}`;
}

export function martinPreviewResultStorageKey(tabKey) {
  return `dcs.configurator.martinPreviewResult.${tabKey}`;
}

export function martinPreviewPendingStorageKey(tabKey) {
  return `dcs.configurator.martinPreviewPending.${tabKey}`;
}

export function martinPreviewStartedStorageKey(tabKey) {
  return `dcs.configurator.martinPreviewStarted.${tabKey}`;
}

function normalizePayload(inputs) {
  const cfe = inputs.minCfePercent ?? inputs.cfeTarget ?? 0;
  return {
    ...inputs,
    minCfePercent: cfe,
    maxCfePercent: inputs.maxCfePercent ?? 100,
    minSolarMW: inputs.minSolarMW ?? 0,
    maxSolarMW: inputs.maxSolarMW ?? 4000,
    minWindMW: inputs.minWindMW ?? 0,
    maxWindMW: inputs.maxWindMW ?? 3000,
    cfeTarget: cfe,
    gridConnectionMode: inputs.gridConnectionMode ?? 'grid-connected',
  };
}

/** @deprecated use resolveMaingearPeerPostBase from clusterPeer.js */
export function resolveMaingearBackendUrl(role) {
  return resolveMaingearPeerPostBase(role);
}

/**
 * Ideum → Maingear: submit inputs; Maingear runs optimizer and pushes results to wall UI.
 * @param {string} maingearBackendUrl e.g. http://192.168.50.1:5000, or '' for relative /api
 */
/** Ideum → Maingear: dismiss wall configurator when leaving Data Centers flow. */
export async function closeConfiguratorWallOnMaingear(maingearBackendUrl) {
  const base = (maingearBackendUrl ?? '').replace(/\/$/, '');
  const url = base ? `${base}/api/configurator/cluster/close` : '/api/configurator/cluster/close';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'ideum' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Cluster close failed (${res.status})`);
  }
  return data;
}

async function postConfiguratorClusterSubmit(maingearBackendUrl, inputs, { pipeline = 'legacy' } = {}) {
  const base = (maingearBackendUrl ?? '').replace(/\/$/, '');
  const url = base ? `${base}/api/configurator/cluster/submit` : '/api/configurator/cluster/submit';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...normalizePayload(inputs),
      source: pipeline === 'martin' ? 'ideum-martin' : 'ideum',
      pipeline,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Cluster submit failed (${res.status})`);
  }
  return data.session;
}

/** Legacy consolidated / synthetic optimizer → Maingear wall (header Configure). */
export async function submitConfiguratorToMaingear(maingearBackendUrl, inputs) {
  return postConfiguratorClusterSubmit(maingearBackendUrl, inputs, { pipeline: 'legacy' });
}

/** Martin Waco DOE path → Maingear wall (footer CONFIGURE). */
export async function submitConfiguratorMartinToMaingear(maingearBackendUrl, inputs) {
  return postConfiguratorClusterSubmit(maingearBackendUrl, inputs, { pipeline: 'martin' });
}

/** Wall display (on Maingear): fetch latest session snapshot. */
export async function fetchConfiguratorClusterSession() {
  const res = await fetch(`${API_BASE_URL}/api/configurator/cluster/session`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Session fetch failed (${res.status})`);
  }
  return data.session;
}

/**
 * Wall display listens for configurator_update on the local cluster WebSocket.
 * @returns {() => void} cleanup
 */
export function connectConfiguratorClusterUpdates(onSession) {
  return connectClusterWebSocket((msg) => {
    if (msg?.type === 'configurator_update' && msg.session) {
      onSession(msg.session);
    }
  });
}

/**
 * Map backend session → wall UI state.
 * @param {object} [options.onlyAfter] ISO timestamp — ignore stale results from before wall opened
 * @param {boolean} [options.ignoreStale] accept ready/error even if updatedAt predates onlyAfter (initial fetch)
 */
export function sessionToWallState(session, options = {}) {
  const { onlyAfter, ignoreStale = false } = options;

  if (!session) {
    return {
      status: 'idle',
      inputs: null,
      result: null,
      error: null,
      errorDetails: [],
      isGenerating: false,
    };
  }

  const status = session.status || 'idle';
  const updatedAt = session.updatedAt;
  const isFresh =
    ignoreStale ||
    !onlyAfter ||
    !updatedAt ||
    updatedAt >= onlyAfter ||
    status === 'generating';

  const hasReadyResult = status === 'ready' && session.result?.ok && isFresh;

  return {
    status,
    sessionId: session.sessionId,
    updatedAt,
    inputs: session.inputs || null,
    result: hasReadyResult ? session.result : null,
    error:
      isFresh && status === 'error'
        ? session.error || (session.result && !session.result.ok ? session.result.error : null)
        : null,
    errorDetails:
      isFresh && status === 'error'
        ? session.errorDetails || session.result?.details || []
        : [],
    isGenerating: status === 'generating' && isFresh,
  };
}
