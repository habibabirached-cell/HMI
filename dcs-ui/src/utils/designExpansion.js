/**
 * Independent compact/expanded toggles for tie breaker networks vs peripheral equipment.
 * `compact: true` = collapsed summary tiles; `compact: false` = full SLD / 3D detail.
 */

import { isGasTurbineBank } from './gasTurbineBank';
import { isTieBreakerNetwork } from './tieBreakerNetwork';

export const DEFAULT_DESIGN_EXPANSION = {
  breakersCompact: true,
  peripheralsCompact: true,
};

export function normalizeDesignExpansion(raw) {
  const out = { ...DEFAULT_DESIGN_EXPANSION };
  if (!raw || typeof raw !== 'object') return out;
  if (typeof raw.breakersCompact === 'boolean') out.breakersCompact = raw.breakersCompact;
  if (typeof raw.peripheralsCompact === 'boolean') {
    out.peripheralsCompact = raw.peripheralsCompact;
  }
  return out;
}

/** Habib-family designs use the dual middle tie networks + peripheral banks. */
export function designSupportsExpansionPanel(designApiPath, configName) {
  const key = String(designApiPath || configName || '')
    .trim()
    .toLowerCase();
  return key === 'habib' || key === 'habib2' || key.endsWith('/habib') || key.endsWith('/habib2');
}

export function applyBreakersExpansionToComponents(components, compact) {
  if (!components?.length) return components;
  return components.map((c) => {
    if (!isTieBreakerNetwork(c)) return c;
    const tg = c.properties?.tieGroup;
    if (!tg?.memberIds?.length) return c;
    return {
      ...c,
      properties: {
        ...c.properties,
        tieGroup: { ...tg, collapsed: compact ? true : false },
      },
    };
  });
}

export function applyPeripheralsExpansionToComponents(components, compact) {
  if (!components?.length) return components;
  return components.map((c) => {
    if (!isGasTurbineBank(c)) return c;
    const g = c.properties?.gasTurbineGroup;
    if (!g?.memberIds?.length) return c;
    return {
      ...c,
      properties: {
        ...c.properties,
        gasTurbineGroup: { ...g, collapsed: compact ? true : false },
      },
    };
  });
}

export function applyDesignExpansionToComponents(components, expansion) {
  const exp = normalizeDesignExpansion(expansion);
  let next = applyBreakersExpansionToComponents(components, exp.breakersCompact);
  next = applyPeripheralsExpansionToComponents(next, exp.peripheralsCompact);
  return next;
}
