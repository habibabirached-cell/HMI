import {
  IDEUM05_P2R18_MAINGEAR_CATALOG,
  IDEUM05_P2R_CHIL_MAINGEAR_CATALOG,
  IDEUM05_WIND02_MAINGEAR_CATALOG,
} from './ideum05Navigation';
import { isLocalClusterDev } from './clusterPeer';

/** Same-origin BroadcastChannel: Ideum kiosk tab → dev Maingear wall tab (?maltaView=wall). */
export const DEV_MAINGEAR_WALL_CHANNEL = 'dcs-dev-maingear-wall-v1';

/** After ?design=… loads on a dev wall tab, apply this remote-control preset. */
export const IDEUM_REMOTE_URL_PARAM = 'ideumRemote';

/** Baseline tile — always opens a new dev Maingear wall tab. */
export const IDEUM_DEV_WALL_OPEN_TAB_COMMANDS = new Set(['add8Turbines']);

/** Augmented / control tiles — relay to an already-open dev wall tab (BroadcastChannel). */
export const IDEUM_DEV_WALL_RELAY_COMMANDS = new Set([
  'addBessOnly',
  'addMvupsOnly',
  'addGfmeOnly',
  'addStatcomAndGFMe',
  'reset',
  'toggleSimulation',
  'toggleBreakersExpansion',
  'togglePeripheralsExpansion',
]);

/** Any command that may appear as ?ideumRemote= on a newly opened dev wall tab. */
export const IDEUM_DEV_WALL_REMOTE_COMMANDS = new Set([
  ...IDEUM_DEV_WALL_OPEN_TAB_COMMANDS,
  ...IDEUM_DEV_WALL_RELAY_COMMANDS,
]);

/** Dispatchable-wind baseline tile (opens wind02 wall tab with addBessOnly). */
export const DISPATCHABLE_WIND_BASELINE_IDEUM_COMMAND = 'dispatchableWindBessBaseline';

export function buildDevMaingearWallTabUrl(catalogDesign, remoteCommand) {
  if (typeof window === 'undefined') {
    return `/?design=${catalogDesign}&maltaView=wall&${IDEUM_REMOTE_URL_PARAM}=${remoteCommand}`;
  }
  const url = new URL(window.location.href);
  url.pathname = window.location.pathname || '/';
  url.search = '';
  url.searchParams.set('design', catalogDesign);
  url.searchParams.set('maltaView', 'wall');
  url.searchParams.set(IDEUM_REMOTE_URL_PARAM, remoteCommand);
  return url.toString();
}

export function openDevMaingearWallTab(catalogDesign, remoteCommand) {
  if (typeof window === 'undefined') return;
  window.open(
    buildDevMaingearWallTabUrl(catalogDesign, remoteCommand),
    '_blank',
    'noopener,noreferrer',
  );
}

export function buildDevMaingearP2R18WallTabUrl(remoteCommand) {
  return buildDevMaingearWallTabUrl(IDEUM05_P2R18_MAINGEAR_CATALOG, remoteCommand);
}

export function openDevMaingearP2R18WallTab(remoteCommand) {
  openDevMaingearWallTab(IDEUM05_P2R18_MAINGEAR_CATALOG, remoteCommand);
}

export function buildDevMaingearP2RChilWallTabUrl(remoteCommand) {
  return buildDevMaingearWallTabUrl(IDEUM05_P2R_CHIL_MAINGEAR_CATALOG, remoteCommand);
}

export function openDevMaingearP2RChilWallTab(remoteCommand) {
  openDevMaingearWallTab(IDEUM05_P2R_CHIL_MAINGEAR_CATALOG, remoteCommand);
}

export function openDevMaingearWind02WallTab(remoteCommand = 'addBessOnly') {
  openDevMaingearWallTab(IDEUM05_WIND02_MAINGEAR_CATALOG, remoteCommand);
}

export function parseIdeumRemoteDeepLink(search) {
  const raw = new URLSearchParams(search).get(IDEUM_REMOTE_URL_PARAM);
  if (!raw || typeof raw !== 'string') return null;
  const command = raw.trim();
  return command || null;
}

/** Relay a Maingear remote command to the local wall tab (localhost dev only). */
export function relayDevWallRemoteCommand(command, payload) {
  if (!command || typeof window === 'undefined') return false;
  if (!isLocalClusterDev()) return false;
  if (typeof BroadcastChannel === 'undefined') return false;
  try {
    const ch = new BroadcastChannel(DEV_MAINGEAR_WALL_CHANNEL);
    ch.postMessage({
      type: 'remote_command',
      command,
      payload: payload ?? null,
    });
    ch.close();
    return true;
  } catch (e) {
    console.warn('[dev wall relay] BroadcastChannel failed', e);
    return false;
  }
}

/** Wall → Ideum touch tab: expansion finished, release the stuck switch. */
export function postDevWallExpansionApplied(message) {
  if (!message || typeof window === 'undefined') return false;
  if (!isLocalClusterDev()) return false;
  if (typeof BroadcastChannel === 'undefined') return false;
  try {
    const ch = new BroadcastChannel(DEV_MAINGEAR_WALL_CHANNEL);
    ch.postMessage(message);
    ch.close();
    return true;
  } catch (e) {
    console.warn('[dev wall relay] expansion ack failed', e);
    return false;
  }
}

export function installDevWallExpansionAckListener(onAck) {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  const ch = new BroadcastChannel(DEV_MAINGEAR_WALL_CHANNEL);
  const handler = (ev) => {
    const data = ev.data;
    if (data?.type === 'expansion_applied') onAck(data);
  };
  ch.addEventListener('message', handler);
  return () => {
    ch.removeEventListener('message', handler);
    ch.close();
  };
}

export function installDevWallRemoteCommandListener(onCommand) {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  const ch = new BroadcastChannel(DEV_MAINGEAR_WALL_CHANNEL);
  const handler = (ev) => {
    const data = ev.data;
    if (data?.type === 'remote_command' && data.command) {
      onCommand(data.command, data.payload ?? undefined);
    }
  };
  ch.addEventListener('message', handler);
  return () => {
    ch.removeEventListener('message', handler);
    ch.close();
  };
}

export function stripIdeumRemoteFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(IDEUM_REMOTE_URL_PARAM)) return;
  url.searchParams.delete(IDEUM_REMOTE_URL_PARAM);
  const qs = url.searchParams.toString();
  window.history.replaceState(null, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash || ''}`);
}
