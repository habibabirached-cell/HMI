/**
 * Netlify production series API — mirrors FastAPI GET /api/v1/series/{cfg}/{event}.
 * Redirects to pre-cropped static CSVs in /databank (no sample rewrite).
 * Keeps function tiny so large CFG5/8/10 files never load inside the lambda.
 */

const EVENT_FOLDER = {
  SCL: 'SCL',
  ROCOF: 'ROCOF',
  PHJUMP: 'PHJUMP',
  VSTEP: 'VSTEP',
  fault: 'SCL',
  rocof: 'ROCOF',
  phase_jump: 'PHJUMP',
  voltage_step: 'VSTEP',
  scl: 'SCL',
  phjump: 'PHJUMP',
  vstep: 'VSTEP',
};

const CFG_RE = /^CFG([1-9]|1[0-1])$/i;

export async function handler(event) {
  const qs = event.queryStringParameters || {};
  let cfg = (qs.cfg || '').toUpperCase();
  let ev = qs.event || '';
  const phase = String(qs.phase || 'full').toLowerCase();

  // Path style: /api/v1/series/CFG1/SCL or /.netlify/functions/series/...
  const path = event.path || '';
  const m = path.match(/series\/([^/]+)\/([^/]+)/i);
  if (m) {
    cfg = m[1].toUpperCase();
    ev = m[2];
  }

  if (!CFG_RE.test(cfg)) {
    return json(400, { detail: `Unsupported CFG: ${cfg}` });
  }

  const folder = EVENT_FOLDER[ev] || EVENT_FOLDER[String(ev).toLowerCase()];
  if (!folder) {
    return json(400, { detail: `Unsupported event: ${ev}` });
  }

  let suffix = '.csv';
  if (phase === 'pre') suffix = '.pre.csv';
  else if (phase === 'post') suffix = '.post.csv';
  else if (phase !== 'full') {
    return json(400, { detail: `Unsupported phase: ${phase}` });
  }

  const location = `/databank/${cfg}/${folder}${suffix}`;
  return {
    statusCode: 302,
    headers: {
      Location: location,
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
    body: '',
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
