/** Isolated Ideum kiosk shell designs (lightweight early-return in App.js). */

export const REF200MW_CATALOG = 'ref200Mw';
export const DATA_CONFIGURATOR_CATALOG = 'dataConfigurator';

export function isRef200MwDesignName(name) {
  return typeof name === 'string' && /^Ref 200 MW$/i.test(name.trim());
}

export function isDataConfiguratorDesignName(name) {
  return typeof name === 'string' && /^Data Configurator$/i.test(name.trim());
}

export function isIdeumRef200MwOnlyConfig(data) {
  if (!data || typeof data !== 'object') return false;
  return data.ideumRef200MwOnly === true || isRef200MwDesignName(data.name);
}

export function isIdeumConfiguratorOnlyConfig(data) {
  if (!data || typeof data !== 'object') return false;
  return data.ideumConfiguratorOnly === true || isDataConfiguratorDesignName(data.name);
}

export function isIdeumHdAeroShellOnlyConfig(data) {
  if (!data || typeof data !== 'object') return false;
  return data.ideumHdAeroShellOnly === true;
}

function catalogLeaf(pathOrName) {
  if (pathOrName == null || pathOrName === '') return '';
  return String(pathOrName).replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';
}

export function isRef200MwCatalogRef(pathOrName) {
  return catalogLeaf(pathOrName) === 'ref200mw';
}

export function isDataConfiguratorCatalogRef(pathOrName) {
  const leaf = catalogLeaf(pathOrName);
  return leaf === 'dataconfigurator' || leaf === 'data_configurator';
}

/** Any isolated shell except full Ideum05. */
export function isIdeumKioskShellMode(mode) {
  return mode != null && mode !== '';
}
