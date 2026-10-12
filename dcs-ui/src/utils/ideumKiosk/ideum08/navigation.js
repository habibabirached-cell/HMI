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
  IDEUM05_HD_AERO_IDEUM_CATALOG as IDEUM08_HD_AERO_IDEUM_CATALOG,
  IDEUM05_HD_AERO_MAINGEAR_CATALOG as IDEUM08_HD_AERO_MAINGEAR_CATALOG,
  IDEUM05_P2R18_MAINGEAR_CATALOG as IDEUM08_P2R18_MAINGEAR_CATALOG,
  cloneIdeum05NavViewport as cloneIdeum08NavViewport,
  ideum05NavViewportFromSystemState as ideum08NavViewportFromSystemState,
  normalizeIdeum05NavViewports as normalizeIdeum08NavViewports,
};

const PUBLIC = process.env.PUBLIC_URL || '';

/** Same on-disk assets as Ideum07 until ideum08-specific art is added under public/models/. */
export const IDEUM08_NAV_IMAGE_URLS = {
  highFidelityHub: `${PUBLIC}/models/ideum08-advanced-analysis-hub.jpg`,
  hdAeroSharing: `${PUBLIC}/models/ideum07-hd-aero-sharing.jpg`,
  refPowerBlockArch: `${PUBLIC}/models/ideum08-ref-power-block-arch.jpg`,
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
  ref200Mvups: `${PUBLIC}/models/ideum08-ref200-mvups.jpg`,
  ref200Sst: `${PUBLIC}/models/ideum08-ref200-sst.jpg`,
};

export const IDEUM08_ADVANCED_ANALYSIS_PREVIEW_MATCH_GROUP = 'ideum08-advanced-analysis-preview';
/** Upper 2D strip aspect (matched across Advanced Analysis subcards). */
export const IDEUM08_ADVANCED_ANALYSIS_PREVIEW_ASPECT = 4 / 3;

/** Advanced Controls stacked cards: taller 3D strip than default (image share 0.54 vs 0.72). */
export const IDEUM08_ADVANCED_CONTROLS_STACKED_IMAGE_SHARE = 0.69;

const IDEUM08_ADVANCED_ANALYSIS_PREVIEW_IMAGE = {
  previewImageMatchGroup: IDEUM08_ADVANCED_ANALYSIS_PREVIEW_MATCH_GROUP,
  previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
  previewImageFill: true,
  previewImageObjectFit: 'cover',
  previewImageObjectPosition: 'center 42%',
  navModelComingSoon: true,
};

export { IDEUM08_CATALOG } from '../common/registry';
export const IDEUM08_NAV_ROOT = 'root';
/** Ideum08 root super-bucket title (replaces Ideum07 “Applications”). */
export const IDEUM08_ROOT_SUPER_BUCKET_TITLE = 'E-E: Ecosystem Enlightener';
export const IDEUM08_ROOT_SUPER_BUCKET_ARIA =
  'The ecosystem enlightener. E-E: Ecosystem Enlightener.';
export const IDEUM08_DATA_CENTERS_HUB = 'data-centers-hub';
export const IDEUM08_ADVANCED_ANALYSIS = 'advanced-analysis';
export const IDEUM08_ADVANCED_CONTROLS = 'advanced-controls';
export const IDEUM08_HIL_CONTROLLER_SUBMENU = 'hil-controller-submenu';
export const IDEUM08_REFERENCE_ARCHITECTURES = 'reference-architectures';
export const IDEUM08_REF_200MW_SUBMENU = 'ref-200-mw-submenu';

export const IDEUM08_HIL_SUBMENU_PREVIEW_MATCH_GROUP = 'ideum08-hil-submenu-preview';

const IDEUM08_HIL_SUBMENU_PREVIEW_IMAGE = {
  previewImageMatchGroup: IDEUM08_HIL_SUBMENU_PREVIEW_MATCH_GROUP,
  previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
  previewImageFill: true,
  previewImageObjectFit: 'cover',
  previewImageObjectPosition: 'center 42%',
  navModelComingSoon: true,
};

export function getIdeum08SuperBucketTitle(screenId) {
  if (screenId === IDEUM08_ADVANCED_ANALYSIS) return 'Advanced Analysis';
  if (screenId === IDEUM08_ADVANCED_CONTROLS) return 'Advanced Controls';
  if (screenId === IDEUM08_HIL_CONTROLLER_SUBMENU) {
    return 'Controller Hardware-in-the-Loop Testing';
  }
  if (screenId === IDEUM08_REF_200MW_SUBMENU) return '200 MW Architecture';
  if (screenId === IDEUM08_REFERENCE_ARCHITECTURES) {
    return 'Reference Power Block Architectures';
  }
  return null;
}

