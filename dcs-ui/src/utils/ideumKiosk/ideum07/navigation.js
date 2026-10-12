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
  computeIdeum05RootCardLayout,
  getIdeum05NavCardLayout as getIdeum05Layout,
  ideum05NavViewportFromSystemState,
  normalizeIdeum05NavViewports,
} from '../../ideum05Navigation';

export {
  IDEUM05_HD_AERO_IDEUM_CATALOG as IDEUM07_HD_AERO_IDEUM_CATALOG,
  IDEUM05_HD_AERO_MAINGEAR_CATALOG as IDEUM07_HD_AERO_MAINGEAR_CATALOG,
  IDEUM05_P2R18_MAINGEAR_CATALOG as IDEUM07_P2R18_MAINGEAR_CATALOG,
  cloneIdeum05NavViewport as cloneIdeum07NavViewport,
  ideum05NavViewportFromSystemState as ideum07NavViewportFromSystemState,
  normalizeIdeum05NavViewports as normalizeIdeum07NavViewports,
};

const PUBLIC = process.env.PUBLIC_URL || '';

export const IDEUM07_NAV_IMAGE_URLS = {
  /** Hub “Advanced Analysis” pane — reference-architecture site diagram. */
  highFidelityHub: `${PUBLIC}/models/ideum07-high-fidelity-hub.jpg`,
  /** Reference Architectures — HD + Aero power sharing card. */
  hdAeroSharing: `${PUBLIC}/models/ideum07-hd-aero-sharing.jpg`,
  refPowerBlockArch: `${PUBLIC}/models/ideum07-ref-power-block-arch.png`,
  advancedControls: `${PUBLIC}/models/ideum07-advanced-controls.png`,
  hilTesting: `${PUBLIC}/models/ideum07-hil-testing.png`,
  dispatchableWind200Mw: `${PUBLIC}/models/ideum07-dispatchable-wind-200mw.jpg`,
  renewablePoweredDatacenters: `${PUBLIC}/models/ideum07-renewable-powered-datacenters.jpg`,
  hilTestRefArchOperation: `${PUBLIC}/models/ideum07-hil-test-ref-arch-operation.jpg`,
  hilTestAdvancedControlsPerformance: `${PUBLIC}/models/ideum07-hil-test-advanced-controls-performance.jpg`,
  ref200ForcedPowerOscillation: `${PUBLIC}/models/ideum07-ref200-forced-power-oscillation.jpg`,
  ref200ContingencyScenarios: `${PUBLIC}/models/ideum07-ref200-contingency-scenarios.jpg`,
  ref200Ssti: `${PUBLIC}/models/ideum07-ref200-ssti.jpg`,
  ref200RideThrough: `${PUBLIC}/models/ideum07-ref200-ride-through.jpg`,
};

export const IDEUM07_ADVANCED_ANALYSIS_PREVIEW_MATCH_GROUP = 'ideum07-advanced-analysis-preview';
/** Upper 2D strip aspect (matched across Advanced Analysis subcards). */
export const IDEUM07_ADVANCED_ANALYSIS_PREVIEW_ASPECT = 4 / 3;

/** Advanced Controls stacked cards: taller 3D strip than default (image share 0.54 vs 0.72). */
export const IDEUM07_ADVANCED_CONTROLS_STACKED_IMAGE_SHARE = 0.69;

const IDEUM07_ADVANCED_ANALYSIS_PREVIEW_IMAGE = {
  previewImageMatchGroup: IDEUM07_ADVANCED_ANALYSIS_PREVIEW_MATCH_GROUP,
  previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
  previewImageFill: true,
  previewImageObjectFit: 'cover',
  previewImageObjectPosition: 'center 42%',
  navModelComingSoon: true,
};

export const IDEUM07_NAV_ROOT = 'root';
export const IDEUM07_DATA_CENTERS_HUB = 'data-centers-hub';
export const IDEUM07_ADVANCED_ANALYSIS = 'advanced-analysis';
export const IDEUM07_ADVANCED_CONTROLS = 'advanced-controls';
export const IDEUM07_HIL_CONTROLLER_SUBMENU = 'hil-controller-submenu';
export const IDEUM07_REFERENCE_ARCHITECTURES = 'reference-architectures';
export const IDEUM07_REF_200MW_SUBMENU = 'ref-200-mw-submenu';

