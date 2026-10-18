/** Ideum05 touch-table menu hierarchy (placeholders until real configs load). */

export const IDEUM05_NAV_ROOT = 'root';

const PUBLIC = process.env.PUBLIC_URL || '';

export const IDEUM05_NAV_MODEL_URLS = {
  outdoorDataCenter: `${PUBLIC}/models/outdoor-data-center/model.gltf`,
  windwardIslandHomes: `${PUBLIC}/models/windward-island-homes/model.gltf`,
  industrialPlantComp: `${PUBLIC}/models/industrial-plant-comp/model.gltf`,
  ref200Mw: `${PUBLIC}/models/200MWglb/model.gltf`,
  ref500Mw: `${PUBLIC}/models/500MW/model.gltf`,
  gridConnected: `${PUBLIC}/models/GridConnected/model.gltf`,
  submarine: `${PUBLIC}/models/Submareen/model.gltf`,
  /** Heavy-duty 7HA-class (configurator / HD+Aero previews). */
  hd7Ha: `${PUBLIC}/models/7HA.glb`,
  windTurbineField: `${PUBLIC}/models/windTurbineField.glb`,
  solarField: `${PUBLIC}/models/solar/model.gltf`,
};

/** Upper share cap when image + 3D are stacked (aspect ratio usually sets the actual split). */
export const IDEUM05_STACKED_PREVIEW_IMAGE_SHARE = 0.72;

export const IDEUM05_NAV_IMAGE_URLS = {
  ref300Mw: `${PUBLIC}/models/300MW.png`,
  ref500Mw: `${PUBLIC}/models/500MW.png`,
  dataCenterConfiguration: `${PUBLIC}/models/DataCenterConfiguration.png`,
  configurator: `${PUBLIC}/models/configurator.png`,
};

/** Shared diagram aspect for data-centers row previews (PNG assets are 1448×1086). */
export const IDEUM05_DATA_CENTERS_PREVIEW_ASPECT = 1448 / 1086;
export const IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP = 'data-centers-preview';

/** @deprecated use IDEUM05_DATA_CENTERS_PREVIEW_* — kept for imports */
export const IDEUM05_MW_REF_IMAGE_ASPECT = IDEUM05_DATA_CENTERS_PREVIEW_ASPECT;
export const IDEUM05_MW_REF_IMAGE_MATCH_GROUP = IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP;

export function isIdeum05DesignName(name) {
  return typeof name === 'string' && /^Ideum05$/i.test(name.trim());
}

export function getIdeum05NavScreen(stack) {
  if (!Array.isArray(stack) || !stack.length) return IDEUM05_NAV_ROOT;
  return stack[stack.length - 1];
}

/** Maingear HD_Aero catalog (cluster loadHdAero). */
export const IDEUM05_HD_AERO_MAINGEAR_CATALOG = 'hd_aero';

/** Maingear P2R_18 catalog (cluster loadP2R18). */
export const IDEUM05_P2R18_MAINGEAR_CATALOG = 'p2r_18';

/** Maingear dispatchable-wind wall catalog (cluster loadWind02). */
export const IDEUM05_WIND02_MAINGEAR_CATALOG = 'wind02';

/** Ideum-only HD_Aero copy (Reference 500 MW overlay; pan/zoom saved here). */
export const IDEUM05_HD_AERO_IDEUM_CATALOG = 'hd_aero_ideum';

/** @deprecated use IDEUM05_HD_AERO_IDEUM_CATALOG */
export const IDEUM05_HD_AERO_DESIGN_DIR = IDEUM05_HD_AERO_IDEUM_CATALOG;

/**
 * Drill screens that swap in a separate catalog design (Reference 500 MW only).
 * Reference 200 MW keeps the Ideum05 touch-control surface; its zoom/pan is stored
 * in ideum05NavViewports on the main Ideum05 save — not via a loaded overlay.
 */
export const IDEUM05_OVERLAY_SAVE_TARGETS = {
  'ref-500-mw': {
    catalogDir: IDEUM05_HD_AERO_IDEUM_CATALOG,
    saveName: 'HD_Aero Ideum',
  },
};

export function getIdeum05OverlaySaveTarget(screenId) {
  return IDEUM05_OVERLAY_SAVE_TARGETS[screenId] ?? null;
}

