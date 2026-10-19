import {
  DEFAULT_WACO_LOAD_TIER,
  normalizeWacoLoadTier,
} from '../../utils/conf_wacoLoadTier';
import {
  MARTIN_STUDY_BADGER,
  effectiveMartinStudy,
  martinStudyForStateId,
  normalizeMartinStudy,
  persistMartinStudyForDataVis,
  readMartinStudyEpoch,
  readPersistedMartinStudy,
  stateIdForMartinStudy,
} from '../../utils/conf_martinStudy';

/** Set only by Ideum 200MW / 1000MW buttons — not cleared by explore-sync corridor updates. */
export const DATAVIS_WACO_LOAD_TIER_STORAGE_KEY = 'dcs.dataVis.wacoLoadTier';

export const WACO_LOAD_MW_URL_PARAM = 'wacoLoadMW';
export const MARTIN_STUDY_URL_PARAM = 'martinStudy';

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

/** Tier on every dataVis / preload call. Wisconsin with no button yet stays on 200 MW. */
export function effectiveDataVisLoadMwTier(stateId) {
  const persisted = readPersistedWacoLoadTier();
  if (persisted != null) return persisted;
  if (effectiveMartinStudy(stateId) === MARTIN_STUDY_BADGER) return 200;
  return DEFAULT_WACO_LOAD_TIER;
}

export function clearPersistedWacoLoadTier() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(DATAVIS_WACO_LOAD_TIER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Ideum → Maingear remote-command payload (separate browser session on wall PC). */
export function wacoLoadTierHandoffPayload(stateId) {
  return {
    wacoLoadMW: effectiveDataVisLoadMwTier(stateId),
    martinStudy: effectiveMartinStudy(stateId),
    stateId,
  };
}

/** Apply tier from cluster remote-command payload on Maingear UI. */
export function applyWacoLoadTierHandoff(payload) {
  const stateId = payload?.stateId;
  if (payload?.martinStudy || stateId) {
    persistMartinStudyForDataVis(
      payload?.martinStudy ?? effectiveMartinStudy(stateId),
    );
  }
  const tier = normalizeWacoLoadTier(payload?.wacoLoadMW ?? payload?.loadMW);
  if (tier == null) return effectiveDataVisLoadMwTier(stateId);
  const prev = readPersistedWacoLoadTier();
  if (prev === tier) return tier;
  persistWacoLoadTierForDataVis(tier);
  notifyWacoLoadTierChanged(tier);
  return tier;
}

export function inputsWithEffectiveWacoLoadTier(inputs) {
  if (!inputs || typeof inputs !== 'object') return inputs;
  const stateId = inputs.stateId || stateIdForMartinStudy(readPersistedMartinStudy());
  const martinStudy = martinStudyForStateId(stateId);
  const requested = normalizeWacoLoadTier(inputs.loadMW);
  return {
    ...inputs,
    stateId,
    loadMW: requested ?? effectiveDataVisLoadMwTier(stateId),
    martinStudy,
  };
}

/** Remote command payload: Waco tier + corridor filters for Maingear UI. */
export function buildExploreRemoteCommandPayload(exploreSyncPayload) {
  const stateId = exploreSyncPayload?.inputs?.stateId;
  return {
    wacoLoadMW: effectiveDataVisLoadMwTier(stateId),
    martinStudy: effectiveMartinStudy(stateId),
    stateId,
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
/** Call on configurator / explore mount when opened with ?martinStudy=badger_hollow_creek. */
export function hydrateMartinStudyFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(MARTIN_STUDY_URL_PARAM);
    const study = normalizeMartinStudy(raw);
    if (!study) return null;
    persistMartinStudyForDataVis(study);
    return study;
  } catch {
    return null;
  }
}

export function hydrateWacoLoadTierFromUrl() {
  if (typeof window === 'undefined') return effectiveDataVisLoadMwTier();
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(WACO_LOAD_MW_URL_PARAM);
    if (raw == null || raw === '') return effectiveDataVisLoadMwTier();
    const tier = normalizeWacoLoadTier(Number(raw));
    if (tier == null) return effectiveDataVisLoadMwTier();
    persistWacoLoadTierForDataVis(tier);
    return tier;
  } catch {
    return effectiveDataVisLoadMwTier();
  }
}

/** Same key as DATAVIS_CONFIGURATOR_INPUTS_STORAGE_KEY. Read here to avoid an import cycle. */
const CONFIGURATOR_INPUTS_STORAGE_KEY = 'dcs.dataVis.lastConfiguratorInputs';

function technologyCapexForDataVis(body) {
  if (body?.technologyCapex && typeof body.technologyCapex === 'object') {
    return body.technologyCapex;
  }
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(CONFIGURATOR_INPUTS_STORAGE_KEY);
    if (!raw) return undefined;
    const stored = JSON.parse(raw)?.inputs?.technologyCapex;
    if (stored && typeof stored === 'object') return stored;
  } catch {
    /* ignore */
  }
  return undefined;
}

export function withDataVisLoadMw(body = {}, stateId) {
  const study = effectiveMartinStudy(stateId ?? body.stateId);
  const technologyCapex = technologyCapexForDataVis(body);
  return {
    ...body,
    loadMW: effectiveDataVisLoadMwTier(stateId ?? body.stateId),
    martinStudy: study,
    martinStudyEpoch: readMartinStudyEpoch(),
    ...(technologyCapex ? { technologyCapex } : {}),
  };
}

export function dataVisLoadMwQueryString(stateId) {
  const tier = effectiveDataVisLoadMwTier(stateId);
  const study = effectiveMartinStudy(stateId);
  const epoch = readMartinStudyEpoch();
  return `loadMW=${encodeURIComponent(String(tier))}&martinStudy=${encodeURIComponent(study)}&martinStudyEpoch=${encodeURIComponent(String(epoch))}`;
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

