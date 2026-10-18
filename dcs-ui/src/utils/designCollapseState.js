/**
 * Quick-scenario branch collapse: compact vs expanded SLD for gas-turbine banks and tie networks.
 */

import {
  DESIGN_SECTION_Y_THRESHOLD,
  isLowerGasTurbineBank,
  isMvupsFlatCollapseOwner,
  isMvupsFlatSchematicComponent,
  normalizeDesignSectionVisibility,
} from './designSectionVisibility';
import { isCollapseAggregateSurfaceComponent } from './collapseAggregate';
import { applyDesignExpansionToComponents, normalizeDesignExpansion } from './designExpansion';
import { isGasTurbineBank, isGasTurbineBankCollapsed } from './gasTurbineBank';
import { isTieBreakerNetwork, isTieNetworkCollapsed } from './tieBreakerNetwork';

/** Presets that show the thin vertical collapse switch in Quick Scenarios. */
export const QUICK_SCENARIO_COLLAPSE_PRESETS = new Set([
  'noBessNoStatcom',
  'withBessandStatCom',
  'withBessAlone',
  'withStatcomAlone',
  'mvups_undamped',
  'mvups_damped',
]);

export const DEFAULT_QUICK_SCENARIO_BRANCH_COLLAPSED = {
  noBessNoStatcom: true,
  withBessandStatCom: true,
  withBessAlone: true,
  withStatcomAlone: true,
  mvups_undamped: true,
  mvups_damped: true,
};

