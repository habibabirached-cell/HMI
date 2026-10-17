/**
 * Restore upper (baseline) pane from last git commit; keep current lower MVUPS exploded + tail.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONF = path.join(__dirname, '../designs/p2r_18/p2r_18.conf.json');
const TMP = path.join(__dirname, '../designs/p2r_18/tmp');
const HEAD_PATH = 'dcs-backend/designs/p2r_18/p2r_18.conf.json';

function main() {
  const raw = fs.readFileSync(CONF, 'utf8');
  fs.mkdirSync(TMP, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(TMP, `p2r_18.conf.pre-restore-baseline-${stamp}.json`), raw);

  const head = JSON.parse(execSync(`git show HEAD:${HEAD_PATH}`, { encoding: 'utf8' }));
  const cur = JSON.parse(raw);

  const headLowerIds = new Set(
    head.canvasComponents.filter((c) => c.canvasPane === 'lower').map((c) => c.id),
  );
  const lowerComponents = cur.canvasComponents.filter((c) => c.canvasPane === 'lower');
  const lowerIds = new Set(lowerComponents.map((c) => c.id));

  const upperComponents = head.canvasComponents.filter((c) => c.canvasPane !== 'lower');

  const upperConnections = head.connections.filter(
    (cn) => !headLowerIds.has(cn.from) && !headLowerIds.has(cn.to),
  );
  const lowerConnections = cur.connections.filter(
    (cn) => lowerIds.has(cn.from) && lowerIds.has(cn.to),
  );

  const merged = { ...head };
  merged.canvasComponents = [...upperComponents, ...lowerComponents];
  merged.connections = [...upperConnections, ...lowerConnections];

  merged.designUiSession = {
    ...head.designUiSession,
    designSectionVisibility: {
      ...head.designUiSession?.designSectionVisibility,
      showMvupsFlatSchematic:
        cur.designUiSession?.designSectionVisibility?.showMvupsFlatSchematic ?? false,
    },
    designExpansion: cur.designUiSession?.designExpansion ?? head.designUiSession?.designExpansion,
  };
  if (cur.systemState) merged.systemState = cur.systemState;

  fs.writeFileSync(CONF, `${JSON.stringify(merged, null, 2)}\n`);

  const itCount = merged.canvasComponents.filter((c) => c.id.startsWith('comp-it-')).length;
  console.log('Restored baseline from HEAD commit.');
  console.log('Upper components:', upperComponents.length);
  console.log('Lower (MVUPS) components:', lowerComponents.length);
  console.log('IT/load branch components on upper:', itCount);
  console.log('Connections:', upperConnections.length, '+', lowerConnections.length);
}

main();
