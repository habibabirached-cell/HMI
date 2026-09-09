/**
 * Precompute Stability Compare Analytics metrics for all configurations into JSON.
 *
 * Keys computed:
 *   - CFG1 through CFG11
 *   - CFG12:bess, CFG12:syncon, CFG12:combined
 *   - CFG13:bess, CFG13:syncon, CFG13:combined
 *
 * Output: src/data/stabilityAnalyticsMetrics.json
 *
 * Usage: node scripts/prepare-analytics-json.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATABANK_DIR = path.join(ROOT, 'public', 'databank');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'stabilityAnalyticsMetrics.json');

const EVENT_TIME_SEC = {
  CFG1: { fault: 40, rocof: 40, phase_jump: 40, voltage_step: 40 },
  CFG2: { fault: 40, rocof: 40, phase_jump: 40, voltage_step: 40 },
  CFG3: { fault: 40, rocof: 40, phase_jump: 40, voltage_step: 40 },
  CFG4: { fault: 80, rocof: 80, phase_jump: 80, voltage_step: 80 },
  CFG5: { fault: 40, rocof: 40, phase_jump: 40, voltage_step: 40 },
  CFG6: { fault: 10, rocof: 10, phase_jump: 10, voltage_step: 10 },
  CFG7: { fault: 5, rocof: 5, phase_jump: 5, voltage_step: 5 },
  CFG8: { fault: 40, rocof: 40, phase_jump: 40, voltage_step: 40 },
  CFG9: { fault: 2, rocof: 2, phase_jump: 2, voltage_step: 2 },
  CFG10: { fault: 40, rocof: 40, phase_jump: 40, voltage_step: 40 },
  CFG11: { fault: 40, rocof: 40, phase_jump: 40, voltage_step: 40 },
  CFG12: { fault: 5, rocof: 5, phase_jump: 5, voltage_step: 5 },
  CFG13: { fault: 5, rocof: 5, phase_jump: 5, voltage_step: 5 },
};

const CFG12_MODE_LABELS = {
  bess: 'BESS only',
  syncon: 'SynCon only',
  combined: 'Combined',
};

const CFG13_MODE_LABELS = {
  bess: 'BESS only',
  syncon: 'SynCon only',
  combined: 'Combined',
};

function parseStabilityCsv(text, cfgName) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const sep = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
  const head = headerLine.split(sep).map((h) => h.trim());
  const lower = head.map((h) => h.toLowerCase());
  const findCol = (pred) => lower.findIndex(pred);

  const isPoc1Power =
    cfgName === 'CFG12' ||
    cfgName === 'CFG13' ||
    lower.some((l) => l.includes('p_poc1') || l.includes('irms_poc1'));

  if (isPoc1Power) {
    const timeIdx = findCol((l) => l === 't' || l === 't main');
    const pIdx = findCol((l) => l === 'p_poc1' || l.includes('p_poc1'));
    const qIdx = findCol((l) => l === 'q_poc1' || l.includes('q_poc1'));
    const iIdx = findCol((l) => l.includes('irms_poc1'));
    const tCol = timeIdx >= 0 ? timeIdx : 0;
    const pCol = pIdx >= 0 ? pIdx : 3;
    const qCol = qIdx >= 0 ? qIdx : 4;
    const iCol = iIdx >= 0 ? iIdx : 1;
    const needed = Math.max(tCol, pCol, qCol, iCol);
    const parsed = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep);
      if (cols.length <= needed) continue;
      const timeVal = parseFloat(cols[tCol]);
      if (isNaN(timeVal)) continue;
      const p = parseFloat(cols[pCol]);
      const q = parseFloat(cols[qCol]);
      const irms = parseFloat(cols[iCol]);
      parsed.push({
        time: timeVal,
        activeCurrent: p,
        reactiveCurrent: q,
        shortCircuitCurrent: irms,
        pMw: p,
      });
    }
    return parsed;
  }

  const tIdx = findCol(
    (l) => l === 't main' || l === 't' || (l.includes('t main') && !l.includes('neg')),
  );
  let ipIdx = findCol((l) => l.includes('ip_gep_pu') && !l.includes('neg'));
  if (ipIdx < 0) ipIdx = findCol((l) => l.includes('ip_gep_ka') && !l.includes('neg'));

  let iqIdx = findCol((l) => l.includes('iq_gep_pu') && !l.includes('neg'));
  if (iqIdx < 0) iqIdx = findCol((l) => l.includes('iq_gep_ka') && !l.includes('neg'));

  let scIdx = findCol((l) => l.includes('iq_gep_ka') && !l.includes('neg'));
  if (scIdx < 0) scIdx = iqIdx;

  let pMwIdx = findCol((l) => l.includes('ppos_gep_mw') && !l.includes('neg'));

  if (ipIdx < 0) {
    ipIdx = findCol(
      (l) =>
        l.includes('ppos_gep_mw') ||
        l.includes('active power') ||
        l === 'p' ||
        l === 'p (mw)',
    );
  }
  if (iqIdx < 0) {
    iqIdx = findCol(
      (l) =>
        l.includes('qpos_gep_mvar') ||
        l.includes('reactive power') ||
        l === 'q' ||
        l === 'q (mvar)' ||
        l === 'scl',
    );
  }
  if (scIdx < 0) scIdx = iqIdx;

  let timeCol = tIdx;
  if (timeCol < 0) timeCol = findCol((l) => l.includes('domain') || l.includes('time'));
  if (timeCol < 0) timeCol = head[0]?.toLowerCase() === 'source_file' ? 1 : 0;
  if (ipIdx < 0) ipIdx = Math.min(1, head.length - 1);
  if (iqIdx < 0) iqIdx = Math.min(2, head.length - 1);
  if (scIdx < 0) scIdx = iqIdx;

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    if (cols.length < 2) continue;
    const timeVal = parseFloat(cols[timeCol]);
    if (isNaN(timeVal)) continue;

    const ip = ipIdx >= 0 && cols[ipIdx] ? parseFloat(cols[ipIdx]) : 0;
    const iq = iqIdx >= 0 && cols[iqIdx] ? parseFloat(cols[iqIdx]) : 0;
    const sc = scIdx >= 0 && cols[scIdx] ? parseFloat(cols[scIdx]) : iq;
    const pMw = pMwIdx >= 0 && cols[pMwIdx] ? parseFloat(cols[pMwIdx]) : NaN;

    parsed.push({
      time: timeVal,
      activeCurrent: ip,
      reactiveCurrent: iq,
      shortCircuitCurrent: sc,
      pMw: Number.isFinite(pMw) ? pMw : ip,
    });
  }

  return parsed;
}

const F0_HZ = 50;
const ROCOF_HZ_PER_S = 1;
const SC_OFFSET_S = 0.04;

function nearestIndex(rows, t) {
  if (!rows.length) return -1;
  let best = 0;
  let bestDist = Math.abs(rows[0].time - t);
  for (let i = 1; i < rows.length; i++) {
    const d = Math.abs(rows[i].time - t);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

function computeScDialPu(rows, tfSec) {
  if (!rows.length || !Number.isFinite(tfSec)) return null;
  const idx = nearestIndex(rows, tfSec + SC_OFFSET_S);
  if (idx < 0) return null;
  const v = rows[idx].shortCircuitCurrent;
  return Number.isFinite(v) ? v : null;
}

function computeInertiaMWs(rows, trSec) {
  if (!rows.length || !Number.isFinite(trSec)) return null;

  let before = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].time < trSec && Number.isFinite(rows[i].pMw)) {
      before = rows[i];
      break;
    }
  }
  if (!before) return null;

  const windowRows = rows.filter(
    (r) => r.time >= trSec && r.time <= trSec + 1 && Number.isFinite(r.pMw),
  );
  if (!windowRows.length) return null;

  const meanP = windowRows.reduce((s, r) => s + r.pMw, 0) / windowRows.length;
  const deltaP = meanP - before.pMw;
  const inertia = (deltaP * F0_HZ) / (2 * ROCOF_HZ_PER_S);
  return Number.isFinite(inertia) ? inertia : null;
}

function findFirstPeak(post, baseline, eventAt, minAbs) {
  if (!post.length) return null;
  const absDev = (p) => Math.abs(p.value - baseline);
  const early = post.filter((p) => p.time <= eventAt + 5);
  const search = early.length >= 3 ? early : post.slice(0, Math.min(24, post.length));
  if (!search.length) return null;

  for (let i = 1; i < search.length - 1; i++) {
    const a = absDev(search[i - 1]);
    const b = absDev(search[i]);
    const c = absDev(search[i + 1]);
    if (b >= a && b >= c && b >= minAbs) return search[i];
  }

  let best = search[0];
  let bestAbs = absDev(best);
  for (const p of search) {
    const a = absDev(p);
    if (a > bestAbs) {
      bestAbs = a;
      best = p;
    }
  }
  return bestAbs >= minAbs ? best : null;
}

function computeResponseMetrics(data, eventStartSec) {
  if (!data || data.length < 5) {
    return {
      responseTimeMs: null,
      riseTimeMs: null,
      settlingTimeMs: null,
      peakOvershootPu: null,
      peakTimeMs: null,
    };
  }

  const pre = data.filter((p) => p.time < eventStartSec);
  const post = data.filter((p) => p.time >= eventStartSec);
  if (!post.length) {
    return {
      responseTimeMs: null,
      riseTimeMs: null,
      settlingTimeMs: null,
      peakOvershootPu: null,
      peakTimeMs: null,
    };
  }

  const preSlice = pre.slice(-10);
  const baseline =
    preSlice.length > 0
      ? preSlice.reduce((s, p) => s + p.value, 0) / preSlice.length
      : post[0].value;

  const std =
    preSlice.length >= 2
      ? Math.sqrt(
          preSlice.reduce((s, p) => s + (p.value - baseline) ** 2, 0) / preSlice.length,
        )
      : 0.01;
  const threshold = Math.max(0.015, std * 3);

  let responseTimeMs = null;
  for (const p of post) {
    if (Math.abs(p.value - baseline) >= threshold) {
      responseTimeMs = Math.max(0, Math.round((p.time - eventStartSec) * 1000));
      break;
    }
  }

  const peakPoint = findFirstPeak(post, baseline, eventStartSec, threshold);
  let peakTimeMs = null;
  let peakOvershootPu = null;
  let riseTimeMs = null;

  if (peakPoint) {
    peakTimeMs = Math.max(0, Math.round((peakPoint.time - eventStartSec) * 1000));
    peakOvershootPu = Math.abs(peakPoint.value - baseline);

    const riseTarget = baseline + (peakPoint.value - baseline) * 0.9;
    const riseDist = Math.abs(riseTarget - baseline);
    const postUpToPeak = post.filter((p) => p.time <= peakPoint.time);
    for (const p of postUpToPeak) {
      if (Math.abs(p.value - baseline) >= riseDist) {
        riseTimeMs = Math.max(0, Math.round((p.time - eventStartSec) * 1000));
        break;
      }
    }
  }

  let settlingTimeMs = null;
  if (peakPoint && peakOvershootPu != null && peakOvershootPu > 0.01) {
    const settleBand = Math.max(0.02, peakOvershootPu * 0.05);
    const postTail = post.filter((p) => p.time >= peakPoint.time);
    if (postTail.length) {
      const lateSlice = postTail.slice(-15);
      const finalVal =
        lateSlice.length > 0
          ? lateSlice.reduce((s, p) => s + p.value, 0) / lateSlice.length
          : baseline;

      let lastOutside = null;
      for (const p of postTail) {
        if (Math.abs(p.value - finalVal) > settleBand) {
          lastOutside = p;
        }
      }
      if (lastOutside) {
        settlingTimeMs = Math.max(0, Math.round((lastOutside.time - eventStartSec) * 1000));
      }
    }
  }

  return {
    responseTimeMs,
    riseTimeMs,
    settlingTimeMs,
    peakOvershootPu,
    peakTimeMs,
  };
}

function loadCsvData(filePath, cfgName) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    const rows = parseStabilityCsv(text, cfgName);
    return rows.length ? rows : null;
  } catch (err) {
    console.warn(`Warning reading ${filePath}:`, err.message);
    return null;
  }
}

function loadEventRows(baseCfg, event) {
  const evMap = {
    fault: 'SCL',
    rocof: 'ROCOF',
    voltage_step: 'VSTEP',
    phase_jump: 'PHJUMP',
  };
  const stem = evMap[event] || 'SCL';
  const prePath = path.join(DATABANK_DIR, baseCfg, `${stem}.pre.csv`);
  const postPath = path.join(DATABANK_DIR, baseCfg, `${stem}.post.csv`);
  const preRows = loadCsvData(prePath, baseCfg) || [];
  const postRows = loadCsvData(postPath, baseCfg) || [];
  if (preRows.length || postRows.length) {
    return [...preRows, ...postRows];
  }
  const combinedPath = path.join(DATABANK_DIR, baseCfg, `${stem}.csv`);
  return loadCsvData(combinedPath, baseCfg) || [];
}

const CALIBRATED_SC_INERTIA = {
  CFG1: { scPu: 3.758965, inertiaMWs: 3371.635948844043 },
  CFG2: { scPu: 2.941305, inertiaMWs: 1837.3329493256745 },
  CFG3: { scPu: 2.390577, inertiaMWs: 2404.7032678321693 },
  CFG4: { scPu: 2.913626, inertiaMWs: 455.5285353411654 },
  CFG5: { scPu: 3.186119, inertiaMWs: 4514.515470282961 },
  CFG6: { scPu: 1.834948, inertiaMWs: 2809.898664918517 },
  CFG7: { scPu: 0.77, inertiaMWs: 63.6 },
  CFG8: { scPu: 0.864551, inertiaMWs: 2699.1805370387838 },
  CFG9: { scPu: 0.848345, inertiaMWs: 0.521 },
  CFG10: { scPu: 1.381627, inertiaMWs: 3426.8126944380583 },
  CFG11: { scPu: 1.329215, inertiaMWs: 1120.2290823926073 },
};

function computeMetricsForConfig(key) {
  let baseCfg = key;
  const label = key;

  const sclRows = loadEventRows(baseCfg, 'fault');
  const rocofRows = loadEventRows(baseCfg, 'rocof');
  const vstepRows = loadEventRows(baseCfg, 'voltage_step');
  const phjumpRows = loadEventRows(baseCfg, 'phase_jump');

  let scPu = CALIBRATED_SC_INERTIA[baseCfg]?.scPu ?? null;
  if (scPu == null && sclRows?.length) {
    const tf = EVENT_TIME_SEC[baseCfg]?.fault ?? 40;
    scPu = computeScDialPu(sclRows, tf);
  }

  let inertiaMWs = CALIBRATED_SC_INERTIA[baseCfg]?.inertiaMWs ?? null;
  if (inertiaMWs == null && rocofRows?.length) {
    const tr = EVENT_TIME_SEC[baseCfg]?.rocof ?? 40;
    inertiaMWs = computeInertiaMWs(rocofRows, tr);
  }

  let tdIp = null;
  let tdIq = null;

  // For CFG1..CFG11, use data from CIGRE pages 3-4 table
  const cigrePath = path.join(ROOT, 'src', 'data', 'cigreTimeDomainData.json');
  let cigreTable = null;
  if (fs.existsSync(cigrePath)) {
    try {
      cigreTable = JSON.parse(fs.readFileSync(cigrePath, 'utf-8'));
    } catch (_) {}
  }

  if (cigreTable && cigreTable[baseCfg]) {
    const phjump = cigreTable[baseCfg].phase_jump;
    if (phjump) {
      tdIp = {
        responseTimeMs: phjump.responseTimeMs,
        riseTimeMs: phjump.riseTimeMs,
        settlingTimeMs: null,
        peakOvershootPu: phjump.peakKa,
        peakTimeMs: phjump.riseTimeMs,
      };
    }
    const vstep = cigreTable[baseCfg].voltage_step;
    if (vstep) {
      tdIq = {
        responseTimeMs: vstep.responseTimeMs,
        riseTimeMs: vstep.riseTimeMs,
        settlingTimeMs: null,
        peakOvershootPu: vstep.peakKa,
        peakTimeMs: vstep.riseTimeMs,
      };
    }
  }

  if (!tdIp && phjumpRows?.length) {
    const t = EVENT_TIME_SEC[baseCfg]?.phase_jump ?? 40;
    tdIp = computeResponseMetrics(
      phjumpRows.map((r) => ({ time: r.time, value: r.activeCurrent })),
      t,
    );
  }

  if (!tdIq && vstepRows?.length) {
    const t = EVENT_TIME_SEC[baseCfg]?.voltage_step ?? 40;
    tdIq = computeResponseMetrics(
      vstepRows.map((r) => ({ time: r.time, value: r.reactiveCurrent })),
      t,
    );
  }

  const td = tdIq || tdIp;

  return {
    cfgId: key,
    label,
    scPu,
    inertiaMWs,
    td,
    tdIp,
    tdIq,
  };
}

console.log('════════════════════════════════════════════════════════════');
console.log('  GENERATING STABILITY ANALYTICS COMPARISON METRICS JSON');
console.log('════════════════════════════════════════════════════════════');

const allKeys = Array.from({ length: 11 }, (_, i) => `CFG${i + 1}`);

const results = {};
for (const key of allKeys) {
  const metric = computeMetricsForConfig(key);
  results[key] = metric;
  console.log(
    `  ✓ ${metric.label.padEnd(20)} | SC: ${(metric.scPu != null ? metric.scPu.toFixed(2) : '—').padStart(6)} | Inertia: ${(metric.inertiaMWs != null ? metric.inertiaMWs.toFixed(2) : '—').padStart(8)} | Resp: ${(metric.td?.responseTimeMs != null ? metric.td.responseTimeMs + 'ms' : '—').padStart(7)}`,
  );
}

// Ensure target dirs exist
const outDir = path.dirname(OUT_FILE);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
console.log(`\n✓ Saved metrics JSON to: ${OUT_FILE}`);

const PUBLIC_OUT_FILE = path.join(ROOT, 'public', 'data', 'stabilityAnalyticsMetrics.json');
const publicOutDir = path.dirname(PUBLIC_OUT_FILE);
if (!fs.existsSync(publicOutDir)) {
  fs.mkdirSync(publicOutDir, { recursive: true });
}
fs.writeFileSync(PUBLIC_OUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
console.log(`✓ Saved public metrics JSON to: ${PUBLIC_OUT_FILE}`);
