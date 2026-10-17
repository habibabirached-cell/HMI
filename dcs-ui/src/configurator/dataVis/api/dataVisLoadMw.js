import {
  DEFAULT_WACO_LOAD_TIER,
  normalizeWacoLoadTier,
} from '../../utils/conf_wacoLoadTier';

/** Set only by Ideum 200MW / 1000MW buttons — not cleared by explore-sync corridor updates. */
export const DATAVIS_WACO_LOAD_TIER_STORAGE_KEY = 'dcs.dataVis.wacoLoadTier';

export const WACO_LOAD_MW_URL_PARAM = 'wacoLoadMW';

export const WACO_LOAD_TIER_CHANGED_EVENT = 'dcs:waco-load-tier-changed';

export function persistWacoLoadTierForDataVis(loadMW) {
  if (typeof window === 'undefined') return;
  const tier = normalizeWacoLoadTier(loadMW);
  if (tier == null) return;
  try {
    window.sessionStorage.setItem(DATAVIS_WACO_LOAD_TIER_STORAGE_KEY, String(tier));
  } catch {
    /* ignore */
  }
}

export function readPersistedWacoLoadTier() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DATAVIS_WACO_LOAD_TIER_STORAGE_KEY);
    if (raw == null || raw === '') return null;
    return normalizeWacoLoadTier(Number(raw));
  } catch {
    return null;
  }
}

/** Explicit tier from load buttons, or null if user has never picked 200/1000. */
export function readDataVisLoadMwTier() {
  return readPersistedWacoLoadTier();
}

/** Tier on every dataVis / preload call — 200 MW until a load button picks 1000. */
export function effectiveDataVisLoadMwTier() {
  return readPersistedWacoLoadTier() ?? DEFAULT_WACO_LOAD_TIER;
}

/** Ideum → Maingear remote-command payload (separate browser session on wall PC). */
export function wacoLoadTierHandoffPayload() {
  return { wacoLoadMW: effectiveDataVisLoadMwTier() };
}

/** Apply tier from cluster remote-command payload on Maingear UI. */
export function applyWacoLoadTierHandoff(payload) {
  const tier = normalizeWacoLoadTier(payload?.wacoLoadMW ?? payload?.loadMW);
  if (tier == null) return effectiveDataVisLoadMwTier();
  const prev = readPersistedWacoLoadTier();
  if (prev === tier) return tier;
  persistWacoLoadTierForDataVis(tier);
  notifyWacoLoadTierChanged(tier);
  return tier;
}

export function inputsWithEffectiveWacoLoadTier(inputs) {
  if (!inputs || typeof inputs !== 'object') return inputs;
  return { ...inputs, loadMW: effectiveDataVisLoadMwTier() };
}

/** Remote command payload: Waco tier + corridor filters for Maingear UI. */
export function buildExploreRemoteCommandPayload(exploreSyncPayload) {
  return {
    wacoLoadMW: effectiveDataVisLoadMwTier(),
    exploreSync: exploreSyncPayload,
  };
}

/** Persist tier and reload — same cold-start path as opening the app with that default. */
export function reloadPageWithWacoLoadTier(loadMW) {
  if (typeof window === 'undefined') return;
  const tier = normalizeWacoLoadTier(loadMW);
  if (tier == null) return;
  persistWacoLoadTierForDataVis(tier);
  const url = new URL(window.location.href);
  url.searchParams.set(WACO_LOAD_MW_URL_PARAM, String(tier));
  window.location.assign(url.toString());
}

/** Call once on configurator mount after reload from a load button. */
export function hydrateWacoLoadTierFromUrl() {
  if (typeof window === 'undefined') return effectiveDataVisLoadMwTier();
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(WACO_LOAD_MW_URL_PARAM);
    if (raw == null || raw === '') return effectiveDataVisLoadMwTier();
    const tier = normalizeWacoLoadTier(Number(raw));
    if (tier == null) return effectiveDataVisLoadMwTier();
    persistWacoLoadTierForDataVis(tier);
    url.searchParams.delete(WACO_LOAD_MW_URL_PARAM);
    const qs = url.searchParams.toString();
    const next = `${url.pathname}${qs ? `?${qs}` : ''}${url.hash || ''}`;
    window.history.replaceState(null, '', next);
    return tier;
  } catch {
    return effectiveDataVisLoadMwTier();
  }
}

export function withDataVisLoadMw(body = {}) {
  return { ...body, loadMW: effectiveDataVisLoadMwTier() };
}

export function dataVisLoadMwQueryString() {
  return `loadMW=${encodeURIComponent(String(effectiveDataVisLoadMwTier()))}`;
}
export function notifyWacoLoadTierChanged(loadMW) {
  if (typeof window === 'undefined') return;
  const tier = normalizeWacoLoadTier(loadMW);
  if (tier == null) return;
  window.dispatchEvent(
    new CustomEvent(WACO_LOAD_TIER_CHANGED_EVENT, { detail: { loadMW: tier } }),
  );
}

/** DevTools: localStorage.setItem('dcs.debug.wacoTier','1') then reload. */
export function logWacoTierDebugContext(label = 'waco-tier') {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage?.getItem('dcs.debug.wacoTier') !== '1') return;
  } catch {
    return;
  }
  console.info(`[${label}]`, {
    sessionTier: readPersistedWacoLoadTier(),
    effectiveTier: effectiveDataVisLoadMwTier(),
  });
}

