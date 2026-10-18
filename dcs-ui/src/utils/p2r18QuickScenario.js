import { normalizeDesignSectionVisibility } from './designSectionVisibility';
import { resolveMvupsPresetForMode } from '../data/quickScenarioUi';

/** Infer named plot preset from current canvas section visibility (P2R_18). */
export function inferP2R18DesignPresetFromVisibility(
  designSectionVisibility,
  mvupsDampingMode = 'undamped',
  namedSimulationConfigs = [],
) {
  const v = normalizeDesignSectionVisibility(designSectionVisibility);
  if (v.showMvupsFlatSchematic) {
    return resolveMvupsPresetForMode(mvupsDampingMode, namedSimulationConfigs);
  }
  if (!v.showLower) {
    return 'noBessNoStatcom';
  }
  const hide = new Set(v.hideBranches || []);
  if (hide.has('statcom') && !hide.has('bess')) {
    return 'withBessAlone';
  }
  if (hide.has('bess') && !hide.has('statcom')) {
    return 'withStatcomAlone';
  }
  return 'withBessandStatCom';
}

export function isP2R18QuickScenarioPreset(presetName) {
  return (
    presetName === 'noBessNoStatcom'
    || presetName === 'withBessandStatCom'
    || presetName === 'withBessAlone'
    || presetName === 'withStatcomAlone'
    || presetName === 'mvups_undamped'
    || presetName === 'mvups_damped'
  );
}
