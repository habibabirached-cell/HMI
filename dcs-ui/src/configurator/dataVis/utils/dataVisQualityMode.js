/**
 * Clean vs original dataset — server swaps in-memory df; UI syncs via API + BroadcastChannel + cluster WS.
 */

import { resolveMaingearPeerPostBase } from '../../../utils/clusterPeer';
import { postDataVisDatasetMode } from '../api/conf_dataVisApi';
import { DATAVIS_CONFIGURATOR_SYNC_CHANNEL } from './dataVisConfiguratorSync';

export const DATAVIS_QUALITY_STORAGE_KEY = 'dcs.dataVis.dataQualityMode';
export const DATA_QUALITY_ORIGINAL = 'original';
export const DATA_QUALITY_CLEAN = 'clean';

export function apiModeFromUiMode(uiMode) {
  return uiMode === DATA_QUALITY_CLEAN ? 'clean' : 'raw';
}

export function uiModeFromApiMode(apiMode) {
  return apiMode === 'clean' ? DATA_QUALITY_CLEAN : DATA_QUALITY_ORIGINAL;
}

export function readPersistedDataQualityMode() {
  if (typeof window === 'undefined') return DATA_QUALITY_ORIGINAL;
  try {
    const v = window.sessionStorage.getItem(DATAVIS_QUALITY_STORAGE_KEY);
    if (v === DATA_QUALITY_CLEAN || v === DATA_QUALITY_ORIGINAL) return v;
  } catch {
    /* ignore */
  }
  return DATA_QUALITY_ORIGINAL;
}

export function persistDataQualityMode(mode) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DATAVIS_QUALITY_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function publishDataQualityModeLocal(uiMode) {
  const next = uiMode === DATA_QUALITY_CLEAN ? DATA_QUALITY_CLEAN : DATA_QUALITY_ORIGINAL;
  persistDataQualityMode(next);
  if (typeof BroadcastChannel === 'undefined') return next;
  const channel = new BroadcastChannel(DATAVIS_CONFIGURATOR_SYNC_CHANNEL);
  channel.postMessage({ type: 'data_quality_mode', mode: next, at: Date.now() });
  channel.close();
  return next;
}

async function postDatasetModeToBase(baseUrl, apiMode) {
  const root = (baseUrl || '').replace(/\/$/, '');
  const url = root
    ? `${root}/api/configurator/dataVis/dataset-mode`
    : '/api/configurator/dataVis/dataset-mode';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: apiMode }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message = typeof detail === 'string' ? detail : detail?.error || res.statusText;
    throw new Error(message || 'dataset-mode request failed');
  }
  return data;
}

/**
 * Set server dataset (local backend + Maingear when Ideum) and notify other browser tabs.
 * @returns {Promise<string>} UI mode (original | clean)
 */
export async function applyDataVisDatasetMode(uiMode, machineRole = null) {
  const apiMode = apiModeFromUiMode(uiMode);
  await postDataVisDatasetMode(apiMode);
  if (machineRole?.isIdeum) {
    const peerBase = resolveMaingearPeerPostBase(machineRole);
    if (peerBase) {
      await postDatasetModeToBase(peerBase, apiMode);
    }
  }
  return publishDataQualityModeLocal(uiModeFromApiMode(apiMode));
}

export function subscribeDataQualityMode(onMode) {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(DATAVIS_CONFIGURATOR_SYNC_CHANNEL);
  channel.onmessage = (event) => {
    const msg = event?.data;
    if (msg?.type !== 'data_quality_mode' || !msg.mode) return;
    persistDataQualityMode(msg.mode);
    onMode(msg.mode);
  };
  return () => {
    try {
      channel.close();
    } catch {
      /* ignore */
    }
  };
}
