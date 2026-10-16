import { API_BASE_URL } from '../../apiConfig';
import { fetchMachineRole, resolveMaingearPeerPostBase } from '../../utils/clusterPeer';
import {
  effectiveDataVisLoadMwTier,
  notifyWacoLoadTierChanged,
} from '../dataVis/api/dataVisLoadMw';
import { normalizeWacoLoadTier } from './conf_wacoLoadTier';
import {
  applyDataVisDatasetMode,
  readPersistedDataQualityMode,
} from '../dataVis/utils/dataVisQualityMode';

/** Same-origin in dev (CRA proxy); absolute when REACT_APP_API_BASE_URL is set. */
const CONFIGURATOR_API_ROOT = API_BASE_URL
  ? `${API_BASE_URL.replace(/\/$/, '')}/api/configurator`
  : '/api/configurator';

/** One backend preload at a time; each run uses session tier at execution (latest button wins). */
let preloadTail = Promise.resolve();

function debugWacoPreload(label, detail) {
  try {
    if (typeof window !== 'undefined' && window.localStorage?.getItem('dcs.debug.wacoTier') === '1') {
      console.info(`[waco-preload] ${label}`, detail);
    }
  } catch {
    /* ignore */
  }
}

async function postWacoPreloadToUrl(url, loadMW) {
  const tier = normalizeWacoLoadTier(loadMW);
  if (tier == null) {
    throw new Error('loadMW must be 200 or 1000');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loadMW: tier }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Waco preload failed (${res.status})`);
  }
  return data;
}

function wacoPreloadUrl(baseRoot, loadMW) {
  const tier = normalizeWacoLoadTier(loadMW);
  const root = (baseRoot || CONFIGURATOR_API_ROOT).replace(/\/$/, '');
  return `${root}/waco/preload?loadMW=${tier}`;
}

/** Same-origin backend reads the Waco workbook for 200 MW or 1000 MW into cache. */
export async function postConfiguratorWacoPreload(loadMW) {
  return postWacoPreloadToUrl(wacoPreloadUrl(CONFIGURATOR_API_ROOT, loadMW), loadMW);
}

/** Direct Ethernet POST to Maingear (Ideum touch table). */
export async function postConfiguratorWacoPreloadToPeer(peerBackendUrl, loadMW) {
  const base = (peerBackendUrl || '').replace(/\/$/, '');
  if (!base) {
    throw new Error('Maingear peerBackendUrl is not configured');
  }
  return postWacoPreloadToUrl(wacoPreloadUrl(`${base}/api/configurator`, loadMW), loadMW);
}

async function postPreloadForTier(tier, machineRole) {
  let role = machineRole;
  if (role === undefined) {
    role = await fetchMachineRole().catch(() => null);
  }
  const isIdeumTouch = Boolean(role?.isIdeum && !role?.combinedWallAndTouch);
  const peerBase = resolveMaingearPeerPostBase(role);

  if (isIdeumTouch && peerBase) {
    const [local, peer] = await Promise.allSettled([
      postConfiguratorWacoPreload(tier),
      postConfiguratorWacoPreloadToPeer(peerBase, tier),
    ]);
    if (local.status === 'rejected' && peer.status === 'rejected') {
      throw local.reason || peer.reason;
    }
    return local.status === 'fulfilled' ? local.value : peer.value;
  }

  return postConfiguratorWacoPreload(tier);
}

/**
 * Warm Waco workbook on backend. Does NOT write session tier — only load buttons do.
 * Serialized: a late 1000MW click is not overwritten by an earlier 200MW call still queued.
 * @param machineRole pass `null` to skip machine-role fetch (load buttons).
 */
export function preloadWacoStudy(loadMW, machineRole = undefined) {
  if (normalizeWacoLoadTier(loadMW) == null && loadMW != null) {
    return Promise.resolve(null);
  }

  const run = preloadTail.then(async () => {
    const tier = effectiveDataVisLoadMwTier();
    debugWacoPreload('POST', { tier, requested: loadMW });
    const result = await postPreloadForTier(tier, machineRole);
    debugWacoPreload('OK', result);
    notifyWacoLoadTierChanged(tier);
    return result;
  });

  preloadTail = run.catch((err) => {
    console.warn('[configurator] Waco preload failed:', err?.message || err);
  });

  return run;
}
/** Fire-and-forget from touch load buttons. */
export function triggerWacoPreloadNow(loadMW) {
  void preloadWacoWithDatasetQuality(loadMW, null);
}

/** Load workbook for tier, then apply session clean/original mode on backend (and Maingear when Ideum). */
export const WACO_DATASET_READY_EVENT = 'dcs:waco-dataset-ready';

export async function preloadWacoWithDatasetQuality(loadMW, machineRole = undefined) {
  await preloadWacoStudy(loadMW, machineRole);
  let role = machineRole;
  if (role === undefined) {
    role = await fetchMachineRole().catch(() => null);
  }
  const uiMode = await applyDataVisDatasetMode(readPersistedDataQualityMode(), role);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(WACO_DATASET_READY_EVENT, {
        detail: { loadMW: effectiveDataVisLoadMwTier() },
      }),
    );
  }
  return uiMode;
}

