/**
 * windOct2026 compact plant: three large tiles + center bus when collapsed;
 * full one-line members when expanded (tie-breaker-network owner + windOctPlantGroup).
 */

import { CANVAS_PANE_LOWER, resolveComponentCanvasPane } from './canvasConf3Split';
import { isTieBreakerNetwork, isTieNetworkCollapsed } from './tieBreakerNetwork';

export function getWindOctPlantOwner(components) {
  if (!components?.length) return null;
  return (
    components.find(
      (c) => isTieBreakerNetwork(c) && c.properties?.windOctPlantGroup,
    ) ?? null
  );
}

export function isWindOctPlantOwner(component) {
  return isTieBreakerNetwork(component) && !!component?.properties?.windOctPlantGroup;
}

export function isWindOctPlantCollapsed(components) {
  const owner = getWindOctPlantOwner(components);
  if (!owner) return false;
  return isTieNetworkCollapsed(owner);
}

function collapseSurfaceIds(group) {
  if (!group) return [];
  const ids = [];
  if (Array.isArray(group.previewMemberIds)) {
    for (const id of group.previewMemberIds) {
      if (id) ids.push(String(id));
    }
  }
  if (Array.isArray(group.busMemberIds)) {
    for (const id of group.busMemberIds) {
      if (id) ids.push(String(id));
    }
  }
  return ids;
}

/** @returns {Set<string>} */
export function getWindOctPlantHiddenMemberIdSet(components) {
  const hidden = new Set();
  const owner = getWindOctPlantOwner(components);
  if (!owner) return hidden;

  const wg = owner.properties.windOctPlantGroup;
  const tg = owner.properties.tieGroup;
  const surfaceIds = collapseSurfaceIds(wg);
  const memberIds = tg?.memberIds || [];
  const ownerPane = resolveComponentCanvasPane(owner);
  const explodedOnOtherPane = memberIds.some((id) => {
    const member = components.find((c) => c.id === id);
    return member && resolveComponentCanvasPane(member) !== ownerPane;
  });

  if (isTieNetworkCollapsed(owner)) {
    hidden.add(owner.id);
    for (const id of memberIds) {
      if (!id) continue;
      const member = components.find((c) => c.id === id);
      if (member && resolveComponentCanvasPane(member) !== ownerPane) continue;
      hidden.add(String(id));
    }
  } else if (!explodedOnOtherPane) {
    for (const id of surfaceIds) {
      hidden.add(id);
    }
  }
  return hidden;
}

export function isWindOctCollapseSurfaceComponent(component, components) {
  if (!component?.id || !isWindOctPlantCollapsed(components)) return false;
  const owner = getWindOctPlantOwner(components);
  const surfaceIds = collapseSurfaceIds(owner?.properties?.windOctPlantGroup);
  return surfaceIds.includes(component.id);
}

/** Top hollow title only — MW/subtitle at bottom stays (windOct compact tiles). */
export function shouldHide3dOverlayTitle(component, components) {
  if (component?.properties?.hide3dOverlayTitle) return true;
  if (component?.properties?.ideumDecorOnly) return true;
  if (!component?.id || !components?.length) return false;
  if (!isWindOctCollapseSurfaceComponent(component, components)) return false;
  const wg = getWindOctPlantOwner(components)?.properties?.windOctPlantGroup;
  const previewIds = wg?.previewMemberIds || [];
  return previewIds.includes(String(component.id));
}

/** Owner id when double-clicking a compact tile / bus should explode the plant. */
export function getCollapsedWindOctPlantOwnerIdForMember(components, memberId) {
  if (!memberId || !components?.length) return null;
  if (!isWindOctPlantCollapsed(components)) return null;
  const owner = getWindOctPlantOwner(components);
  if (!owner) return null;
  const surfaceIds = collapseSurfaceIds(owner.properties?.windOctPlantGroup);
  if (surfaceIds.includes(String(memberId))) {
    return owner.id;
  }
  return null;
}

/** Keep the compact tiles upstairs and park the one-line members on the lower pane. */
export function withWindOctExplodedCopyOnLowerPane(components) {
  const owner = getWindOctPlantOwner(components);
  const memberIds = owner?.properties?.tieGroup?.memberIds;
  if (!memberIds?.length) return components;
  const idSet = new Set(memberIds.map(String));
  let changed = false;
  const next = components.map((c) => {
    if (!idSet.has(String(c.id))) return c;
    if (resolveComponentCanvasPane(c) === CANVAS_PANE_LOWER) return c;
    changed = true;
    return { ...c, canvasPane: CANVAS_PANE_LOWER };
  });
  return changed ? next : components;
}

function componentBounds(components, getSize) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of components) {
    const { width, height } = getSize(c);
    const x = c.position?.x ?? 0;
    const y = c.position?.y ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function zoomToFitBounds(bounds, viewW, viewH, pad) {
  const contentW = Math.max(1, bounds.maxX - bounds.minX);
  const contentH = Math.max(1, bounds.maxY - bounds.minY);
  return Math.min((viewW - pad * 2) / contentW, (viewH - pad * 2) / contentH);
}

function panToFitBounds(bounds, viewW, viewH, zoom) {
  const contentW = (bounds.maxX - bounds.minX) * zoom;
  const contentH = (bounds.maxY - bounds.minY) * zoom;
  return {
    x: (viewW - contentW) / 2 - bounds.minX * zoom,
    y: (viewH - contentH) / 2 - bounds.minY * zoom,
  };
}

/** One zoom that fits both the compact plant and the exploded one-line in their panes. */
export function fitWindOctSplitPanes(upper, lower, viewW, paneH, getSize) {
  const upperBounds = componentBounds(upper, getSize);
  const lowerBounds = componentBounds(lower, getSize);
  if (!upperBounds || !lowerBounds || viewW < 80 || paneH < 80) return null;
  const pad = 24;
  const zoom = Math.max(
    0.12,
    Math.min(1.1, zoomToFitBounds(upperBounds, viewW, paneH, pad), zoomToFitBounds(lowerBounds, viewW, paneH, pad)),
  );
  return {
    zoom,
    panTop: panToFitBounds(upperBounds, viewW, paneH, zoom),
    panBottom: panToFitBounds(lowerBounds, viewW, paneH, zoom),
  };
}

export function expandWindOctPlantOwnerPatch(owner) {
  const tg = owner?.properties?.tieGroup;
  if (!tg?.memberIds?.length) return null;
  return {
    properties: {
      ...owner.properties,
      tieGroup: { ...tg, collapsed: false },
    },
  };
}
