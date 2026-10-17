/**
 * Remove auxiliary / IT rack load branches from p2r_18 lower MVUPS mirror only.
 * Do NOT run on production baseline — use scoped removal (lower comp-mvups-exp-* only).
 * @deprecated Prefer a lower-pane-only script; this file still removes upper loads if run.
 */
const fs = require('fs');
const path = require('path');

const CONF = path.join(__dirname, '../designs/p2r_18/p2r_18.conf.json');
const TMP_DIR = path.join(__dirname, '../designs/p2r_18/tmp');

const LOAD_TYPES = new Set([
  'auxiliary-loads',
  'auxiliary-loads-bess',
  'it-rack-load',
  'it-pcs-rect-inv',
  'ups',
]);

function isLoadId(id) {
  if (!id || typeof id !== 'string') return false;
  if (id.startsWith('comp-it-')) return true;
  if (id.startsWith('comp-mvups-exp-it-')) return true;
  if (id.includes('-aux-preview')) return true;
  return false;
}

function isLoadComponent(c) {
  if (!c) return false;
  if (LOAD_TYPES.has(c.type)) return true;
  return isLoadId(c.id);
}

function main() {
  const raw = fs.readFileSync(CONF, 'utf8');
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(TMP_DIR, `p2r_18.conf.pre-remove-loads-${stamp}.json`), raw);

  const j = JSON.parse(raw);
  const toRemove = new Set(j.canvasComponents.filter(isLoadComponent).map((c) => c.id));

  for (const c of j.canvasComponents) {
    const g = c.properties?.gasTurbineGroup;
    if (g?.memberIds) {
      g.memberIds = g.memberIds.filter((id) => !toRemove.has(id) && !isLoadId(id));
    }
    if (g?.collapseCompanionMemberId && toRemove.has(g.collapseCompanionMemberId)) {
      delete g.collapseCompanionMemberId;
    }
    if (g?.collapseExtraMemberIds) {
      g.collapseExtraMemberIds = g.collapseExtraMemberIds.filter((id) => !toRemove.has(id));
    }
  }

  j.canvasComponents = j.canvasComponents.filter((c) => !toRemove.has(c.id));
  j.connections = j.connections.filter(
    (cn) => !toRemove.has(cn.from) && !toRemove.has(cn.to),
  );

  fs.writeFileSync(CONF, `${JSON.stringify(j, null, 2)}\n`);
  console.log('Removed', toRemove.size, 'load-related components');
}

main();