export function isIdeum05OverlayScreen(screenId) {
  return getIdeum05OverlaySaveTarget(screenId) != null;
}

/** Maingear cluster command when entering a catalog overlay drill screen. */
export function getIdeum05OverlayClusterCommand(screenId) {
  if (screenId === 'ref-500-mw') return 'loadHdAero';
  return null;
}

/** Cluster command for Reference 200 MW (touch controls, no design overlay). */
export function getIdeum05ControlsClusterCommand(screenId) {
  if (screenId === 'ref-200-mw') return 'loadP2R18';
  return null;
}

/** Cluster command when a nav card is tapped (no drill). */
export function getIdeum05NavClusterCommand(screenId, cardId) {
  const card = getIdeum05NavCards(screenId).find((c) => c.id === cardId);
  const cmd = card?.navClusterCommand;
  return typeof cmd === 'string' && cmd.trim() ? cmd.trim() : null;
}

/** Load a design catalog folder instead of drilling (e.g. Grid Connected -> ideum06). */
export function getIdeum05NavLoadDesignCatalog(screenId, cardId) {
  const card = getIdeum05NavCards(screenId).find((c) => c.id === cardId);
  const dir = card?.navLoadDesignCatalog;
  return typeof dir === 'string' && dir.trim() ? dir.trim() : null;
}

/** Reference 200 MW — Ideum touch preset buttons (Reset / Live RTDS). */
export function isIdeum05ControlsScreen(screenId) {
  return screenId === 'ref-200-mw';
}

export function isIdeum05HdAeroScreen(screenId) {
  return screenId === 'ref-500-mw';
}

/** Hides nav cards: either touch controls (200 MW) or loaded overlay (500 MW). */
export function isIdeum05DesignScreen(screenId) {
  return isIdeum05ControlsScreen(screenId) || isIdeum05OverlayScreen(screenId);
}

export function isIdeum05ConfiguratorScreen(screenId) {
  return screenId === 'configurator';
}

export function getIdeum05OverlayDesignDir(screenId) {
  const target = IDEUM05_OVERLAY_SAVE_TARGETS[screenId];
  return target?.catalogDir ?? null;
}

/** Root landing: three equal left cards + Data Centers + Grid Connected. */
export const IDEUM05_ROOT_NAV_LAYOUT = [
  { x: 80, y: 89, width: 347, height: 348 },
  { x: 80, y: 457, width: 347, height: 348 },
  { x: 80, y: 825, width: 347, height: 348 },
  { x: 447, y: 89, width: 1333, height: 1089 },
  { x: 1800, y: 89, width: 520, height: 1089 },
];

/** Default canvas positions for up to 3 nav cards (root + placeholder sub-screens). */
export const IDEUM05_NAV_CARD_LAYOUT = IDEUM05_ROOT_NAV_LAYOUT;

/** Per-screen layout overrides (data-centers uses computeIdeum05EqualCardLayout). */
export const IDEUM05_NAV_SCREEN_LAYOUTS = {};

/** Padding for three equal data-centers cards (computed from viewport). */
export const IDEUM05_DATA_CENTERS_LAYOUT_PAD = {
  marginX: 40,
  marginY: 72,
  marginBottom: 40,
  gap: 20,
};

/** Three equal columns that fill the visible canvas at the current zoom. */
export function computeIdeum05EqualCardLayout(
  viewportWidth,
  viewportHeight,
  zoom = 1,
  cardCount = 3,
  pad = IDEUM05_DATA_CENTERS_LAYOUT_PAD,
) {
  const z = Math.max(Number(zoom) || 1, 0.01);
  const canvasW = viewportWidth / z;
  const canvasH = viewportHeight / z;
  const { marginX, marginY, marginBottom, gap } = pad;
  const gaps = Math.max(0, cardCount - 1) * gap;
  const width = Math.max(200, Math.floor((canvasW - marginX * 2 - gaps) / cardCount));
  const height = Math.max(400, Math.floor(canvasH - marginY - marginBottom));

  return Array.from({ length: cardCount }, (_, i) => ({
    x: marginX + i * (width + gap),
    y: marginY,
    width,
    height,
  }));
}

