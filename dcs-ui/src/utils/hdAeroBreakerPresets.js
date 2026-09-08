import { isInteractiveBreakerOpen } from './openBreakerConnections';

/** Upper CB (Aero path) in HD_Aero collapsed one-line. */
export const HD_AERO_CB_A_ID = 'comp-aero-stub-cb';

/** Lower CB (Load path) in HD_Aero collapsed one-line. */
export const HD_AERO_CB_B_ID = 'comp-load2-stub-cb';

export const HD_AERO_ENSEMBLE_ID = 'all';

export const HD_AERO_DEFAULT_PRESET = 'HD';

/** Green/closed = electrically on; orange/open = off. */
export function isHdAeroBreakerClosed(component) {
  return component != null && !isInteractiveBreakerOpen(component);
}

/**
 * Map the two interactive CB states to a named ensemble chart preset.
 * @param {object[]} components — canvas components after the toggle
 * @param {string} clickedId — breaker that was just clicked
 * @returns {string|null}
 */
export function resolveHdAeroPresetFromBreakers(components, clickedId) {
  const cbA = (components || []).find((c) => c.id === HD_AERO_CB_A_ID);
  const cbB = (components || []).find((c) => c.id === HD_AERO_CB_B_ID);
  if (!cbA || !cbB) return null;

  const aOn = isHdAeroBreakerClosed(cbA);
  const bOn = isHdAeroBreakerClosed(cbB);

  if (!aOn && !bOn) return 'HD';
  if (aOn && !bOn) return 'HD-A';
  if (!aOn && bOn) return 'HD-L';
  if (aOn && bOn) {
    if (clickedId === HD_AERO_CB_A_ID) return 'HD-Load-Aero';
    if (clickedId === HD_AERO_CB_B_ID) return 'HD-Aero-Load';
    return 'HD-Load-Aero';
  }
  return null;
}

/** Force both HD_Aero stub breakers open (orange/off). */
export function hdAeroBreakersOpenUpdate(components) {
  return (components || []).map((c) =>
    c.id === HD_AERO_CB_A_ID || c.id === HD_AERO_CB_B_ID
      ? { ...c, status: 'open', initialSimStatus: 'open' }
      : c,
  );
}
