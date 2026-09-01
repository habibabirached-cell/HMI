/**
 * Ideum (input) ↔ Maingear wall (output) configurator sync over Ethernet cluster.
 */

import { API_BASE_URL } from '../../apiConfig';
import { connectClusterWebSocket } from '../../utils/clusterPeer';

function normalizePayload(inputs) {
  return {
    ...inputs,
    minCfePercent: inputs.minCfePercent ?? inputs.cfeTarget ?? 0,
    gridConnectionMode: inputs.gridConnectionMode ?? 'grid-connected',
  };
}

/**
 * Ideum → Maingear: submit inputs; Maingear runs optimizer and pushes results to wall UI.
 * @param {string} maingearBackendUrl e.g. http://192.168.50.1:5000
 */
export async function submitConfiguratorToMaingear(maingearBackendUrl, inputs) {
  const base = (maingearBackendUrl || '').replace(/\/$/, '');
  if (!base) {
    throw new Error('Maingear backend URL is not configured.');
  }
  const res = await fetch(`${base}/api/configurator/cluster/submit`, {
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

export function sessionToWallState(session) {
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
  return {
    status,
    sessionId: session.sessionId,
    updatedAt: session.updatedAt,
    inputs: session.inputs || null,
    result: session.result?.ok ? session.result : null,
    error: session.error || (session.result && !session.result.ok ? session.result.error : null),
    errorDetails: session.errorDetails || session.result?.details || [],
    isGenerating: status === 'generating',
  };
}
