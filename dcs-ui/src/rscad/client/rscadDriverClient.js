/**
 * Browser client for Roberto's RSCAD driver (Windows host, port 8008).
 * The driver runs only on the Maingear. Ideum opens the kiosk at localhost,
 * so the socket must target the Maingear Ethernet host, not the page host.
 * Start payload matches CAD_Driver/rscad-driver-svc/src/ws_client/run_streaming_scenario.py.
 */

import { fetchMachineRole, isLocalClusterDev, sendRemoteCommandToMaingear } from '../../utils/clusterPeer';
import { relayDevWallRemoteCommand } from '../../utils/ideumDevMaingearTab';
import {
  RSCAD_CHARTS_OPEN_COMMAND,
  RSCAD_METER_SAMPLE_COMMAND,
  rscadWallSampleFromMeters,
} from '../../utils/rscadWallCharts';

const RSCAD_PORT = '8008';
const MAINGEAR_RSCAD_HOST = '192.168.50.1';
const CONNECT_TIMEOUT_MS = 8000;
const START_TIMEOUT_MS = 60000;
const CONFIG_TIMEOUT_MS = 45000;

function rscadSwitch(id, name, position) {
  return {
    id,
    name,
    type: 'switch',
    subtab: 'Draft',
    subpage: 'SS #1',
    properties: { position },
  };
}

function rscadPushbutton(id, name, position) {
  return {
    id,
    name,
    type: 'pushbutton',
    subtab: 'Draft',
    subpage: 'SS #1',
    properties: { position },
  };
}

function rscadSlider(id, name, value) {
  return {
    id,
    name,
    type: 'slider',
    subtab: 'Draft',
    subpage: 'SS #1',
    properties: { value },
  };
}

function rscadMeter(id, name) {
  return { id, name, type: 'meter', subtab: 'Draft', subpage: 'SS #1' };
}

/** Previous case: CDC_LM8unit_2BESS_MVUPS.rtfx. Set RSCAD_USE_OLD_SCENARIO to send this again. */
const OLD_START_MESSAGE = {
  command: 'start',
  body: {
    name: 'CDC_LM8unit_2BESS_MVUPS',
    do_compile_case: false,
    model_file: 'CDC_LM8unit_2BESS_MVUPS\\CDC_LM8unit_2BESS_MVUPS.rtfx',
    streaming_interval: 0.1,
    prop_set_wait: 1,
    config: [
      rscadSwitch(75504, 'Topology', 0),
      rscadSwitch(75363, 'AI_load', 0),
    ],
    output: [
      rscadMeter(24763, 'VGB'),
      rscadMeter(470, 'PMAC'),
      rscadMeter(75586, 'P_UPS_LOAD'),
      rscadMeter(75587, 'Q_UPS_LOAD'),
      rscadMeter(75589, 'Vgridrms'),
      rscadMeter(75588, 'LoadSideV_rms_pu'),
      rscadMeter(75441, 'BESS1_MW_scale'),
      rscadMeter(75442, 'BESS2_MW_scale'),
      rscadMeter(24816, 'Simtime'),
      rscadMeter(2114, 'W'),
    ],
  },
};

// HMI - BUTTON - Start
const START_MESSAGE = {
  command: 'start',
  body: {
    name: 'CDC_LM8unit_2BESS_MVUPS',
    do_compile_case: false,
    model_file: 'CDC_LM8unit_2BESS_MVUPS\\Lm2500_8units_EMS_sig_upgraded_10152026.rtfx',
    streaming_interval: 0.1,
    prop_set_wait: 1,
    config: [
      rscadSwitch(59233, 'Topology', 0),
      rscadSwitch(59241, 'AI_load', 0),
      rscadSwitch(55240, 'SW99', 0),
      rscadSlider(59237, 'PLoad_pu', 0.7),
    ],
    output: [
      rscadMeter(62384, 'VGB1'),
      rscadMeter(62386, 'PMAC1'),
      rscadMeter(59248, 'P_UPS_LOAD'),
      rscadMeter(59249, 'Q_UPS_LOAD'),
      rscadMeter(59251, 'Vgridrms'),
      rscadMeter(59250, 'LoadSideV_rms_pu'),
      rscadMeter(55391, 'BESS1_MW_scale'),
      rscadMeter(55393, 'BESS2_MW_scale'),
      rscadMeter(55224, 'Simtime'),
      rscadMeter(51951, 'W1'),
      rscadMeter(55355, 'sRef1'),
    ],
  },
};

