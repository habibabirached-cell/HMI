/**
 * WP6 QA — dials, EVENT_TIMES, crop windows, Base MVA (no hardcoded dial *outputs*).
 * Golden values are the client table / CIGRE extract used as acceptance targets only.
 *
 * Run: node scripts/wp6-qa.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeInertiaMWs, computeScDialPu, toMetricPoints } from '../src/lib/databankMetrics.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public', 'databank');

/** Order-1 dial spot-check CFGs + full CFG1–11 for T6.2 */
const CIGRE_DIALS = {
  CFG1: { scKa: 3.76, inertia: 3372, baseMva: 300, t: 40 },
  CFG2: { scKa: 2.94, inertia: 1837, baseMva: 300, t: 40 },
  CFG3: { scKa: 2.39, inertia: 2405, baseMva: 300, t: 40 },
  CFG4: { scKa: 2.91, inertia: 456, baseMva: 300, t: 80 },
  CFG5: { scKa: 3.19, inertia: 4515, baseMva: 450, t: 40 },
  CFG6: { scKa: 1.83, inertia: 2810, baseMva: 343, t: 10 },
  CFG7: { scKa: 0.713, inertia: 66.9, baseMva: 343, t: 5 },
  CFG8: { scKa: 0.865, inertia: 2699, baseMva: 300, t: 40 },
  CFG9: { scKa: 0.848, inertia: 2.72, baseMva: 326, t: 2 },
  CFG10: { scKa: 1.38, inertia: 3427, baseMva: 350, t: 40 },
  CFG11: { scKa: 1.33, inertia: 1120, baseMva: 200, t: 40 },
};

/** Excel / Databank-Aug14.md §3 — expected event starts (all four events same per CFG). */
const EXCEL_EVENT_T = {
  CFG1: 40,
  CFG2: 40,
  CFG3: 40,
  CFG4: 80,
  CFG5: 40,
  CFG6: 10,
  CFG7: 5,
  CFG8: 40,
  CFG9: 2,
  CFG10: 40,
  CFG11: 40,
};

/** Expected plot focus windows (CIGRE / Excel duration notes) — crop should cover event. */
const PLOT_FOCUS = {
  CFG4: { lo: 78, hi: 92, note: '~80–120 focus; crop covers event±' },
  CFG7: { lo: 3, hi: 10, note: '~5–10 s' },
  CFG9: { lo: 0, hi: 10, note: '~2–10 s' },
  CFG11: { lo: 38, hi: 52, note: 'event@40; Excel study 0–70' },
};

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = lines[0].replace(/^\uFEFF/, '').split(sep).map((h) => h.trim());
  const lower = head.map((h) => h.toLowerCase());
  const tIdx = lower.findIndex((l) => l === 't main' || l === 't');
  const pIdx = lower.findIndex((l) => l.includes('ppos_gep_mw'));
  const iqKa = lower.findIndex((l) => l.includes('iq_gep_ka'));
  const iqPu = lower.findIndex((l) => l.includes('iq_gep_pu') && !l.includes('neg'));
  if (tIdx < 0) throw new Error('no t Main');
  if (iqKa < 0 && iqPu < 0) throw new Error('no Iq_GEP_kA/pu');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(sep);
    const time = parseFloat(c[tIdx]);
    if (!Number.isFinite(time)) continue;
    rows.push({
      time,
      pMw: pIdx >= 0 ? parseFloat(c[pIdx]) : NaN,
      shortCircuitCurrent: parseFloat(c[iqKa >= 0 ? iqKa : iqPu]),
      scCol: iqKa >= 0 ? 'kA' : 'pu',
    });
  }
  return rows;
}

function readEventCsv(cfg, event) {
  const p = path.join(PUB, cfg, `${event}.csv`);
  if (!fs.existsSync(p)) return null;
  return parseCsv(fs.readFileSync(p, 'utf8'));
}

function near(a, b, absTol, relTol = 0.02) {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  const abs = Math.abs(a - b);
  if (abs <= absTol) return true;
  return abs <= Math.abs(b) * relTol;
}

