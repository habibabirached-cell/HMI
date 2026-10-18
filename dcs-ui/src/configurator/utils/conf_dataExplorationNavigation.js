/**
 * Data Exploration tab — cluster-aware navigation (MacBook dev / Ideum / Maingear).
 *
 * Ideum → Maingear uses the same Ethernet path as configurator submit and FlexSim remote
 * control (POST /api/cluster/remote-command + /ws/cluster on peerBackendUrl). Corridor /
 * histogram band limits from the touch table will later stream over this tunnel (compare
 * ideumRemoteMouse.js → Maingear KioskMouseServer :8767 for real-time pointer relay).
 */

import {
  connectPeerClusterWebSocket,
  fetchMachineRole,
  resolveMaingearPeerPostBase,
  sendRemoteCommandToMaingear,
} from '../../utils/clusterPeer';
import { isLocalClusterDev } from './conf_configuratorCluster';
import { IDEUM_DATA_EXPLORATION_TAB_ID } from '../components/conf_IdeumPageTabs';
import {
  buildExploreRemoteCommandPayload,
  inputsWithEffectiveWacoLoadTier,
  MARTIN_STUDY_URL_PARAM,
  WACO_LOAD_MW_URL_PARAM,
} from '../dataVis/api/dataVisLoadMw';
import { martinStudyForStateId } from './conf_martinStudy';
import {
  publishConfiguratorExploreSync,
  stashExploreSyncHandoffForNewTab,
} from '../dataVis/utils/dataVisConfiguratorSync';

export { IDEUM_DATA_EXPLORATION_TAB_ID };
export const IDEUM_EXPLORE_DATA_TAB_ID = 'explore-data';

export const IDEUM_TAB_URL_PARAM = 'ideumTab';

/** One exploration window for this browser. Later clicks navigate this same tab. */
export const DATA_EXPLORATION_WINDOW_NAME = 'dcsDataExploration';

/** Opener-side handle. Survives until this configurator tab is refreshed. */
let explorationWindow = null;

const EXPLORATION_NAV_KEY = 'dcs.dataVis.explorationTarget';
const EXPLORATION_ALIVE_KEY = 'dcs.dataVis.explorationAlive';

