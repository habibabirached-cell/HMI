/** DataCenter — Ideum05 data-centers menu only (three panes, no root landing). */

export const DATA_CENTER_CATALOG = 'dataCenter';

export function isDataCenterDesignName(name) {
  return typeof name === 'string' && /^DataCenter$/i.test(name.trim());
}

export function isIdeumDataCenterOnlyConfig(data) {
  if (!data || typeof data !== 'object') return false;
  return data.ideumDataCenterOnly === true || isDataCenterDesignName(data.name);
}

/** Match display name or catalog folder (dataCenter). */
export function isDataCenterCatalogRef(pathOrName) {
  if (pathOrName == null || pathOrName === '') return false;
  const leaf = String(pathOrName).replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';
  return leaf === 'datacenter';
}
