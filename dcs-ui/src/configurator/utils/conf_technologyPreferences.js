import { CONFIGURATOR_TECHNOLOGIES } from '../../configuratorData/conf_technologies';

export const TECH_PREFERENCE = {
  MUST: 'must',
  SHOULD: 'should',
  IF_NECESSARY: 'ifNecessary',
};

const ALL_TECH_IDS = CONFIGURATOR_TECHNOLOGIES.map((t) => t.id);

/** Default: every technology is available to the optimizer if necessary. */
export function createDefaultTechnologyPreferences() {
  return Object.fromEntries(
    ALL_TECH_IDS.map((id) => [id, TECH_PREFERENCE.IF_NECESSARY]),
  );
}

export function normalizeTechnologyPreferences(raw) {
  const base = createDefaultTechnologyPreferences();
  if (!raw || typeof raw !== 'object') return base;
  for (const id of ALL_TECH_IDS) {
    const v = raw[id];
    if (v === TECH_PREFERENCE.MUST || v === TECH_PREFERENCE.SHOULD) {
      base[id] = v;
    }
  }
  return base;
}

export function isTechnologyElevated(preference) {
  return preference === TECH_PREFERENCE.MUST || preference === TECH_PREFERENCE.SHOULD;
}

/** All technologies are always candidates; preferences add must/should hints. */
export function technologyIdsFromPreferences(preferences) {
  return ALL_TECH_IDS;
}

export function setTechnologyPreference(preferences, techId, targetPref) {
  const next = { ...normalizeTechnologyPreferences(preferences) };
  if (targetPref === TECH_PREFERENCE.MUST) {
    next[techId] = next[techId] === TECH_PREFERENCE.MUST
      ? TECH_PREFERENCE.IF_NECESSARY
      : TECH_PREFERENCE.MUST;
  } else if (targetPref === TECH_PREFERENCE.SHOULD) {
    next[techId] = next[techId] === TECH_PREFERENCE.SHOULD
      ? TECH_PREFERENCE.IF_NECESSARY
      : TECH_PREFERENCE.SHOULD;
  }
  return next;
}

export function countElevatedTechnologies(preferences) {
  return Object.values(normalizeTechnologyPreferences(preferences))
    .filter(isTechnologyElevated).length;
}