export function getIdeum08NavScreen(stack) {
  if (!Array.isArray(stack) || !stack.length) return IDEUM08_NAV_ROOT;
  return stack[stack.length - 1];
}

export const IDEUM08_OVERLAY_SAVE_TARGETS = {
  'ref-500-mw': {
    catalogDir: IDEUM05_HD_AERO_IDEUM_CATALOG,
    saveName: 'HD_Aero Ideum',
  },
};

export function getIdeum08OverlaySaveTarget(screenId) {
  return IDEUM08_OVERLAY_SAVE_TARGETS[screenId] ?? null;
}

export function isIdeum08OverlayScreen(screenId) {
  return getIdeum08OverlaySaveTarget(screenId) != null;
}

export function getIdeum08OverlayClusterCommand(screenId) {
  if (screenId === 'ref-500-mw') return 'loadHdAero';
  return null;
}

export function getIdeum08ControlsClusterCommand(screenId) {
  if (screenId === 'ref-200-mw') return 'loadP2R18';
  return null;
}

export function getIdeum08NavClusterCommand(screenId, cardId) {
  const card = getIdeum08NavCards(screenId).find((c) => c.id === cardId);
  const cmd = card?.navClusterCommand;
  return typeof cmd === 'string' && cmd.trim() ? cmd.trim() : null;
}

export function getIdeum08NavLoadDesignCatalog(screenId, cardId) {
  const card = getIdeum08NavCards(screenId).find((c) => c.id === cardId);
  const dir = card?.navLoadDesignCatalog;
  return typeof dir === 'string' && dir.trim() ? dir.trim() : null;
}

export function isIdeum08ControlsScreen(screenId) {
  return screenId === 'ref-200-mw';
}

export function isIdeum08HdAeroScreen(screenId) {
  return screenId === 'ref-500-mw';
}

export function isIdeum08DesignScreen(screenId) {
  return isIdeum08ControlsScreen(screenId) || isIdeum08OverlayScreen(screenId);
}

export function isIdeum08HubScreen(screenId) {
  return screenId === IDEUM08_DATA_CENTERS_HUB;
}

export function isIdeum08ReferenceArchScreen(screenId) {
  return screenId === IDEUM08_REFERENCE_ARCHITECTURES;
}

export function getIdeum08OverlayDesignDir(screenId) {
  const target = IDEUM08_OVERLAY_SAVE_TARGETS[screenId];
  return target?.catalogDir ?? null;
}

