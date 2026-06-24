/**
 * Live RTDS WebSocket client.
 *
 * Browser on Maingear connects DIRECTLY to rtds_live_bridge.py (:8765).
 * Docker relay is only a fallback (often fails on host.docker.internal).
 */

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';
const BACKEND_PORT = '5000';
const BRIDGE_PORT = '8765';
const CONNECT_TIMEOUT_MS = 8000;

function pageHost() {
  if (typeof window === 'undefined') return '127.0.0.1';
  return window.location.hostname || 'localhost';
}

export function directBridgeWebSocketUrl() {
  return `ws://${pageHost()}:${BRIDGE_PORT}`;
}

export function backendRelayWebSocketUrl() {
  const host = pageHost();
  if (!API_BASE) {
    return `ws://${host}:${BACKEND_PORT}/ws/rtds-live`;
  }
  return `${API_BASE.replace(/^http/, 'ws')}/ws/rtds-live`;
}

export function rtdsConnectionCandidates() {
  return [
    { id: 'direct-bridge', label: 'Direct bridge on Maingear host', url: directBridgeWebSocketUrl() },
    { id: 'docker-relay', label: 'Docker backend relay', url: backendRelayWebSocketUrl() },
  ];
}

function tryOpenWebSocket(candidate) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let ws;
    try {
      ws = new WebSocket(candidate.url);
    } catch (e) {
      reject(new Error(`WebSocket construct failed: ${e.message}`));
      return;
    }

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch (_) {
        /* ignore */
      }
      reject(new Error(`Timeout (${CONNECT_TIMEOUT_MS / 1000}s) — nothing listening?`));
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ws);
    };

    ws.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error('WebSocket error (connection refused or blocked)'));
    };
  });
}

/**
 * @returns {() => void} cleanup
 */
export function connectLiveRtds(onMessage, onError) {
  let ws = null;
  let closed = false;
  const attemptLog = [];

  const failAll = () => {
    const tried = attemptLog
      .map((a) => `  • ${a.label}\n    URL: ${a.url}\n    Result: ${a.result}`)
      .join('\n\n');
    onError?.(
      'Could not connect to the RTDS bridge on Maingear.\n\n'
        + 'Connection attempts:\n\n'
        + tried
        + '\n\n'
        + 'Fix:\n'
        + '1. Git Bash — leave this running:\n'
        + '     cd ~/Documents/HMI/dcs-backend\n'
        + '     python rtds_live_bridge.py\n'
        + '   Must show: listening on ws://0.0.0.0:8765 and RSCAD bindings OK\n'
        + '2. Open RSCAD FX with your case (same as Socket_v2.py)\n'
        + '3. Click Live RTDS again\n\n'
        + 'When direct bridge works, the bridge terminal prints:\n'
        + '  [rtds-bridge] HMI backend connected\n'
        + '  Connecting to the active RSCAD FX application...\n'
        + '  Connected successfully!',
      {
        mode: 'connect-failed',
        attemptLog,
        directBridgeUrl: directBridgeWebSocketUrl(),
        dockerRelayUrl: backendRelayWebSocketUrl(),
        pageHost: pageHost(),
        pagePort: typeof window !== 'undefined' ? window.location.port : '',
        bridgePort: BRIDGE_PORT,
        note: 'Browser now tries ws://HOST:8765 first (bypasses Docker). Docker relay is fallback only.',
      },
    );
  };

  const attachHandlers = (socket) => {
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'error') {
          onError?.(msg.message || 'RTDS error', {
            mode: 'bridge-rscad-error',
            bridgeMessage: msg.message,
            connectedUrl: socket.url,
            attemptLog,
            pageHost: pageHost(),
          });
          return;
        }
        if (msg.type === 'sample') {
          onMessage?.(msg);
        }
      } catch (e) {
        console.warn('RTDS live parse error', e);
      }
    };
  };

  void (async () => {
    const candidates = rtdsConnectionCandidates();
    for (const candidate of candidates) {
      if (closed) return;
      try {
        const socket = await tryOpenWebSocket(candidate);
        if (closed) {
          socket.close();
          return;
        }
        ws = socket;
        attemptLog.push({ ...candidate, result: 'Connected OK' });
        attachHandlers(socket);
        socket.send(JSON.stringify({ type: 'start' }));
        return;
      } catch (e) {
        attemptLog.push({ ...candidate, result: e.message || String(e) });
      }
    }
    if (!closed) failAll();
  })();

  return () => {
    if (closed) return;
    closed = true;
    try {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stop' }));
      }
      ws?.close();
    } catch (_) {
      /* ignore */
    }
  };
}

export async function stopLiveRtdsApi() {
  const res = await fetch(`${API_BASE}/api/rtds-live/stop`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `RTDS stop failed (${res.status})`);
  }
  return res.json();
}
