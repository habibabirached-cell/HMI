/**
 * Place external canvas titles above or below the equipment box (best legibility).
 */

const PREFER_BELOW_TYPES = new Set([
  'ups',
  'it-rack-load',
  'bess-50mw',
  'bess-30mw',
  'bess',
  'breaker-bess',
  'bess-xfmr',
]);

/** @returns {'above' | 'below'} */
export function resolveExternalLabelPlacement(component) {
  const ov = component?.visualOverrides?.externalLabelPlacement;
  if (ov === 'above' || ov === 'below') return ov;

  const y = Number(component?.position?.y) || 0;
  const type = component?.type || '';

  if (type === 'auxiliary-loads-bess' || type === 'auxiliary-loads') {
    return y < 400 ? 'above' : 'below';
  }

  if (PREFER_BELOW_TYPES.has(type)) {
    return y >= 420 ? 'below' : 'above';
  }

  if (type === 'bus-hv-vertical') {
    return 'above';
  }

  return 'above';
}

export function shouldShowExternalPrimaryLabel(component) {
  if (!component) return false;
  const text = String(
    component.properties?.primaryLabel != null
      ? component.properties.primaryLabel
      : component.name || '',
  ).trim();
  if (!text) return false;
  if (component.type === 'bus-knot') return false;
  return true;
}
