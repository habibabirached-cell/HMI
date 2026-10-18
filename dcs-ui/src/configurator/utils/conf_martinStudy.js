/** Martin DOE study workbook selection (Waco vs Badger Hollow Creek). */

export const MARTIN_STUDY_WACO = 'waco';
export const MARTIN_STUDY_BADGER = 'badger_hollow_creek';

export const DATAVIS_MARTIN_STUDY_STORAGE_KEY = 'dcs.dataVis.martinStudy';
export const DATAVIS_MARTIN_STUDY_EPOCH_KEY = 'dcs.dataVis.martinStudyEpoch';

export const MARTIN_STUDY_CHANGED_EVENT = 'dcs:martin-study-changed';

export function martinStudyForStateId(stateId) {
  return stateId === 'wisconsin' ? MARTIN_STUDY_BADGER : MARTIN_STUDY_WACO;
}

/** Configurator location dropdown id for a Martin study workbook. */
export function stateIdForMartinStudy(study) {
  return study === MARTIN_STUDY_BADGER ? 'wisconsin' : 'texas';
}

export function normalizeMartinStudy(raw) {
  if (raw === MARTIN_STUDY_BADGER || raw === MARTIN_STUDY_WACO) return raw;
  return null;
}

export function readMartinStudyEpoch() {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = Number(window.sessionStorage.getItem(DATAVIS_MARTIN_STUDY_EPOCH_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}

function bumpMartinStudyEpoch() {
  const next = Math.max(Date.now(), readMartinStudyEpoch() + 1);
  try {
    window.sessionStorage.setItem(DATAVIS_MARTIN_STUDY_EPOCH_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function persistMartinStudyForDataVis(study) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeMartinStudy(study);
  if (!normalized) return;
  try {
    const prev = window.sessionStorage.getItem(DATAVIS_MARTIN_STUDY_STORAGE_KEY);
    window.sessionStorage.setItem(DATAVIS_MARTIN_STUDY_STORAGE_KEY, normalized);
    if (prev !== normalized) bumpMartinStudyEpoch();
  } catch {
    /* ignore */
  }
}

export function readPersistedMartinStudy() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DATAVIS_MARTIN_STUDY_STORAGE_KEY);
    return normalizeMartinStudy(raw);
  } catch {
    return null;
  }
}

export function effectiveMartinStudy(stateId) {
  if (stateId === 'wisconsin' || stateId === 'texas') {
    return martinStudyForStateId(stateId);
  }
  return readPersistedMartinStudy() ?? MARTIN_STUDY_WACO;
}

export function notifyMartinStudyChanged(study) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeMartinStudy(study);
  if (!normalized) return;
  window.dispatchEvent(
    new CustomEvent(MARTIN_STUDY_CHANGED_EVENT, { detail: { martinStudy: normalized } }),
  );
}

export function applyMartinStudyHandoff(payload) {
  const fromPayload = normalizeMartinStudy(payload?.martinStudy)
    ?? normalizeMartinStudy(payload?.inputs?.martinStudy)
    ?? martinStudyForStateId(payload?.stateId ?? payload?.inputs?.stateId);
  const prev = readPersistedMartinStudy();
  if (prev === fromPayload) return fromPayload;
  persistMartinStudyForDataVis(fromPayload);
  notifyMartinStudyChanged(fromPayload);
  return fromPayload;
}