/** Which stacked design section each collapse switch affects. */
export const QUICK_SCENARIO_COLLAPSE_SECTION = {
  noBessNoStatcom: 'upper',
  withBessandStatCom: 'lower',
  withBessAlone: 'lower',
  withStatcomAlone: 'lower',
  mvups_undamped: 'lower',
  mvups_damped: 'lower',
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

  if (v.showMvupsFlatSchematic) {
    for (const c of components) {
      if (!isMvupsFlatCollapseOwner(c)) continue;
      if (isGasTurbineBank(c) && c.properties?.gasTurbineGroup?.memberIds?.length) {
        ownerIds.add(c.id);
      }
      if (isTieBreakerNetwork(c) && c.properties?.tieGroup?.memberIds?.length) {
        ownerIds.add(c.id);
      }
    }
    return ownerIds;
  }

  for (const c of components) {
    if (isMvupsFlatCollapseOwner(c)) continue;
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

/** MVUPS flat quick scenario: one strip (tie) collapses / any tile double-click expands all owners. */
export const MVUPS_FLAT_UNIFIED_STRIP_OWNER_ID = 'comp-mvups-flat-tie-network';

/** P2R_18 MVUPS: middle bus and each wing explode on their own "...". */
export const MVUPS_EXP_MIDDLE_TIE_ID = 'comp-mvups-exp-tie-network';
export const MVUPS_WING_LEFT_BANK_ID = 'comp-mvups-flat-gen-bank-left';
export const MVUPS_WING_RIGHT_BANK_ID = 'comp-mvups-flat-gen-bank-right';
export const MVUPS_WING_LOAD_BANK_ID = 'comp-mvups-flat-load-bank';

const MVUPS_INDEPENDENT_SECTION_OWNERS = {
  [MVUPS_WING_LEFT_BANK_ID]: [MVUPS_WING_LEFT_BANK_ID],
  'comp-mvups-flat-gen-3d-preview-left': [MVUPS_WING_LEFT_BANK_ID],
  [MVUPS_WING_RIGHT_BANK_ID]: [MVUPS_WING_RIGHT_BANK_ID, MVUPS_WING_LOAD_BANK_ID],
  'comp-mvups-flat-gen-3d-preview-right': [MVUPS_WING_RIGHT_BANK_ID, MVUPS_WING_LOAD_BANK_ID],
  'comp-mvups-flat-aux-preview': [MVUPS_WING_RIGHT_BANK_ID, MVUPS_WING_LOAD_BANK_ID],
  'comp-mvups-flat-mvups-preview': [MVUPS_WING_RIGHT_BANK_ID, MVUPS_WING_LOAD_BANK_ID],
  [MVUPS_WING_LOAD_BANK_ID]: [MVUPS_WING_RIGHT_BANK_ID, MVUPS_WING_LOAD_BANK_ID],
  [MVUPS_EXP_MIDDLE_TIE_ID]: [MVUPS_EXP_MIDDLE_TIE_ID],
};

const MVUPS_WING_DOUBLE_CLICK_IDS = new Set([
  MVUPS_WING_LEFT_BANK_ID,
  'comp-mvups-flat-gen-3d-preview-left',
  MVUPS_WING_RIGHT_BANK_ID,
  'comp-mvups-flat-gen-3d-preview-right',
  'comp-mvups-flat-aux-preview',
  'comp-mvups-flat-mvups-preview',
  MVUPS_WING_LOAD_BANK_ID,
]);

/** Left or right collapsed wing tile. Double-click opens both wings and leaves the middle tie collapsed. */
export function isMvupsWingDoubleClickTarget(component) {
  return MVUPS_WING_DOUBLE_CLICK_IDS.has(component?.id);
}

export function mvupsBothWingsOwnerIds() {
  return [MVUPS_WING_LEFT_BANK_ID, MVUPS_WING_RIGHT_BANK_ID, MVUPS_WING_LOAD_BANK_ID];
}

/** Owner ids toggled together for this tile or strip. Null outside the P2R_18 MVUPS sections. */
export function mvupsIndependentSectionOwnerIds(component) {
  const ids = MVUPS_INDEPENDENT_SECTION_OWNERS[component?.id];
  return ids ? ids.slice() : null;
}

export function buildMvupsIndependentSectionUpdates(components, ownerIds, collapsed) {
  const want = new Set(ownerIds || []);
  const updates = [];
  for (const c of components || []) {
    if (!want.has(c.id)) continue;
    if (isGasTurbineBank(c)) {
      const g = c.properties?.gasTurbineGroup;
      if (!g?.memberIds?.length) continue;
      updates.push({
        id: c.id,
        patch: {
          properties: {
            ...c.properties,
            gasTurbineGroup: { ...g, collapsed: !!collapsed },
          },
        },
      });
    } else if (isTieBreakerNetwork(c)) {
      const tg = c.properties?.tieGroup;
      if (!tg?.memberIds?.length) continue;
      updates.push({
        id: c.id,
        patch: {
          properties: {
            ...c.properties,
            tieGroup: { ...tg, collapsed: !!collapsed },
          },
        },
      });
    }
  }
  return updates;
}

export function isMvupsFlatUnifiedCollapseMode(visibility) {
  return normalizeDesignSectionVisibility(visibility).showMvupsFlatSchematic === true;
}

export function isMvupsFlatUnifiedStripOwner(component) {
  return component?.id === MVUPS_FLAT_UNIFIED_STRIP_OWNER_ID;
}

/** Only MVUPS flat tiles/owners — upper baseline GT uses normal per-bank expand. */
export function shouldMvupsFlatUnifiedExpandOnDoubleClick(component, allComponents) {
  if (!component || !allComponents?.length) return false;
  if (isMvupsWingDoubleClickTarget(component)) return false;
  if (!isMvupsFlatSchematicComponent(component)) return false;
  if (isCollapseAggregateSurfaceComponent(component, allComponents)) return true;
  if (
    isTieBreakerNetwork(component) &&
    isMvupsFlatCollapseOwner(component) &&
    isTieNetworkCollapsed(component)
  ) {
    return true;
  }
  if (
    isGasTurbineBank(component) &&
    isMvupsFlatCollapseOwner(component) &&
    isGasTurbineBankCollapsed(component)
  ) {
    return true;
  }
  return false;
}

function mvupsFlatOwnerCollapsedStates(components) {
  const states = [];
  for (const c of components || []) {
    if (!isMvupsFlatCollapseOwner(c)) continue;
    // P2R_18 middle bus and wings collapse on their own "...", so mixed state is intentional.
    if (mvupsIndependentSectionOwnerIds(c)) continue;
    if (isGasTurbineBank(c)) states.push(isGasTurbineBankCollapsed(c));
    else if (isTieBreakerNetwork(c)) states.push(isTieNetworkCollapsed(c));
  }
  return states;
}

/** Mixed collapsed/expanded owners (e.g. breakers vs peripherals toggled separately). */
export function isMvupsFlatCollapseDesynced(components) {
  const states = mvupsFlatOwnerCollapsedStates(components);
  if (states.length <= 1) return false;
  return !states.every((s) => s === states[0]);
}

/**
 * When desynced, collapse all owners (compact 3D tiles) — default MVUPS flat presentation.
 * @returns {boolean|null} collapsed flag for applyMvupsFlatUnifiedCollapse, or null if in sync
 */
export function getMvupsFlatCollapseRepairCollapsed(components) {
  if (!isMvupsFlatCollapseDesynced(components)) return null;
  return true;
}

/** Set collapsed on every MVUPS flat bank + tie owner at once. */
export function applyMvupsFlatUnifiedCollapseToComponents(components, collapsed) {
  if (!components?.length) return components;
  return components.map((c) => {
    if (!isMvupsFlatCollapseOwner(c)) return c;

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

/**
 * Quick-scenario / collapse switch: MVUPS flat keeps tie + banks in lockstep (no split expansion).
 */
export function applyQuickScenarioBranchCollapseToComponents(
  components,
  visibility,
  collapsed,
  presetName,
  designExpansion,
) {
  const v = normalizeDesignSectionVisibility(visibility);
  if (v.showMvupsFlatSchematic) {
    return applyMvupsFlatUnifiedCollapseToComponents(components, collapsed);
  }
  let next = applyBranchCollapseToComponents(components, visibility, collapsed, presetName);
  next = applyDesignExpansionToComponents(next, normalizeDesignExpansion(designExpansion));
  return next;
}

/** After loading saved designExpansion. Breakers and peripherals stay independent. */
export function applyLoadedDesignExpansionToComponents(components, designExpansion, _visibility) {
  return applyDesignExpansionToComponents(components, normalizeDesignExpansion(designExpansion));
}
