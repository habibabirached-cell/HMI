/**
 * Maingear ↔ Ideum cluster: machine role and remote commands over WebSocket/HTTP.
 */

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';
const BACKEND_PORT = '5000';
/** Maingear Docker backend on cluster Ethernet (Ideum fallback when role not loaded yet). */
export const MAINGEAR_CLUSTER_BACKEND = 'http://192.168.50.1:5000';

/** Two browser tabs on one laptop (localhost UI + local backend). */
export function isLocalClusterDev() {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Base URL for Ideum browser → Maingear HTTP (remote-command, configurator submit, etc.).
 * Physical Ideum always posts directly to peerBackendUrl — even when the UI is opened
 * via localhost/127.0.0.1 on the touch-table PC (same as HD_Aero cluster commands).
 *
 * @param {object | null} role from GET /api/cluster/machine-role
 * @returns {string} base URL, or '' for same-origin / CRA dev-server proxy
 */
export function resolveMaingearPeerPostBase(role) {
  const peerUrl = (role?.peerBackendUrl || '').replace(/\/$/, '');
  const envUrl = (process.env.REACT_APP_MAINGEAR_BACKEND_URL || '').replace(/\/$/, '');

  if (typeof window === 'undefined') {
    return envUrl || peerUrl || API_BASE || 'http://127.0.0.1:5000';
  }

  if (role?.isIdeum && peerUrl) {
    return peerUrl;
  }

  if (isLocalClusterDev()) {
    return envUrl || API_BASE || '';
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === '192.168.50.2' || host.startsWith('192.168.50.')) {
      return peerUrl || envUrl || MAINGEAR_CLUSTER_BACKEND;
    }
  }

  return peerUrl || envUrl || API_BASE || `http://${window.location.hostname}:${BACKEND_PORT}`;
}

export async function fetchMachineRole() {
  const res = await fetch(`${API_BASE}/api/cluster/machine-role`);
  if (!res.ok) {
    throw new Error(`Machine role request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Ideum → Maingear: POST remote command to peer backend (direct Ethernet, not UI proxy).
 * @param {string | object | null} peerBackendUrlOrRole peer URL or machine-role object
 */
export async function sendRemoteCommandToMaingear(peerBackendUrlOrRole, command, payload = undefined) {
  const base =
    typeof peerBackendUrlOrRole === 'object' && peerBackendUrlOrRole !== null
      ? resolveMaingearPeerPostBase(peerBackendUrlOrRole)
      : (peerBackendUrlOrRole || '').replace(/\/$/, '');
  const body = { command, source: 'ideum' };
  if (payload != null && typeof payload === 'object') {
    body.payload = payload;
  }
  const res = await fetch(`${base}/api/cluster/remote-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Remote command failed (${res.status})`);
  }
  return data;
}

/** Maingear UI → cluster WebSocket subscribers (Ideum mirrors simulation state). */
export async function broadcastClusterMessage(message) {
  const res = await fetch(`${API_BASE}/api/cluster/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Cluster broadcast failed (${res.status})`);
  }
  return res.json();
}

function peerClusterWebSocketUrl(peerBackendUrl) {
  const base = (peerBackendUrl || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base.replace(/^http/, 'ws')}/ws/cluster`;
}

/**
 * Ideum UI listens on the Maingear backend WebSocket for simulation_state, etc.
 * @returns {() => void} cleanup
 */
export function connectPeerClusterWebSocket(peerBackendUrl, onMessage) {
  let ws;
  let closed = false;
  let retryTimer = null;

  const connect = () => {
    if (closed) return;
    const url = peerClusterWebSocketUrl(peerBackendUrl);
    if (!url) return;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.warn('Peer cluster WebSocket failed to open', e);
      retryTimer = setTimeout(connect, 3000);
      return;
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage(msg);
      } catch (e) {
        console.warn('Peer cluster WebSocket parse error', e);
      }
    };

    ws.onerror = (e) => {
      console.warn('Peer cluster WebSocket error', e);
    };

    ws.onclose = () => {
      if (!closed) {
        retryTimer = setTimeout(connect, 3000);
      }
    };
  };

  connect();

  return () => {
    if (closed) return;
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    try {
      ws?.close();
    } catch (_) {
      /* ignore */
    }
  };
}

function clusterWebSocketUrl() {
  if (typeof window === 'undefined') {
    return `ws://127.0.0.1:${BACKEND_PORT}/ws/cluster`;
  }
  const host = window.location.hostname;
  // Dev UI runs on :3003; backend on :5000. CRA proxy often fails WS upgrade — connect direct.
  if (!API_BASE) {
    return `ws://${host}:${BACKEND_PORT}/ws/cluster`;
  }
  const wsBase = API_BASE.replace(/^http/, 'ws');
  return `${wsBase}/ws/cluster`;
}

/**
 * Subscribe to cluster WebSocket (Maingear UI listens for remote_command).
 * @returns {() => void} cleanup
 */
export function connectClusterWebSocket(onMessage) {
  let ws;
  let closed = false;
  let retryTimer = null;

  const connect = () => {
    if (closed) return;
    const url = clusterWebSocketUrl();
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.warn('Cluster WebSocket failed to open', e);
      retryTimer = setTimeout(connect, 3000);
      return;
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

    ws.onclose = () => {
      if (!closed) {
        retryTimer = setTimeout(connect, 3000);
      }
    };
  };

  connect();

  return () => {
    if (closed) return;
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    try {
      ws?.close();
    } catch (_) {
      /* ignore */
    }
  };
}
