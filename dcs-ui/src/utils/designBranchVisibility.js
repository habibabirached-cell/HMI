/**
 * Per-branch visibility for quick-scenario presets (hide BESS or STATCOM branches
 * while keeping the rest of the withBessandStatCom layout).
 */

import { BESS_COLLAPSE_3D_TYPES } from './bess3dLayout';
export const DESIGN_BRANCH_KIND = {
  BESS: 'bess',
  STATCOM: 'statcom',
};

function isBessEquipmentComponent(component) {
  if (!component) return false;
  if (BESS_COLLAPSE_3D_TYPES.has(component.type)) return true;
  if (component.type === 'bess-xfmr' && /bess/i.test(component.name || component.fullName || '')) {
    return true;
  }
  if (component.type === 'breaker-bess' && /bess/i.test(component.name || component.fullName || '')) {
    return true;
  }
  if (String(component.id || '').includes('bess-preview')) return true;
  return false;
}

function isStatcomEquipmentComponent(component) {
  if (!component) return false;
  if (component.type === 'gfme-statcom') return true;
  if (component.type === 'bess-xfmr' && /statcom/i.test(component.name || component.fullName || '')) {
    return true;
  }
  if (
    component.type === 'breaker-bess' &&
    /statcom/i.test(component.name || component.fullName || '')
  ) {
    return true;
  }
  if (String(component.id || '').includes('gfme-preview')) return true;
  return false;
}

function expandBranchWithAdjacentCts(seedIds, components, connections) {
  const ids = new Set(seedIds);
  const byId = new Map(components.map((c) => [c.id, c]));
  let changed = true;

  while (changed) {
    changed = false;
    for (const conn of connections || []) {
      if (ids.has(conn.from) && !ids.has(conn.to)) {
        const peer = byId.get(conn.to);
        if (peer?.type === 'ct' || peer?.type === 'ct-v') {
          ids.add(conn.to);
          changed = true;
        }
      }
      if (ids.has(conn.to) && !ids.has(conn.from)) {
        const peer = byId.get(conn.from);
        if (peer?.type === 'ct' || peer?.type === 'ct-v') {
          ids.add(conn.from);
          changed = true;
        }
      }
    }
  }

  return ids;
}

/**
 * @param {'bess'|'statcom'} branchKind
 */
export function collectBranchMemberIds(components, connections, branchKind) {
  const matcher =
    branchKind === DESIGN_BRANCH_KIND.BESS
      ? isBessEquipmentComponent
      : branchKind === DESIGN_BRANCH_KIND.STATCOM
        ? isStatcomEquipmentComponent
        : null;
  if (!matcher || !components?.length) return new Set();

  const seed = new Set();
  for (const c of components) {
    if (matcher(c)) seed.add(c.id);
  }
  return expandBranchWithAdjacentCts(seed, components, connections);
}

export function collectHiddenBranchMemberIds(components, connections, hideBranches) {
  const hidden = new Set();
  if (!Array.isArray(hideBranches) || !hideBranches.length) return hidden;

  for (const branch of hideBranches) {
    for (const id of collectBranchMemberIds(components, connections, branch)) {
      hidden.add(id);
    }
  }
  return hidden;
}