let socket = null;
let simulationId = null;
let busy = false;
let statusText = '';
let meterSampleIndex = 0;
let wallRole = null;
let forwardWarned = false;
const listeners = new Set();

async function publishRscadWall(command, payload) {
  if (wallRole?.isIdeum && !wallRole?.isMaingear) {
    await sendRemoteCommandToMaingear(wallRole, command, payload);
    return;
  }
  if (isLocalClusterDev()) {
    relayDevWallRemoteCommand(command, payload);
  }
}

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
    ws.send(JSON.stringify(activeScenario().start));
    const reply = await pending;
    if (reply.status === 'error' || reply.error) {
      throw new Error(reply.message || reply.error || 'Start failed');
    }
    if (!reply.id) {
      throw new Error('Start reply had no id');
    }
    simulationId = String(reply.id);
    statusText = '';
    meterSampleIndex = 0;
    forwardWarned = false;
    try {
      wallRole = await fetchMachineRole();
    } catch {
      wallRole = null;
    }
    try {
      await publishRscadWall(RSCAD_CHARTS_OPEN_COMMAND);
    } catch (error) {
      console.warn('[rscad] could not open Maingear charts', error);
    }
    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      const sample = rscadWallSampleFromMeters(data, meterSampleIndex);
      if (!sample) return;
      meterSampleIndex += 1;
      publishRscadWall(RSCAD_METER_SAMPLE_COMMAND, sample).catch((error) => {
        if (forwardWarned) return;
        forwardWarned = true;
        console.warn('[rscad] meter forward failed', error);
      });
    };
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

async function sendRunningConfig(config) {
  if (busy) return { ...snapshot(), ok: false };
  if (!simulationId || !socket || socket.readyState !== WebSocket.OPEN) {
    statusText = 'Press Start first';
    emit();
    return { ...snapshot(), ok: false };
  }
  busy = true;
  statusText = '';
  emit();
  try {
    const pending = waitForReply(socket, CONFIG_TIMEOUT_MS);
    socket.send(JSON.stringify({
      command: 'set_config',
      body: {
        id: simulationId,
        prop_set_wait: 2,
        config,
      },
    }));
    const reply = await pending;
    if (reply.status === 'error' || reply.error) {
      throw new Error(reply.message || reply.error || 'RSCAD rejected the command');
    }
    statusText = '';
    return { ...snapshot(), ok: true };
  } catch (error) {
    statusText = error?.message || 'Command failed';
    return { ...snapshot(), ok: false };
  } finally {
    busy = false;
    emit();
  }
}

/**
 * Previous case (CDC_LM8unit_2BESS_MVUPS.rtfx).
 * Set RSCAD_USE_OLD_SCENARIO to true to send these again.
 */
export const oldScenario = {
  start: OLD_START_MESSAGE,
  aiLoad: [rscadSwitch(75363, 'AI_load', 1)],
  baseload: [rscadSwitch(75363, 'AI_load', 0)],
  addBess: [
    rscadPushbutton(75382, 'ST2DBlk', 1),
    rscadPushbutton(75378, 'ST1DBlk', 1),
    rscadPushbutton(75380, 'BESS1OnGrid', 1),
    rscadPushbutton(75384, 'BESS2OnGrid', 1),
  ],
  addMvups: [
    rscadSwitch(75363, 'AI_load', 0),
    rscadSwitch(75504, 'Topology', 1),
    rscadSwitch(75363, 'AI_load', 1),
  ],
};

