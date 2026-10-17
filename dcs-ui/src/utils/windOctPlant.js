/**
 * windOct2026 compact plant: three large tiles + center bus when collapsed;
 * full one-line members when expanded (tie-breaker-network owner + windOctPlantGroup).
 */

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

  if (isTieNetworkCollapsed(owner)) {
    hidden.add(owner.id);
    for (const id of memberIds) {
      if (id) hidden.add(String(id));
    }
  } else {
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
