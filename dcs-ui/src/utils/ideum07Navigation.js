/** Ideum07 touch-table menu — same root as Ideum05; Data Centers opens two-panel hub. */

import {
  IDEUM05_DATA_CENTERS_PREVIEW_ASPECT,
  IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
  IDEUM05_HD_AERO_IDEUM_CATALOG,
  IDEUM05_HD_AERO_MAINGEAR_CATALOG,
  IDEUM05_NAV_IMAGE_URLS,
  IDEUM05_NAV_MODEL_URLS,
  IDEUM05_P2R18_MAINGEAR_CATALOG,
  IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
  cloneIdeum05NavViewport,
  getIdeum05NavCardLayout as getIdeum05Layout,
  ideum05NavViewportFromSystemState,
  normalizeIdeum05NavViewports,
} from './ideum05Navigation';

export {
  IDEUM05_HD_AERO_IDEUM_CATALOG as IDEUM07_HD_AERO_IDEUM_CATALOG,
  IDEUM05_HD_AERO_MAINGEAR_CATALOG as IDEUM07_HD_AERO_MAINGEAR_CATALOG,
  IDEUM05_P2R18_MAINGEAR_CATALOG as IDEUM07_P2R18_MAINGEAR_CATALOG,
  cloneIdeum05NavViewport as cloneIdeum07NavViewport,
  ideum05NavViewportFromSystemState as ideum07NavViewportFromSystemState,
  normalizeIdeum05NavViewports as normalizeIdeum07NavViewports,
};

export const IDEUM07_CATALOG = 'ideum07';
export const IDEUM07_NAV_ROOT = 'root';
export const IDEUM07_DATA_CENTERS_HUB = 'data-centers-hub';
export const IDEUM07_REFERENCE_ARCHITECTURES = 'reference-architectures';

export function isIdeum07DesignName(name) {
  return typeof name === 'string' && /^Ideum07$/i.test(name.trim());
}

export function getIdeum07NavScreen(stack) {
  if (!Array.isArray(stack) || !stack.length) return IDEUM07_NAV_ROOT;
  return stack[stack.length - 1];
}

export const IDEUM07_OVERLAY_SAVE_TARGETS = {
  'ref-500-mw': {
    catalogDir: IDEUM05_HD_AERO_IDEUM_CATALOG,
    saveName: 'HD_Aero Ideum',
  },
};

export function getIdeum07OverlaySaveTarget(screenId) {
  return IDEUM07_OVERLAY_SAVE_TARGETS[screenId] ?? null;
}

export function isIdeum07OverlayScreen(screenId) {
  return getIdeum07OverlaySaveTarget(screenId) != null;
}

export function getIdeum07OverlayClusterCommand(screenId) {
  if (screenId === 'ref-500-mw') return 'loadHdAero';
  return null;
}

export function getIdeum07ControlsClusterCommand(screenId) {
  if (screenId === 'ref-200-mw') return 'loadP2R18';
  return null;
}

export function getIdeum07NavClusterCommand(screenId, cardId) {
  const card = getIdeum07NavCards(screenId).find((c) => c.id === cardId);
  const cmd = card?.navClusterCommand;
  return typeof cmd === 'string' && cmd.trim() ? cmd.trim() : null;
}

export function getIdeum07NavLoadDesignCatalog(screenId, cardId) {
  const card = getIdeum07NavCards(screenId).find((c) => c.id === cardId);
  const dir = card?.navLoadDesignCatalog;
  return typeof dir === 'string' && dir.trim() ? dir.trim() : null;
}

export function isIdeum07ControlsScreen(screenId) {
  return screenId === 'ref-200-mw';
}

export function isIdeum07HdAeroScreen(screenId) {
  return screenId === 'ref-500-mw';
}

export function isIdeum07DesignScreen(screenId) {
  return isIdeum07ControlsScreen(screenId) || isIdeum07OverlayScreen(screenId);
}

export function isIdeum07HubScreen(screenId) {
  return screenId === IDEUM07_DATA_CENTERS_HUB;
}

export function isIdeum07ReferenceArchScreen(screenId) {
  return screenId === IDEUM07_REFERENCE_ARCHITECTURES;
}

export function getIdeum07OverlayDesignDir(screenId) {
  const target = IDEUM07_OVERLAY_SAVE_TARGETS[screenId];
  return target?.catalogDir ?? null;
}

