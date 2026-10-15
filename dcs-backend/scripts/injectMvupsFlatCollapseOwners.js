/**
 * One-shot: add MVUPS flat schematic collapse owners + preview tiles to p2r_18.conf.json.
 * Safe to re-run (replaces prior comp-mvups-flat-* owners).
 */
const fs = require('fs');
const path = require('path');

const CONF = path.join(__dirname, '../designs/p2r_18/p2r_18.conf.json');

function classifyFlatMember(c) {
  const x = c.position?.x ?? 0;
  const y = c.position?.y ?? 0;
  if (c.type === 'mvups-sld') return 'right';
  if (x >= 3500) return 'right';
  const onGenChain =
    ['gas-turbine-lm2500-andritz', 'breaker-gen-13.8', 'gsu'].includes(c.type) ||
    (c.type === 'ct' && x < -500);
  if (onGenChain) return y < 2400 ? 'topGen' : 'botGen';
  return 'tie';
}

function main() {
  const j = JSON.parse(fs.readFileSync(CONF, 'utf8'));
  const flat = j.canvasComponents.filter((c) => c.id?.startsWith('p2r-mvups-flat-'));
  const groups = { topGen: [], botGen: [], tie: [], right: [] };
  for (const c of flat) {
    groups[classifyFlatMember(c)].push(c.id);
  }

  j.canvasComponents = j.canvasComponents.filter(
    (c) => !String(c.id || '').startsWith('comp-mvups-flat-'),
  );

  const owners = [
    {
      id: 'comp-mvups-flat-gen-3d-preview-top',
      type: 'gas-turbine-3d',
      name: '4 Gas Turbines',
      fullName: '4 Gas Turbines (MVUPS flat collapsed — upper set)',
      position: { x: -325, y: 1862.5 },
      status: 'online',
      properties: {
        primaryLabel: '4 Gas Turbines',
        rating: 0,
        voltage: 13.8,
        unit: 'MW',
        mvupsFlatSchematic: true,
      },
      visualOverrides: { width: 750, height: 375 },
      state: { power: 0, voltage: 13.8, current: 0, frequency: 60 },
      isTripped: false,
      canvasPane: 'lower',
    },
    {
      id: 'comp-mvups-flat-gen-3d-preview-bottom',
      type: 'gas-turbine-3d',
      name: '4 Gas Turbines',
      fullName: '4 Gas Turbines (MVUPS flat collapsed — lower set)',
      position: { x: -325, y: 2712.5 },
      status: 'online',
      properties: {
        primaryLabel: '4 Gas Turbines',
        rating: 0,
        voltage: 13.8,
        unit: 'MW',
        mvupsFlatSchematic: true,
      },
      visualOverrides: { width: 750, height: 375 },
      state: { power: 0, voltage: 13.8, current: 0, frequency: 60 },
      isTripped: false,
      canvasPane: 'lower',
    },
    {
      id: 'comp-mvups-flat-aux-preview',
      type: 'auxiliary-loads-bess',
      name: 'Aux, IT and Rack Loads ',
      fullName: 'Auxiliary Loads (MVUPS flat collapsed)',
      position: { x: 2475, y: 3112.5 },
      status: 'online',
      properties: { rating: 5, voltage: 0.48, unit: 'MW', mvupsFlatSchematic: true },
      visualOverrides: { width: 750, height: 375 },
      state: { power: 0, voltage: 0.48, current: 0, frequency: 60 },
      isTripped: false,
      canvasPane: 'lower',
    },
    {
      id: 'comp-mvups-flat-mvups-preview',
      type: 'bess-50mw',
      name: 'MVUPS',
      fullName: 'MVUPS (3D placeholder — BESS model)',
      position: { x: 2575, y: 2262.5 },
      status: 'online',
      properties: { rating: 25, voltage: 34.5, unit: 'MVA', mvupsFlatSchematic: true },
      visualOverrides: { width: 750, height: 375 },
      state: { power: 0, voltage: 34.5, current: 0, frequency: 60, soc: 85 },
      isTripped: false,
      canvasPane: 'lower',
    },
    {
      id: 'comp-mvups-flat-gen-bank-top',
      type: 'gas-turbine-bank',
      name: 'MVUPS Gen Bank Top',
      fullName: 'MVUPS flat — upper 4× LM2500',
      position: { x: 27, y: 1876 },
      status: 'online',
      properties: {
        rating: 0,
        voltage: 13.8,
        unit: '',
        mvupsFlatSchematic: true,
        mvupsFlatCollapseOwner: true,
        gasTurbineGroup: {
          collapsed: false,
          side: 'left',
          verticalBand: { minY: 1800, maxY: 2400 },
          previewMemberId: 'comp-mvups-flat-gen-3d-preview-top',
          collapseColumnLeft: -337.5,
          memberIds: groups.topGen,
          stubLinks: {
            gapPx: 75,
            leftAnchorIds: [],
            rightAnchorIds: [],
            busMemberId: 'p2r-mvups-flat-paste-1779985373163-0-q5ccd',
          },
        },
      },
      state: { power: 0, voltage: 13.8, current: 0, frequency: 60 },
      isTripped: false,
      canvasPane: 'lower',
    },
    {
      id: 'comp-mvups-flat-gen-bank-bottom',
      type: 'gas-turbine-bank',
      name: 'MVUPS Gen Bank Bottom',
      fullName: 'MVUPS flat — lower 4× LM2500',
      position: { x: 27, y: 2726 },
      status: 'online',
      properties: {
        rating: 0,
        voltage: 13.8,
        unit: '',
        mvupsFlatSchematic: true,
        mvupsFlatCollapseOwner: true,
        gasTurbineGroup: {
          collapsed: false,
          side: 'left',
          verticalBand: { minY: 2600, maxY: 3200 },
          previewMemberId: 'comp-mvups-flat-gen-3d-preview-bottom',
          collapseColumnLeft: -337.5,
          memberIds: groups.botGen,
          stubLinks: {
            gapPx: 75,
            leftAnchorIds: [],
            rightAnchorIds: [],
            busMemberId: 'p2r-mvups-flat-paste-1779985373163-0-q5ccd',
          },
        },
      },
      state: { power: 0, voltage: 13.8, current: 0, frequency: 60 },
      isTripped: false,
      canvasPane: 'lower',
    },
    {
      id: 'comp-mvups-flat-load-bank',
      type: 'gas-turbine-bank',
      name: 'MVUPS Load Bank',
      fullName: 'MVUPS flat — load + MVUPS flank',
      position: { x: 2789, y: 1876 },
      status: 'online',
      properties: {
        rating: 0,
        voltage: 13.8,
        unit: '',
        mvupsFlatSchematic: true,
        mvupsFlatCollapseOwner: true,
        gasTurbineGroup: {
          collapsed: false,
          side: 'right',
          verticalBand: { minY: 1800, maxY: 4400 },
          previewMemberId: 'comp-mvups-flat-mvups-preview',
          collapseColumnLeft: 2487.5,
          collapseCompanionMemberId: 'comp-mvups-flat-aux-preview',
          memberIds: groups.right,
          stubLinks: {
            gapPx: 75,
            leftAnchorIds: [],
            rightAnchorIds: [
              'p2r-mvups-flat-paste-1779985373163-111-ici2k',
              'p2r-mvups-flat-paste-1779985373163-119-zpe0e',
            ],
            busMemberId: 'p2r-mvups-flat-paste-1779985373163-1-43w91',
          },
        },
      },
      state: { power: 0, voltage: 13.8, current: 0, frequency: 60 },
      isTripped: false,
      canvasPane: 'lower',
    },
    {
      id: 'comp-mvups-flat-tie-network',
      type: 'tie-breaker-network',
      name: 'Tie Breaker Network',
      fullName: 'MVUPS flat tie (collapse / expand)',
      position: { x: 1333, y: 1888 },
      status: 'online',
      properties: {
        rating: 0,
        voltage: 34.5,
        unit: '',
        mvupsFlatSchematic: true,
        mvupsFlatCollapseOwner: true,
        tieGroup: {
          collapsed: false,
          memberIds: groups.tie,
          stubLinks: {
            gapPx: 50,
            fillAisleWidth: true,
            leftAnchorIds: [
              'p2r-mvups-flat-paste-1779985373163-150-dyx80',
              'p2r-mvups-flat-paste-1779985373163-158-f6q3z',
              'p2r-mvups-flat-paste-1779985373163-166-ncflg',
              'p2r-mvups-flat-paste-1779985373163-174-1qe8l',
            ],
            rightAnchorIds: [
              'p2r-mvups-flat-paste-1779985373163-111-ici2k',
              'p2r-mvups-flat-paste-1779985373163-119-zpe0e',
              'p2r-mvups-flat-paste-1779985373163-120-ou8v3',
              'p2r-mvups-flat-paste-1779985373163-121-hg6zl',
            ],
          },
        },
      },
      state: { power: 0, voltage: 34.5, current: 0, frequency: 60 },
      isTripped: false,
      visualOverrides: { width: 218, height: 1500 },
      canvasPane: 'lower',
    },
  ];

  const insertBefore = j.canvasComponents.findIndex((c) =>
    c.id?.startsWith('p2r-mvups-flat-'),
  );
  if (insertBefore >= 0) {
    j.canvasComponents.splice(insertBefore, 0, ...owners);
  } else {
    j.canvasComponents.push(...owners);
  }

  fs.writeFileSync(CONF, `${JSON.stringify(j, null, 2)}\n`);
  console.log('Injected MVUPS flat collapse owners:', owners.map((o) => o.id).join(', '));
  console.log(
    'Member counts — topGen:',
    groups.topGen.length,
    'botGen:',
    groups.botGen.length,
    'tie:',
    groups.tie.length,
    'right:',
    groups.right.length,
  );
}

main();