const SCREENS = {
  [IDEUM08_NAV_ROOT]: [
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
      navDrillTarget: IDEUM08_DATA_CENTERS_HUB,
      modelUrl: IDEUM05_NAV_MODEL_URLS.outdoorDataCenter,
      modelFitScale: 0.8,
      modelYOffset: 0.54,
      cameraPitchLift: 1.06,
      navFeatured: true,
    },
  ],
  [IDEUM08_DATA_CENTERS_HUB]: [],
  [IDEUM08_ADVANCED_ANALYSIS]: [
    {
      id: 'ref-power-block-arch',
      label: 'Reference Power Block Architectures',
      navSubtitle: '(Islanded or Grid Connected)',
      preview: 'Reference power block site layouts',
      previewImageUrl: IDEUM08_NAV_IMAGE_URLS.refPowerBlockArch,
      ...IDEUM08_ADVANCED_ANALYSIS_PREVIEW_IMAGE,
      navDrillTarget: IDEUM08_REFERENCE_ARCHITECTURES,
      navFeatured: true,
    },
    {
      id: 'advanced-controls',
      label: 'Advanced Controls',
      preview: 'Advanced control strategies',
      previewImageUrl: IDEUM08_NAV_IMAGE_URLS.advancedControls,
      ...IDEUM08_ADVANCED_ANALYSIS_PREVIEW_IMAGE,
      navDrillTarget: IDEUM08_ADVANCED_CONTROLS,
      navFeatured: true,
    },
    {
      id: 'hil-controller-testing',
      label: 'Controller Hardware-in-the-Loop Testing',
      preview: 'HIL test bench',
      previewImageUrl: IDEUM08_NAV_IMAGE_URLS.hilTesting,
      ...IDEUM08_ADVANCED_ANALYSIS_PREVIEW_IMAGE,
      navDrillTarget: IDEUM08_HIL_CONTROLLER_SUBMENU,
      navFeatured: true,
    },
  ],
  [IDEUM08_HIL_CONTROLLER_SUBMENU]: [
    {
      id: 'test-ref-architecture-operation',
      label: 'Test Reference Architecture Operation',
      preview: 'HIL validation of reference architecture',
      previewImageUrl: IDEUM08_NAV_IMAGE_URLS.hilTestRefArchOperation,
      ...IDEUM08_HIL_SUBMENU_PREVIEW_IMAGE,
      navFeatured: true,
    },
    {
      id: 'test-advanced-controls-performance',
      label: 'Test Advanced Controls Performance',
      preview: 'Advanced controls performance HIL (coming soon)',
      previewImageUrl: IDEUM08_NAV_IMAGE_URLS.hilTestAdvancedControlsPerformance,
      ...IDEUM08_HIL_SUBMENU_PREVIEW_IMAGE,
      navFeatured: true,
      navDisabled: true,
      navDimmedPreview: true,
    },
  ],
  [IDEUM08_ADVANCED_CONTROLS]: [
    {
      id: 'hd-lm-power-sharing-control',
      label: 'HD + LM Power Sharing Control',
      preview: 'HD and LM2500 power sharing control study',
      previewImageUrl: IDEUM08_NAV_IMAGE_URLS.hdAeroSharing,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM08_ADVANCED_CONTROLS_STACKED_IMAGE_SHARE,
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
      previewImageUrl: IDEUM08_NAV_IMAGE_URLS.renewablePoweredDatacenters,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM08_ADVANCED_CONTROLS_STACKED_IMAGE_SHARE,
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
  [IDEUM08_REFERENCE_ARCHITECTURES]: [
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
      navDrillTarget: IDEUM08_REF_200MW_SUBMENU,
      navFeatured: true,
    },
    {
      id: 'dispatchable-wind-200-mw',
      label: 'Dispatchable wind powered 200 MW architecture',
      preview: 'Wind-powered dispatchable 200 MW site',
      previewImageUrl: IDEUM08_NAV_IMAGE_URLS.dispatchableWind200Mw,
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

function freezeIdeum08NavCardsDisabledLast(screenId) {
  const cards = SCREENS[screenId] || [];
  const active = [];
  const disabled = [];
  for (const card of cards) {
    if (card?.navDisabled) disabled.push(card);
    else active.push(card);
  }
  return Object.freeze([...active, ...disabled]);
}

/** Stable arrays — do not allocate per getIdeum08NavCards call (avoids layout effect loops). */
const IDEUM08_ADVANCED_ANALYSIS_CARDS = freezeIdeum08NavCardsDisabledLast(
  IDEUM08_ADVANCED_ANALYSIS,
);
const IDEUM08_REFERENCE_ARCHITECTURES_CARDS = freezeIdeum08NavCardsDisabledLast(
  IDEUM08_REFERENCE_ARCHITECTURES,
);
const IDEUM08_ADVANCED_CONTROLS_CARDS = freezeIdeum08NavCardsDisabledLast(
  IDEUM08_ADVANCED_CONTROLS,
);
const IDEUM08_HIL_CONTROLLER_SUBMENU_CARDS = freezeIdeum08NavCardsDisabledLast(
  IDEUM08_HIL_CONTROLLER_SUBMENU,
);

export function getIdeum08NavCards(screenId) {
  if (screenId === IDEUM08_ADVANCED_ANALYSIS) {
    return IDEUM08_ADVANCED_ANALYSIS_CARDS;
  }
  if (screenId === IDEUM08_ADVANCED_CONTROLS) {
    return IDEUM08_ADVANCED_CONTROLS_CARDS;
  }
  if (screenId === IDEUM08_HIL_CONTROLLER_SUBMENU) {
    return IDEUM08_HIL_CONTROLLER_SUBMENU_CARDS;
  }
  if (screenId === IDEUM08_REFERENCE_ARCHITECTURES) {
    return IDEUM08_REFERENCE_ARCHITECTURES_CARDS;
  }
  return SCREENS[screenId] || [];
}

export function getIdeum08NavDrillTarget(screenId, cardId) {
  const card = getIdeum08NavCards(screenId).find((c) => c.id === cardId);
  if (!card || isIdeum08NavCardDisabled(card)) return null;
  if (typeof card.navDrillTarget === 'string' && card.navDrillTarget.trim()) {
    return card.navDrillTarget.trim();
  }
  if (DRILL_IDS.has(cardId)) return cardId;
  return null;
}

export function isIdeum08NavCardDisabled(card) {
  return card?.navDisabled === true;
}

export function isIdeum08NavCardFeatured(card) {
  return card?.navFeatured === true;
}

export const IDEUM08_ROOT_GROUP = {
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
const IDEUM08_NAV_FIT_SCREEN_INSET_PX = 8;

/** Screen-pixel inset for auto-fit Ideum07 nav (matches scaleIdeum08NavToViewport inset × zoom). */
export function ideum08NavScreenInsetPx(zoom) {
  const z = Math.max(Number(zoom) || 1, 0.01);
  return Math.max(8, Math.round(IDEUM08_NAV_FIT_SCREEN_INSET_PX * z));
}

function getIdeum08FitCanvas(viewport) {
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
    inset: IDEUM08_NAV_FIT_SCREEN_INSET_PX / zoom,
  };
}

/**
 * Stretch the menu bbox to the visible canvas (object-fit: fill).
 * Independent X/Y scale so there is no letterboxing; tile aspect ratios follow the window.
 */
function mapIdeum08ChromeRects(chrome, mapRect) {
  if (!chrome) return null;
  const out = {};
  for (const [key, rect] of Object.entries(chrome)) {
    if (rect && Number.isFinite(rect.x) && Number.isFinite(rect.width)) {
      out[key] = mapRect(rect);
    }
  }
  return Object.keys(out).length ? out : null;
}

function scaleIdeum08NavToViewport(cardLayouts, chrome, canvasWidth, canvasHeight, inset = 8) {
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
    chrome: mapIdeum08ChromeRects(chrome, mapRect),
    fitScale: Math.min(fitScaleX, fitScaleY),
    fitScaleX,
    fitScaleY,
  };
}

/** Three-pane super-bucket (Advanced Analysis menu or Reference Power Block submenu). */
export function computeIdeum08ThreePaneSuperBucketLayout(
  viewportWidth,
  viewportHeight,
  zoom = 1,
  cardCount = 3,
  chromeKey = 'superBucket',
) {
  const { canvasW, canvasH, inset } = getIdeum08FitCanvas({
    width: viewportWidth,
    height: viewportHeight,
    zoom,
  });
  const { titlePx, subsetGap, wallPx } = IDEUM08_ROOT_GROUP;
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

  return scaleIdeum08NavToViewport(cardLayouts, chrome, canvasW, canvasH, inset);
}

/** Two-pane super-bucket stacked vertically (CHIL submenu). */
export function computeIdeum08VerticalStackSuperBucketLayout(
  viewportWidth,
  viewportHeight,
  zoom = 1,
  cardCount = 2,
  chromeKey = 'hilSubmenu',
) {
  const { canvasW, canvasH, inset } = getIdeum08FitCanvas({
    width: viewportWidth,
    height: viewportHeight,
    zoom,
  });
  const { titlePx, subsetGap, wallPx } = IDEUM08_ROOT_GROUP;
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

  return scaleIdeum08NavToViewport(cardLayouts, chrome, canvasW, canvasH, inset);
}

export function computeIdeum08ReferenceArchGroupedLayout(
  viewportWidth,
  viewportHeight,
  zoom = 1,
  cardCount = 3,
) {
  return computeIdeum08ThreePaneSuperBucketLayout(
    viewportWidth,
    viewportHeight,
    zoom,
    cardCount,
    'refArch',
  );
}

/**
 * Ideum08 root: Applications super-bucket fills the viewport; Data Centers + three preview tiles inside.
 */
export function computeIdeum08RootGroupedLayout(viewportWidth, viewportHeight, zoom = 1) {
  const { canvasW, canvasH, inset } = getIdeum08FitCanvas({
    width: viewportWidth,
    height: viewportHeight,
    zoom,
  });
  const { titlePx, subsetGap, wallPx } = IDEUM08_ROOT_GROUP;
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

  const legacy = computeIdeum05RootCardLayout(viewportWidth, viewportHeight, zoom);
  let dcRatio = 0.62;
  if (legacy?.length >= 4) {
    const stackWLegacy = legacy[0].width;
    const dcLegacy = legacy[3];
    dcRatio =
      dcLegacy.width / Math.max(1, dcLegacy.width + subsetGap + stackWLegacy);
  }

  const dcW = Math.max(200, Math.floor((innerW - subsetGap) * dcRatio));
  const stackW = Math.max(120, innerW - subsetGap - dcW);
  const dcX = innerX;
  const stackX = innerX + dcW + subsetGap;

  const stackCount = 3;
  const stackGaps = (stackCount - 1) * subsetGap;
  const subRowH = Math.max(72, Math.floor((innerH - stackGaps) / stackCount));

  const base0 = legacy?.[0] || {};
  const base1 = legacy?.[1] || {};
  const base2 = legacy?.[2] || {};
  const baseDc = legacy?.[3] || {};

  const cardLayouts = [
    { ...base0, x: stackX, y: innerY, width: stackW, height: subRowH },
    {
      ...base1,
      x: stackX,
      y: innerY + (subRowH + subsetGap),
      width: stackW,
      height: subRowH,
    },
    {
      ...base2,
      x: stackX,
      y: innerY + 2 * (subRowH + subsetGap),
      width: stackW,
      height: subRowH,
    },
    { ...baseDc, x: dcX, y: innerY, width: dcW, height: innerH },
  ];

  const chrome = {
    applications: {
      x: chromeX,
      y: chromeY,
      width: chromeW,
      height: chromeH,
    },
  };

  return scaleIdeum08NavToViewport(cardLayouts, chrome, canvasW, canvasH, inset);
}

export function getIdeum08RootLayoutChrome(screenId, viewport) {
  if (screenId !== IDEUM08_NAV_ROOT) return null;
  const fit = getIdeum08FitCanvas(viewport);
  return computeIdeum08RootGroupedLayout(fit.vw, fit.vh, fit.zoom).chrome;
}

export function getIdeum08SuperBucketLayoutChrome(screenId, viewport) {
  const fit = getIdeum08FitCanvas(viewport);
  if (screenId === IDEUM08_ADVANCED_ANALYSIS) {
    const grouped = computeIdeum08ThreePaneSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      3,
      'advancedAnalysis',
    );
    return grouped.chrome?.advancedAnalysis ?? null;
  }
  if (screenId === IDEUM08_ADVANCED_CONTROLS) {
    const grouped = computeIdeum08ThreePaneSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      2,
      'advancedControls',
    );
    return grouped.chrome?.advancedControls ?? null;
  }
  if (screenId === IDEUM08_HIL_CONTROLLER_SUBMENU) {
    const grouped = computeIdeum08VerticalStackSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      2,
      'hilSubmenu',
    );
    return grouped.chrome?.hilSubmenu ?? null;
  }
  if (screenId === IDEUM08_REFERENCE_ARCHITECTURES) {
    const grouped = computeIdeum08ReferenceArchGroupedLayout(
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
export function getIdeum08NavCardLayout(screenId, viewport) {
  const fit = getIdeum08FitCanvas(viewport);
  if (screenId === IDEUM08_ADVANCED_ANALYSIS) {
    return computeIdeum08ThreePaneSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      3,
      'advancedAnalysis',
    ).cardLayouts;
  }
  if (screenId === IDEUM08_ADVANCED_CONTROLS) {
    return computeIdeum08ThreePaneSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      2,
      'advancedControls',
    ).cardLayouts;
  }
  if (screenId === IDEUM08_HIL_CONTROLLER_SUBMENU) {
    return computeIdeum08VerticalStackSuperBucketLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      2,
      'hilSubmenu',
    ).cardLayouts;
  }
  if (screenId === IDEUM08_REFERENCE_ARCHITECTURES) {
    return computeIdeum08ReferenceArchGroupedLayout(
      fit.vw,
      fit.vh,
      fit.zoom,
      3,
    ).cardLayouts;
  }
  if (screenId === IDEUM08_NAV_ROOT) {
    return computeIdeum08RootGroupedLayout(fit.vw, fit.vh, fit.zoom).cardLayouts;
  }
  return getIdeum05Layout(screenId, viewport);
}

