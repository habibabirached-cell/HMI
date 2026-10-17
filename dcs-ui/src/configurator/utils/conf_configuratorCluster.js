/**
 * Ideum (input) ↔ Maingear wall (output) configurator sync over Ethernet cluster.
 */

import { API_BASE_URL } from '../../apiConfig';
import {
  connectClusterWebSocket,
  isLocalClusterDev,
  resolveMaingearPeerPostBase,
} from '../../utils/clusterPeer';
import { effectiveDataVisLoadMwTier, inputsWithEffectiveWacoLoadTier } from '../dataVis/api/dataVisLoadMw';
import {
  configuratorInputsToDataVisRanges,
  sanitizeConfiguratorInputsForDataVis,
} from '../dataVis/utils/dataVisConfiguratorSync';

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

function exploreSyncBody(inputs, uiMode) {
  const inputsForSync = sanitizeConfiguratorInputsForDataVis(
    inputsWithEffectiveWacoLoadTier(inputs),
  );
  return {
    inputs: inputsForSync,
    ranges: configuratorInputsToDataVisRanges(inputsForSync),
    uiMode,
    source: 'ideum',
    at: Date.now(),
    wacoLoadMW: effectiveDataVisLoadMwTier(),
  };
}

async function postExploreSyncToUrl(url, inputs, uiMode) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exploreSyncBody(inputs, uiMode)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Explore sync failed (${res.status})`);
  }
  return data;
}

/** Same-origin (Ideum backend may forward to peer). */
export async function postConfiguratorExploreSync(_maingearBackendUrl, inputs, uiMode) {
  const base = (API_BASE_URL || '').replace(/\/$/, '');
  const url = base
    ? `${base}/api/configurator/cluster/explore-sync`
    : '/api/configurator/cluster/explore-sync';
  return postExploreSyncToUrl(url, inputs, uiMode);
}

/** Direct Ethernet POST to Maingear (mirrors clean-data dataset-mode peer call). */
export async function postConfiguratorExploreSyncToPeer(peerBackendUrl, inputs, uiMode) {
  const base = (peerBackendUrl || '').replace(/\/$/, '');
  if (!base) {
    throw new Error('Maingear peerBackendUrl is not configured');
  }
  return postExploreSyncToUrl(`${base}/api/configurator/cluster/explore-sync`, inputs, uiMode);
}

export function logExploreSyncResult(label, data) {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem('dcs.debug.exploreSync') !== '1') return;
  } catch {
    return;
  }
  console.info(`[explore-sync] ${label}`, data);
}

export async function fetchConfiguratorExploreSyncLatest() {
  const res = await fetch(`${API_BASE_URL}/api/configurator/cluster/explore-sync/latest`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Explore sync latest failed (${res.status})`);
  }
  return data;
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
