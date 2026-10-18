import {
  IDEUM05_P2R18_MAINGEAR_CATALOG,
  IDEUM05_WIND02_MAINGEAR_CATALOG,
} from './ideum05Navigation';

/** After ?design=… loads on a dev wall tab, apply this remote-control preset. */
export const IDEUM_REMOTE_URL_PARAM = 'ideumRemote';

/** Ideum touch → Maingear presets that open a local P2R_18 wall tab on dev Mac. */
export const IDEUM_DEV_WALL_REMOTE_COMMANDS = new Set(['addBessOnly']);

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

export function openDevMaingearWind02WallTab(remoteCommand = 'addBessOnly') {
  openDevMaingearWallTab(IDEUM05_WIND02_MAINGEAR_CATALOG, remoteCommand);
}

export function parseIdeumRemoteDeepLink(search) {
  const raw = new URLSearchParams(search).get(IDEUM_REMOTE_URL_PARAM);
  if (!raw || typeof raw !== 'string') return null;
  const command = raw.trim();
  return command || null;
}

export function stripIdeumRemoteFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(IDEUM_REMOTE_URL_PARAM)) return;
  url.searchParams.delete(IDEUM_REMOTE_URL_PARAM);
  const qs = url.searchParams.toString();
  window.history.replaceState(null, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash || ''}`);
}
