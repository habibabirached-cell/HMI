/** Martin DOE study workbook selection (Waco vs Badger Hollow Creek). */

export const MARTIN_STUDY_WACO = 'waco';
export const MARTIN_STUDY_BADGER = 'badger_hollow_creek';

export const DATAVIS_MARTIN_STUDY_STORAGE_KEY = 'dcs.dataVis.martinStudy';

export const MARTIN_STUDY_CHANGED_EVENT = 'dcs:martin-study-changed';

export function martinStudyForStateId(stateId) {
  return stateId === 'wisconsin' ? MARTIN_STUDY_BADGER : MARTIN_STUDY_WACO;
}

export function normalizeMartinStudy(raw) {
  if (raw === MARTIN_STUDY_BADGER || raw === MARTIN_STUDY_WACO) return raw;
  return null;
}

export function persistMartinStudyForDataVis(study) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeMartinStudy(study);
  if (!normalized) return;
  try {
    window.sessionStorage.setItem(DATAVIS_MARTIN_STUDY_STORAGE_KEY, normalized);
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
  return readPersistedMartinStudy() ?? martinStudyForStateId(stateId);
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
    ?? martinStudyForStateId(payload?.stateId);
  const prev = readPersistedMartinStudy();
  if (prev === fromPayload) return fromPayload;
  persistMartinStudyForDataVis(fromPayload);
  notifyMartinStudyChanged(fromPayload);
  return fromPayload;
}