/** Padding for root screen (left stack + two right tiles). */
export const IDEUM05_ROOT_LAYOUT_PAD = {
  marginX: 80,
  marginY: 120,
  marginBottom: 40,
  gap: 20,
  leftCardCount: 3,
  /** Left stack width as a fraction of Grid Connected width (2/3 = one-third thinner). */
  leftColumnWidthShare: 2 / 3,
  /** Grid Connected width as a share of the right-hand pair (Data Centers gets the rest). */
  gridConnectedWidthShare: 0.38,
  /** Scale pane height relative to the prior full-bleed layout (1.1 = 10% taller). */
  paneHeightScale: 1.21,
};

/** Root: three equal left tiles (2/3 Grid Connected width) + Data Centers + Grid Connected. */
export function computeIdeum05RootCardLayout(
  viewportWidth,
  viewportHeight,
  zoom = 1,
  pad = IDEUM05_ROOT_LAYOUT_PAD,
) {
  const z = Math.max(Number(zoom) || 1, 0.01);
  const canvasW = viewportWidth / z;
  const canvasH = viewportHeight / z;
  const {
    marginX,
    marginY,
    marginBottom,
    gap,
    gridConnectedWidthShare,
    leftCardCount,
    leftColumnWidthShare,
    paneHeightScale,
  } = pad;
  const baseMarginTotal = marginY + marginBottom;
  const availForPanes = canvasH - baseMarginTotal;
  const mainHeight = Math.max(400, Math.floor(availForPanes * paneHeightScale));
  const marginTotal = Math.max(0, Math.floor(canvasH - mainHeight));
  const marginYAdj = baseMarginTotal > 0
    ? Math.floor(marginY * marginTotal / baseMarginTotal)
    : Math.floor(marginTotal / 2);
  const leftGaps = Math.max(0, leftCardCount - 1) * gap;
  const leftCardH = Math.max(160, Math.floor((mainHeight - leftGaps) / leftCardCount));

  const innerW = canvasW - 2 * marginX;
  const alpha = gridConnectedWidthShare;
  const rightPairW = Math.max(600, Math.floor((innerW - gap) / (1 + 1 / alpha)));
  const gridW = Math.max(480, Math.floor(rightPairW * alpha));
  const leftW = Math.max(320, Math.floor(gridW * leftColumnWidthShare));
  const dataCentersW = Math.max(640, rightPairW - gridW - gap + (gridW - leftW));
  const rightX = marginX + leftW + gap;

  const leftLayouts = Array.from({ length: leftCardCount }, (_, i) => ({
    x: marginX,
    y: marginYAdj + i * (leftCardH + gap),
    width: leftW,
    height: leftCardH,
  }));

  return [
    ...leftLayouts,
    { x: rightX, y: marginYAdj, width: dataCentersW, height: mainHeight },
    { x: rightX + dataCentersW + gap, y: marginYAdj, width: gridW, height: mainHeight },
  ];
}

export function getIdeum05NavCardLayout(screenId, viewport = null) {
  const vw =
    viewport?.width ??
    (typeof window !== 'undefined' ? window.innerWidth : 1920);
  const vh =
    viewport?.height ??
    (typeof window !== 'undefined' ? window.innerHeight : 1080);
  const z = viewport?.zoom ?? 1;
  if (screenId === IDEUM05_NAV_ROOT) {
    return computeIdeum05RootCardLayout(vw, vh, z);
  }
  if (screenId === 'data-centers') {
    return computeIdeum05EqualCardLayout(vw, vh, z, 3);
  }
  return IDEUM05_NAV_SCREEN_LAYOUTS[screenId] || IDEUM05_NAV_CARD_LAYOUT;
}

