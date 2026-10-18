/**
 * Browser client for Roberto's RSCAD driver (Windows host, port 8008).
 * The driver runs only on the Maingear. Ideum opens the kiosk at localhost,
 * so the socket must target the Maingear Ethernet host, not the page host.
 * Start payload matches CAD_Driver/rscad-driver-svc/src/ws_client/run_streaming_scenario.py.
 */

import { fetchMachineRole } from '../../utils/clusterPeer';

const RSCAD_PORT = '8008';
const MAINGEAR_RSCAD_HOST = '192.168.50.1';
const CONNECT_TIMEOUT_MS = 8000;
const START_TIMEOUT_MS = 60000;

const START_MESSAGE = {
  command: 'start',
  body: {
    name: 'CDC_LM8unit_2BESS_MVUPS',
    do_compile_case: false,
    model_file: 'CDC_LM8unit_2BESS_MVUPS\\CDC_LM8unit_2BESS_MVUPS.rtfx',
    streaming_interval: 0.1,
    prop_set_wait: 1,
    config: [
      {
        id: 75504,
        name: 'Topology',
        type: 'switch',
        subtab: 'Draft',
        subpage: 'SS #1',
        properties: { position: 0 },
      },
      {
        id: 75363,
        name: 'AI_load',
        type: 'switch',
        subtab: 'Draft',
        subpage: 'SS #1',
        properties: { position: 0 },
      },
    ],
    output: [
      { id: 24763, name: 'VGB', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 470, name: 'PMAC', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 75586, name: 'P_UPS_LOAD', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 75587, name: 'Q_UPS_LOAD', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 75589, name: 'Vgridrms', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 75588, name: 'LoadSideV_rms_pu', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 75441, name: 'BESS1_MW_scale', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 75442, name: 'BESS2_MW_scale', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 24816, name: 'Simtime', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
      { id: 2114, name: 'W', type: 'meter', subtab: 'Draft', subpage: 'SS #1' },
    ],
  },
};

let socket = null;
let simulationId = null;
let busy = false;
let statusText = '';
const listeners = new Set();

function pageHost() {
  if (typeof window === 'undefined') return '127.0.0.1';
  return window.location.hostname || '127.0.0.1';
}

function hostFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    return new URL(url).hostname || '';
  } catch {
    return '';
  }
}

function isLoopbackHost(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/**
 * Ideum kiosk → Maingear Ethernet (192.168.50.1).
 * Maingear or a dev laptop → the host that served this page (Roberto's client uses 127.0.0.1).
 */
export async function resolveRscadDriverHost() {
  try {
    const role = await fetchMachineRole();
    if (role?.isIdeum && !role?.isMaingear) {
      const peerHost = hostFromUrl(role.peerBackendUrl);
      if (peerHost && !isLoopbackHost(peerHost)) return peerHost;
      return MAINGEAR_RSCAD_HOST;
    }
  } catch {
    /* same-machine fallback below */
  }
  return pageHost();
}

export async function rscadDriverWebSocketUrl() {
  const host = await resolveRscadDriverHost();
  return `ws://${host}:${RSCAD_PORT}/ws/stream_model`;
}

function snapshot() {
  return { simulationId, busy, statusText };
}

function emit() {
  const snap = snapshot();
  listeners.forEach((fn) => fn(snap));
}

export function subscribeRscadDriver(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

function closeSocket() {
  const current = socket;
  socket = null;
  if (!current) return;
  current.onopen = null;
  current.onerror = null;
  current.onclose = null;
  current.onmessage = null;
  try {
    current.close();
  } catch (_) {
    /* already closed */
  }
}

function waitForOpen(ws, timeoutMs, url) {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new Error(`RSCAD server not reachable at ${url}`));
    const timer = setTimeout(fail, timeoutMs);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    ws.onerror = () => {
      clearTimeout(timer);
      fail();
    };
  });
}

function waitForReply(ws, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener('message', onMessage);
      reject(new Error('Timed out waiting for RSCAD'));
    }, timeoutMs);

    function onMessage(event) {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (_) {
        return;
      }
      if (!data || (!data.status && !data.error)) return;
      clearTimeout(timer);
      ws.removeEventListener('message', onMessage);
      resolve(data);
    }

    ws.addEventListener('message', onMessage);
  });
}

export async function startRscadSimulation() {
  if (busy) return snapshot();
  busy = true;
  statusText = '';
  emit();

  try {
    closeSocket();
    const url = await rscadDriverWebSocketUrl();
    const ws = new WebSocket(url);
    socket = ws;
    await waitForOpen(ws, CONNECT_TIMEOUT_MS, url);
    const pending = waitForReply(ws, START_TIMEOUT_MS);
    ws.send(JSON.stringify(START_MESSAGE));
    const reply = await pending;
    if (reply.status === 'error' || reply.error) {
      throw new Error(reply.message || reply.error || 'Start failed');
    }
    if (!reply.id) {
      throw new Error('Start reply had no id');
    }
    simulationId = String(reply.id);
    statusText = '';
    ws.onmessage = () => {};
    return snapshot();
  } catch (error) {
    simulationId = null;
    statusText = error?.message || 'Start failed';
    closeSocket();
    return snapshot();
  } finally {
    busy = false;
    emit();
  }
}

export async function stopRscadSimulation() {
  if (busy || !simulationId) return snapshot();
  busy = true;
  emit();
  const id = simulationId;

  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const pending = waitForReply(socket, 15000);
      socket.send(JSON.stringify({ command: 'stop', body: { id } }));
      await pending.catch(() => {});
    }
  } finally {
    simulationId = null;
    statusText = '';
    closeSocket();
    busy = false;
    emit();
  }
  return snapshot();
}
