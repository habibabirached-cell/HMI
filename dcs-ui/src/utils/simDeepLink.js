/**
 * Shareable URLs for a loaded design + scenario (+ optional chart preset), e.g.
 * ?design=halfblock&sim=HalfBlock&config=demo1
 * Design-only bookmark: ?design=ideum07
 * "design" is the same path segment used by GET /api/designs/catalog/{design}/load (halfblock, archive/foo, …).
 */

export function designCatalogPathFromConfig(loadedConfig) {
  if (!loadedConfig?.name) return null;
  if (loadedConfig.csv_status?.use_design_dir) {
    return loadedConfig.csv_status.design_catalog_rel || loadedConfig.name;
  }
  return loadedConfig.name;
}

export function parseDesignOnlyDeepLink(search) {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  const design = (params.get('design') || '').trim();
  const sim = (params.get('sim') || '').trim();
  if (!design || sim) return null;
  return { design };
}

export function parseSimulationDeepLink(search) {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  const design = (params.get('design') || '').trim();
  const sim = (params.get('sim') || '').trim();
  const config = (params.get('config') || '').trim();
  if (!design || !sim) return null;
  return { design, sim, config: config || null };
}

/** Keep ?design= in the address bar; drop sim/config when switching designs or after scenario bootstrap. */
export function applyDesignToUrl(designApiPath, { keepSimulationParams = false } = {}) {
  if (typeof window === 'undefined' || !designApiPath) return;
  const params = new URLSearchParams(window.location.search);
  params.set('design', designApiPath);
  if (!keepSimulationParams) {
    params.delete('sim');
    params.delete('config');
  }
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
  window.history.replaceState(null, '', next);
}

/** After a sim deep link runs, leave ?design= for bookmarking but remove one-shot sim params. */
export function stripSimulationParamsFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('sim') && !params.has('config')) return;
  params.delete('sim');
  params.delete('config');
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
  window.history.replaceState(null, '', next);
}

/**
 * Returns the query string only (starts with ?) so callers can append to origin + pathname.
 */
export function buildSimulationDeepLinkQuery({ designApiPath, simulationId, namedConfig }) {
  if (!designApiPath || !simulationId) return '';
  const p = new URLSearchParams();
  p.set('design', designApiPath);
  p.set('sim', simulationId);
  if (namedConfig) p.set('config', namedConfig);
  return `?${p.toString()}`;
}

/** localStorage key for “last CSV tab + optional preset” when reopening a design (same browser). */
export function lastScenarioSessionStorageKey(designApiPath) {
  return `dcs:lastScenario:${designApiPath}`;
}
