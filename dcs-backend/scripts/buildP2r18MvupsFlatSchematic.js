#!/usr/bin/env node
/**
 * Build non-collapsible MVUPS flat one-line under the lower pane (p2r-mvups-flat-*).
 * Matches dcs-backend/data/MVUPS/image.png: 8 gens → one vertical bus → tie → MVUPS/load.
 */
const fs = require('fs');
const path = require('path');

const CONF = path.join(__dirname, '../designs/p2r_18/p2r_18.conf.json');
const PREFIX = 'p2r-mvups-flat-';
const PASTE_PREFIX = 'paste-1779985373163-';
const TIE_ID = `${PASTE_PREFIX}10-gt3vx`;
const BUS_MAIN_ID = `${PASTE_PREFIX}0-q5ccd`;
const BUS_SECONDARY_ID = `${PASTE_PREFIX}1-43w91`;

const GEN_ROWS = [
  ['144', '146', '148', '150'],
  ['152', '154', '156', '158'],
  ['160', '162', '164', '166'],
  ['168', '170', '172', '174'],
  ['145', '147', '149', '151'],
  ['153', '155', '157', '159'],
  ['161', '163', '165', '167'],
  ['169', '171', '173', '175'],
];

const LOAD_PARTS = ['219', '220', '221', '222', '223', '224', '225', '226', '227'];
const TIE_SECTION_CB = '9';

const LAYOUT = {
  genStartY: 2050,
  genRowDy: 95,
  genGtX: -175,
  tieY: 2890,
  busMainX: 487.5,
  busSecondaryX: 0,
  loadDx: 125,
};

const PART_OFFSET = {
  'gas-turbine-lm2500-andritz': { dx: 0, dy: 0 },
  'breaker-gen-13.8': { dx: 250, dy: 6 },
  gsu: { dx: 375, dy: 0 },
  ct: { dx: 550, dy: 0 },
};

function mapId(oldId) {
  return `${PREFIX}${oldId}`;
}

function pasteId(conf, num) {
  const needle = `${PASTE_PREFIX}${num}-`;
  return conf.canvasComponents.find((c) => c.id.startsWith(needle))?.id ?? null;
}

function isTieRowComponent(c) {
  if (!c || c.name === 'Retour') return false;
  const y = c.position?.y ?? 0;
  return y >= 2980 && y <= 3040;
}