/** Root + ref-arch menus scale to the viewport; saved canvas pan is not applied. */
export function isIdeum08AutoFitNavScreen(screenId) {
  return (
    screenId === IDEUM08_NAV_ROOT
    || screenId === IDEUM08_ADVANCED_ANALYSIS
    || screenId === IDEUM08_ADVANCED_CONTROLS
    || screenId === IDEUM08_HIL_CONTROLLER_SUBMENU
    || screenId === IDEUM08_REFERENCE_ARCHITECTURES
  );
}

/** Pixel sizes for super-bucket title bar + frame ring (matches Ideum07NavLayer root chrome). */
export function getIdeum08RootBucketChrome(zoom) {
  const z = Math.max(Number(zoom) || 1, 0.01);
  const { titlePx, wallShare, subsetGap } = IDEUM08_ROOT_GROUP;
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
export function computeIdeum08SlotGroupChrome(slots, zoom) {
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

  const bucketChrome = getIdeum08RootBucketChrome(zoom);
  const { bucketTitleH, subsetGapPx } = bucketChrome;
  const insetPx = ideum08NavScreenInsetPx(zoom);
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

export const IDEUM08_DATA_CENTERS_PREVIEW_ASPECT = IDEUM05_DATA_CENTERS_PREVIEW_ASPECT;
export const IDEUM08_DATA_CENTERS_PREVIEW_MATCH_GROUP = IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP;