/**
 * Live payloads from run_streaming_scenario.py (EMS case).
 * Start, connect_ai_load_message, tunr_off_ai_load_message, connect_bess_message,
 * connect_mvups_message, connect_EMS_message, disconnect_EMS_message,
 * baseload_change_message (EMS frequency regulation). Stop is stop_simulation_message.
 */
const scenario = {
  // HMI - BUTTON - Start
  start: START_MESSAGE,
  // HMI - BUTTON - AI Load
  aiLoad: [rscadSwitch(59241, 'AI_load', 1)],
  // HMI - BUTTON - Baseload
  baseload: [
    rscadSwitch(59241, 'AI_load', 0),
    rscadSlider(59237, 'PLoad_pu', 0.75),
  ],
  // HMI - BUTTON - Add BESS
  addBess: [
    rscadPushbutton(52120, 'ST2DBlk', 1),
    rscadPushbutton(52114, 'ST1DBlk', 1),
    rscadPushbutton(52115, 'BESS1OnGrid', 1),
    rscadPushbutton(52121, 'BESS2OnGrid', 1),
  ],
  // HMI - BUTTON - Add MVUPS
  addMvups: [
    rscadSwitch(59241, 'AI_load', 0),
    rscadSwitch(59233, 'Topology', 1),
    rscadSwitch(59241, 'AI_load', 1),
  ],
  // HMI - BUTTON - EMS Control
  connectEms: [rscadSwitch(55240, 'SW99', 1)],
  // HMI - BUTTON - Manual Control
  disconnectEms: [rscadSwitch(55240, 'SW99', 0)],
  // HMI - BUTTON - EMS Frequency Regulation
  emsFrequency: [rscadSlider(59237, 'PLoad_pu', 0.9)],
};

/** Flip to true to send oldScenario instead of the messages in run_streaming_scenario.py. */
export const RSCAD_USE_OLD_SCENARIO = false;

function activeScenario() {
  return RSCAD_USE_OLD_SCENARIO ? oldScenario : scenario;
}

/** AI Load: connect_ai_load_message. */
export function sendRscadAiLoad() {
  return sendRunningConfig(activeScenario().aiLoad);
}

/** Baseload: tunr_off_ai_load_message. */
export function sendRscadBaseload() {
  return sendRunningConfig(activeScenario().baseload);
}

/** Add BESS: connect_bess_message. Does not change the MVUPS topology switch. */
export function sendRscadAddBess() {
  return sendRunningConfig(activeScenario().addBess);
}

/** Add MVUPS: connect_mvups_message. AI load off, Topology on, AI load back on. */
export function sendRscadAddMvups() {
  return sendRunningConfig(activeScenario().addMvups);
}

/** EMS Control on: connect_EMS_message (SW99 = 1). */
export function sendRscadConnectEms() {
  const config = activeScenario().connectEms;
  if (!config) return Promise.resolve({ ...snapshot(), ok: false });
  return sendRunningConfig(config);
}

/** Manual Control: disconnect_EMS_message (SW99 = 0). */
export function sendRscadDisconnectEms() {
  const config = activeScenario().disconnectEms;
  if (!config) return Promise.resolve({ ...snapshot(), ok: false });
  return sendRunningConfig(config);
}

/** EMS Frequency Regulation: baseload_change_message (PLoad_pu = 0.9). */
export function sendRscadEmsFrequency() {
  const config = activeScenario().emsFrequency;
  if (!config) return Promise.resolve({ ...snapshot(), ok: false });
  return sendRunningConfig(config);
}

// HMI - BUTTON - Stop
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
    meterSampleIndex = 0;
    closeSocket();
    busy = false;
    emit();
  }
  return snapshot();
}
