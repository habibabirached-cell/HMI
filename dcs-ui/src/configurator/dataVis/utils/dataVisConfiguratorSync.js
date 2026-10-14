/**
 * Dev MacBook: configurator (Inputs tab) → Data Exploration tab filter sync.
 * Same pattern as future Ideum → Maingear corridor bands over cluster WebSocket.
 */

import { isLocalClusterDev } from '../../utils/conf_configuratorCluster';
import { fetchMachineRole } from '../../../utils/clusterPeer';

export const DATAVIS_CONFIGURATOR_SYNC_CHANNEL = 'dcs-dataVis-configurator-filters-v1';
export const DATAVIS_CONFIGURATOR_RANGES_STORAGE_KEY = 'dcs.dataVis.lastConfiguratorRanges';
export const DATAVIS_CONFIGURATOR_INPUTS_STORAGE_KEY = 'dcs.dataVis.lastConfiguratorInputs';

export const CONFIGURATOR_SYNC_COLUMNS = {
  cfe: 'Carbon Free Energy (%)',
  loadCompliance: 'Year 1 Load Compliance (%)',
  solar: 'Solar AC Nameplate (MWac)',
  wind: 'Wind Nameplate (MWac)',
};

/** Map Ideum configurator inputs → dataVis histogram range map (Waco column keys). */
export function configuratorInputsToDataVisRanges(inputs) {
  if (!inputs) return {};
  const minCfePct = Number(inputs.minCfePercent ?? inputs.cfeTarget ?? 0);
  const maxCfePct = Number(inputs.maxCfePercent ?? 100);
  const rel = Number(inputs.reliabilityTarget ?? 99.99);
  const minSolar = Number(inputs.minSolarMW ?? 0);
  const maxSolar = Number(inputs.maxSolarMW ?? 4000);
  const minWind = Number(inputs.minWindMW ?? 0);
  const maxWind = Number(inputs.maxWindMW ?? 3000);

  const cfeLo = Math.min(minCfePct, maxCfePct) / 100;
  const cfeHi = Math.max(minCfePct, maxCfePct) / 100;

  return {
    [CONFIGURATOR_SYNC_COLUMNS.cfe]: { min: cfeLo, max: cfeHi },
    [CONFIGURATOR_SYNC_COLUMNS.loadCompliance]: { min: rel, max: 100 },
    [CONFIGURATOR_SYNC_COLUMNS.solar]: {
      min: Math.min(minSolar, maxSolar),
      max: Math.max(minSolar, maxSolar),
    },
    [CONFIGURATOR_SYNC_COLUMNS.wind]: {
      min: Math.min(minWind, maxWind),
      max: Math.max(minWind, maxWind),
    },
  };
}

export async function shouldSyncConfiguratorToDataVis() {
  if (typeof window === 'undefined') return false;
  try {
    const role = await fetchMachineRole();
    if (role?.isIdeum) return true;
  } catch {
    /* dev fallback below */
  }
  if (!isLocalClusterDev()) return false;
  try {
    const role = await fetchMachineRole();
    return Boolean(role?.isDev) || isLocalClusterDev();
  } catch {
    return isLocalClusterDev();
  }
}

export function persistConfiguratorRangesForDataVis(ranges) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      DATAVIS_CONFIGURATOR_RANGES_STORAGE_KEY,
      JSON.stringify({ ranges, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function readPersistedConfiguratorRanges() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DATAVIS_CONFIGURATOR_RANGES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.ranges ?? null;
  } catch {
    return null;
  }
}

export function persistConfiguratorInputsForDataVis(inputs, uiMode) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      DATAVIS_CONFIGURATOR_INPUTS_STORAGE_KEY,
      JSON.stringify({ inputs, uiMode, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function readPersistedConfiguratorInputs() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DATAVIS_CONFIGURATOR_INPUTS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Configurator Inputs → Explore Data / Data Exploration (ranges + full inputs for Martin). */
export function publishConfiguratorExploreSync(inputs, uiMode) {
  const ranges = configuratorInputsToDataVisRanges(inputs);
  persistConfiguratorRangesForDataVis(ranges);
  persistConfiguratorInputsForDataVis(inputs, uiMode);
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(DATAVIS_CONFIGURATOR_SYNC_CHANNEL);
    channel.postMessage({
      type: 'configurator_explore_sync',
      ranges,
      inputs,
      uiMode,
      at: Date.now(),
    });
    channel.close();
  }
  return { ranges, inputs, uiMode };
}

/** @deprecated use publishConfiguratorExploreSync */
export function publishConfiguratorFiltersToDataVis(inputs) {
  return publishConfiguratorExploreSync(inputs, inputs?.uiMode);
}

/** Data Exploration tab: listen for configurator updates. */
export function subscribeConfiguratorFiltersToDataVis(onRanges) {
  return subscribeConfiguratorExploreSync((payload) => {
    if (payload?.ranges) onRanges(payload.ranges);
  });
}

/** Explore Data + Data Exploration: corridor bands and Martin inputs. */
export function subscribeConfiguratorExploreSync(onSync) {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(DATAVIS_CONFIGURATOR_SYNC_CHANNEL);
  channel.onmessage = (event) => {
    const msg = event?.data;
    if (msg?.type === 'configurator_filters' && msg.ranges) {
      persistConfiguratorRangesForDataVis(msg.ranges);
      onSync({ ranges: msg.ranges });
      return;
    }
    if (msg?.type !== 'configurator_explore_sync') return;
    if (msg.ranges) persistConfiguratorRangesForDataVis(msg.ranges);
    if (msg.inputs) persistConfiguratorInputsForDataVis(msg.inputs, msg.uiMode);
    onSync({
      ranges: msg.ranges,
      inputs: msg.inputs,
      uiMode: msg.uiMode,
    });
  };
  return () => {
    try {
      channel.close();
    } catch {
      /* ignore */
    }
  };
}