export const IDEUM07_HIL_SUBMENU_PREVIEW_MATCH_GROUP = 'ideum07-hil-submenu-preview';

const IDEUM07_HIL_SUBMENU_PREVIEW_IMAGE = {
  previewImageMatchGroup: IDEUM07_HIL_SUBMENU_PREVIEW_MATCH_GROUP,
  previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
  previewImageFill: true,
  previewImageObjectFit: 'cover',
  previewImageObjectPosition: 'center 42%',
  navModelComingSoon: true,
};

export function getIdeum07SuperBucketTitle(screenId) {
  if (screenId === IDEUM07_ADVANCED_ANALYSIS) return 'Advanced Analysis';
  if (screenId === IDEUM07_ADVANCED_CONTROLS) return 'Advanced Controls';
  if (screenId === IDEUM07_HIL_CONTROLLER_SUBMENU) {
    return 'Controller Hardware-in-the-Loop Testing';
  }
  if (screenId === IDEUM07_REF_200MW_SUBMENU) return '200 MW Architecture';
  if (screenId === IDEUM07_REFERENCE_ARCHITECTURES) {
    return 'Reference Power Block Architectures';
  }
  return null;
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
      navDimmedPreview: true,
    },
    {
      id: 'island-microgrids',
      label: 'Island / Micro Grids',
      preview: 'Island & microgrid solutions',
      modelUrl: IDEUM05_NAV_MODEL_URLS.windwardIslandHomes,
      modelFitScale: 0.64,
      modelYOffset: 0.54,
      navDisabled: true,
      navDimmedPreview: true,
    },
    {
      id: 'submarine',
      label: 'Marine Power/Propulsion',
      preview: 'Coming soon',
      navDisabled: true,
      navDimmedPreview: true,
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
  [IDEUM07_ADVANCED_ANALYSIS]: [
    {
      id: 'ref-power-block-arch',
      label: 'Reference Power Block Architectures',
      navSubtitle: '(Islanded or Grid Connected)',
      preview: 'Reference power block site layouts',
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.refPowerBlockArch,
      ...IDEUM07_ADVANCED_ANALYSIS_PREVIEW_IMAGE,
      navDrillTarget: IDEUM07_REFERENCE_ARCHITECTURES,
      navFeatured: true,
    },
    {
      id: 'advanced-controls',
      label: 'Advanced Controls',
      preview: 'Advanced control strategies',
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.advancedControls,
      ...IDEUM07_ADVANCED_ANALYSIS_PREVIEW_IMAGE,
      navDrillTarget: IDEUM07_ADVANCED_CONTROLS,
      navFeatured: true,
    },
    {
      id: 'hil-controller-testing',
      label: 'Controller Hardware-in-the-Loop Testing',
      preview: 'HIL test bench',
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.hilTesting,
      ...IDEUM07_ADVANCED_ANALYSIS_PREVIEW_IMAGE,
      navDrillTarget: IDEUM07_HIL_CONTROLLER_SUBMENU,
      navFeatured: true,
    },
  ],
  [IDEUM07_HIL_CONTROLLER_SUBMENU]: [
    {
      id: 'test-ref-architecture-operation',
      label: 'Test Reference Architecture Operation',
      preview: 'HIL validation of reference architecture',
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.hilTestRefArchOperation,
      ...IDEUM07_HIL_SUBMENU_PREVIEW_IMAGE,
      navFeatured: true,
    },
    {
      id: 'test-advanced-controls-performance',
      label: 'Test Advanced Controls Performance',
      preview: 'Advanced controls performance HIL (coming soon)',
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.hilTestAdvancedControlsPerformance,
      ...IDEUM07_HIL_SUBMENU_PREVIEW_IMAGE,
      navFeatured: true,
      navDisabled: true,
      navDimmedPreview: true,
    },
  ],
  [IDEUM07_ADVANCED_CONTROLS]: [
    {
      id: 'hd-lm-power-sharing-control',
      label: 'HD + LM Power Sharing Control',
      preview: 'HD and LM2500 power sharing control study',
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.hdAeroSharing,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM07_ADVANCED_CONTROLS_STACKED_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.hd7Ha,
      modelFitScale: 0.88,
      modelYOffset: 0.48,
      cameraPitchLift: 0.38,
      navFeatured: true,
      navLoadDesignCatalog: 'hd_aero_ideum',
    },
    {
      id: 'renewable-powered-datacenters',
      label: 'Renewable Powered Datacenters',
      preview: 'Renewable-powered datacenter controls (coming soon)',
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.renewablePoweredDatacenters,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM07_ADVANCED_CONTROLS_STACKED_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.windTurbineField,
      modelFitScale: 0.12,
      modelYOffset: 0.01,
      cameraPitchLift: 0.48,
      modelUrlSecondary: IDEUM05_NAV_MODEL_URLS.solarField,
      modelFitScaleSecondary: 0.68,
      modelYOffsetSecondary: 0.14,
      cameraPitchLiftSecondary: 0.52,
      navFeatured: true,
      navDisabled: true,
      navDimmedPreview: true,
    },
  ],
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
      navDrillTarget: IDEUM07_REF_200MW_SUBMENU,
      navFeatured: true,
    },
    {
      id: 'dispatchable-wind-200-mw',
      label: 'Dispatchable wind powered 200 MW architecture',
      preview: 'Wind-powered dispatchable 200 MW site',
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.dispatchableWind200Mw,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.ref500Mw,
      modelFitScale: 0.92,
      modelYOffset: 0.1,
      cameraPitchLift: 0.5,
      navFeatured: true,
    },
    {
      id: 'ref-500-mw-arch',
      label: '500 MW architecture',
      preview: '500 MW reference design (coming soon)',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.ref500Mw,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
      navModelComingSoon: true,
      navFeatured: true,
      navDisabled: true,
      navDimmedPreview: true,
    },
  ],
};

