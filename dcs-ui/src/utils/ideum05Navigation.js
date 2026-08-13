/** Ideum05 touch-table menu hierarchy (placeholders until real configs load). */

export const IDEUM05_NAV_ROOT = 'root';

const PUBLIC = process.env.PUBLIC_URL || '';

export const IDEUM05_NAV_MODEL_URLS = {
  outdoorDataCenter: `${PUBLIC}/models/outdoor-data-center/model.gltf`,
  windwardIslandHomes: `${PUBLIC}/models/windward-island-homes/model.gltf`,
  industrialPlantComp: `${PUBLIC}/models/industrial-plant-comp/model.gltf`,
  ref200Mw: `${PUBLIC}/models/200MWglb/model.gltf`,
  ref500Mw: `${PUBLIC}/models/500MW/model.gltf`,
};

/** Upper share cap when image + 3D are stacked (aspect ratio usually sets the actual split). */
export const IDEUM05_STACKED_PREVIEW_IMAGE_SHARE = 0.72;

export const IDEUM05_NAV_IMAGE_URLS = {
  ref300Mw: `${PUBLIC}/models/300MW.png`,
  ref500Mw: `${PUBLIC}/models/500MW.png`,
  dataCenterConfiguration: `${PUBLIC}/models/DataCenterConfiguration.png`,
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

export function isIdeum05ControlsScreen(screenId) {
  return screenId === 'controls';
}

/** Root landing: two small cards left, featured card right (index maps to IDEUM05_NAV_CARD_LAYOUT). */
export const IDEUM05_ROOT_NAV_LAYOUT = [
  { x: 80, y: 120, width: 720, height: 480 },
  { x: 80, y: 640, width: 720, height: 380 },
  { x: 900, y: 120, width: 1080, height: 900 },
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

export function getIdeum05NavCardLayout(screenId, viewport = null) {
  if (screenId === 'data-centers') {
    const vw =
      viewport?.width ??
      (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const vh =
      viewport?.height ??
      (typeof window !== 'undefined' ? window.innerHeight : 1080);
    const z = viewport?.zoom ?? 1;
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
      id: 'data-centers',
      label: 'Data Centers',
      preview: 'Data center applications',
      modelUrl: IDEUM05_NAV_MODEL_URLS.outdoorDataCenter,
      modelFitScale: 0.74,
      modelYOffset: 0.54,
      navFeatured: true,
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
      navDrillTarget: 'controls',
    },
    {
      id: 'controls',
      label: 'Data Center Configurator',
      preview: 'Interactive configuration',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.dataCenterConfiguration,
      previewImageMatchGroup: IDEUM05_DATA_CENTERS_PREVIEW_MATCH_GROUP,
      previewImageHeightShare: IDEUM05_STACKED_PREVIEW_IMAGE_SHARE,
      modelUrl: IDEUM05_NAV_MODEL_URLS.outdoorDataCenter,
      modelFitScale: 0.78,
      modelYOffset: 0.54,
      cameraPitchLift: 0.42,
      navDrillTarget: 'controls',
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
      navDisabled: true,
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
  'controls',
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