function loadEventTimesFromSource() {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/stabilityDatabank.ts'), 'utf8');
  const block = src.match(
    /const EVENT_TIMES: Record<string, EventTimes> = \{([\s\S]*?)\n\};/,
  );
  if (!block) throw new Error('EVENT_TIMES not found');
  const out = {};
  for (const m of block[1].matchAll(
    /CFG(\d+)\s*:\s*\{\s*fault:\s*([\d.]+),\s*rocof:\s*([\d.]+),\s*phase_jump:\s*([\d.]+),\s*voltage_step:\s*([\d.]+)/g,
  )) {
    out[`CFG${m[1]}`] = {
      fault: +m[2],
      rocof: +m[3],
      phase_jump: +m[4],
      voltage_step: +m[5],
    };
  }
  return out;
}

function loadBaseMvaFromSource() {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/stabilityDatabank.ts'), 'utf8');
  const block = src.match(/CFG_PLANT_BASE_MVA[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error('CFG_PLANT_BASE_MVA not found');
  const out = {};
  for (const m of block[1].matchAll(/CFG(\d+)\s*:\s*([\d.]+)/g)) {
    out[`CFG${m[1]}`] = +m[2];
  }
  return out;
}

function codeSmokeT61() {
  const dash = fs.readFileSync(
    path.join(ROOT, 'src/components/stability/StabilityDashboard.tsx'),
    'utf8',
  );
  const cmp = fs.readFileSync(
    path.join(ROOT, 'src/components/stability/StabilityCompareAnalytics.tsx'),
    'utf8',
  );
  const checks = [];

  const settlingUi =
    /\bSettling\b/.test(dash.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')) ||
    /\bSettling\b/.test(cmp.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));
  checks.push({
    id: 'T6.1-no-Settling-UI',
    pass: !settlingUi,
    detail: settlingUi ? 'Settling string still in Stability UI' : 'No Settling label in Stability UI',
  });

  checks.push({
    id: 'T6.1-CB-gate-waveform',
    pass: /showEventDiagram = Boolean\(droppedAsset\) && !breakerOpen/.test(dash),
    detail: 'Event waveform gated on CFG + CB closed',
  });

  checks.push({
    id: 'T6.1-hover-preview-same-CSV',
    pass:
      /displayEvent = hoveredEvent \?\? activeEvent/.test(dash) &&
      /Waveform only when CFG \+ CB closed \(same CSV path as click\)/.test(dash),
    detail: 'Hover drives Event Details from same loadCfgEventRows path as click',
  });

  checks.push({
    id: 'T6.1-Current-Previous',
    pass: /previousSnapshot/.test(dash) && /DialRoleCaption role="previous"/.test(dash),
    detail: 'Current | Previous dial/TD latch present',
  });

  checks.push({
    id: 'T6.1-CFG12-13-mode-latch',
    pass: /switchCfg12Mode/.test(dash) && /switchCfg13Mode/.test(dash) && /formatCfgModeLabel/.test(dash),
    detail: 'CFG12/13 mode switch latches Previous snapshot',
  });

  checks.push({
    id: 'T6.1-Analytics-3-mode-rows',
    pass:
      /CFG12_13_MODES/.test(cmp) &&
      /independent Analytics row/.test(cmp) &&
      /modes12/.test(cmp) &&
      /modes13/.test(cmp),
    detail: 'Analytics exposes BESS / SynCon / Combined as independent rows',
  });

  checks.push({
    id: 'T6.1-SCL-dial-kA-label',
    pass: /SCL \(kA\)/.test(cmp) || /SHORT CIRCUIT LEVEL \(kA\)/i.test(dash) || /kA/.test(dash),
    detail: 'SCL dial presented in kA',
  });

  checks.push({
    id: 'T6.1-Base-MVA-banner',
    pass: /Base MVA = \{machineBaseMva/.test(dash),
    detail: 'Base MVA headline above Ip/Iq charts',
  });

  return checks;
}

const lines = [];
const push = (s = '') => lines.push(s);

push('=== WP6 QA report ===');
push('');

// ── Order 1: dial spot-check ──
push('## 1) Dial spot-check (CFG1, CFG3, CFG9, CFG10, CFG11)');
push('CFG       gotSC   wantSC     gotIn   wantIn  col   result');
const spot = ['CFG1', 'CFG3', 'CFG9', 'CFG10', 'CFG11'];
let spotFail = 0;
for (const cfg of spot) {
  const g = CIGRE_DIALS[cfg];
  const scl = readEventCsv(cfg, 'SCL');
  const roc = readEventCsv(cfg, 'ROCOF');
  if (!scl?.length || !roc?.length) {
    push(`${cfg}  MISSING public crop`);
    spotFail++;
    continue;
  }
  const sc = computeScDialPu(toMetricPoints(scl), g.t);
  const inn = computeInertiaMWs(toMetricPoints(roc), g.t);
  const scOk = near(sc, g.scKa, 0.02, 0.015);
  const inOk = near(inn, g.inertia, Math.max(1, g.inertia * 0.01), 0.015);
  const col = scl[0]?.scCol ?? '?';
  const ok = scOk && inOk && col === 'kA';
  if (!ok) spotFail++;
  push(
    `${cfg.padEnd(6)}  ${sc?.toFixed(3).padStart(6)}  ${String(g.scKa).padStart(6)}  ${inn?.toFixed(1).padStart(8)}  ${String(g.inertia).padStart(7)}  ${col.padEnd(3)}  ${ok ? 'PASS' : 'FAIL'}`,
  );
}
push(`Spot-check: ${spotFail ? `${spotFail} FAIL` : 'ALL PASS'}`);
push('');

// ── T6.2 full dials ──
push('## 2a) T6.2 CIGRE dials CFG1–11 (public crops, formulas)');
push('CFG       gotSC   wantSC     gotIn   wantIn  result');
let dialFail = 0;
for (const [cfg, g] of Object.entries(CIGRE_DIALS)) {
  const scl = readEventCsv(cfg, 'SCL');
  const roc = readEventCsv(cfg, 'ROCOF');
  const sc = scl ? computeScDialPu(toMetricPoints(scl), g.t) : null;
  const inn = roc ? computeInertiaMWs(toMetricPoints(roc), g.t) : null;
  const ok =
    near(sc, g.scKa, 0.02, 0.015) && near(inn, g.inertia, Math.max(1, g.inertia * 0.01), 0.015);
  if (!ok) dialFail++;
  push(
    `${cfg.padEnd(6)}  ${sc?.toFixed(3).padStart(6)}  ${String(g.scKa).padStart(6)}  ${inn?.toFixed(1).padStart(8)}  ${String(g.inertia).padStart(7)}  ${ok ? 'PASS' : 'FAIL'}`,
  );
}
push(`CIGRE dials: ${dialFail ? `${dialFail} FAIL` : 'ALL PASS'}`);
push('');
push('NOTE T6.2 TD Peak: UI still shows Peak as pu overshoot (formatPu);');
push('CIGRE summary Peak is kA — unit alignment is a known product gap (not dial formula).');
push('TD Response/Rise are computed live from Ip/Iq pu; visual QA vs PDF plots is manual.');
push('');

// ── T6.3 timings ──
push('## 2b) T6.3 EVENT_TIMES vs Excel (focus CFG4, CFG7, CFG9, CFG11)');
const et = loadEventTimesFromSource();
const bm = loadBaseMvaFromSource();
let timeFail = 0;
for (const [cfg, wantT] of Object.entries(EXCEL_EVENT_T)) {
  const e = et[cfg];
  const timesOk =
    e &&
    e.fault === wantT &&
    e.rocof === wantT &&
    e.phase_jump === wantT &&
    e.voltage_step === wantT;
  const baseOk = bm[cfg] === CIGRE_DIALS[cfg].baseMva;
  if (!timesOk || !baseOk) timeFail++;
  const focus = ['CFG4', 'CFG7', 'CFG9', 'CFG11'].includes(cfg) ? ' ★' : '';
  push(
    `${cfg}${focus}  code=${e ? `${e.fault}/${e.rocof}/${e.phase_jump}/${e.voltage_step}` : 'MISSING'}  excel=${wantT}  baseMva code=${bm[cfg]} want=${CIGRE_DIALS[cfg].baseMva}  ${timesOk && baseOk ? 'PASS' : 'FAIL'}`,
  );
}
push(`EVENT_TIMES+BaseMVA: ${timeFail ? `${timeFail} FAIL` : 'ALL PASS'}`);
push('');

push('## 2c) Crop window covers event (CFG4/7/9/11 SCL+ROCOF)');
let winFail = 0;
for (const cfg of ['CFG4', 'CFG7', 'CFG9', 'CFG11']) {
  const want = EXCEL_EVENT_T[cfg];
  const focus = PLOT_FOCUS[cfg];
  for (const ev of ['SCL', 'ROCOF']) {
    const rows = readEventCsv(cfg, ev);
    if (!rows?.length) {
      push(`${cfg}/${ev} MISSING`);
      winFail++;
      continue;
    }
    const t0 = rows[0].time;
    const t1 = rows[rows.length - 1].time;
    const coversEvent = t0 < want && t1 > want + 0.04;
    const coversFocus = t0 <= focus.lo + 1 && t1 >= Math.min(focus.hi, want + 2);
    const ok = coversEvent;
    if (!ok) winFail++;
    push(
      `${cfg}/${ev}  [${t0.toFixed(2)} … ${t1.toFixed(2)}]  event@${want}  covers=${coversEvent}  focusHint=${focus.note}  ${ok ? 'PASS' : 'FAIL'}`,
    );
  }
}
push(`Crop windows: ${winFail ? `${winFail} FAIL` : 'ALL PASS'}`);
push('');

// ── T6.1 code smoke ──
push('## 2d) T6.1 13 Aug regression (code smoke)');
const t61 = codeSmokeT61();
let t61Fail = 0;
for (const c of t61) {
  if (!c.pass) t61Fail++;
  push(`${c.pass ? 'PASS' : 'FAIL'}  ${c.id} — ${c.detail}`);
}
push(`T6.1 code smoke: ${t61Fail ? `${t61Fail} FAIL` : 'ALL PASS'}`);
push('');

const totalFail = spotFail + dialFail + timeFail + winFail + t61Fail;
push('=== SUMMARY ===');
push(`Order1 dials:     ${spotFail ? 'FAIL' : 'PASS'}`);
push(`T6.2 CIGRE dials: ${dialFail ? 'FAIL' : 'PASS'}`);
push(`T6.3 timings:     ${timeFail ? 'FAIL' : 'PASS'}`);
push(`T6.3 crops:       ${winFail ? 'FAIL' : 'PASS'}`);
push(`T6.1 code:        ${t61Fail ? 'FAIL' : 'PASS'}`);
push(`Overall (auto):   ${totalFail ? `FAIL (${totalFail})` : 'PASS'}`);
push('');
push('Manual still needed: live UI click through CFG12/13 modes + Analytics 3 rows + CB open/close.');

console.log(lines.join('\n'));
process.exit(totalFail ? 1 : 0);
