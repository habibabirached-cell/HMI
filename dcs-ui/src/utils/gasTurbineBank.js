/**
 * Gas turbine bank aggregate: one `gas-turbine-bank` block per generation flank
 * (left / right of a vertical bus). Expanded = full aisle visible + 3-dot strip;
 * collapsed = one `gas-turbine-3d` preview connected to the bus via stub links.
 */

import { GAS_TURBINE_3D_TYPE } from './gasTurbine3dLayout';
import { getComponentVisualConfig as defaultGetVisual } from '../data/componentVisuals';

/** 3-dot collapse strip — matches tie-breaker-network strip. */
export const GTBANK_STRIP_WIDTH = 34;
export const GTBANK_STRIP_HEIGHT = 24;

function compWidthPx(c, getComponentVisualConfig) {
  const vis = getComponentVisualConfig(c.type);
  return c.visualOverrides?.width ?? vis.width;
}

function compHeightPx(c, getComponentVisualConfig) {
  const vis = getComponentVisualConfig(c.type);
  return c.visualOverrides?.height ?? vis.height;
}

function verticalSpansOverlap(topA, bottomA, topB, bottomB) {
  return topA < bottomB && bottomA > topB;
}

function bankVerticalSpan(bank, components, getComponentVisualConfig) {
  const g = bank.properties?.gasTurbineGroup;
  const band = g?.verticalBand;
  if (band && Number.isFinite(band.minY) && Number.isFinite(band.maxY)) {
    return { top: band.minY, bottom: band.maxY };
  }

  const byId = new Map(components.map((c) => [c.id, c]));
  let top = Infinity;
  let bottom = -Infinity;

  for (const surfaceId of getGasTurbineBankCollapseSurfaceMemberIds(g)) {
    const surface = byId.get(surfaceId);
    if (!surface) continue;
    const y = surface.position?.y ?? 0;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + compHeightPx(surface, getComponentVisualConfig));
  }

  for (const id of g?.memberIds || []) {
    const member = byId.get(id);
    if (!member) continue;
    const y = member.position?.y ?? 0;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + compHeightPx(member, getComponentVisualConfig));
  }

  if (Number.isFinite(top)) {
    return { top, bottom };
  }

  const y = bank.position?.y ?? 0;
  const h = compHeightPx(bank, getComponentVisualConfig);
  return { top: y, bottom: y + Math.max(h, GTBANK_STRIP_HEIGHT) };
}

function componentOverlapsBankVerticalSpan(c, bank, components, getComponentVisualConfig) {
  const cTop = c.position?.y ?? 0;
  const cBottom = cTop + compHeightPx(c, getComponentVisualConfig);
  const { top: bankTop, bottom: bankBottom } = bankVerticalSpan(
    bank,
    components,
    getComponentVisualConfig,
  );
  return verticalSpansOverlap(cTop, cBottom, bankTop, bankBottom);
}

function anchorRightEdge(comp, getComponentVisualConfig) {
  const w = compWidthPx(comp, getComponentVisualConfig);
  return (comp.position?.x ?? 0) + w;
}

function anchorLeftEdge(comp) {
  return comp.position?.x ?? 0;
}

function anchorCenterY(comp, getComponentVisualConfig) {
  const h = compHeightPx(comp, getComponentVisualConfig);
  return (comp.position?.y ?? 0) + h / 2;
}

export function isGasTurbineBank(component) {
  return component?.type === 'gas-turbine-bank';
}

export function getGasTurbineBankPreviewMemberId(bank) {
  return bank?.properties?.gasTurbineGroup?.previewMemberId ?? null;
}

export function getGasTurbineBankCollapseCompanionMemberId(bank) {
  return bank?.properties?.gasTurbineGroup?.collapseCompanionMemberId ?? null;
}

/** Ordered collapse tiles: 3D preview, aux companion, then optional extras (BESS, GFMe, …). */
export function getGasTurbineBankCollapseSurfaceMemberIds(gasTurbineGroup) {
  const g = gasTurbineGroup;
  if (!g) return [];
  const ids = [];
  if (g.previewMemberId) ids.push(String(g.previewMemberId));
  if (g.collapseCompanionMemberId) ids.push(String(g.collapseCompanionMemberId));
  if (Array.isArray(g.collapseExtraMemberIds)) {
    for (const id of g.collapseExtraMemberIds) {
      if (id) ids.push(String(id));
    }
  }
  return ids;
}

