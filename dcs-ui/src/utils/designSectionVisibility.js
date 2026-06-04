/**
 * Upper / lower stacked design sections (statcom03+ family).
 * Quick-scenario presets can show/hide whole sections without changing collapse state.
 */

import {
  isGasTurbineBank,
  getGasTurbineBankCollapseSurfaceMemberIds,
} from './gasTurbineBank';
import { isTieBreakerNetwork } from './tieBreakerNetwork';

/** Y split between upper stack (buses at y≈0) and lower stack (buses at y≈1900). */
export const DESIGN_SECTION_Y_THRESHOLD = 1800;

export const DEFAULT_DESIGN_SECTION_VISIBILITY = {
  showUpper: true,
  showLower: true,
};

/** Named simulation presets → canvas section visibility (statcom05 quick scenarios). */
export const QUICK_SCENARIO_DESIGN_VISIBILITY = {
  TurnOffAllPower: { showUpper: false, showLower: false },
  noBessNoStatcom: { showUpper: true, showLower: false },
  withBessandStatCom: { showUpper: true, showLower: true },
};

export function normalizeDesignSectionVisibility(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_DESIGN_SECTION_VISIBILITY };
  }
  return {
    showUpper: raw.showUpper !== false,
    showLower: raw.showLower !== false,
  };
}

export function resolveQuickScenarioDesignVisibility(presetName) {
  if (!presetName || typeof presetName !== 'string') return null;
  const mapped = QUICK_SCENARIO_DESIGN_VISIBILITY[presetName];
  return mapped ? { ...mapped } : null;
}

function isLowerSectionByY(y) {
  return (y ?? 0) >= DESIGN_SECTION_Y_THRESHOLD;
}

function isLowerGasTurbineBank(bank) {
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
    const target = isLowerGasTurbineBank(c) ? lower : upper;
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
export function getDesignSectionHiddenMemberIdSet(components, visibility) {
  const v = normalizeDesignSectionVisibility(visibility);
  if (v.showUpper && v.showLower) return new Set();

  const hidden = new Set();
  const { upper, lower } = buildDesignSectionMemberIdSets(components);

  if (!v.showUpper) {
    for (const id of upper) hidden.add(id);
  }
  if (!v.showLower) {
    for (const id of lower) hidden.add(id);
  }

  return hidden;
}
