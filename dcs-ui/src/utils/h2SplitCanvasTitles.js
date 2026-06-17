/** H2 conf3: fixed titles for UpperCanvas / BelowCanvas. */

export const H2_UPPER_CANVAS_TITLE = {
  line1: 'Base Configuration : ',
  line2: 'LM2500 only',
};

const LOWER_TITLE_BY_PRESET = {
  withBessandStatCom: {
    line1: 'Alternative Configuration : ',
    line2: '+BESS and +STATCOM',
  },
  withBessAlone: {
    line1: 'Alternative Configuration : ',
    line2: '+BESS',
  },
  withStatcomAlone: {
    line1: 'Alternative Configuration : ',
    line2: '+STATCOM',
  },
  noBessNoStatcom: {
    line1: 'Alternative Configuration',
    line2: '',
  },
};

export function designUsesH2SplitTitles(designApiPath, configName) {
  const leaf = String(designApiPath || '')
    .trim()
    .split(/[/\\]/)
    .pop()
    ?.toLowerCase();
  const name = String(configName || '').trim().toLowerCase();
  return leaf === 'h2' || name === 'h2';
}

/** Resolve active quick-scenario preset for H2 lower-canvas title. */
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
  if (branches.includes('statcom')) return 'withBessAlone';
  if (branches.includes('bess')) return 'withStatcomAlone';
  if (v?.showLower) return 'withBessandStatCom';
  return 'noBessNoStatcom';
}

export function resolveH2SplitPaneTitles(presetName) {
  const key = presetName && LOWER_TITLE_BY_PRESET[presetName] ? presetName : 'noBessNoStatcom';
  return {
    upper: H2_UPPER_CANVAS_TITLE,
    lower: LOWER_TITLE_BY_PRESET[key],
  };
}