const DRILL_IDS = new Set(['island-microgrids', 'industrial']);

function freezeIdeum07NavCardsDisabledLast(screenId) {
  const cards = SCREENS[screenId] || [];
  const active = [];
  const disabled = [];
  for (const card of cards) {
    if (card?.navDisabled) disabled.push(card);
    else active.push(card);
  }
  return Object.freeze([...active, ...disabled]);
}

/** Stable arrays — do not allocate per getIdeum07NavCards call (avoids layout effect loops). */
const IDEUM07_ADVANCED_ANALYSIS_CARDS = freezeIdeum07NavCardsDisabledLast(
  IDEUM07_ADVANCED_ANALYSIS,
);
const IDEUM07_REFERENCE_ARCHITECTURES_CARDS = freezeIdeum07NavCardsDisabledLast(
  IDEUM07_REFERENCE_ARCHITECTURES,
);
const IDEUM07_ADVANCED_CONTROLS_CARDS = freezeIdeum07NavCardsDisabledLast(
  IDEUM07_ADVANCED_CONTROLS,
);
const IDEUM07_HIL_CONTROLLER_SUBMENU_CARDS = freezeIdeum07NavCardsDisabledLast(
  IDEUM07_HIL_CONTROLLER_SUBMENU,
);

export function getIdeum07NavCards(screenId) {
  if (screenId === IDEUM07_ADVANCED_ANALYSIS) {
    return IDEUM07_ADVANCED_ANALYSIS_CARDS;
  }
  if (screenId === IDEUM07_ADVANCED_CONTROLS) {
    return IDEUM07_ADVANCED_CONTROLS_CARDS;
  }
  if (screenId === IDEUM07_HIL_CONTROLLER_SUBMENU) {
    return IDEUM07_HIL_CONTROLLER_SUBMENU_CARDS;
  }
  if (screenId === IDEUM07_REFERENCE_ARCHITECTURES) {
    return IDEUM07_REFERENCE_ARCHITECTURES_CARDS;
  }
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

export const IDEUM07_ROOT_GROUP = {
  titlePx: 42,
  /** Side/bottom frame thickness as a fraction of title bar height (canvas px). */
  wallShare: 0.5,
  /** Uniform canvas px: super-bucket gap, inset from bucket walls, gap between sub-tiles. */
  subsetGap: 22,
  get bucketPad() {
    return this.subsetGap;
  },
  get superBucketSeparation() {
    return this.subsetGap;
  },
  get bucketGap() {
    return this.bucketPad + this.superBucketSeparation;
  },
  get wallPx() {
    return Math.max(12, Math.round(this.titlePx * this.wallShare));
  },
};

/** Small canvas-space pad so bucket borders are not flush with the clip edge. */
const IDEUM07_NAV_FIT_SCREEN_INSET_PX = 8;

/** Screen-pixel inset for auto-fit Ideum07 nav (matches scaleIdeum07NavToViewport inset × zoom). */
export function ideum07NavScreenInsetPx(zoom) {
  const z = Math.max(Number(zoom) || 1, 0.01);
  return Math.max(8, Math.round(IDEUM07_NAV_FIT_SCREEN_INSET_PX * z));
}

function getIdeum07FitCanvas(viewport) {
  const vw =
    viewport?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1920);
  const vh =
    viewport?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 1080);
  const zoom = Math.max(Number(viewport?.zoom) || 1, 0.01);
  return {
    vw,
    vh,
    zoom,
    canvasW: vw / zoom,
    canvasH: vh / zoom,
    inset: IDEUM07_NAV_FIT_SCREEN_INSET_PX / zoom,
  };
}

