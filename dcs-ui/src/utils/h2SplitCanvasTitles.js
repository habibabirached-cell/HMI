/** Split-canvas pane titles (upper / lower) for conf3 stacked designs. */

import { designHasStackedSections } from './canvasConf3Split';

export const H2_UPPER_CANVAS_TITLE = {
  line1: 'Baseline Configuration : ',
  line2: 'LM2500 only',
};

const LOWER_TITLE_BY_PRESET = {
  withBessandStatCom: {
    line1: 'Augmented Configuration : ',
    line2: '+ BESS and +STATCOM',
  },
  withBessAlone: {
    line1: 'Augmented Configuration : ',
    line2: '+ BESS',
  },
  withStatcomAlone: {
    line1: 'Augmented Configuration : ',
    line2: '+ STATCOM',
  },
  mvups_undamped: {
    line1: 'Augmented Configuration : ',
    line2: '+ MVUPS',
  },
  mvups_damped: {
    line1: 'Augmented Configuration : ',
    line2: '+ MVUPS',
  },
  noBessNoStatcom: null,
};

function normalizeTitleLines(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    line1: String(raw.line1 ?? ''),
    line2: String(raw.line2 ?? ''),
  };
}

/** True when the design has upper/lower stacked canvas sections (any design name). */
export function designUsesSplitPaneTitles(components) {
  return designHasStackedSections(components);
}

/** @deprecated Use designUsesSplitPaneTitles — kept for older imports. */
export function designUsesH2SplitTitles(_designApiPath, _configName, components) {
  if (Array.isArray(components)) return designUsesSplitPaneTitles(components);
  return false;
}

/** Validate titles restored from systemState. */
export function normalizeSplitPaneTitles(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const upper = normalizeTitleLines(raw.upper);
  if (!upper) return null;
  const lower = raw.lower == null ? null : normalizeTitleLines(raw.lower);
  return { upper, lower };
}

/** Resolve active quick-scenario preset for lower-canvas title. */
export function resolveH2ActivePresetName({
  activeQuickScenarioPreset,
  activeNamedSimulationConfig,
  designSectionVisibility,
}) {
  if (activeQuickScenarioPreset) return activeQuickScenarioPreset;
  if (activeNamedSimulationConfig && LOWER_TITLE_BY_PRESET[activeNamedSimulationConfig]) {
    return activeNamedSimulationConfig;
  }
  const v = designSectionVisibility;
  if (v && v.showLower === false) return 'noBessNoStatcom';
  const branches = v?.hideBranches || [];
  if (v?.showMvupsFlatSchematic) {
    return activeNamedSimulationConfig === 'mvups_damped' ? 'mvups_damped' : 'mvups_undamped';
  }
  if (branches.includes('statcom') && !branches.includes('bess')) return 'withBessAlone';
  if (branches.includes('bess') && !branches.includes('statcom')) return 'withStatcomAlone';
  if (v?.showLower) return 'withBessandStatCom';
  return 'noBessNoStatcom';
}

export function resolveH2SplitPaneTitles(presetName) {
  const key = presetName && Object.prototype.hasOwnProperty.call(LOWER_TITLE_BY_PRESET, presetName)
    ? presetName
    : 'noBessNoStatcom';
  return {
    upper: H2_UPPER_CANVAS_TITLE,
    lower: LOWER_TITLE_BY_PRESET[key] ?? null,
  };
}