export function isGasTurbineBankCollapsed(component) {
  if (!isGasTurbineBank(component)) return false;
  const g = component.properties?.gasTurbineGroup;
  if (!g?.memberIds?.length) return false;
  return g.collapsed === true;
}

/** Expanded = members visible + thin 3-dot strip at top of flank. */
export function isGasTurbineBankStripMode(component) {
  if (!isGasTurbineBank(component)) return false;
  const g = component.properties?.gasTurbineGroup;
  if (!g?.memberIds?.length) return false;
  return g.collapsed !== true;
}

export function getGasTurbineBankCollapsedColumnWidth(
  bank,
  getComponentVisualConfig = defaultGetVisual,
  components = null,
) {
  const previewId = bank?.properties?.gasTurbineGroup?.previewMemberId;
  if (previewId && components?.length) {
    const preview = components.find((c) => c.id === previewId);
    if (preview) {
      return compWidthPx(preview, getComponentVisualConfig);
    }
  }
  const previewVis = getComponentVisualConfig(GAS_TURBINE_3D_TYPE);
  return bank?.visualOverrides?.collapsedWidth ?? previewVis.width ?? 500;
}

export function isGasTurbineBankPlaceholderPreview(component) {
  return component?.properties?.collapsePlaceholderOnly === true;
}

function collapseColumnLeft(bank, components) {
  const g = bank.properties?.gasTurbineGroup;
  if (Number.isFinite(g?.collapseColumnLeft)) return g.collapseColumnLeft;
  const previewId = g?.previewMemberId;
  if (previewId) {
    const preview = components.find((c) => c.id === previewId);
    if (preview) return preview.position?.x ?? 0;
  }
  return bank.position?.x ?? 0;
}

export function gasTurbineBankEffectiveDimensions(
  component,
  baseWidth,
  baseHeight,
  getComponentVisualConfig = defaultGetVisual,
) {
  if (isGasTurbineBankStripMode(component)) {
    return {
      width: GTBANK_STRIP_WIDTH,
      height: GTBANK_STRIP_HEIGHT,
    };
  }
  if (isGasTurbineBankCollapsed(component)) {
    return { width: 0, height: 0 };
  }
  return { width: baseWidth, height: baseHeight };
}

function hasGasTurbineBankStubLinks(component) {
  const sl = component?.properties?.gasTurbineGroup?.stubLinks;
  return (
    sl &&
    ((Array.isArray(sl.leftAnchorIds) && sl.leftAnchorIds.length > 0) ||
      (Array.isArray(sl.rightAnchorIds) && sl.rightAnchorIds.length > 0))
  );
}

/** @returns {Set<string>} ids omitted from canvas render. */
export function getGasTurbineBankHiddenMemberIdSet(components) {
  const hidden = new Set();
  if (!components?.length) return hidden;

  for (const bank of components) {
    if (!isGasTurbineBank(bank)) continue;
    const g = bank.properties?.gasTurbineGroup;
    const surfaceIds = getGasTurbineBankCollapseSurfaceMemberIds(g);

    if (isGasTurbineBankCollapsed(bank)) {
      hidden.add(bank.id);
      for (const id of g?.memberIds || []) {
        if (id) hidden.add(String(id));
      }
    } else {
      for (const id of surfaceIds) {
        hidden.add(id);
      }
    }
  }
  return hidden;
}

function resolveStubAnchorComponents(anchorIds, components) {
  const resolved = [];
  for (let i = 0; i < (anchorIds || []).length; i += 1) {
    const id = anchorIds[i];
    const c = components.find((x) => x.id === id);
    if (c) resolved.push(c);
  }
  return resolved;
}

