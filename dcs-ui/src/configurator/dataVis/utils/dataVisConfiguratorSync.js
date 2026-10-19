/**
 * Dev MacBook: configurator (Inputs tab) → Data Exploration tab filter sync.
 * Same pattern as future Ideum → Maingear corridor bands over cluster WebSocket.
 */

import { isLocalClusterDev } from '../../utils/conf_configuratorCluster';
import { normalizeWacoLoadTier } from '../../utils/conf_wacoLoadTier';
import { fetchMachineRole } from '../../../utils/clusterPeer';

export const DATAVIS_CONFIGURATOR_SYNC_CHANNEL = 'dcs-dataVis-configurator-filters-v1';
/** Same-page copy of an explore sync. BroadcastChannel does not echo to the sender. */
export const CONFIGURATOR_EXPLORE_SYNC_EVENT = 'dcs:configurator-explore-sync';
export const DATAVIS_CONFIGURATOR_RANGES_STORAGE_KEY = 'dcs.dataVis.lastConfiguratorRanges';
export const DATAVIS_CONFIGURATOR_INPUTS_STORAGE_KEY = 'dcs.dataVis.lastConfiguratorInputs';
/** Dev new-tab / Maingear remote — localStorage (sessionStorage is per-tab). */
export const EXPLORE_SYNC_HANDOFF_STORAGE_KEY = 'dcs.configurator.exploreSyncHandoff';

export const CONFIGURATOR_SYNC_COLUMNS = {
  cfe: 'Carbon Free Energy (%)',
  loadCompliance: 'Year 1 Load Compliance (%)',
  solar: 'Solar AC Nameplate (MWac)',
  wind: 'Wind Nameplate (MWac)',
};

/** Merge corridor + parallel brushes into Martin Waco filter inputs (lowest LCOE case). */
export function martinInputsFromExploreFilters(baseInputs, ranges, parcoordsRanges) {
  if (!baseInputs || typeof baseInputs !== 'object') return baseInputs;

  const merged = { ...baseInputs };
  const bandFor = (col) => parcoordsRanges?.[col] ?? ranges?.[col];

  const cfe = bandFor(CONFIGURATOR_SYNC_COLUMNS.cfe);
  if (cfe && (cfe.min != null || cfe.max != null)) {
    const lo = Math.min(cfe.min ?? cfe.max, cfe.max ?? cfe.min);
    const hi = Math.max(cfe.min ?? cfe.max, cfe.max ?? cfe.min);
    const toPct = lo <= 1.0001 && hi <= 1.0001 ? 100 : 1;
    merged.minCfePercent = lo * toPct;
    merged.maxCfePercent = hi * toPct;
    merged.cfeTarget = merged.minCfePercent;
  }

  const load = bandFor(CONFIGURATOR_SYNC_COLUMNS.loadCompliance);
  if (load && load.min != null) {
    const lo = Math.min(load.min, load.max ?? load.min);
    const hi = Math.max(load.min, load.max ?? load.min);
    // Waco histogram uses 0–1; Ideum uptime slider uses 0–100. Minimum uptime = lower handle.
    const toPct = lo <= 1.0001 && hi <= 1.0001 ? 100 : 1;
    merged.reliabilityTarget = lo * toPct;
  }

  const solar = bandFor(CONFIGURATOR_SYNC_COLUMNS.solar);
  if (solar && (solar.min != null || solar.max != null)) {
    merged.minSolarMW = Math.min(solar.min ?? solar.max, solar.max ?? solar.min);
    merged.maxSolarMW = Math.max(solar.min ?? solar.max, solar.max ?? solar.min);
  }

  const wind = bandFor(CONFIGURATOR_SYNC_COLUMNS.wind);
  if (wind && (wind.min != null || wind.max != null)) {
    merged.minWindMW = Math.min(wind.min ?? wind.max, wind.max ?? wind.min);
    merged.maxWindMW = Math.max(wind.min ?? wind.max, wind.max ?? wind.min);
  }

  return merged;
}

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
    if (role?.isIdeum || role?.isMaingear) return true;
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

