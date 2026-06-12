/**
 * Maingear ↔ Ideum cluster: machine role and remote commands over WebSocket/HTTP.
 */

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

export async function fetchMachineRole() {
  const res = await fetch(`${API_BASE}/api/cluster/machine-role`);
  if (!res.ok) {
    throw new Error(`Machine role request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Ideum → Maingear: POST remote command to peer backend (direct Ethernet, not UI proxy).
 */
export async function sendRemoteCommandToMaingear(peerBackendUrl, command) {
  const base = (peerBackendUrl || '').replace(/\/$/, '');
  const res = await fetch(`${base}/api/cluster/remote-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, source: 'ideum' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Remote command failed (${res.status})`);
  }
  return data;
}

function clusterWebSocketUrl() {
  const base = API_BASE || `${window.location.protocol}//${window.location.host}`;
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/ws/cluster`;
}

/**
 * Subscribe to cluster WebSocket (Maingear UI listens for remote_command).
 * @returns {() => void} cleanup
 */
export function connectClusterWebSocket(onMessage) {
  let ws;
  let closed = false;

  try {
    ws = new WebSocket(clusterWebSocketUrl());
  } catch (e) {
    console.warn('Cluster WebSocket failed to open', e);
    return () => {};
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      onMessage(msg);
    } catch (e) {
      console.warn('Cluster WebSocket parse error', e);
    }
  };

  ws.onerror = (e) => {
    console.warn('Cluster WebSocket error', e);
  };

  return () => {
    if (closed) return;
    closed = true;
    try {
      ws.close();
    } catch (_) {
      /* ignore */
    }
  };
}