/**
 * Stretch the menu bbox to the visible canvas (object-fit: fill).
 * Independent X/Y scale so there is no letterboxing; tile aspect ratios follow the window.
 */
function mapIdeum07ChromeRects(chrome, mapRect) {
  if (!chrome) return null;
  const out = {};
  for (const [key, rect] of Object.entries(chrome)) {
    if (rect && Number.isFinite(rect.x) && Number.isFinite(rect.width)) {
      out[key] = mapRect(rect);
    }
  }
  return Object.keys(out).length ? out : null;
}

function scaleIdeum07NavToViewport(cardLayouts, chrome, canvasWidth, canvasHeight, inset = 8) {
  const extras = chrome
    ? Object.values(chrome).filter(
        (r) => r && Number.isFinite(r.x) && Number.isFinite(r.width),
      )
    : [];
  const rects = [...(cardLayouts || []), ...extras].filter(
    (r) => r && Number.isFinite(r.x) && Number.isFinite(r.width),
  );
  if (!rects.length || canvasWidth <= 0 || canvasHeight <= 0) {
    return { cardLayouts, chrome, fitScale: 1, fitScaleX: 1, fitScaleY: 1 };
  }

  let minL = Infinity;
  let minT = Infinity;
  let maxR = 0;
  let maxB = 0;
  for (const r of rects) {
    minL = Math.min(minL, r.x);
    minT = Math.min(minT, r.y);
    maxR = Math.max(maxR, r.x + r.width);
    maxB = Math.max(maxB, r.y + r.height);
  }

  const contentW = Math.max(1, maxR - minL);
  const contentH = Math.max(1, maxB - minT);
  const availW = Math.max(1, canvasWidth - inset * 2);
  const availH = Math.max(1, canvasHeight - inset * 2);
  const fitScaleX = availW / contentW;
  const fitScaleY = availH / contentH;

  const mapRect = (r) => ({
    ...r,
    x: inset + (r.x - minL) * fitScaleX,
    y: inset + (r.y - minT) * fitScaleY,
    width: r.width * fitScaleX,
    height: r.height * fitScaleY,
  });

  return {
    cardLayouts: (cardLayouts || []).map(mapRect),
    chrome: mapIdeum07ChromeRects(chrome, mapRect),
    fitScale: Math.min(fitScaleX, fitScaleY),
    fitScaleX,
    fitScaleY,
  };
}

