/**
 * Ideum (input) ↔ Maingear wall (output) configurator sync over Ethernet cluster.
 */

import { API_BASE_URL } from '../../apiConfig';
import { connectClusterWebSocket } from '../../utils/clusterPeer';

function normalizePayload(inputs) {
  const cfe = inputs.minCfePercent ?? inputs.cfeTarget ?? 0;
  return {
    ...inputs,
    minCfePercent: cfe,
    cfeTarget: cfe,
    gridConnectionMode: inputs.gridConnectionMode ?? 'grid-connected',
  };
}

/**
 * Resolve where Ideum should POST cluster/submit.
 * Local dev (two browser tabs on one laptop) uses the same backend as the wall tab.
 * Physical Ideum touch table posts directly to peerBackendUrl (same as remote commands).
 *
 * @param {object | null} role from GET /api/cluster/machine-role
 * @returns {string} base URL, or '' for same-origin / CRA dev-server proxy
 */
export function resolveMaingearBackendUrl(role) {
  const peerUrl = (role?.peerBackendUrl || '').replace(/\/$/, '');
  const envUrl = (process.env.REACT_APP_MAINGEAR_BACKEND_URL || '').replace(/\/$/, '');

  if (typeof window === 'undefined') {
    return envUrl || peerUrl || API_BASE_URL || 'http://127.0.0.1:5000';
  }

  const hostname = window.location.hostname;
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalDev) {
    return envUrl || API_BASE_URL || '';
  }

  if (role?.isIdeum) {
    // Direct Ethernet POST — mirrors sendRemoteCommandToMaingear (Add 8 turbine, etc.).
    return peerUrl || envUrl || API_BASE_URL || '';
  }

  return envUrl || API_BASE_URL || `http://${hostname}:5000`;
}

/**
 * Ideum → Maingear: submit inputs; Maingear runs optimizer and pushes results to wall UI.
 * @param {string} maingearBackendUrl e.g. http://192.168.50.1:5000, or '' for relative /api
 */
export async function submitConfiguratorToMaingear(maingearBackendUrl, inputs) {
  const base = (maingearBackendUrl ?? '').replace(/\/$/, '');
  const url = base ? `${base}/api/configurator/cluster/submit` : '/api/configurator/cluster/submit';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...normalizePayload(inputs), source: 'ideum' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Cluster submit failed (${res.status})`);
  }
  return data.session;
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
 */
export function sessionToWallState(session, options = {}) {
  const { onlyAfter } = options;

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
