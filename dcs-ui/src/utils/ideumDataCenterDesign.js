/** DataCenter — Ideum05 data-centers menu only (three panes, no root landing). */

export const DATA_CENTER_CATALOG = 'dataCenter';

export function isDataCenterDesignName(name) {
  return typeof name === 'string' && /^DataCenter$/i.test(name.trim());
}

export function isIdeumDataCenterOnlyConfig(data) {
  if (!data || typeof data !== 'object') return false;
  return data.ideumDataCenterOnly === true || isDataCenterDesignName(data.name);
}