function publishExplorationTarget(url) {
  try {
    window.localStorage.setItem(
      EXPLORATION_NAV_KEY,
      JSON.stringify({ url, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

function explorationTabIsAlive() {
  try {
    const at = Number(window.localStorage.getItem(EXPLORATION_ALIVE_KEY) || 0);
    return Number.isFinite(at) && Date.now() - at < 5000;
  } catch {
    return false;
  }
}

function claimThisPageAsExplorationWindow() {
  if (typeof window === 'undefined') return;
  try {
    const view = new URLSearchParams(window.location.search).get('view');
    if (view !== DATA_EXPLORATION_CONFIGURATOR_VIEW) return;
    window.name = DATA_EXPLORATION_WINDOW_NAME;
    const beat = () => {
      try {
        window.localStorage.setItem(EXPLORATION_ALIVE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    };
    beat();
    window.setInterval(beat, 1000);
    window.addEventListener('beforeunload', () => {
      try {
        window.localStorage.removeItem(EXPLORATION_ALIVE_KEY);
      } catch {
        /* ignore */
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key !== EXPLORATION_NAV_KEY || !event.newValue) return;
      if (window.name !== DATA_EXPLORATION_WINDOW_NAME) return;
      try {
        const next = JSON.parse(event.newValue);
        if (!next?.url) return;
        if (next.url === window.location.href) window.location.reload();
        else window.location.replace(next.url);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}

/** Maingear cluster WebSocket + remote-command handler (App.js). */
export const DATA_EXPLORATION_REMOTE_COMMAND = 'openDataExploration';
export const EXPLORE_DATA_REMOTE_COMMAND = 'openExploreData';

export const DATA_EXPLORATION_CONFIGURATOR_VIEW = 'configurator-ideum';

/** Handoff when Maingear UI mounts after Ideum remote-command (avoids event race). */
export const PENDING_IDEUM_TAB_STORAGE_KEY = 'dcs.configurator.pendingIdeumTab';

export function stashPendingIdeumTab(tabId) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PENDING_IDEUM_TAB_STORAGE_KEY, tabId);
  } catch {
    /* ignore */
  }
}

export function consumePendingIdeumTab() {
  if (typeof window === 'undefined') return null;
  try {
    const tab = window.sessionStorage.getItem(PENDING_IDEUM_TAB_STORAGE_KEY);
    if (tab) window.sessionStorage.removeItem(PENDING_IDEUM_TAB_STORAGE_KEY);
    return tab;
  } catch {
    return null;
  }
}

function buildIdeumExploreUrl(originPathname, tabId, inputs, uiMode) {
  const handoff = stashExploreSyncHandoffForNewTab(
    inputsWithEffectiveWacoLoadTier(inputs),
    uiMode,
  );
  const url = new URL(typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  url.pathname = originPathname;
  url.searchParams.set('view', DATA_EXPLORATION_CONFIGURATOR_VIEW);
  url.searchParams.set(IDEUM_TAB_URL_PARAM, tabId);
  const stateId = handoff?.inputs?.stateId ?? inputs?.stateId;
  const study = handoff?.inputs?.martinStudy ?? martinStudyForStateId(stateId);
  url.searchParams.set(WACO_LOAD_MW_URL_PARAM, String(handoff?.inputs?.loadMW ?? inputs?.loadMW ?? 200));
  url.searchParams.set(MARTIN_STUDY_URL_PARAM, study);
  return url.toString();
}

function explorationWindowIsOpen(win) {
  try {
    return Boolean(win) && !win.closed;
  } catch {
    return false;
  }
}

function openNamedExplorationWindow(url) {
  const existing = explorationWindowIsOpen(explorationWindow) ? explorationWindow : null;
  if (existing) {
    try {
      existing.name = DATA_EXPLORATION_WINDOW_NAME;
      if (existing.location.href === url) existing.location.reload();
      else existing.location.replace(url);
      existing.focus();
      return existing;
    } catch {
      /* the open tab also listens for the storage target below */
    }
  }
  if (explorationTabIsAlive()) {
    publishExplorationTarget(url);
    return existing;
  }
  publishExplorationTarget(url);
  const win = window.open(url, DATA_EXPLORATION_WINDOW_NAME);
  if (win) explorationWindow = win;
  try {
    win?.focus();
  } catch {
    /* the named tab can still load if focus is blocked */
  }
  return win;
}

claimThisPageAsExplorationWindow();

/** Dev MacBook: Data Exploration in the one named tab. A later click reloads that tab. */
export function openDataExplorationDevNewTab(inputs, uiMode) {
  if (typeof window === 'undefined') return;
  const url = buildIdeumExploreUrl(
    window.location.pathname,
    IDEUM_DATA_EXPLORATION_TAB_ID,
    inputs,
    uiMode,
  );
  openNamedExplorationWindow(url);
}

/** Dev MacBook: Explore Data in the same named tab as Data Exploration. */
export function openExploreDataDevNewTab(inputs, uiMode) {
  if (typeof window === 'undefined') return;
  const url = buildIdeumExploreUrl(
    window.location.pathname,
    IDEUM_EXPLORE_DATA_TAB_ID,
    inputs,
    uiMode,
  );
  openNamedExplorationWindow(url);
}

/**
 * Ideum → Maingear: open Data Exploration on the wall PC and keep a peer cluster WebSocket
 * for future real-time filter sync (CFE bands, histogram brushes, etc.).
 * @returns {() => void} disconnect tunnel
 */
export function startIdeumDataExplorationMaingearTunnel(role) {
  const peerBase = resolveMaingearPeerPostBase(role);
  /*
   * TODO (follow-up): send Ideum corridor / filter band { column, min, max } messages to
   * Maingear (e.g. type: 'datavis_filter') so wall Data Exploration applies the same bounds
   * without loading the full Waco sheet on the touch table.
   */
  return connectPeerClusterWebSocket(peerBase, (msg) => {
    if (msg?.type === 'datavis_state') {
      /* Future: mirror Maingear exploration state on Ideum UI chrome. */
    }
  });
}

export async function requestDataExplorationOnMaingear(role, inputs, uiMode) {
  const exploreSync = publishConfiguratorExploreSync(
    inputsWithEffectiveWacoLoadTier(inputs),
    uiMode,
  );
  await sendRemoteCommandToMaingear(
    role,
    DATA_EXPLORATION_REMOTE_COMMAND,
    buildExploreRemoteCommandPayload(exploreSync),
  );
}

export async function requestExploreDataOnMaingear(role, inputs, uiMode) {
  const exploreSync = publishConfiguratorExploreSync(
    inputsWithEffectiveWacoLoadTier(inputs),
    uiMode,
  );
  await sendRemoteCommandToMaingear(
    role,
    EXPLORE_DATA_REMOTE_COMMAND,
    buildExploreRemoteCommandPayload(exploreSync),
  );
}

export async function resolveExploreDataNavigationAction(explicitRole = null) {
  return resolveDataExplorationNavigationAction(explicitRole);
}

export function readIdeumTabFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(IDEUM_TAB_URL_PARAM);
}

/**
 * @returns {Promise<'same-tab'|'new-tab'|'maingear-remote'>}
 */
export async function resolveDataExplorationNavigationAction(explicitRole = null) {
  let role = explicitRole;
  if (!role) {
    try {
      role = await fetchMachineRole();
    } catch {
      role = null;
    }
  }

  if (role?.isMaingear) {
    return 'same-tab';
  }

  if (role?.isIdeum) {
    return 'maingear-remote';
  }

  const openDevTab =
    role?.isDev
    || (isLocalClusterDev() && !role?.isMaingear && !role?.isIdeum);
  if (openDevTab) {
    return 'new-tab';
  }

  return 'same-tab';
}
