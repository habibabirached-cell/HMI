/**
 * Maingear ↔ Ideum cluster: machine role and remote commands over WebSocket/HTTP.
 */

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';
const BACKEND_PORT = '5000';

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

    ws.onopen = () => {
      console.info('[cluster] Peer WebSocket connected', url);
    };

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

    ws.onopen = () => {
      console.info('[cluster] WebSocket connected', url);
    };

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
