/**
 * Quick-scenario branch collapse: compact vs expanded SLD for gas-turbine banks and tie networks.
 */

import {
  DESIGN_SECTION_Y_THRESHOLD,
  isLowerGasTurbineBank,
  normalizeDesignSectionVisibility,
} from './designSectionVisibility';
import { isGasTurbineBank } from './gasTurbineBank';
import { isTieBreakerNetwork } from './tieBreakerNetwork';

/** Presets that show the thin vertical collapse switch in Quick Scenarios. */
export const QUICK_SCENARIO_COLLAPSE_PRESETS = new Set([
  'noBessNoStatcom',
  'withBessandStatCom',
  'withBessAlone',
  'withStatcomAlone',
]);

export const DEFAULT_QUICK_SCENARIO_BRANCH_COLLAPSED = {
  noBessNoStatcom: true,
  withBessandStatCom: true,
  withBessAlone: true,
  withStatcomAlone: true,
};

/** Which stacked design section each collapse switch affects. */
export const QUICK_SCENARIO_COLLAPSE_SECTION = {
  noBessNoStatcom: 'upper',
  withBessandStatCom: 'lower',
  withBessAlone: 'lower',
  withStatcomAlone: 'lower',
};

export function resolveQuickScenarioCollapseSection(presetName) {
  return QUICK_SCENARIO_COLLAPSE_SECTION[presetName] ?? 'all';
}

export function hasQuickScenarioCollapseControl(presetName) {
  return QUICK_SCENARIO_COLLAPSE_PRESETS.has(presetName);
}

export function normalizeQuickScenarioBranchCollapsed(raw) {
  const out = { ...DEFAULT_QUICK_SCENARIO_BRANCH_COLLAPSED };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of QUICK_SCENARIO_COLLAPSE_PRESETS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key];
  }
  return out;
}

function isLowerTieNetwork(tie) {
  return (tie.position?.y ?? 0) >= DESIGN_SECTION_Y_THRESHOLD;
}

/** Collapse-owner ids (banks / tie cards) in sections visible for this preset. */
export function getVisibleCollapseOwnerIds(components, visibility, collapseSection = 'all') {
  const v = normalizeDesignSectionVisibility(visibility);
  const ownerIds = new Set();
  if (!components?.length) return ownerIds;

  for (const c of components) {
    if (isGasTurbineBank(c)) {
      const inLower = isLowerGasTurbineBank(c);
      if (collapseSection === 'upper' && inLower) continue;
      if (collapseSection === 'lower' && !inLower) continue;
      if (inLower && !v.showLower) continue;
      if (!inLower && !v.showUpper) continue;
      if (c.properties?.gasTurbineGroup?.memberIds?.length) ownerIds.add(c.id);
      continue;
    }
    if (isTieBreakerNetwork(c)) {
      const inLower = isLowerTieNetwork(c);
      if (collapseSection === 'upper' && inLower) continue;
      if (collapseSection === 'lower' && !inLower) continue;
      if (inLower && !v.showLower) continue;
      if (!inLower && !v.showUpper) continue;
      if (c.properties?.tieGroup?.memberIds?.length) ownerIds.add(c.id);
    }
  }

  return ownerIds;
}

/**
 * Set collapsed on visible gas-turbine banks and tie networks.
 * @param {boolean} collapsed — true = compact tiles, false = expanded SLD
 * @param {string} [presetName] — scopes collapse to upper/lower per quick scenario
 */
export function applyBranchCollapseToComponents(components, visibility, collapsed, presetName) {
  const collapseSection = resolveQuickScenarioCollapseSection(presetName);
  const ownerIds = getVisibleCollapseOwnerIds(components, visibility, collapseSection);
  if (!ownerIds.size) return components;

  return components.map((c) => {
    if (!ownerIds.has(c.id)) return c;

    if (isGasTurbineBank(c)) {
      const g = c.properties?.gasTurbineGroup;
      if (!g?.memberIds?.length) return c;
      return {
        ...c,
        properties: {
          ...c.properties,
          gasTurbineGroup: { ...g, collapsed: !!collapsed },
        },
      };
    }

    if (isTieBreakerNetwork(c)) {
      const tg = c.properties?.tieGroup;
      if (!tg?.memberIds?.length) return c;
      return {
        ...c,
        properties: {
          ...c.properties,
          tieGroup: { ...tg, collapsed: collapsed ? true : false },
        },
      };
    }

    return c;
  });
}
