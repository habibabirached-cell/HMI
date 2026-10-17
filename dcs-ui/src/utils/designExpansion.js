/**
 * Independent compact/expanded toggles for tie breaker networks vs peripheral equipment.
 * `compact: true` = collapsed summary tiles; `compact: false` = full SLD / 3D detail.
 */

import {
  CANVAS_PANE_LOWER,
  CANVAS_PANE_UPPER,
  resolveComponentCanvasPane,
} from './canvasConf3Split';
import { isGasTurbineBank } from './gasTurbineBank';
import { isTieBreakerNetwork } from './tieBreakerNetwork';

export const DEFAULT_DESIGN_EXPANSION = {
  breakersCompact: true,
  peripheralsCompact: true,
  breakersCompactUpper: true,
  breakersCompactLower: true,
};

export function normalizeDesignExpansion(raw) {
  const legacyBreakers =
    typeof raw?.breakersCompact === 'boolean' ? raw.breakersCompact : true;
  const out = {
    ...DEFAULT_DESIGN_EXPANSION,
    breakersCompact: legacyBreakers,
    peripheralsCompact:
      typeof raw?.peripheralsCompact === 'boolean' ? raw.peripheralsCompact : true,
    breakersCompactUpper:
      typeof raw?.breakersCompactUpper === 'boolean'
        ? raw.breakersCompactUpper
        : legacyBreakers,
    breakersCompactLower:
      typeof raw?.breakersCompactLower === 'boolean'
        ? raw.breakersCompactLower
        : legacyBreakers,
  };
  return out;
}

/** P2R_18 lower mirror: independent tie collapse from upper baseline. */
export function designHasStackedBreakerExpansion(components) {
  return (
    Array.isArray(components) &&
    components.some((c) => c?.id === 'comp-mvups-exp-tie-network')
  );
}

function breakersCompactForTie(expansion, tie) {
  const exp = normalizeDesignExpansion(expansion);
  if (tie?.id === 'comp-mvups-exp-tie-network') return exp.breakersCompactLower;
  if (resolveComponentCanvasPane(tie) === CANVAS_PANE_LOWER) {
    return exp.breakersCompactLower;
  }
  if (resolveComponentCanvasPane(tie) === CANVAS_PANE_UPPER) {
    return exp.breakersCompactUpper;
  }
  return exp.breakersCompact;
}

/** Expansion toggles are available for every design (not limited to H-family names). */
export function designSupportsExpansionPanel(_designApiPath, _configName) {
  return true;
}

export function applyBreakersExpansionToComponents(components, expansion) {
  if (!components?.length) return components;
  return components.map((c) => {
    if (!isTieBreakerNetwork(c)) return c;
    const tg = c.properties?.tieGroup;
    if (!tg?.memberIds?.length) return c;
    const compact = breakersCompactForTie(expansion, c);
    return {
      ...c,
      properties: {
        ...c.properties,
        tieGroup: { ...tg, collapsed: compact ? true : false },
      },
    };
  });
}

/** @param {'upper'|'lower'} [pane] — when set, only update that stack's tie networks. */
export function applyBreakersExpansionForPane(components, expansion, pane) {
  if (!components?.length || !pane) {
    return applyBreakersExpansionToComponents(components, expansion);
  }
  const exp = normalizeDesignExpansion(expansion);
  const compact = pane === 'lower' ? exp.breakersCompactLower : exp.breakersCompactUpper;
  return components.map((c) => {
    if (!isTieBreakerNetwork(c)) return c;
    const tg = c.properties?.tieGroup;
    if (!tg?.memberIds?.length) return c;
    const cPane = resolveComponentCanvasPane(c);
    const target = pane === 'lower' ? CANVAS_PANE_LOWER : CANVAS_PANE_UPPER;
    if (cPane !== target) return c;
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
  let next = applyBreakersExpansionToComponents(components, exp);
  next = applyPeripheralsExpansionToComponents(next, exp.peripheralsCompact);
  return next;
}
