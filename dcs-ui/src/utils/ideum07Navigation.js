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
} from './ideum05Navigation';

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
  /** Hub “High-Fidelity Analysis” pane — reference-architecture site diagram. */
  highFidelityHub: `${PUBLIC}/models/ideum07-high-fidelity-hub.jpg`,
  /** Reference Architectures — HD + Aero power sharing card. */
  hdAeroSharing: `${PUBLIC}/models/ideum07-hd-aero-sharing.jpg`,
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
      previewImageUrl: IDEUM07_NAV_IMAGE_URLS.hdAeroSharing,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.hd7Ha,
      modelFitScale: 0.88,
      modelYOffset: 0.48,
      cameraPitchLift: 0.38,
      navFeatured: true,
      navLoadDesignCatalog: 'hd_aero_ideum',
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

const IDEUM07_ROOT_GROUP = {
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
function scaleIdeum07NavToViewport(cardLayouts, chrome, canvasWidth, canvasHeight, inset = 8) {
  const extras = chrome ? [chrome.stability, chrome.applications] : [];
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
    chrome: chrome
      ? {
          stability: mapRect(chrome.stability),
          applications: mapRect(chrome.applications),
        }
      : null,
    fitScale: Math.min(fitScaleX, fitScaleY),
    fitScaleX,
    fitScaleY,
  };
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

/** Reuse Ideum05 layout math; Ideum07 root + ref-arch scale to fit visible canvas. */
export function getIdeum07NavCardLayout(screenId, viewport) {
  const fit = getIdeum07FitCanvas(viewport);
  if (screenId === IDEUM07_REFERENCE_ARCHITECTURES) {
    const raw = getIdeum05Layout('data-centers', viewport);
    return scaleIdeum07NavToViewport(raw, null, fit.canvasW, fit.canvasH, fit.inset).cardLayouts;
  }
  if (screenId === IDEUM07_NAV_ROOT) {
    return computeIdeum07RootGroupedLayout(fit.vw, fit.vh, fit.zoom).cardLayouts;
  }
  return getIdeum05Layout(screenId, viewport);
}

/** Root + ref-arch menus scale to the viewport; saved canvas pan is not applied. */
export function isIdeum07AutoFitNavScreen(screenId) {
  return screenId === IDEUM07_NAV_ROOT || screenId === IDEUM07_REFERENCE_ARCHITECTURES;
}

export const IDEUM07_DATA_CENTERS_PREVIEW_ASPECT = IDEUM05_DATA_CENTERS_PREVIEW_ASPECT;
export const IDEUM07_DATA_CENTERS_PREVIEW_MATCH_GROUP = IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP;
