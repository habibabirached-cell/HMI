/** Ideum06 — trackpad-only design (no nav, canvas, or 3D). */

export const IDEUM05_CATALOG = 'ideum05';
export const IDEUM06_CATALOG = 'ideum06';

export function isIdeum06DesignName(name) {
  return typeof name === 'string' && /^Ideum06$/i.test(name.trim());
}

export function isIdeumTrackpadOnlyConfig(data) {
  if (!data || typeof data !== 'object') return false;
  return data.ideumTrackpadOnly === true || isIdeum06DesignName(data.name);
}
