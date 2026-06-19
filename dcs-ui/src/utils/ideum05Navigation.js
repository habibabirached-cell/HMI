/** Ideum05 touch-table menu hierarchy (placeholders until real configs load). */

export const IDEUM05_NAV_ROOT = 'root';

const PUBLIC = process.env.PUBLIC_URL || '';

export const IDEUM05_NAV_MODEL_URLS = {
  outdoorDataCenter: `${PUBLIC}/models/outdoor-data-center/model.gltf`,
  windwardIslandHomes: `${PUBLIC}/models/windward-island-homes/model.gltf`,
  industrialPlantComp: `${PUBLIC}/models/industrial-plant-comp/model.gltf`,
};

export const IDEUM05_NAV_IMAGE_URLS = {
  ref300Mw: `${PUBLIC}/models/300MW.png`,
  ref500Mw: `${PUBLIC}/models/500MW.png`,
  dataCenterConfiguration: `${PUBLIC}/models/DataCenterConfiguration.png`,
};

/** 300MW.png / 500MW.png intrinsic aspect — keep paired previews identical pixel size. */
export const IDEUM05_MW_REF_IMAGE_ASPECT = 1448 / 1086;
export const IDEUM05_MW_REF_IMAGE_MATCH_GROUP = 'mw-reference';

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

/** Canvas positions for up to 3 nav cards (matches existing Ideum control layout). */
export const IDEUM05_NAV_CARD_LAYOUT = [
  { x: 80, y: 120, width: 720, height: 480 },
  { x: 80, y: 640, width: 720, height: 380 },
  { x: 900, y: 120, width: 1080, height: 900 },
];

const SCREENS = {
  [IDEUM05_NAV_ROOT]: [
    {
      id: 'data-centers',
      label: 'Data Centers',
      preview: 'Data center applications',
      modelUrl: IDEUM05_NAV_MODEL_URLS.outdoorDataCenter,
      modelFitScale: 0.74,
      modelYOffset: 0.54,
    },
    {
      id: 'island-microgrids',
      label: 'Island / Micro Grids',
      preview: 'Island & microgrid solutions',
      modelUrl: IDEUM05_NAV_MODEL_URLS.windwardIslandHomes,
      modelFitScale: 0.64,
      modelYOffset: 0.54,
    },
    {
      id: 'industrial',
      label: 'Industrial Processes',
      preview: 'Industrial power processes',
      modelUrl: IDEUM05_NAV_MODEL_URLS.industrialPlantComp,
      modelFitScale: 0.74,
      modelYOffset: 0.54,
    },
  ],
  'data-centers': [
    {
      id: 'ref-300',
      label: 'Reference 300 MW',
      preview: '300 MW reference design',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.ref300Mw,
      previewImageMatchGroup: IDEUM05_MW_REF_IMAGE_MATCH_GROUP,
    },
    {
      id: 'ref-500',
      label: 'Reference 500 MW',
      preview: '500 MW reference design',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.ref500Mw,
      previewImageMatchGroup: IDEUM05_MW_REF_IMAGE_MATCH_GROUP,
    },
    {
      id: 'controls',
      label: 'Data Center Configuration',
      preview: 'Interactive configuration',
      previewImageUrl: IDEUM05_NAV_IMAGE_URLS.dataCenterConfiguration,
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

export function ideum05NavCardDrills(cardId) {
  return DRILL_IDS.has(cardId);
}