const SCREENS = {
  [IDEUM05_NAV_ROOT]: [
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
      navLoadDesignCatalog: 'dataCenter',
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
  'data-centers': [
    {
      id: 'ref-300',
      label: 'Reference 200 MW',
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
      id: 'controls',
      label: 'Data Center Configurator',
      preview: 'Interactive configuration',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.configurator,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageFill: true,
      previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.outdoorDataCenter,
      modelFitScale: 0.78,
      modelYOffset: 0.54,
      cameraPitchLift: 0.42,
      navTitleActive: true,
      navLoadDesignCatalog: 'dataConfigurator',
    },
    {
      id: 'ref-500',
      label: 'Reference 500 MW',
      preview: '500 MW reference design',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.ref500Mw,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.ref500Mw,
      modelFitScale: 0.92,
      modelYOffset: 0.1,
      cameraPitchLift: 0.5,
      navFeatured: true,
      navLoadDesignCatalog: 'hd_aero_ideum',
    },
  ],
  'island-microgrids': [
    { id: 'island-ph-1', label: 'Microgrid Reference A', preview: 'Coming soon' },
    { id: 'island-ph-2', label: 'Microgrid Reference B', preview: 'Coming soon' },
    { id: 'island-ph-3', label: 'Island Configuration', preview: 'Coming soon' },
  ],
  industrial: [
    { id: 'ind-ph-1', label: 'Industrial Reference A', preview: 'Coming soon' },
    { id: 'ind-ph-2', label: 'Industrial Reference B', preview: 'Coming soon' },
    { id: 'ind-ph-3', label: 'Process Configuration', preview: 'Coming soon' },
  ],
};

/** Screen ids that drill deeper when a card is tapped. */
const DRILL_IDS = new Set([
  'data-centers',
  'island-microgrids',
  'industrial',
  'configurator',
]);

export function getIdeum05NavCards(screenId) {
  return SCREENS[screenId] || [];
}

export function ideum05NavCardDrills(cardId, screenId = IDEUM05_NAV_ROOT) {
  return getIdeum05NavDrillTarget(screenId, cardId) != null;
}

/** Screen id pushed onto the nav stack when a card is selected (null = no drill). */
export function getIdeum05NavDrillTarget(screenId, cardId) {
  const card = getIdeum05NavCards(screenId).find((c) => c.id === cardId);
  if (!card || isIdeum05NavCardDisabled(card)) return null;
  if (typeof card.navDrillTarget === 'string' && card.navDrillTarget.trim()) {
    return card.navDrillTarget.trim();
  }
  if (DRILL_IDS.has(cardId)) return cardId;
  return null;
}

export function isIdeum05NavCardDisabled(card) {
  return card?.navDisabled === true;
}

export function isIdeum05NavCardFeatured(card) {
  return card?.navFeatured === true;
}

function isFiniteViewportPoint(point) {
  return (
    point &&
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

/** @typedef {{ zoom?: number, pan?: { x: number, y: number }, panTop?: { x: number, y: number }, panBottom?: { x: number, y: number } }} Ideum05NavViewport */

/** Clone a single Ideum05 nav screen viewport for persistence. */
export function cloneIdeum05NavViewport(viewport) {
  if (!viewport || typeof viewport !== 'object') return null;
  /** @type {Ideum05NavViewport} */
  const out = {};
  const zoom = Number(viewport.zoom);
  if (Number.isFinite(zoom)) out.zoom = zoom;
  if (isFiniteViewportPoint(viewport.pan)) out.pan = { x: viewport.pan.x, y: viewport.pan.y };
  if (isFiniteViewportPoint(viewport.panTop)) {
    out.panTop = { x: viewport.panTop.x, y: viewport.panTop.y };
  }
  if (isFiniteViewportPoint(viewport.panBottom)) {
    out.panBottom = { x: viewport.panBottom.x, y: viewport.panBottom.y };
  }
  return Object.keys(out).length ? out : null;
}

/** Build a viewport object from legacy `systemState` (root screen). */
export function ideum05NavViewportFromSystemState(systemState) {
  if (!systemState || typeof systemState !== 'object') return null;
  return cloneIdeum05NavViewport({
    zoom: systemState.zoom,
    pan: systemState.pan,
    panTop: systemState.panTop,
    panBottom: systemState.panBottom,
  });
}

/**
 * Normalize saved per-screen viewports; seed `root` from legacy systemState when missing.
 * @returns {Record<string, Ideum05NavViewport>}
 */
export function normalizeIdeum05NavViewports(raw, legacySystemState = null) {
  /** @type {Record<string, Ideum05NavViewport>} */
  const out = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [screenId, viewport] of Object.entries(raw)) {
      const normalized = cloneIdeum05NavViewport(viewport);
      if (normalized) out[screenId] = normalized;
    }
  }
  if (!out[IDEUM05_NAV_ROOT] && legacySystemState) {
    const rootVp = ideum05NavViewportFromSystemState(legacySystemState);
    if (rootVp) out[IDEUM05_NAV_ROOT] = rootVp;
  }
  return out;
}