/** Three-pane super-bucket (Advanced Analysis menu or Reference Power Block submenu). */
export function computeIdeum07ThreePaneSuperBucketLayout(
  viewportWidth,
  viewportHeight,
  zoom = 1,
  cardCount = 3,
  chromeKey = 'superBucket',
) {
  const { canvasW, canvasH, inset } = getIdeum07FitCanvas({
    width: viewportWidth,
    height: viewportHeight,
    zoom,
  });
  const { titlePx, subsetGap, wallPx } = IDEUM07_ROOT_GROUP;
  const cardInset = wallPx + subsetGap;

  const chromeX = inset;
  const chromeY = inset;
  const chromeW = Math.max(1, canvasW - inset * 2);
  const chromeH = Math.max(1, canvasH - inset * 2);

  const innerX = chromeX + cardInset;
  const innerY = chromeY + titlePx + subsetGap;
  const innerW = Math.max(1, chromeW - cardInset * 2);
  const innerH = Math.max(
    160,
    chromeH - titlePx - subsetGap - wallPx - subsetGap,
  );

  const gaps = Math.max(0, cardCount - 1) * subsetGap;
  const cardW = Math.max(200, Math.floor((innerW - gaps) / cardCount));
  const cardH = Math.max(400, innerH);

  const cardLayouts = Array.from({ length: cardCount }, (_, i) => ({
    x: innerX + i * (cardW + subsetGap),
    y: innerY,
    width: cardW,
    height: cardH,
  }));

  const chrome = {
    [chromeKey]: {
      x: chromeX,
      y: chromeY,
      width: chromeW,
      height: chromeH,
    },
  };

  return scaleIdeum07NavToViewport(cardLayouts, chrome, canvasW, canvasH, inset);
}

/** Two-pane super-bucket stacked vertically (CHIL submenu). */
export function computeIdeum07VerticalStackSuperBucketLayout(
  viewportWidth,
  viewportHeight,
  zoom = 1,
  cardCount = 2,
  chromeKey = 'hilSubmenu',
) {
  const { canvasW, canvasH, inset } = getIdeum07FitCanvas({
    width: viewportWidth,
    height: viewportHeight,
    zoom,
  });
  const { titlePx, subsetGap, wallPx } = IDEUM07_ROOT_GROUP;
  const cardInset = wallPx + subsetGap;

  const chromeX = inset;
  const chromeY = inset;
  const chromeW = Math.max(1, canvasW - inset * 2);
  const chromeH = Math.max(1, canvasH - inset * 2);

  const innerX = chromeX + cardInset;
  const innerY = chromeY + titlePx + subsetGap;
  const innerW = Math.max(1, chromeW - cardInset * 2);
  const innerH = Math.max(
    160,
    chromeH - titlePx - subsetGap - wallPx - subsetGap,
  );

  const gaps = Math.max(0, cardCount - 1) * subsetGap;
  const cardW = innerW;
  const cardH = Math.max(180, Math.floor((innerH - gaps) / cardCount));

  const cardLayouts = Array.from({ length: cardCount }, (_, i) => ({
    x: innerX,
    y: innerY + i * (cardH + subsetGap),
    width: cardW,
    height: cardH,
  }));

  const chrome = {
    [chromeKey]: {
      x: chromeX,
      y: chromeY,
      width: chromeW,
      height: chromeH,
    },
  };

  return scaleIdeum07NavToViewport(cardLayouts, chrome, canvasW, canvasH, inset);
}

export function computeIdeum07ReferenceArchGroupedLayout(
  viewportWidth,
  viewportHeight,
  zoom = 1,
  cardCount = 3,
) {
  return computeIdeum07ThreePaneSuperBucketLayout(
    viewportWidth,
    viewportHeight,
    zoom,
    cardCount,
    'refArch',
  );
}

/**
 * Ideum07 root: | Stability Solutions ⊃ Grid | Applications ⊃ (3× gray + Data Centers) |
 * Uses the same pane sizes as computeIdeum05RootCardLayout, regrouped only.
 */
