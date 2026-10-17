/**
 * Append MVUPS downstream section (from p2r_18_mvups_meaghan flat schematic) to
 * p2r_18 lower exploded pane, hung off comp-mvups-exp-bus-right.
 */
const fs = require('fs');
const path = require('path');

const P2R = path.join(__dirname, '../designs/p2r_18/p2r_18.conf.json');
const MEAGHAN = path.join(
  __dirname,
  '../designs/p2r_18_mvups_meaghan/p2r_18_mvups_meaghan.conf.json',
);
const TMP = path.join(__dirname, '../designs/p2r_18/tmp');
const TAIL_PREFIX = 'comp-mvups-exp-tail-';
const CONN_PREFIX = 'conn-mvups-exp-tail-';

/** Meaghan flat bus anchor → p2r lower right bus */
const MEAGHAN_BUS = { x: 1387.5, y: 2230 };
const P2R_BUS_ID = 'comp-mvups-exp-bus-right';

const SOURCE_TO_TAIL = [
  ['p2r-mvups-flat-paste-1779985373163-219-e82rw', `${TAIL_PREFIX}ct`],
  ['p2r-mvups-flat-mvups-sld-1', `${TAIL_PREFIX}mvups-sld`],
  ['p2r-mvups-flat-paste-1779985373163-221-slybl', `${TAIL_PREFIX}knot`],
  ['p2r-mvups-flat-paste-1779985373163-222-31s1a', `${TAIL_PREFIX}aux-loads`],
  ['p2r-mvups-flat-paste-1779985373163-223-o4uxy', `${TAIL_PREFIX}aux-cb`],
  ['p2r-mvups-flat-paste-1779985373163-224-7909a', `${TAIL_PREFIX}dc-cb`],
  ['p2r-mvups-flat-paste-1779985373163-227-49qqg', `${TAIL_PREFIX}it-rack`],
];

const SOURCE_CONN_IDS = [
  'conn-p2r-mvups-flat-conn-paste-1779985373163-224',
  'conn-p2r-mvups-flat-conn-paste-1779985373163-227',
  'conn-p2r-mvups-flat-conn-paste-1779985373163-228',
  'conn-p2r-mvups-flat-conn-paste-1779985373163-229',
  'conn-p2r-mvups-flat-conn-paste-1779985373163-230',
  'conn-p2r-mvups-flat-mvups-a',
  'conn-p2r-mvups-flat-mvups-b',
  'conn-p2r-mvups-flat-mvups-c',
];

function stripFlatFlags(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.properties?.mvupsFlatSchematic) delete obj.properties.mvupsFlatSchematic;
}

function remapEndpoint(id, idMap) {
  if (idMap.has(id)) return idMap.get(id);
  if (id === 'p2r-mvups-flat-paste-1779985373163-1-43w91') return P2R_BUS_ID;
  return id;
}

function main() {
  const raw = fs.readFileSync(P2R, 'utf8');
  fs.mkdirSync(TMP, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(TMP, `p2r_18.conf.pre-mvups-tail-${stamp}.json`);
  fs.writeFileSync(backup, raw);
  console.log('Backup:', backup);

  const p2r = JSON.parse(raw);
  const meaghan = JSON.parse(fs.readFileSync(MEAGHAN, 'utf8'));

  const bus = p2r.canvasComponents.find((c) => c.id === P2R_BUS_ID);
  if (!bus?.position) throw new Error(`Missing ${P2R_BUS_ID}`);

  const dx = bus.position.x - MEAGHAN_BUS.x;
  const dy = bus.position.y - MEAGHAN_BUS.y;

  const idMap = new Map(
    SOURCE_TO_TAIL.map(([src, tailId]) => [src, tailId]),
  );
  idMap.set('p2r-mvups-flat-paste-1779985373163-1-43w91', P2R_BUS_ID);

  p2r.canvasComponents = p2r.canvasComponents.filter(
    (c) => !c.id.startsWith(TAIL_PREFIX),
  );
  p2r.connections = p2r.connections.filter(
    (c) => !c.id.startsWith(CONN_PREFIX),
  );

  for (const [srcId, tailId] of SOURCE_TO_TAIL) {
    const src = meaghan.canvasComponents.find((c) => c.id === srcId);
    if (!src) throw new Error(`Missing meaghan component ${srcId}`);
    const clone = JSON.parse(JSON.stringify(src));
    clone.id = tailId;
    clone.canvasPane = 'lower';
    clone.position = {
      x: src.position.x + dx,
      y: src.position.y + dy,
    };
    stripFlatFlags(clone);
    p2r.canvasComponents.push(clone);
  }

  let connIdx = 0;
  for (const connId of SOURCE_CONN_IDS) {
    const srcConn = meaghan.connections.find((c) => c.id === connId);
    if (!srcConn) throw new Error(`Missing meaghan connection ${connId}`);
    const cn = JSON.parse(JSON.stringify(srcConn));
    cn.id = `${CONN_PREFIX}${connIdx++}`;
    cn.from = remapEndpoint(srcConn.from, idMap);
    cn.to = remapEndpoint(srcConn.to, idMap);
    p2r.connections.push(cn);
  }

  fs.writeFileSync(P2R, `${JSON.stringify(p2r, null, 2)}\n`);
  console.log('Added MVUPS tail:', SOURCE_TO_TAIL.map(([, id]) => id).join(', '));
  console.log(`Position offset dx=${dx} dy=${dy} (anchored to ${P2R_BUS_ID})`);
}

main();