const SCREENS = {
  [IDEUM07_NAV_ROOT]: [
    {
      id: 'industrial',
      label: 'Industrial Processes',
      preview: 'Industrial power processes',
      modelUrl: IDEUM05_NAV_MODEL_URLS.industrialPlantComp,
      modelFitScale: 0.74,
      modelYOffset: 0.54,
      navDisabled: true,
    },
    {
      id: 'island-microgrids',
      label: 'Island / Micro Grids',
      preview: 'Island & microgrid solutions',
      modelUrl: IDEUM05_NAV_MODEL_URLS.windwardIslandHomes,
      modelFitScale: 0.64,
      modelYOffset: 0.54,
      navDisabled: true,
    },
    {
      id: 'submarine',
      label: 'Marine Power/Propulsion',
      preview: 'Coming soon',
      navDisabled: true,
      modelUrl: IDEUM05_NAV_MODEL_URLS.submarine,
      modelFitScale: 0.4,
      modelYOffset: 0.54,
      YShiftParalellToTheScreen: 0.051,
      cameraPitchLift: 0.06,
      modelRotationMode: 'faceFlyby',
      modelFaceYawDeg: 120,
      modelTurntableSpeedScale: 3,
      modelFlybyTravelScale: 0.9,
      modelFlybyDurationMs: 28800,
      modelFlybyRepeatCount: 1,
      modelShowYawDebug: false,
    },
    {
      id: 'data-centers',
      label: 'Data Centers',
      preview: 'Data center applications',
      navDrillTarget: IDEUM07_DATA_CENTERS_HUB,
      modelUrl: IDEUM05_NAV_MODEL_URLS.outdoorDataCenter,
      modelFitScale: 0.8,
      modelYOffset: 0.54,
      cameraPitchLift: 1.06,
      navFeatured: true,
    },
    {
      id: 'grid-connected',
      label: 'Grid Connected',
      preview: 'Grid-connected power system',
      navLoadDesignCatalog: 'ideum06',
      navFeatured: true,
      modelUrl: IDEUM05_NAV_MODEL_URLS.gridConnected,
      modelFitScale: 0.7,
      modelYOffset: 2.14,
      cameraPitchLift: 1.06,
      modelRotationMode: 'pendulum',
      modelPendulumAmplitudeDeg: 10,
      modelPendulumOffsetDeg: 241,
    },
  ],
  [IDEUM07_DATA_CENTERS_HUB]: [],
  [IDEUM07_REFERENCE_ARCHITECTURES]: [
    {
      id: 'ref-200-mw-arch',
      label: '200 MW architecture',
      preview: '200 MW reference design',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.ref300Mw,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.ref200Mw,
      modelFitScale: 0.92,
      modelYOffset: 0.1,
      cameraPitchLift: 0.5,
      navFeatured: true,
      navLoadDesignCatalog: 'ref200Mw',
    },
    {
      id: 'ref-500-mw-arch',
      label: '500 MW architecture',
      preview: '500 MW reference design (coming soon)',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.ref500Mw,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.ref500Mw,
      modelFitScale: 0.92,
      modelYOffset: 0.1,
      cameraPitchLift: 0.5,
      navFeatured: true,
      navDisabled: true,
      navDimmedPreview: true,
    },
    {
      id: 'hd-aero-sharing',
      label: 'HD + Aero Power Sharing',
      preview: 'High-fidelity power sharing study',
      navLoadDesignCatalog: 'hd_aero_ideum',
      navFeatured: true,
      navPlaceholderPreview: true,
    },
  ],
};

const DRILL_IDS = new Set(['island-microgrids', 'industrial']);

export function getIdeum07NavCards(screenId) {
  return SCREENS[screenId] || [];
}

export function getIdeum07NavDrillTarget(screenId, cardId) {
  const card = getIdeum07NavCards(screenId).find((c) => c.id === cardId);
  if (!card || isIdeum07NavCardDisabled(card)) return null;
  if (typeof card.navDrillTarget === 'string' && card.navDrillTarget.trim()) {
    return card.navDrillTarget.trim();
  }
  if (DRILL_IDS.has(cardId)) return cardId;
  return null;
}

export function isIdeum07NavCardDisabled(card) {
  return card?.navDisabled === true;
}

export function isIdeum07NavCardFeatured(card) {
  return card?.navFeatured === true;
}

/** Reuse Ideum05 layout math; reference-architectures uses the 3-column data-centers grid. */
export function getIdeum07NavCardLayout(screenId, viewport) {
  if (screenId === IDEUM07_REFERENCE_ARCHITECTURES) {
    return getIdeum05Layout('data-centers', viewport);
  }
  return getIdeum05Layout(screenId, viewport);
}

export const IDEUM07_DATA_CENTERS_PREVIEW_ASPECT = IDEUM05_DATA_CENTERS_PREVIEW_ASPECT;
export const IDEUM07_DATA_CENTERS_PREVIEW_MATCH_GROUP = IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP;
