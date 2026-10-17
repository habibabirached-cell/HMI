/**
 * windOct2026: compact = 3 large tiles + center bus; explode = full one-line (double-click / 3-dot strip).
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../designs/windoct2026/windoct2026.conf.json');
const OUT_WIND02 = path.join(__dirname, '../designs/wind02/wind02.conf.json');

function comp(id, type, name, fullName, x, y, props, extra = {}) {
  return {
    id,
    type,
    name,
    fullName,
    position: { x, y },
    status: 'online',
    properties: props,
    state: {
      power: 0,
      voltage: props.voltage ?? 0,
      current: 0,
      frequency: 60,
      ...(extra.stateExtra || {}),
    },
    isTripped: false,
    canvasPane: 'upper',
    ...(extra.visualOverrides ? { visualOverrides: extra.visualOverrides } : {}),
    ...(extra.initialSimStatus != null ? { initialSimStatus: extra.initialSimStatus } : {}),
  };
}

function conn(id, from, to, style) {
  return {
    id,
    from,
    to,
    voltage: 0,
    type: 'AC',
    status: 'normal',
    ...(style ? { style } : {}),
  };
}

const previewFeederStyle = {
  useAuto: false,
  color: '#2d7a32',
  thickness: 5,
  animation: 'none',
  depth3d: 38,
  glossiness: 18,
  shadow: { blur: 4, offsetX: 2, offsetY: 2, opacity: 0.35, color: '#000000' },
  flowArrows: 'forward',
};

const loadFeederStyle = {
  useAuto: false,
  color: '#c62828',
  thickness: 5,
  animation: 'none',
  depth3d: 38,
  glossiness: 18,
  shadow: { blur: 4, offsetX: 2, offsetY: 2, opacity: 0.35, color: '#000000' },
  flowArrows: 'forward',
};

const tile = { width: 750, height: 375 };

const compactPreviews = [
  comp('wo26c-wind-3d', 'wind-turbine-3d', 'GFL Wind', 'GFL Wind 200 MW', -325, 162.5, {
    primaryLabel: '',
    hide3dOverlayTitle: true,
    rating: 200,
    voltage: 34.5,
    unit: 'MW',
  }, { visualOverrides: tile }),
  comp('wo26c-bess-3d', 'bess-50mw', 'BESS', 'Battery Energy Storage 200 MW', -375, 812.5, {
    primaryLabel: '',
    hide3dOverlayTitle: true,
    rating: 200,
    voltage: 34.5,
    unit: 'MW',
  }, { visualOverrides: tile, stateExtra: { soc: 85 } }),
  comp('wo26c-load-preview', 'auxiliary-loads-bess', 'Data Center Load', 'Aux, IT and Rack Loads', 2525, 400, {
    rating: 200,
    voltage: 0.48,
    unit: 'MW',
  }, { visualOverrides: tile }),
  comp('wo26c-bus-mid', 'bus-hv-vertical', '34.5 kV Bus', 'Main Collection Bus 34.5 kV', 1437.5, 80, {
    rating: 0,
    voltage: 34.5,
    unit: 'kV',
  }, { visualOverrides: { width: 25, height: 1100 } }),
];

const explodedMembers = [
  comp('wo26-gfl-wind', 'gfl-wind-farm', 'GFL Wind', 'GFL Wind 200 MW', 80, 240, {
    rating: 200, voltage: 34.5, unit: 'MW', gridFollowing: true,
  }, { visualOverrides: { externalLabelPlacement: 'above' } }),
  comp('wo26-wind-cb', 'breaker-hv', 'CB 34.5kV', 'Circuit Breaker 34.5 kV', 280, 280, {
    rating: 3000, voltage: 34.5, unit: 'A',
  }, { visualOverrides: { externalLabelPlacement: 'above' } }),
  comp('wo26-bus', 'bus-hv-vertical', '34.5 kV Bus', 'Main Collection Bus 34.5 kV', 480, 180, {
    rating: 0, voltage: 34.5, unit: 'kV',
  }, { visualOverrides: { width: 25, height: 460, externalLabelPlacement: 'above' } }),
  comp('wo26-bus-mid-cb', 'breaker-hv', 'Bus CB', 'Center bus section CB 34.5 kV', 505, 380, {
    rating: 3500, voltage: 34.5, unit: 'A',
  }, { visualOverrides: { externalLabelPlacement: 'above' } }),
  comp('wo26-bess', 'bess-50mw', 'BESS', 'Battery Energy Storage System 200MW', 80, 560, {
    rating: 200, voltage: 0.7, unit: 'MW',
  }, { stateExtra: { soc: 85 } }),
  comp('wo26-bess-cb', 'breaker-bess', 'BESS CB 0.7 kV', 'BESS Circuit Breaker 0.7 kV', 260, 600, {
    rating: 2000, voltage: 0.7, unit: 'A',
  }),
  comp('wo26-bess-xfmr', 'bess-xfmr', 'BESS Xfmr', 'BESS Xfmr 0.7 kV : 34.5 kV', 390, 600, {
    rating: 200, unit: 'MVA', primaryVoltageKv: 0.7, secondaryVoltageKv: 34.5,
  }),
  comp('wo26-bess-ct', 'ct', 'CT', 'Current Transformer 2000:1', 520, 600, {
    rating: 2000, voltage: 0, unit: '2000:1',
  }),
  comp('wo26-load-ct', 'ct', 'CT', 'Load-side CT', 620, 380, {
    rating: 2000, voltage: 0, unit: '2000:1',
  }),
  comp('wo26-gsu-dc', 'gsu', 'GSU', 'GSU 34.5 kV : 480 V 50 MVA', 760, 380, {
    rating: 50, unit: 'MVA', primaryVoltageKv: 34.5, secondaryVoltageKv: 0.48, gsuBusOnComponentSide: 'left',
  }),
  comp('wo26-lv-knot', 'bus-knot', '', 'Connection Point', 920, 405, {
    rating: 0, voltage: 0, unit: '',
  }),
  comp('wo26-aux', 'auxiliary-loads-bess', 'Auxiliary Loads', 'Auxiliary Loads', 920, 200, {
    rating: 5, voltage: 0.48, unit: 'MW',
  }),
  comp('wo26-aux-cb', 'breaker-lv', 'Aux CB', 'Auxiliary feeder circuit breaker', 970, 300, {
    rating: 4000, voltage: 0.48, unit: 'A',
  }),
  comp('wo26-dc-cb', 'breaker-dc', 'DC CB 480V', 'DC Circuit Breaker 480V', 1060, 405, {
    rating: 3000, voltage: 0.48, unit: 'A',
  }),
  comp('wo26-pcs', 'it-pcs-rect-inv', 'Rectifier / Inverter', 'To Data Center Building Xfmr + UPS + Rectifier 34.5kVac:400Vdc 200MW', 1180, 405, {
    rating: 200, voltage: 0.4, unit: 'MW',
  }),
  comp('wo26-ups', 'ups', 'UPS', 'LV UPS 400Vdc', 1320, 520, {
    rating: 200, voltage: 0.4, unit: 'MVA',
  }),
  comp('wo26-it-rack', 'it-rack-load', 'IT Rack Load', 'IT Rack Load', 1460, 405, {
    rating: 200, voltage: 0.4, unit: 'MW',
  }),
];

const memberIds = explodedMembers.map((c) => c.id);

const plantOwner = comp(
  'wo26-plant-owner',
  'tie-breaker-network',
  'One-line',
  'Wind + BESS + DC one-line (expand / collapse)',
  1333,
  -12,
  {
    rating: 0,
    voltage: 34.5,
    unit: '',
    tieGroup: {
      collapsed: true,
      memberIds,
    },
    windOctPlantGroup: {
      previewMemberIds: ['wo26c-wind-3d', 'wo26c-bess-3d', 'wo26c-load-preview'],
      busMemberIds: ['wo26c-bus-mid'],
    },
  },
  { visualOverrides: { width: 218, height: 1500 } },
);

const compactConnections = [
  conn('wo26c-wind-bus', 'wo26c-wind-3d', 'wo26c-bus-mid', previewFeederStyle),
  conn('wo26c-bess-bus', 'wo26c-bess-3d', 'wo26c-bus-mid', previewFeederStyle),
  conn('wo26c-load-bus', 'wo26c-load-preview', 'wo26c-bus-mid', loadFeederStyle),
];

const explodedConnections = [
  conn('wo26-c0', 'wo26-gfl-wind', 'wo26-wind-cb'),
  conn('wo26-c1', 'wo26-wind-cb', 'wo26-bus-mid-cb'),
  conn('wo26-c1b', 'wo26-bus-mid-cb', 'wo26-bus'),
  conn('wo26-c2', 'wo26-bess', 'wo26-bess-cb'),
  conn('wo26-c3', 'wo26-bess-cb', 'wo26-bess-xfmr'),
  conn('wo26-c4', 'wo26-bess-xfmr', 'wo26-bess-ct'),
  conn('wo26-c5', 'wo26-bess-ct', 'wo26-bus'),
  conn('wo26-c6', 'wo26-bus', 'wo26-load-ct'),
  conn('wo26-c7', 'wo26-load-ct', 'wo26-gsu-dc'),
  conn('wo26-c8', 'wo26-gsu-dc', 'wo26-lv-knot'),
  conn('wo26-c9', 'wo26-lv-knot', 'wo26-aux-cb'),
  conn('wo26-c10', 'wo26-aux', 'wo26-aux-cb'),
  conn('wo26-c11', 'wo26-aux-cb', 'wo26-lv-knot'),
  conn('wo26-c12', 'wo26-lv-knot', 'wo26-dc-cb'),
  conn('wo26-c13', 'wo26-dc-cb', 'wo26-pcs'),
  conn('wo26-c14', 'wo26-pcs', 'wo26-ups'),
  conn('wo26-c15', 'wo26-ups', 'wo26-it-rack'),
];

const canvasComponents = [...compactPreviews, plantOwner, ...explodedMembers];
const connections = [...compactConnections, ...explodedConnections];

const design = {
  name: 'windOct2026',
  description: 'Compact 3-tile view; double-click or expand strip for full one-line.',
  canvasComponents,
  connections,
  systemState: {
    simulationRunning: false,
    zoom: 0.52,
    pan: { x: 120, y: 40 },
    panTop: { x: 120, y: 40 },
    panBottom: { x: 40, y: 80 },
    quadBottomRowShare: 51.5,
    mode: 'design',
    uiFontPxShift: 5,
    canvasFontPxShift: 20,
    collapsedComponentFontPxShift: 24,
    splitPaneTitles: null,
    designViewMode: 'canvas',
    workspaceLayoutPreset: 'conf2',
  },
  variableDrivenPresence: [],
  canvasBlockTypeScale: {},
  globalSampleStep: 128,
  perChartSampleStep: {},
  playbackTimeRange: { t1: 8.0, t2: 60.0 },
  designUiSession: {
    designSectionVisibility: {
      showUpper: true,
      showLower: false,
      hideBranches: [],
      showMvupsFlatSchematic: false,
      canvasExternalPrimaryLabels: true,
    },
    quickScenarioBranchCollapsed: {
      noBessNoStatcom: true,
      withBessandStatCom: true,
      withBessAlone: true,
      withStatcomAlone: true,
      mvups_undamped: true,
      mvups_damped: true,
    },
    designExpansion: {
      breakersCompactUpper: false,
      peripheralsCompact: true,
    },
  },
  quickScenarioButtons: [],
  hiddenDefaultQuickScenarios: [],
  ideumControlButtons: [],
  ideumKioskMode: false,
  busTransferSegments: [],
};

function mergeCompactIntoExisting(existingPath, baseDesign, designName) {
  if (!fs.existsSync(existingPath)) return null;
  const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
  const compactIds = new Set([
    'wo26c-wind-3d',
    'wo26c-bess-3d',
    'wo26c-load-preview',
    'wo26c-bus-mid',
  ]);
  const compactById = Object.fromEntries(
    (existing.canvasComponents || [])
      .filter((c) => compactIds.has(c.id))
      .map((c) => [c.id, c]),
  );
  const mergedComponents = baseDesign.canvasComponents.map((c) => {
    const saved = compactById[c.id];
    if (!saved) return c;
    return {
      ...c,
      ...saved,
      id: c.id,
      properties: { ...c.properties, ...saved.properties },
    };
  });
  return {
    ...baseDesign,
    name: designName,
    description: existing.description ?? baseDesign.description,
    canvasComponents: mergedComponents,
    systemState: { ...baseDesign.systemState, ...(existing.systemState || {}) },
    designUiSession: existing.designUiSession ?? baseDesign.designUiSession,
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(design, null, 2)}\n`);
console.log('Wrote', OUT, '—', canvasComponents.length, 'components,', connections.length, 'connections');

const wind02Merged = mergeCompactIntoExisting(OUT_WIND02, design, 'wind02');
if (wind02Merged) {
  fs.writeFileSync(OUT_WIND02, `${JSON.stringify(wind02Merged, null, 2)}\n`);
  console.log('Updated', OUT_WIND02, '(kept compact tile positions / pan)');
}
