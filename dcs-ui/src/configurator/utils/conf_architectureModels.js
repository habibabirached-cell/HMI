import { getBess3DModelUrl } from '../../utils/bess3dLayout';
import { getGasTurbine3DModelUrl } from '../../utils/gasTurbine3dLayout';
import { IDEUM05_NAV_MODEL_URLS } from '../../utils/ideum05Navigation';

const PUBLIC = process.env.PUBLIC_URL || '';

/** Map supply-mix technology ids to in-card 3D preview assets. */
export const ARCHITECTURE_MODEL_BY_TECH = {
  solar: { kind: 'gltf', url: `${PUBLIC}/models/solar/model.gltf` },
  wind: { kind: 'wind', url: `${PUBLIC}/models/windTurbineField.glb` },
  battery: { kind: 'bess', url: getBess3DModelUrl() },
  hd7ha02: { kind: 'turbine', url: `${PUBLIC}/models/7HA.glb` },
  hd7f05: { kind: 'turbine', url: `${PUBLIC}/models/7HA.glb`, cameraDist: 1.4 },
  lm2500g4: { kind: 'turbine', url: getGasTurbine3DModelUrl() },
  lm250022mw: { kind: 'turbine', url: getGasTurbine3DModelUrl(), cameraDist: 1.0 },
  heavyDutyGT: { kind: 'turbine', url: `${PUBLIC}/models/7HA.glb` },
  aeroderivativeGT: { kind: 'turbine', url: getGasTurbine3DModelUrl() },
  fuelCell: { kind: 'gltf', url: `${PUBLIC}/models/FuelCell/model.gltf`, neutralLight: true },
  recipEngine: { kind: 'gltf', url: `${PUBLIC}/models/recipEngine/model.gltf`, cameraDist: 1.0 },
};

export const DATA_CENTER_MODEL_URL = IDEUM05_NAV_MODEL_URLS.outdoorDataCenter;

export function getArchitectureModelSpec(techId) {
  return ARCHITECTURE_MODEL_BY_TECH[techId] || { kind: 'turbine', url: getGasTurbine3DModelUrl() };
}

/** Full concentric donuts — inner edges flush (no gap) in viewBox units. */
export const ARCHITECTURE_DC_CORE_RADIUS = 16;
const ARCHITECTURE_RING_BAND = 6 * 0.9;
export const ARCHITECTURE_TITLE_INNER = ARCHITECTURE_DC_CORE_RADIUS;
export const ARCHITECTURE_TITLE_OUTER = ARCHITECTURE_TITLE_INNER + ARCHITECTURE_RING_BAND;
export const ARCHITECTURE_BUS_INNER = ARCHITECTURE_TITLE_OUTER;
export const ARCHITECTURE_BUS_OUTER = ARCHITECTURE_BUS_INNER + ARCHITECTURE_RING_BAND;
export const ARCHITECTURE_TITLE_RING_RADIUS = (ARCHITECTURE_TITLE_INNER + ARCHITECTURE_TITLE_OUTER) / 2;
export const ARCHITECTURE_BUS_RING_RADIUS = (ARCHITECTURE_BUS_INNER + ARCHITECTURE_BUS_OUTER) / 2;

/** Hub center — outer ring top edge sits at viewBox y=0 (flush with pane top). */
export const ARCHITECTURE_CENTER = { x: 50, y: ARCHITECTURE_BUS_OUTER };

/** Prefer corners, side midpoints, then slot under the data center.
 *  Slot index maps to sortArchitectureAssets() order (see ARCHITECTURE_ASSET_GROUP_ORDER). */
const ARCHITECTURE_ASSET_SLOTS = [
  { left: 76, top: 20 }, // 0 — solar
  { left: 91, top: 20 }, // 1 — wind
  { left: 91, top: 58 }, // 2 — battery (BESS)
  { left: 9, top: 20 }, // 3 — HD - 7HA.02
  { left: 9, top: 58 }, // 4 — HD - 7F.05
  { left: 42, top: 80 }, // 5 — LM2500+G4
  { left: 25, top: 80 }, // 6 — LM2500 22MW
  { left: 60, top: 80 }, // 7 — fuel cell (overflow)
  { left: 75, top: 80 }, // 8 — reciprocating engine (overflow)
  { left: 9, top: 28 }, // 9 — overflow
  { left: 91, top: 28 }, // 10 — overflow
  { left: 9, top: 72 }, // 11 — overflow
  { left: 91, top: 72 }, // 12 — overflow
];

