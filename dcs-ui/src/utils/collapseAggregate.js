/**
 * Collapsed aggregate surfaces: double-click expands to reveal detailed member components.
 *
 * Current surfaces in statcom03-style designs:
 * - `tie-breaker-network` card (tieGroup.collapsed)
 * - `gas-turbine-3d` bank preview (gasTurbineGroup.previewMemberId)
 * - `auxiliary-loads-bess` bank companion (gasTurbineGroup.collapseCompanionMemberId)
 * - extra collapse tiles (gasTurbineGroup.collapseExtraMemberIds — BESS, GFMe, …)
 * - `gfme-statcom` collapse tiles use g2x2 GLTF preview (isGFMeCollapseAggregateSurface)
 * - `bess-50mw` / `bess-30mw` / `bess` collapse tiles use Bess.c.glb; `mvups-3d` uses mvups.c.glb
 */

import { isTieBreakerNetwork, isTieNetworkCollapsed } from './tieBreakerNetwork';
import {
  isGasTurbineBank,
  isGasTurbineBankCollapsed,
  getGasTurbineBankCollapseSurfaceMemberIds,
} from './gasTurbineBank';
import { BESS_COLLAPSE_3D_TYPES } from './bess3dLayout';
import { isWindOctCollapseSurfaceComponent } from './windOctPlant';

/** Aggregate block types that own a collapse/expand group (strip when expanded). */
export const COLLAPSE_AGGREGATE_OWNER_TYPES = ['tie-breaker-network', 'gas-turbine-bank'];

/**
 * True when this rendered component is the collapsed summary card (not a hidden member).
 * @param {object} component
 * @param {object[]} components
 */
export function isCollapseAggregateSurfaceComponent(component, components) {
  if (!component?.id || !components?.length) return false;

  if (isWindOctCollapseSurfaceComponent(component, components)) {
    return true;
  }

  if (isTieBreakerNetwork(component) && isTieNetworkCollapsed(component)) {
    return true;
  }

  for (const bank of components) {
    if (!isGasTurbineBank(bank) || !isGasTurbineBankCollapsed(bank)) continue;
    const g = bank.properties?.gasTurbineGroup;
    if (!g) continue;
    if (getGasTurbineBankCollapseSurfaceMemberIds(g).includes(component.id)) return true;
  }

  return false;
}

/** Large Aux / IT / Rack collapse tile — custom glow line-art instead of PNG texture. */
export function isAuxLoadsCollapseAggregateSurface(component, components) {
  return (
    component?.type === 'auxiliary-loads-bess' &&
    isCollapseAggregateSurfaceComponent(component, components)
  );
}

/** Large GFMe STATCOM collapse tile — g2x2 GLTF preview instead of SVG line-art texture. */
export function isGFMeCollapseAggregateSurface(component, components) {
  return (
    component?.type === 'gfme-statcom' &&
    isCollapseAggregateSurfaceComponent(component, components)
  );
}

/** Large BESS collapse tile — Bess.c.glb preview instead of SVG line-art texture. */
export function isBessCollapseAggregateSurface(component, components) {
  return (
    BESS_COLLAPSE_3D_TYPES.has(component?.type) &&
    isCollapseAggregateSurfaceComponent(component, components)
  );
}