export function computeIdeum07RootGroupedLayout(viewportWidth, viewportHeight, zoom = 1) {
  const { canvasW, canvasH, inset } = getIdeum07FitCanvas({
    width: viewportWidth,
    height: viewportHeight,
    zoom,
  });
  const legacy = computeIdeum05RootCardLayout(viewportWidth, viewportHeight, zoom);
  if (!legacy || legacy.length < 5) {
    return scaleIdeum07NavToViewport(legacy, null, canvasW, canvasH, inset);
  }

  const [left0, left1, left2, dc, grid] = legacy;
  const stackW = left0.width;
  const dcW = dc.width;
  const stabilityW = grid.width;
  const mainY = dc.y;
  const mainH = dc.height;
  const { bucketGap, bucketPad, titlePx, subsetGap, wallPx } = IDEUM07_ROOT_GROUP;
  const cardInset = wallPx + subsetGap;

  const stabilityX = left0.x;
  const chromeY = mainY - titlePx - bucketPad;
  const chromeBottom = mainY + mainH;
  const appsChromeX = stabilityX + stabilityW + bucketGap - bucketPad;
  const innerY = chromeY + titlePx + subsetGap;
  const innerH = Math.max(160, chromeBottom - wallPx - subsetGap - innerY);

  const dcX = appsChromeX + cardInset;
  const stackX = dcX + dcW + subsetGap;
  const appsContentW = dcW + subsetGap + stackW;

  const stackCount = 3;
  const stackGaps = (stackCount - 1) * subsetGap;
  const subRowH = Math.max(72, Math.floor((innerH - stackGaps) / stackCount));

  const cardLayouts = [
    { ...left0, x: stackX, y: innerY, width: stackW, height: subRowH },
    {
      ...left1,
      x: stackX,
      y: innerY + (subRowH + subsetGap),
      width: stackW,
      height: subRowH,
    },
    {
      ...left2,
      x: stackX,
      y: innerY + 2 * (subRowH + subsetGap),
      width: stackW,
      height: subRowH,
    },
    { ...dc, x: dcX, y: innerY, width: dcW, height: innerH },
    {
      ...grid,
      x: stabilityX + cardInset,
      y: innerY,
      width: Math.max(120, stabilityW - cardInset * 2),
      height: innerH,
    },
  ];

  const chrome = {
    stability: {
      x: stabilityX,
      y: chromeY,
      width: stabilityW,
      height: mainH + titlePx + bucketPad,
    },
    applications: {
      x: appsChromeX,
      y: chromeY,
      width: appsContentW + cardInset * 2,
      height: mainH + titlePx + bucketPad,
    },
  };

  return scaleIdeum07NavToViewport(cardLayouts, chrome, canvasW, canvasH, inset);
}

export function getIdeum07RootLayoutChrome(screenId, viewport) {
  if (screenId !== IDEUM07_NAV_ROOT) return null;
  const fit = getIdeum07FitCanvas(viewport);
  return computeIdeum07RootGroupedLayout(fit.vw, fit.vh, fit.zoom).chrome;
}

export function getIdeum07SuperBucketLayoutChrome(screenId, viewport) {
  const fit = getIdeum07FitCanvas(viewport);
  if (screenId === IDEUM07_ADVANCED_ANALYSIS) {
    const grouped = computeIdeum07ThreePaneSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      3,
      'advancedAnalysis',
    );
    return grouped.chrome?.advancedAnalysis ?? null;
  }
  if (screenId === IDEUM07_ADVANCED_CONTROLS) {
    const grouped = computeIdeum07ThreePaneSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      2,
      'advancedControls',
    );
    return grouped.chrome?.advancedControls ?? null;
  }
  if (screenId === IDEUM07_HIL_CONTROLLER_SUBMENU) {
    const grouped = computeIdeum07VerticalStackSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      2,
      'hilSubmenu',
    );
    return grouped.chrome?.hilSubmenu ?? null;
  }
  if (screenId === IDEUM07_REFERENCE_ARCHITECTURES) {
    const grouped = computeIdeum07ReferenceArchGroupedLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      3,
    );
    return grouped.chrome?.refArch ?? null;
  }
  return null;
}