export function getGasTurbineBankCollapsedStubSegments(
  renderComponents,
  bankCompAnchors,
  bankRenderComp,
  components,
  getComponentVisualConfig,
) {
  if (
    !bankCompAnchors?.properties?.gasTurbineGroup?.stubLinks ||
    !isGasTurbineBankCollapsed(bankCompAnchors)
  ) {
    return [];
  }

  const g = bankCompAnchors.properties.gasTurbineGroup;
  const sl = g.stubLinks;
  const bankKey = bankCompAnchors.id || bankRenderComp.id || 'gtbank';
  const previewId = g?.previewMemberId;
  const previewRender = previewId
    ? renderComponents.find((c) => c.id === previewId)
    : null;
  const previewAuthored = previewId ? components.find((c) => c.id === previewId) : null;
  const preview = previewRender || previewAuthored;
  if (!preview) return [];

  const colLeft = collapseColumnLeft(bankCompAnchors, components);
  const colW = getGasTurbineBankCollapsedColumnWidth(
    bankRenderComp,
    getComponentVisualConfig,
    components,
  );
  const colRight = colLeft + colW;
  const y = anchorCenterY(preview, getComponentVisualConfig);

  const busId = sl.busMemberId;
  const bus = busId ? components.find((c) => c.id === busId) : null;
  if (bus) {
    // Bus feeder lines omitted — connections render via normal design wiring when expanded.
    return [];
  }

  const leftAnchors = resolveStubAnchorComponents(sl.leftAnchorIds, components);
  const rightAnchors = resolveStubAnchorComponents(sl.rightAnchorIds, components);

  const segs = [];
  let ki = 0;
  for (const c of leftAnchors) {
    const x1 = anchorRightEdge(c, getComponentVisualConfig);
    segs.push({
      key: `gtbank-stub-L-${bankKey}-${ki}`,
      x1,
      y1: y,
      x2: colLeft,
      y2: y,
    });
    ki += 1;
  }
  ki = 0;
  for (const c of rightAnchors) {
    const x2 = anchorLeftEdge(c);
    segs.push({
      key: `gtbank-stub-R-${bankKey}-${ki}`,
      x1: colRight,
      y1: y,
      x2,
      y2: y,
    });
    ki += 1;
  }
  return segs;
}

/**
 * Render-time horizontal shifts when a bank is collapsed: align preview + pull flanks.
 * @returns {Map<string, number>}
 */
export function buildGasTurbineBankCollapseHorizontalShiftMap(components, getComponentVisualConfig) {
  const shiftById = new Map();
  if (!components?.length) return shiftById;

  const byId = new Map(components.map((c) => [c.id, c]));
  const banks = components.filter((c) => isGasTurbineBank(c) && isGasTurbineBankCollapsed(c));
  if (!banks.length) return shiftById;

  const scopeByVerticalBand = banks.length > 1;

  for (const bank of banks) {
    const g = bank.properties?.gasTurbineGroup;
    const excluded = new Set([...(g?.memberIds || []), bank.id]);
    const surfaceIds = getGasTurbineBankCollapseSurfaceMemberIds(g);
    for (const surfaceId of surfaceIds) {
      excluded.add(surfaceId);
    }

    const colLeft = collapseColumnLeft(bank, components);
    const colW = getGasTurbineBankCollapsedColumnWidth(bank, getComponentVisualConfig, components);
    const colRight = colLeft + colW;
    const gap = Number.isFinite(g?.stubLinks?.gapPx) ? g.stubLinks.gapPx : 25;

    for (const surfaceId of surfaceIds) {
      const member = byId.get(surfaceId);
      if (!member) continue;
      const dx = colLeft - (member.position?.x ?? 0);
      if (dx !== 0) shiftById.set(surfaceId, dx);
    }

    if (!hasGasTurbineBankStubLinks(bank)) continue;

    const side = g?.side === 'right' ? 'right' : 'left';

    let leftMaxRight = -Infinity;
    let rightMinLeft = Infinity;

    if (side === 'left') {
      for (const id of g.stubLinks.rightAnchorIds || []) {
        const c = byId.get(id);
        if (!c) continue;
        rightMinLeft = Math.min(rightMinLeft, anchorLeftEdge(c));
      }
      for (const c of components) {
        if (!c?.id || excluded.has(c.id)) continue;
        if (
          scopeByVerticalBand &&
          !componentOverlapsBankVerticalSpan(c, bank, components, getComponentVisualConfig)
        ) {
          continue;
        }
        const w = compWidthPx(c, getComponentVisualConfig);
        const cx = c.position?.x ?? 0;
        const right = cx + w;
        if (right < colLeft) {
          leftMaxRight = Math.max(leftMaxRight, right);
        }
      }
    } else {
      for (const id of g.stubLinks.leftAnchorIds || []) {
        const c = byId.get(id);
        if (!c) continue;
        leftMaxRight = Math.max(leftMaxRight, anchorRightEdge(c, getComponentVisualConfig));
      }
      for (const c of components) {
        if (!c?.id || excluded.has(c.id)) continue;
        if (
          scopeByVerticalBand &&
          !componentOverlapsBankVerticalSpan(c, bank, components, getComponentVisualConfig)
        ) {
          continue;
        }
        const cx = c.position?.x ?? 0;
        const left = cx;
        if (left > colRight) {
          rightMinLeft = Math.min(rightMinLeft, left);
        }
      }
    }

    if (side === 'left') {
      if (!Number.isFinite(leftMaxRight)) continue;
      const dRightward = colLeft - gap - leftMaxRight;
      for (const c of components) {
        if (!c?.id || excluded.has(c.id)) continue;
        if (
          scopeByVerticalBand &&
          !componentOverlapsBankVerticalSpan(c, bank, components, getComponentVisualConfig)
        ) {
          continue;
        }
        const w = compWidthPx(c, getComponentVisualConfig);
        const right = (c.position?.x ?? 0) + w;
        const previewDx = shiftById.get(c.id) ?? 0;
        if (right + previewDx < colLeft) {
          shiftById.set(c.id, previewDx + dRightward);
        }
      }
      continue;
    }

    if (!Number.isFinite(rightMinLeft)) continue;
    const dLeftward = rightMinLeft - (colRight + gap);
    for (const c of components) {
      if (!c?.id || excluded.has(c.id)) continue;
      if (
        scopeByVerticalBand &&
        !componentOverlapsBankVerticalSpan(c, bank, components, getComponentVisualConfig)
      ) {
        continue;
      }
      const cx = c.position?.x ?? 0;
      const previewDx = shiftById.get(c.id) ?? 0;
      if (cx + previewDx > colRight) {
        shiftById.set(c.id, previewDx - dLeftward);
      }
    }
  }

  return shiftById;
}