/** Apply explore_data_sync payload (cluster WS or catch-up GET). */
export function exploreSyncPayloadFromMessage(msg) {
  if (!msg || msg.type !== 'explore_data_sync') return null;
  return {
    ranges: msg.ranges,
    inputs: msg.inputs,
    uiMode: msg.uiMode,
  };
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

/** Never persist CONFIGURATOR_DEFAULT loadMW (1000) — only explicit 200|1000 load buttons. */
export function sanitizeConfiguratorInputsForDataVis(inputs) {
  if (!inputs || typeof inputs !== 'object') return inputs;
  const tier = normalizeWacoLoadTier(inputs.loadMW);
  if (tier == null) {
    const { loadMW: _drop, ...rest } = inputs;
    return rest;
  }
  return { ...inputs, loadMW: tier };
}

export function persistConfiguratorInputsForDataVis(inputs, uiMode) {
  if (typeof window === 'undefined') return;
  try {
    const clean = sanitizeConfiguratorInputsForDataVis(inputs);
    window.sessionStorage.setItem(
      DATAVIS_CONFIGURATOR_INPUTS_STORAGE_KEY,
      JSON.stringify({ inputs: clean, uiMode, at: Date.now() }),
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
    const parsed = JSON.parse(raw);
    if (parsed?.inputs) {
      parsed.inputs = sanitizeConfiguratorInputsForDataVis(parsed.inputs);
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Configurator Inputs → Explore Data / Data Exploration (ranges + full inputs for Martin). */
export function publishConfiguratorExploreSync(inputs, uiMode) {
  const ranges = configuratorInputsToDataVisRanges(inputs);
  const cleanInputs = sanitizeConfiguratorInputsForDataVis(inputs);
  persistConfiguratorRangesForDataVis(ranges);
  persistConfiguratorInputsForDataVis(cleanInputs, uiMode);
  const at = Date.now();
  const handoff = { ranges, inputs: cleanInputs, uiMode, at };
  try {
    window.localStorage.setItem(EXPLORE_SYNC_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
  } catch {
    /* ignore */
  }
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(DATAVIS_CONFIGURATOR_SYNC_CHANNEL);
    channel.postMessage({ type: 'configurator_explore_sync', ...handoff });
    channel.close();
  }
  return { ranges, inputs: cleanInputs, uiMode, at };
}

export function stashExploreSyncHandoffForNewTab(inputs, uiMode) {
  const payload = publishConfiguratorExploreSync(inputs, uiMode);
  if (typeof window === 'undefined') return payload;
  try {
    window.localStorage.setItem(
      EXPLORE_SYNC_HANDOFF_STORAGE_KEY,
      JSON.stringify({ ...payload, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
  return payload;
}

export function consumeExploreSyncHandoff() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EXPLORE_SYNC_HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(EXPLORE_SYNC_HANDOFF_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (parsed?.inputs) {
      parsed.inputs = sanitizeConfiguratorInputsForDataVis(parsed.inputs);
    }
    applyExploreSyncHandoff(parsed);
    return parsed;
  } catch {
    return null;
  }
}

/** First paint on Explore tab (new browser tab): localStorage handoff → session + React state. */
export function readInitialExploreSyncState(isExploreWall) {
  if (typeof window === 'undefined') {
    return { ranges: {}, ideumWallInputs: null, wallUiMode: null };
  }
  const handoff = consumeExploreSyncHandoff();
  const ranges = handoff?.ranges || readPersistedConfiguratorRanges() || {};
  if (!isExploreWall) {
    return { ranges, ideumWallInputs: null, wallUiMode: null };
  }
  const stored = readPersistedConfiguratorInputs();
  return {
    ranges,
    ideumWallInputs: stored?.inputs ?? handoff?.inputs ?? null,
    wallUiMode: stored?.uiMode ?? handoff?.uiMode ?? null,
  };
}

/** Apply corridor sync on this browser (Maingear after remote command, or new tab). */
export function applyExploreSyncHandoff(handoff) {
  if (!handoff) return;
  const { ranges, inputs, uiMode } = handoff;
  if (ranges) persistConfiguratorRangesForDataVis(ranges);
  if (inputs) persistConfiguratorInputsForDataVis(inputs, uiMode);
  if (typeof BroadcastChannel === 'undefined') return;
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
  const apply = (msg) => {
    if (!msg) return;
    if (msg.type === 'configurator_filters' && msg.ranges) {
      persistConfiguratorRangesForDataVis(msg.ranges);
      onSync({ ranges: msg.ranges });
      return;
    }
    if (msg.type && msg.type !== 'configurator_explore_sync' && !msg.inputs && !msg.ranges) return;
    if (msg.type === 'configurator_explore_sync' || msg.inputs || msg.ranges) {
      if (msg.ranges) persistConfiguratorRangesForDataVis(msg.ranges);
      if (msg.inputs) persistConfiguratorInputsForDataVis(msg.inputs, msg.uiMode);
      onSync({
        ranges: msg.ranges,
        inputs: msg.inputs,
        uiMode: msg.uiMode,
        at: msg.at,
      });
    }
  };

  let channel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(DATAVIS_CONFIGURATOR_SYNC_CHANNEL);
    channel.onmessage = (event) => apply(event?.data);
  }

  const onStorage = (event) => {
    if (event.key !== EXPLORE_SYNC_HANDOFF_STORAGE_KEY || !event.newValue) return;
    try {
      apply(JSON.parse(event.newValue));
    } catch {
      /* ignore */
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    try {
      channel?.close();
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}
