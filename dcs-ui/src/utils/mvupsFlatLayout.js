/**
 * MVUPS flat one-line: render-only layout (independent from upper baseline collapse).
 */

/** Default render-only shift so expanded one-line clears the left toolbar (~620px). */
export const MVUPS_FLAT_EXPANDED_RENDER_OFFSET_X = 620;

export function isMvupsFlatCollapseOwnerComponent(component) {
  return component?.properties?.mvupsFlatCollapseOwner === true;
}

export function isMvupsFlatSchematicCanvasComponent(component) {
  if (!component) return false;
  const id = component.id;
  if (typeof id === 'string' && id.startsWith('p2r-mvups-flat-')) return true;
  if (typeof id === 'string' && id.startsWith('comp-mvups-flat-')) return true;
  return component.properties?.mvupsFlatSchematic === true;
}

export function isMvupsFlatFullyExpandedLocal(components) {
  if (!components?.length) return false;
  let owners = 0;
  for (const c of components) {
    if (!isMvupsFlatCollapseOwnerComponent(c)) continue;
    owners += 1;
    if (c.type === 'gas-turbine-bank') {
      const g = c.properties?.gasTurbineGroup;
      if (g?.memberIds?.length && g.collapsed === true) return false;
    }
    if (c.type === 'tie-breaker-network') {
      const tg = c.properties?.tieGroup;
      if (tg?.memberIds?.length && tg.collapsed !== false) return false;
    }
  }
  return owners > 0;
}

/**
 * When expanded, shift only MVUPS flat canvas ids (not saved positions — collapse tiles unchanged).
 * @returns {Map<string, number>}
 */
export function buildMvupsFlatExpandedRenderShiftMap(components, showMvupsFlatSchematic) {
  const map = new Map();
  if (!showMvupsFlatSchematic || !isMvupsFlatFullyExpandedLocal(components)) {
    return map;
  }

  const loadBank = components.find((c) => c.id === 'comp-mvups-flat-load-bank');
  const custom = loadBank?.properties?.gasTurbineGroup?.expandedRenderOffsetX;
  const dx = Number.isFinite(custom) ? custom : MVUPS_FLAT_EXPANDED_RENDER_OFFSET_X;

  for (const c of components) {
    if (isMvupsFlatSchematicCanvasComponent(c)) {
      map.set(c.id, dx);
    }
  }
  return map;
}

/** MVUPS one-line pieces, including the expanded mirror that is not flagged on each child. */
function isMvupsLayoutPiece(component) {
  if (isMvupsFlatSchematicCanvasComponent(component)) return true;
  return typeof component?.id === 'string' && component.id.startsWith('comp-mvups-exp-');
}

/**
 * BESS/STATCOM wings and the MVUPS one-line collapse independently.
 * A bank may only pull pieces from its own plant.
 */
export function shouldApplyBankCollapseShiftToComponent(bank, component) {
  const mvupsBank = isMvupsFlatCollapseOwnerComponent(bank);
  const mvupsPiece = isMvupsLayoutPiece(component);
  if (mvupsBank || mvupsPiece) return mvupsBank && mvupsPiece;
  return true;
}

export function shouldApplyTieCollapseShiftToComponent(tie, component) {
  // Only the MVUPS tie may slide the MVUPS one-line. The BESS paste tie sits on the same
  // band and would otherwise crush the expanded MVUPS drawing into the center column.
  if (isMvupsLayoutPiece(component)) {
    return tie?.id === 'comp-mvups-exp-tie-network';
  }
  if (!isMvupsFlatCollapseOwnerComponent(tie)) return true;
  return false;
}
