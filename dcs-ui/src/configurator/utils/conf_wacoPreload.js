import { API_BASE_URL } from '../../apiConfig';
import { fetchMachineRole, resolveMaingearPeerPostBase } from '../../utils/clusterPeer';
import {
  dataVisLoadMwQueryString,
  effectiveDataVisLoadMwTier,
  notifyWacoLoadTierChanged,
} from '../dataVis/api/dataVisLoadMw';
import {
  effectiveMartinStudy,
  notifyMartinStudyChanged,
  persistMartinStudyForDataVis,
} from './conf_martinStudy';
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

async function postWacoPreloadToUrl(url, loadMW, stateId) {
  const tier = normalizeWacoLoadTier(loadMW);
  if (tier == null) {
    throw new Error('loadMW must be 200 or 1000');
  }
  const martinStudy = effectiveMartinStudy(stateId);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loadMW: tier, martinStudy, stateId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Martin study preload failed (${res.status})`);
  }
  return data;
}

function wacoPreloadUrl(baseRoot, loadMW, stateId) {
  const tier = normalizeWacoLoadTier(loadMW);
  const root = (baseRoot || CONFIGURATOR_API_ROOT).replace(/\/$/, '');
  return `${root}/waco/preload?${dataVisLoadMwQueryString(stateId)}&loadMW=${tier}`;
}

/** Same-origin backend reads the Martin study workbook into cache. */
export async function postConfiguratorWacoPreload(loadMW, stateId) {
  return postWacoPreloadToUrl(wacoPreloadUrl(CONFIGURATOR_API_ROOT, loadMW, stateId), loadMW, stateId);
}

/** Direct Ethernet POST to Maingear (Ideum touch table). */
export async function postConfiguratorWacoPreloadToPeer(peerBackendUrl, loadMW, stateId) {
  const base = (peerBackendUrl || '').replace(/\/$/, '');
  if (!base) {
    throw new Error('Maingear peerBackendUrl is not configured');
  }
  return postWacoPreloadToUrl(wacoPreloadUrl(`${base}/api/configurator`, loadMW, stateId), loadMW, stateId);
}

async function postPreloadForTier(tier, machineRole, stateId) {
  let role = machineRole;
  if (role === undefined) {
    role = await fetchMachineRole().catch(() => null);
  }
  const isIdeumTouch = Boolean(role?.isIdeum && !role?.combinedWallAndTouch);
  const peerBase = resolveMaingearPeerPostBase(role);

  if (isIdeumTouch && peerBase) {
    const [local, peer] = await Promise.allSettled([
      postConfiguratorWacoPreload(tier, stateId),
      postConfiguratorWacoPreloadToPeer(peerBase, tier, stateId),
    ]);
    if (local.status === 'rejected' && peer.status === 'rejected') {
      throw local.reason || peer.reason;
    }
    return local.status === 'fulfilled' ? local.value : peer.value;
  }

  return postConfiguratorWacoPreload(tier, stateId);
}

/**
 * Warm Martin study on backend. Does NOT write session tier — only load buttons do.
 * @param machineRole pass `null` to skip machine-role fetch (load buttons).
 */
export function preloadWacoStudy(loadMW, machineRole = undefined, stateId = 'texas') {
  if (normalizeWacoLoadTier(loadMW) == null && loadMW != null) {
    return Promise.resolve(null);
  }

  const run = preloadTail.then(async () => {
    const tier = effectiveDataVisLoadMwTier(stateId);
    const martinStudy = effectiveMartinStudy(stateId);
    persistMartinStudyForDataVis(martinStudy);
    debugWacoPreload('POST', { tier, requested: loadMW, martinStudy, stateId });
    const result = await postPreloadForTier(tier, machineRole, stateId);
    debugWacoPreload('OK', result);
    notifyWacoLoadTierChanged(tier);
    notifyMartinStudyChanged(martinStudy);
    return result;
  });

  preloadTail = run.catch((err) => {
    console.warn('[configurator] Martin study preload failed:', err?.message || err);
  });

  return run;
}

/** Fire-and-forget from touch load buttons. */
export function triggerWacoPreloadNow(loadMW, stateId) {
  void preloadWacoWithDatasetQuality(loadMW, null, stateId);
}

/** Load workbook for tier, then apply session clean/original mode on backend (and Maingear when Ideum). */
export const WACO_DATASET_READY_EVENT = 'dcs:waco-dataset-ready';

export async function preloadWacoWithDatasetQuality(loadMW, machineRole = undefined, stateId = 'texas') {
  await preloadWacoStudy(loadMW, machineRole, stateId);
  let role = machineRole;
  if (role === undefined) {
    role = await fetchMachineRole().catch(() => null);
  }
  const uiMode = await applyDataVisDatasetMode(readPersistedDataQualityMode(), role);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(WACO_DATASET_READY_EVENT, {
        detail: {
          loadMW: effectiveDataVisLoadMwTier(stateId),
          martinStudy: effectiveMartinStudy(stateId),
          stateId,
        },
      }),
    );
  }
  return uiMode;
}
