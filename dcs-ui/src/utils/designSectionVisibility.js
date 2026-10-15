/**
 * Upper / lower stacked design sections (statcom03+ family).
 * Quick-scenario presets can show/hide whole sections without changing collapse state.
 */

import {
  isGasTurbineBank,
  getGasTurbineBankCollapseSurfaceMemberIds,
} from './gasTurbineBank';
import { isTieBreakerNetwork } from './tieBreakerNetwork';
import { collectHiddenBranchMemberIds } from './designBranchVisibility';

/** Y split between upper stack (buses at y≈0) and lower stack (buses at y≈1900). */
export const DESIGN_SECTION_Y_THRESHOLD = 1800;

export const MVUPS_FLAT_SCHEMATIC_ID_PREFIX = 'p2r-mvups-flat-';

export const DEFAULT_DESIGN_SECTION_VISIBILITY = {
  showUpper: true,
  showLower: true,
  hideBranches: [],
  showMvupsFlatSchematic: false,
};

/** Named simulation presets → canvas section visibility (statcom05 quick scenarios). */
export const QUICK_SCENARIO_DESIGN_VISIBILITY = {
  Reset: { showUpper: false, showLower: false },
  TurnOffAllPower: { showUpper: false, showLower: false },
  noBessNoStatcom: { showUpper: true, showLower: false },
  withBessandStatCom: { showUpper: true, showLower: true },
  withBessAlone: { showUpper: true, showLower: true, hideBranches: ['statcom'] },
  withStatcomAlone: { showUpper: true, showLower: true, hideBranches: ['bess'] },
  mvups_undamped: { showUpper: true, showLower: true, showMvupsFlatSchematic: true },
  mvups_damped: { showUpper: true, showLower: true, showMvupsFlatSchematic: true },
};

export function normalizeDesignSectionVisibility(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_DESIGN_SECTION_VISIBILITY };
  }
  return {
    showUpper: raw.showUpper !== false,
    showLower: raw.showLower !== false,
    hideBranches: Array.isArray(raw.hideBranches)
      ? raw.hideBranches.filter((b) => b === 'bess' || b === 'statcom')
      : [],
    showMvupsFlatSchematic: raw.showMvupsFlatSchematic === true,
  };
}

export function isMvupsFlatSchematicComponentId(id) {
  return typeof id === 'string' && id.startsWith(MVUPS_FLAT_SCHEMATIC_ID_PREFIX);
}

export function isMvupsFlatCollapseOwnerId(id) {
  return typeof id === 'string' && id.startsWith('comp-mvups-flat-');
}

export function isMvupsFlatCollapseOwner(component) {
  if (!component) return false;
  return (
    isMvupsFlatCollapseOwnerId(component.id) ||
    component.properties?.mvupsFlatCollapseOwner === true
  );
}

export function isMvupsFlatSchematicComponent(component) {
  if (!component) return false;
  return (
    isMvupsFlatSchematicComponentId(component.id) ||
    isMvupsFlatCollapseOwner(component) ||
    component.properties?.mvupsFlatSchematic === true
  );
}

export function resolveQuickScenarioDesignVisibility(presetName) {
  if (!presetName || typeof presetName !== 'string') return null;
  const mapped = QUICK_SCENARIO_DESIGN_VISIBILITY[presetName];
  return mapped ? normalizeDesignSectionVisibility(mapped) : null;
}

function isLowerSectionByY(y) {
  return (y ?? 0) >= DESIGN_SECTION_Y_THRESHOLD;
}

export function isLowerGasTurbineBank(bank) {
  const minY = bank.properties?.gasTurbineGroup?.verticalBand?.minY;
  if (Number.isFinite(minY)) return minY >= DESIGN_SECTION_Y_THRESHOLD;
  return isLowerSectionByY(bank.position?.y);
}

function collectGasTurbineBankMemberIds(bank) {
  const g = bank.properties?.gasTurbineGroup;
  const ids = [bank.id];
  for (const id of g?.memberIds || []) {
    if (id) ids.push(String(id));
  }
  for (const id of getGasTurbineBankCollapseSurfaceMemberIds(g)) {
    ids.push(id);
  }
  return ids;
}

function collectTieMemberIds(tie) {
  const tg = tie.properties?.tieGroup;
  const ids = [tie.id];
  for (const id of tg?.memberIds || []) {
    if (id) ids.push(String(id));
  }
  return ids;
}

/**
 * Partition canvas component ids into upper / lower design stacks.
 * Banks and tie networks are authoritative; remaining components use Y position.
 */
export function buildDesignSectionMemberIdSets(components) {
  const upper = new Set();
  const lower = new Set();
  const assigned = new Set();

  if (!components?.length) return { upper, lower };

  for (const c of components) {
    if (!isGasTurbineBank(c)) continue;
    const ids = collectGasTurbineBankMemberIds(c);
    const target =
      isLowerGasTurbineBank(c) || isMvupsFlatCollapseOwner(c) ? lower : upper;
    for (const id of ids) {
      target.add(id);
      assigned.add(id);
    }
  }

  for (const c of components) {
    if (!isTieBreakerNetwork(c)) continue;
    const ids = collectTieMemberIds(c);
    const target = isLowerSectionByY(c.position?.y) ? lower : upper;
    for (const id of ids) {
      target.add(id);
      assigned.add(id);
    }
  }

  for (const c of components) {
    if (assigned.has(c.id)) continue;
    if (isLowerSectionByY(c.position?.y)) lower.add(c.id);
    else upper.add(c.id);
  }

  return { upper, lower };
}

/** Component ids that should not render for the given section visibility. */
export function getDesignSectionHiddenMemberIdSet(components, visibility, connections = []) {
  const v = normalizeDesignSectionVisibility(visibility);
  const hidden = new Set();

  if (!v.showUpper || !v.showLower) {
    const { upper, lower } = buildDesignSectionMemberIdSets(components);
    if (!v.showUpper) {
      for (const id of upper) hidden.add(id);
    }
    if (!v.showLower) {
      for (const id of lower) hidden.add(id);
    }
  }

  for (const id of collectHiddenBranchMemberIds(components, connections, v.hideBranches)) {
    hidden.add(id);
  }

  if (v.showMvupsFlatSchematic) {
    const { lower } = buildDesignSectionMemberIdSets(components);
    for (const id of lower) {
      if (!isMvupsFlatSchematicComponentId(id) && !isMvupsFlatCollapseOwnerId(id)) {
        hidden.add(id);
      }
    }
  } else {
    for (const c of components || []) {
      if (isMvupsFlatSchematicComponentId(c.id) || isMvupsFlatCollapseOwnerId(c.id)) {
        hidden.add(c.id);
      }
    }
  }

  return hidden;
}