/** Remove deleted ids from gasTurbineGroup member/stub/preview lists. */
export function scrubGasTurbineGroupReferencesAfterDelete(components, deletedIds) {
  const deleted = deletedIds instanceof Set ? deletedIds : new Set(deletedIds);
  if (!deleted.size) return components;

  return components.map((c) => {
    const g = c.properties?.gasTurbineGroup;
    if (!g) return c;

    let nextG = g;
    let changed = false;

    if (g.previewMemberId && deleted.has(g.previewMemberId)) {
      nextG = { ...nextG, previewMemberId: null };
      changed = true;
    }

    if (g.collapseCompanionMemberId && deleted.has(g.collapseCompanionMemberId)) {
      nextG = { ...nextG, collapseCompanionMemberId: null };
      changed = true;
    }

    if (Array.isArray(g.collapseExtraMemberIds)) {
      const collapseExtraMemberIds = g.collapseExtraMemberIds.filter((id) => !deleted.has(id));
      if (collapseExtraMemberIds.length !== g.collapseExtraMemberIds.length) {
        nextG = { ...nextG, collapseExtraMemberIds };
        changed = true;
      }
    }

    if (Array.isArray(g.memberIds)) {
      const memberIds = g.memberIds.filter((id) => !deleted.has(id));
      if (memberIds.length !== g.memberIds.length) {
        nextG = { ...nextG, memberIds };
        changed = true;
      }
    }

    const stub = g.stubLinks;
    if (stub) {
      let nextStub = stub;
      if (Array.isArray(stub.leftAnchorIds)) {
        const leftAnchorIds = stub.leftAnchorIds.filter((id) => !deleted.has(id));
        if (leftAnchorIds.length !== stub.leftAnchorIds.length) {
          nextStub = { ...nextStub, leftAnchorIds };
          changed = true;
        }
      }
      if (Array.isArray(stub.rightAnchorIds)) {
        const rightAnchorIds = stub.rightAnchorIds.filter((id) => !deleted.has(id));
        if (rightAnchorIds.length !== stub.rightAnchorIds.length) {
          nextStub = { ...nextStub, rightAnchorIds };
          changed = true;
        }
      }
      if (changed) {
        nextG = { ...nextG, stubLinks: nextStub };
      }
    }

    if (!changed) return c;
    return {
      ...c,
      properties: { ...c.properties, gasTurbineGroup: nextG },
    };
  });
}

/** Bank id when member or preview belongs to a collapsed bank (for double-click expand). */
export function getCollapsedGasTurbineBankIdForMember(components, memberId) {
  if (!memberId || !components?.length) return null;
  for (const c of components) {
    if (!isGasTurbineBank(c) || !isGasTurbineBankCollapsed(c)) continue;
    const g = c.properties?.gasTurbineGroup;
    const ids = g?.memberIds || [];
    const surfaceIds = getGasTurbineBankCollapseSurfaceMemberIds(g);
    if (ids.includes(memberId) || surfaceIds.includes(String(memberId))) {
      return c.id;
    }
  }
  return null;
}