/** Wall layout order: renewables → storage → HD GTs → aero GTs. */
const ARCHITECTURE_ASSET_GROUP_ORDER = [
  ['solar'],
  ['wind'],
  ['battery'],
  ['hd7ha02', 'hd7f05', 'heavyDutyGT'],
  ['lm2500g4', 'lm250022mw', 'aeroderivativeGT'],
  ['fuelCell'],
  ['recipEngine'],
];

const ARCHITECTURE_ASSET_WITHIN_GROUP = [
  'solar',
  'wind',
  'battery',
  'hd7ha02',
  'hd7f05',
  'heavyDutyGT',
  'lm2500g4',
  'lm250022mw',
  'aeroderivativeGT',
  'fuelCell',
  'recipEngine',
];

function architectureAssetRank(id) {
  const groupIndex = ARCHITECTURE_ASSET_GROUP_ORDER.findIndex((group) => group.includes(id));
  const withinIndex = ARCHITECTURE_ASSET_WITHIN_GROUP.indexOf(id);
  return {
    group: groupIndex >= 0 ? groupIndex : ARCHITECTURE_ASSET_GROUP_ORDER.length,
    within: withinIndex >= 0 ? withinIndex : Number.MAX_SAFE_INTEGER,
  };
}

export function sortArchitectureAssets(assets) {
  return [...assets].sort((a, b) => {
    const rankA = architectureAssetRank(a.id);
    const rankB = architectureAssetRank(b.id);
    if (rankA.group !== rankB.group) return rankA.group - rankB.group;
    if (rankA.within !== rankB.within) return rankA.within - rankB.within;
    return (b.installedMW || 0) - (a.installedMW || 0);
  });
}

export function layoutAssetsAroundHub(assetCount) {
  if (assetCount <= 0) return [];
  return ARCHITECTURE_ASSET_SLOTS.slice(0, assetCount).map((slot) => ({
    ...slot,
    angle: Math.atan2(slot.top - ARCHITECTURE_CENTER.y, slot.left - ARCHITECTURE_CENTER.x),
  }));
}

/** Full-circle donut band (even-odd fill). */
export function fullDonutPath(outerR, innerR, cx = ARCHITECTURE_CENTER.x, cy = ARCHITECTURE_CENTER.y) {
  return [
    `M ${cx - outerR},${cy}`,
    `A ${outerR},${outerR} 0 1,0 ${cx + outerR},${cy}`,
    `A ${outerR},${outerR} 0 1,0 ${cx - outerR},${cy}`,
    `M ${cx - innerR},${cy}`,
    `A ${innerR},${innerR} 0 1,1 ${cx + innerR},${cy}`,
    `A ${innerR},${innerR} 0 1,1 ${cx - innerR},${cy}`,
    'Z',
  ].join(' ');
}

/** Full circle path for curved labels — startOffset 25% places text at top. */
export function fullCirclePath(radius, cx = ARCHITECTURE_CENTER.x, cy = ARCHITECTURE_CENTER.y) {
  return `M ${cx - radius},${cy} A ${radius},${radius} 0 1,1 ${cx + radius},${cy} A ${radius},${radius} 0 1,1 ${cx - radius},${cy}`;
}

export function hubCenterFromRect(hubRect) {
  return {
    x: hubRect.left + (ARCHITECTURE_CENTER.x / 100) * hubRect.width,
    y: hubRect.top + (ARCHITECTURE_CENTER.y / 100) * hubRect.height,
  };
}

export function hubRingRadiusPx(hubRect) {
  return (ARCHITECTURE_BUS_OUTER / 100) * hubRect.width;
}