function main() {
  const conf = JSON.parse(fs.readFileSync(CONF, 'utf8'));

  conf.canvasComponents = conf.canvasComponents.filter(
    (c) => c.id !== 'comp-lower-left-gen-mvups-preview' && !String(c.id).startsWith(PREFIX),
  );
  conf.connections = conf.connections.filter(
    (c) =>
      !String(c.id).startsWith('conn-p2r-mvups-flat-') &&
      c.from !== 'comp-lower-left-gen-mvups-preview',
  );

  for (const bankId of ['comp-lower-left-gen-bank', 'comp-lower-right-gen-bank']) {
    const bank = conf.canvasComponents.find((c) => c.id === bankId);
    const g = bank?.properties?.gasTurbineGroup;
    if (g?.collapseExtraMemberIds) {
      g.collapseExtraMemberIds = g.collapseExtraMemberIds.filter(
        (id) => id !== 'comp-lower-left-gen-mvups-preview',
      );
    }
  }

  const byId = new Map(conf.canvasComponents.map((c) => [c.id, c]));
  const tie = byId.get(TIE_ID);
  const tieMembers = tie?.properties?.tieGroup?.memberIds || [];

  const sourceIds = new Set([BUS_MAIN_ID, BUS_SECONDARY_ID]);

  for (const row of GEN_ROWS) {
    for (const num of row) {
      const id = pasteId(conf, num);
      if (id) sourceIds.add(id);
    }
  }

  for (const id of tieMembers) {
    const c = byId.get(id);
    if (isTieRowComponent(c)) sourceIds.add(id);
  }

  const sectionCbId = pasteId(conf, TIE_SECTION_CB);
  if (sectionCbId) sourceIds.add(sectionCbId);

  for (const num of LOAD_PARTS) {
    const id = pasteId(conf, num);
    if (id) sourceIds.add(id);
  }

  const genCtIds = new Set();
  for (const row of GEN_ROWS) {
    const ctId = pasteId(conf, row[3]);
    if (ctId) genCtIds.add(ctId);
  }

  const idMap = new Map();
  for (const oldId of sourceIds) {
    idMap.set(oldId, mapId(oldId));
  }

  const tieRowIds = [...sourceIds].filter((id) => {
    const c = byId.get(id);
    return c && isTieRowComponent(c);
  });
  tieRowIds.sort((a, b) => (byId.get(a).position.x ?? 0) - (byId.get(b).position.x ?? 0));

  const tieXStart = LAYOUT.busMainX + 140;
  const tieXStep = tieRowIds.length > 1 ? 1650 / (tieRowIds.length - 1) : 0;
  LAYOUT.busSecondaryX = tieXStart + Math.max(0, tieRowIds.length - 1) * tieXStep + 160;

  const loadIds = LOAD_PARTS.map((n) => pasteId(conf, n)).filter(Boolean);
  const loadXStart = LAYOUT.busSecondaryX + 100;

  const positionByOldId = new Map();

  for (const oldId of sourceIds) {
    const c = byId.get(oldId);
    if (!c) continue;

    if (oldId === BUS_MAIN_ID) {
      positionByOldId.set(oldId, {
        x: LAYOUT.busMainX,
        y: LAYOUT.genStartY - 40,
        busHeight: LAYOUT.genRowDy * 8 + 120,
        rename: '34.5kV Bus',
      });
    } else if (oldId === BUS_SECONDARY_ID) {
      positionByOldId.set(oldId, {
        x: LAYOUT.busSecondaryX,
        y: LAYOUT.tieY - 180,
        busHeight: 360,
        rename: '34.5kV Bus',
      });
    } else if (GEN_ROWS.some((row) => row.some((n) => pasteId(conf, n) === oldId))) {
      let rowIndex = -1;
      for (let i = 0; i < GEN_ROWS.length; i += 1) {
        if (GEN_ROWS[i].some((num) => pasteId(conf, num) === oldId)) {
          rowIndex = i;
          break;
        }
      }
      const off = PART_OFFSET[c.type] || { dx: 0, dy: 0 };
      if (rowIndex >= 0) {
        positionByOldId.set(oldId, {
          x: LAYOUT.genGtX + off.dx,
          y: LAYOUT.genStartY + rowIndex * LAYOUT.genRowDy + off.dy,
        });
      }
    } else if (tieRowIds.includes(oldId) || oldId === sectionCbId) {
      const idx = tieRowIds.includes(oldId)
        ? tieRowIds.indexOf(oldId)
        : tieRowIds.length;
      const baseY = c.type === 'ct' ? LAYOUT.tieY - 25 : LAYOUT.tieY;
      positionByOldId.set(oldId, {
        x: tieXStart + idx * tieXStep,
        y: baseY,
      });
    } else if (loadIds.includes(oldId)) {
      const idx = loadIds.indexOf(oldId);
      const baseY = c.type === 'breaker-lv' ? LAYOUT.tieY + 75 : LAYOUT.tieY;
      const y =
        c.type === 'auxiliary-loads-bess'
          ? LAYOUT.tieY + 150
          : c.type === 'bus-knot' || c.type === 'it-pcs-rect-inv'
            ? LAYOUT.tieY + 25
            : c.type === 'breaker-dc'
              ? LAYOUT.tieY + 6
              : baseY;
      positionByOldId.set(oldId, { x: loadXStart + idx * LAYOUT.loadDx, y });
    }
  }

  const newComponents = [];
  for (const oldId of sourceIds) {
    const c = byId.get(oldId);
    if (!c) continue;
    const clone = JSON.parse(JSON.stringify(c));
    clone.id = idMap.get(oldId);
    clone.canvasPane = 'lower';
    clone.properties = { ...clone.properties, mvupsFlatSchematic: true };
    delete clone.connectionReadout;
    delete clone.embeddedSparklines;

    const pos = positionByOldId.get(oldId);
    if (pos) {
      clone.position = { x: pos.x, y: pos.y };
      if (pos.rename) clone.name = pos.rename;
      if (pos.busHeight) {
        clone.visualOverrides = {
          ...(clone.visualOverrides || {}),
          width: 25,
          height: pos.busHeight,
        };
      }
    }

    newComponents.push(clone);
  }

  const newConnections = [];
  for (const conn of conf.connections) {
    let from = conn.from;
    let to = conn.to;

    if (genCtIds.has(from) && to === BUS_SECONDARY_ID) to = BUS_MAIN_ID;
    if (genCtIds.has(to) && from === BUS_SECONDARY_ID) from = BUS_MAIN_ID;

    if (!idMap.has(from) || !idMap.has(to)) continue;

    const clone = JSON.parse(JSON.stringify(conn));
    clone.id = `conn-p2r-mvups-flat-${clone.id}`;
    clone.from = idMap.get(from);
    clone.to = idMap.get(to);
    newConnections.push(clone);
  }

  conf.canvasComponents.push(...newComponents);
  conf.connections.push(...newConnections);

  const tieEndOld = pasteId(conf, '122');
  const tieEndFlat = tieEndOld ? idMap.get(tieEndOld) : null;
  const sectionFlat = sectionCbId ? idMap.get(sectionCbId) : null;
  const busSecFlat = idMap.get(BUS_SECONDARY_ID);
  if (tieEndFlat && sectionFlat && busSecFlat) {
    conf.connections = conf.connections.filter(
      (c) =>
        !(
          (c.from === tieEndFlat && c.to === busSecFlat) ||
          (c.to === tieEndFlat && c.from === busSecFlat)
        ),
    );
    conf.connections.push(
      {
        id: 'conn-p2r-mvups-flat-tie-section-a',
        from: tieEndFlat,
        to: sectionFlat,
        type: 'power',
        status: 'idle',
      },
      {
        id: 'conn-p2r-mvups-flat-tie-section-b',
        from: sectionFlat,
        to: busSecFlat,
        type: 'power',
        status: 'idle',
      },
    );
  }

  fs.writeFileSync(CONF, `${JSON.stringify(conf, null, 2)}\n`);
  console.log(
    `MVUPS flat schematic: ${newComponents.length} components, ${newConnections.length} connections`,
  );
}

main();
