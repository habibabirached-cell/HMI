/** Which on-disk design / catalog dir is loaded (Ideum07 vs Ideum08 kiosk generations). */

export const IDEUM07_CATALOG = 'ideum07';
export const IDEUM08_CATALOG = 'ideum08';

export function isIdeum07DesignName(name) {
  return typeof name === 'string' && /^Ideum07$/i.test(name.trim());
}

export function isIdeum08DesignName(name) {
  return typeof name === 'string' && /^Ideum08$/i.test(name.trim());
}

export function ideumKioskCatalogForDesignName(name) {
  if (isIdeum08DesignName(name)) return IDEUM08_CATALOG;
  if (isIdeum07DesignName(name)) return IDEUM07_CATALOG;
  return null;
}

export function isIdeumKioskCatalog(catalog) {
  const c = String(catalog || '').trim().toLowerCase();
  return c === IDEUM07_CATALOG || c === IDEUM08_CATALOG;
}

/** @deprecated use isIdeumKioskCatalog */
export const isIdeum07KioskCatalog = isIdeumKioskCatalog;

/** @deprecated use explicit isIdeum07DesignName / isIdeum08DesignName */
export function isIdeum07FamilyDesignName(name) {
  return isIdeum07DesignName(name) || isIdeum08DesignName(name);
}
