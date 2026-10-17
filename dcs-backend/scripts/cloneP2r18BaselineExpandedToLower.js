/**
 * Replace P2R_18 lower pane with a flat copy of the expanded upper baseline:
 * same components + connections, shifted down Y_OFFSET, no sparkles, no collapse owners.
 */
const fs = require('fs');
const path = require('path');

const CONF = path.join(__dirname, '../designs/p2r_18/p2r_18.conf.json');
const TMP_DIR = path.join(__dirname, '../designs/p2r_18/tmp');
const Y_OFFSET = 1876;
const LOWER_ID_PREFIX = 'comp-mvups-exp-';

function compById(components, id) {
  return components.find((c) => c.id === id);
}

function upperExpandedMemberIds(j) {
  const ul = compById(j.canvasComponents, 'comp-upper-left-gen-bank');
  const ur = compById(j.canvasComponents, 'comp-upper-right-gen-bank');
  const tie = compById(j.canvasComponents, 'comp-voltver-tie-network');
  const ids = new Set([
    ...ul.properties.gasTurbineGroup.memberIds.filter((id) => !id.startsWith('comp-it-')),
    ...ur.properties.gasTurbineGroup.memberIds.filter((id) => !id.startsWith('comp-it-')),
    ...tie.properties.tieGroup.memberIds,
    'comp-bus-left',
    'comp-bus-right',
  ]);
  j.canvasComponents.forEach((c) => {
    if (c.canvasPane === 'upper' && c.type === 'breaker-hv-boxed') ids.add(c.id);
  });
  return ids;
}

function toLowerId(upperId) {
  return `${LOWER_ID_PREFIX}${upperId.slice('comp-'.length)}`;
}

function cloneComponent(upper) {
  const c = JSON.parse(JSON.stringify(upper));
  c.id = toLowerId(upper.id);
  c.canvasPane = 'lower';
  c.position = {
    x: upper.position.x,
    y: upper.position.y + Y_OFFSET,
  };
  delete c.connectionReadout;
  if (c.properties?.gasTurbineGroup) delete c.properties.gasTurbineGroup;
  if (c.properties?.tieGroup) delete c.properties.tieGroup;
  return c;
}

function main() {
  const raw = fs.readFileSync(CONF, 'utf8');
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(TMP_DIR, `p2r_18.conf.pre-flat-mvups-mirror-${stamp}.json`);
  fs.writeFileSync(backup, raw);
  console.log('Backup:', backup);

  const j = JSON.parse(raw);
  const upperIds = upperExpandedMemberIds(j);
  const idMap = new Map([...upperIds].map((id) => [id, toLowerId(id)]));

  const upperComponents = j.canvasComponents.filter((c) => upperIds.has(c.id));
  const lowerClones = upperComponents.map(cloneComponent);

  j.canvasComponents = [
    ...j.canvasComponents.filter((c) => c.canvasPane !== 'lower'),
    ...lowerClones,
  ];

  const upperConn = j.connections.filter(
    (cn) => upperIds.has(cn.from) && upperIds.has(cn.to),
  );
  j.connections = j.connections.filter((cn) => {
    const fromLower = cn.from.startsWith(LOWER_ID_PREFIX) || cn.from.startsWith('paste-') || cn.from.startsWith('p2r-mvups-flat') || cn.from.startsWith('comp-lower') || cn.from.startsWith('comp-mvups-flat');
    const toLower = cn.to.startsWith(LOWER_ID_PREFIX) || cn.to.startsWith('paste-') || cn.to.startsWith('p2r-mvups-flat') || cn.to.startsWith('comp-lower') || cn.to.startsWith('comp-mvups-flat');
    return !(fromLower || toLower);
  });
  upperConn.forEach((cn, idx) => {
    j.connections.push({
      id: `conn-mvups-exp-${idx}`,
      from: idMap.get(cn.from),
      to: idMap.get(cn.to),
      type: cn.type,
      status: cn.status,
    });
  });

  if (j.designUiSession?.designSectionVisibility) {
    j.designUiSession.designSectionVisibility.showMvupsFlatSchematic = false;
  }

  const upperTie = compById(j.canvasComponents, 'comp-voltver-tie-network');
  if (upperTie) {
    const mapUpperId = (id) =>
      id.startsWith('comp-') ? `${LOWER_ID_PREFIX}${id.slice('comp-'.length)}` : id;
    const tg = upperTie.properties.tieGroup;
    const lowerTie = JSON.parse(JSON.stringify(upperTie));
    lowerTie.id = `${LOWER_ID_PREFIX}tie-network`;
    lowerTie.canvasPane = 'lower';
    lowerTie.position = {
      x: upperTie.position.x,
      y: upperTie.position.y + Y_OFFSET,
    };
    lowerTie.properties.tieGroup = {
      ...tg,
      memberIds: (tg.memberIds || []).map(mapUpperId),
      stubLinks: tg.stubLinks
        ? {
            ...tg.stubLinks,
            leftAnchorIds: (tg.stubLinks.leftAnchorIds || []).map(mapUpperId),
            rightAnchorIds: (tg.stubLinks.rightAnchorIds || []).map(mapUpperId),
          }
        : undefined,
    };
    j.canvasComponents.push(lowerTie);
  }

  if (j.designUiSession) {
    j.designUiSession.designExpansion = {
      ...(j.designUiSession.designExpansion || {}),
      breakersCompactUpper: j.designUiSession.designExpansion?.breakersCompact ?? true,
      breakersCompactLower: false,
    };
  }

  fs.writeFileSync(CONF, `${JSON.stringify(j, null, 2)}\n`);
  console.log('Lower pane:', lowerClones.length, 'components (flat baseline mirror, no sparkles)');
  console.log('Connections added:', upperConn.length);
  console.log('Set designSectionVisibility.showMvupsFlatSchematic = false (required to render comp-mvups-exp-*)');
}

main();