/** Reuse Ideum05 layout math; Ideum07 root + ref-arch scale to fit visible canvas. */
export function getIdeum07NavCardLayout(screenId, viewport) {
  const fit = getIdeum07FitCanvas(viewport);
  if (screenId === IDEUM07_ADVANCED_ANALYSIS) {
    return computeIdeum07ThreePaneSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      3,
      'advancedAnalysis',
    ).cardLayouts;
  }
  if (screenId === IDEUM07_ADVANCED_CONTROLS) {
    return computeIdeum07ThreePaneSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      2,
      'advancedControls',
    ).cardLayouts;
  }
  if (screenId === IDEUM07_HIL_CONTROLLER_SUBMENU) {
    return computeIdeum07VerticalStackSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      2,
      'hilSubmenu',
    ).cardLayouts;
  }
  if (screenId === IDEUM07_REFERENCE_ARCHITECTURES) {
    return computeIdeum07ReferenceArchGroupedLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      3,
    ).cardLayouts;
  }
  if (screenId === IDEUM07_NAV_ROOT) {
    return computeIdeum07RootGroupedLayout(fit.vw, fit.vh, fit.zoom).cardLayouts;
  }
  return getIdeum05Layout(screenId, viewport);
}

/** Root + ref-arch menus scale to the viewport; saved canvas pan is not applied. */
export function isIdeum07AutoFitNavScreen(screenId) {
  return (
    screenId === IDEUM07_NAV_ROOT
    || screenId === IDEUM07_ADVANCED_ANALYSIS
    || screenId === IDEUM07_ADVANCED_CONTROLS
    || screenId === IDEUM07_HIL_CONTROLLER_SUBMENU
    || screenId === IDEUM07_REFERENCE_ARCHITECTURES
  );
}

/** Pixel sizes for super-bucket title bar + frame ring (matches Ideum07NavLayer root chrome). */
export function getIdeum07RootBucketChrome(zoom) {
  const z = Math.max(Number(zoom) || 1, 0.01);
  const { titlePx, wallShare, subsetGap } = IDEUM07_ROOT_GROUP;
  const bucketTitleH = Math.max(28, Math.round(titlePx * z));
  const bucketWallH = Math.max(14, Math.round(bucketTitleH * wallShare));
  const bucketTitleFont = Math.max(13, Math.round(20 * z));
  const subsetGapPx = Math.max(14, Math.round(subsetGap * z));
  return {
    bucketTitleH,
    bucketWallH,
    bucketTitleFont,
    subsetGapPx,
    bucketGapPx: subsetGapPx * 2,
    cssVars: {
      '--ideum07-bucket-title': `${bucketTitleH}px`,
      '--ideum07-bucket-wall': `${bucketWallH}px`,
    },
  };
}

/** Absolute super-bucket rect wrapping laid-out nav slots (title bar sits above card tops). */
export function computeIdeum07SlotGroupChrome(slots, zoom) {
  if (!Array.isArray(slots) || !slots.length) return null;

  let minL = Infinity;
  let minT = Infinity;
  let maxR = 0;
  let maxB = 0;
  for (const slot of slots) {
    minL = Math.min(minL, slot.left);
    minT = Math.min(minT, slot.top);
    maxR = Math.max(maxR, slot.left + slot.width);
    maxB = Math.max(maxB, slot.top + slot.height);
  }

  const bucketChrome = getIdeum07RootBucketChrome(zoom);
  const { bucketTitleH, subsetGapPx } = bucketChrome;
  const insetPx = ideum07NavScreenInsetPx(zoom);
  const top = Math.max(insetPx, minT - bucketTitleH - subsetGapPx);

  return {
    ...bucketChrome,
    rect: {
      left: minL,
      top,
      width: Math.max(1, maxR - minL),
      height: Math.max(1, maxB - top),
    },
  };
}

export const IDEUM07_DATA_CENTERS_PREVIEW_ASPECT = IDEUM05_DATA_CENTERS_PREVIEW_ASPECT;
export const IDEUM07_DATA_CENTERS_PREVIEW_MATCH_GROUP = IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP;
