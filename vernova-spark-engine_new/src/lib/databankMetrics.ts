/**
 * Dial metrics from Databank_Info_Aug14.xlsx (Signals + DIAL VALUE):
 *
 * Charts (Fault / RoCoF): Ip_GEP_pu Main + Iq_GEP_pu Main (waveforms stay pu)
 *
 * Short Circuit dial (product UI — Asha 15 Aug):
 *   Iq_GEP_kA Main at (tf + 0.04 s) — kA, not pu
 *
 * ROCOF / Inertia dial:
 *   f0 = 50, ROCOF = 1
 *   ∆P = mean(Ppos_GEP_MW Main from tr .. tr+1) − P just before tr
 *   Inertia (MW.s) = ∆P * f0 / (2 * ROCOF)
 */

export type MetricPoint = {
  time: number;
  /** Ppos_GEP_MW Main — inertia formula only (not chart Ip) */
  pMw: number;
  /** Iq_GEP_kA Main (preferred) for SC dial — field name kept for callers */
  iqPu: number;
};

const F0_HZ = 50;
const ROCOF_HZ_PER_S = 1; // |ROCOF| used in Databank_Info (study is −1 Hz/s)
const SC_OFFSET_S = 0.04;

function nearestIndex(rows: MetricPoint[], t: number): number {
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

/** Sample just before `t` (last point with time < t). */
function sampleJustBefore(rows: MetricPoint[], t: number): MetricPoint | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].time < t && Number.isFinite(rows[i].pMw)) return rows[i];
  }
  return null;
}

/**
 * Short-circuit dial: Iq_GEP_kA Main at tf + 0.04 s
 * (nearest sample on slim/windowed data — values unchanged).
 */
export function computeScDialPu(rows: MetricPoint[], tfSec: number): number | null {
  if (!rows.length || !Number.isFinite(tfSec)) return null;
  const idx = nearestIndex(rows, tfSec + SC_OFFSET_S);
  if (idx < 0) return null;
  const v = rows[idx].iqPu;
  return Number.isFinite(v) ? v : null;
}

/** Alias — dial is kA after Aug14 wiring (same sample rule as computeScDialPu). */
export const computeScDialKa = computeScDialPu;

/**
 * Inertia dial (MW.s) from ROCOF study CSV using Databank_Info formula.
 */
export function computeInertiaMWs(rows: MetricPoint[], trSec: number): number | null {
  if (!rows.length || !Number.isFinite(trSec)) return null;

  const before = sampleJustBefore(rows, trSec);
  if (!before) return null;

  const window = rows.filter(
    (r) => r.time >= trSec && r.time <= trSec + 1 && Number.isFinite(r.pMw),
  );
  if (!window.length) return null;

  const meanP = window.reduce((s, r) => s + r.pMw, 0) / window.length;
  const deltaP = meanP - before.pMw;
  const inertia = (deltaP * F0_HZ) / (2 * ROCOF_HZ_PER_S);
  return Number.isFinite(inertia) ? inertia : null;
}

export function toMetricPoints(
  rows: Array<{
    time: number;
    shortCircuitCurrent: number;
    /** Preferred: Ppos_GEP_MW from CSV; required for correct inertia */
    pMw?: number;
    /** Legacy fallback only */
    activeCurrent?: number;
  }>,
): MetricPoint[] {
  const source = (rows as any)?.rawRows || rows;
  return source.map((r: any) => ({
    time: r.time,
    pMw: Number.isFinite(r.pMw) ? (r.pMw as number) : (r.activeCurrent ?? NaN),
    iqPu: r.shortCircuitCurrent,
  }));
}

/** Common system MVA for fair CFG-to-CFG SC compare (Arun 10 Aug — ~300 MVA). */
export const SYSTEM_BASE_MVA = 300;

/**
 * Sum SynCon / BESS / STATCOM MVA from CFG rating strings.
 * Handles "150 MVA", "65 MVA × 2", "152.68 MVA (3.47 MVA x 44 …)".
 */
export function parseMachineBaseMva(
  specs: Array<{ rating: string; type?: string; name?: string }>,
): number {
  let sum = 0;
  for (const s of specs) {
    const kind = `${s.type ?? ''} ${s.name ?? ''}`;
    if (!/syncon|battery|statcom|bess/i.test(kind)) continue;
    const mult = s.rating.match(/([\d.]+)\s*MVA\s*[×xX]\s*(\d+)/);
    if (mult) {
      sum += parseFloat(mult[1]) * parseInt(mult[2], 10);
      continue;
    }
    const m = s.rating.match(/([\d.]+)\s*MVA/i);
    if (m) sum += parseFloat(m[1]);
  }
  return sum > 0 ? sum : SYSTEM_BASE_MVA;
}

/** Convert SC dial from machine pu base → common system base. */
export function scPuOnSystemBase(
  scPu: number,
  machineBaseMva: number,
  systemBase = SYSTEM_BASE_MVA,
): number {
  if (!Number.isFinite(scPu) || !(machineBaseMva > 0) || !(systemBase > 0)) return scPu;
  return scPu * (machineBaseMva / systemBase);
}

/** Slide 15 — Time Domain Characterization metrics from Ip/Iq series. */
export type ResponseMetrics = {
  /** Time from event to first detectable response (onset above noise) */
  responseTimeMs: number | null;
  /** Time to reach 90% of first-cycle peak (from event) */
  riseTimeMs: number | null;
  /** Time until oscillations stay within ±5% of peak-to-peak */
  settlingTimeMs: number | null;
  /** First-cycle peak magnitude vs pre-event baseline (pu) */
  peakOvershootPu: number | null;
  /** Time from event to first-cycle peak (ms) — Slide 17 “Peak Time” */
  peakTimeMs: number | null;
};

type SeriesPoint = { time: number; value: number };

const meanOf = (pts: SeriesPoint[]) =>
  pts.length ? pts.reduce((s, p) => s + p.value, 0) / pts.length : NaN;

const stdOf = (pts: SeriesPoint[], mean: number) => {
  if (pts.length < 2) return 0;
  const varSum = pts.reduce((s, p) => s + (p.value - mean) ** 2, 0);
  return Math.sqrt(varSum / pts.length);
};

/**
 * First significant local extremum of |value − baseline| after the event.
 * Slim databank CSVs are ~40–80 ms apart — detect first peak cycle from samples.
 */
function findFirstPeak(
  post: SeriesPoint[],
  baseline: number,
  eventAt: number,
  minAbs: number,
): SeriesPoint | null {
  if (!post.length) return null;

  const absDev = (p: SeriesPoint) => Math.abs(p.value - baseline);
  // Search first ~5 s (or enough samples) so coarse CSVs still catch the first cycle
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

/**
 * Slide 15 metrics around event start for Voltage step / Phase jump:
 * Response = onset (first sample above noise after event — not 50% delay),
 * Rise = 90% of first peak, Settling = ±5% band, Peak = first peak vs baseline.
 *
 * Tiny / noise-only excursions return null (UI shows —) instead of fake 0 ms / 0.000 pu.
 */
export function computeResponseMetrics(
  series: Array<{ time: number; value: number }>,
  eventAt: number,
): ResponseMetrics {
  const empty: ResponseMetrics = {
    responseTimeMs: null,
    riseTimeMs: null,
    settlingTimeMs: null,
    peakOvershootPu: null,
    peakTimeMs: null,
  };
  if (!series.length || !Number.isFinite(eventAt)) return empty;

  const post = series.filter(
    (p) => p.time >= eventAt && p.time <= eventAt + 60 && Number.isFinite(p.value),
  );
  if (post.length < 3) return empty;

  const pre = series.filter(
    (p) => p.time >= eventAt - 0.5 && p.time < eventAt && Number.isFinite(p.value),
  );
  const baseline = pre.length ? meanOf(pre) : post[0].value;
  const preSigma = stdOf(pre, baseline);

  // Ignore noise-sized wiggles (meeting: Settling 0 ms / Peak 0.000 on flat V-step Ip/Iq)
  const MIN_ABS_PU = 0.002;
  const minAbs = Math.max(MIN_ABS_PU, 5 * preSigma);

  const peakPt = findFirstPeak(post, baseline, eventAt, minAbs);
  if (!peakPt) return empty;

  const peakAbs = Math.abs(peakPt.value - baseline);
  if (peakAbs < minAbs) return empty;

  const sign = Math.sign(peakPt.value - baseline) || 1;
  const goingUp = peakPt.value >= baseline;
  const thresh90 = baseline + sign * peakAbs * 0.9;

  // Response = first detectable departure from baseline (onset), not 50% of peak
  let responseTimeMs: number | null = null;
  for (const p of post) {
    if (p.time > peakPt.time) break;
    if (Math.abs(p.value - baseline) >= minAbs) {
      responseTimeMs = (p.time - eventAt) * 1000;
      break;
    }
  }

  let riseTimeMs: number | null = null;
  const untilPeak = post.filter((p) => p.time <= peakPt.time);
  for (const p of untilPeak) {
    const hit90 = goingUp ? p.value >= thresh90 : p.value <= thresh90;
    if (hit90 && riseTimeMs == null) {
      riseTimeMs = (p.time - eventAt) * 1000;
    }
  }
  if (responseTimeMs == null) responseTimeMs = (peakPt.time - eventAt) * 1000;
  if (riseTimeMs == null) riseTimeMs = (peakPt.time - eventAt) * 1000;

  const afterInclPeak = post.filter((p) => p.time >= peakPt.time);

  // Opposing extremum in the first cycle window (~2 s or 24 samples)
  const cycleWindow = afterInclPeak.filter((p) => p.time <= peakPt.time + 2);
  const cycleSearch = cycleWindow.length >= 2
    ? cycleWindow
    : afterInclPeak.slice(0, Math.min(24, afterInclPeak.length));
  let opposite = baseline;
  if (goingUp) {
    let minV = peakPt.value;
    for (const p of cycleSearch) if (p.value < minV) minV = p.value;
    opposite = Math.min(minV, baseline);
  } else {
    let maxV = peakPt.value;
    for (const p of cycleSearch) if (p.value > maxV) maxV = p.value;
    opposite = Math.max(maxV, baseline);
  }
  const peakToPeak = Math.max(Math.abs(peakPt.value - opposite), peakAbs);

  // Final value: mean of the last ~2 s of the post-event window (steady-state)
  const tEnd = post[post.length - 1].time;
  const late = post.filter((p) => p.time >= Math.max(eventAt + 1, tEnd - 2));
  const tail = late.length >= 3 ? late : post.slice(Math.floor((post.length * 2) / 3));
  const finalMean = meanOf(tail.length ? tail : post);

  const stepAbs = Math.abs(finalMean - baseline);
  const band = Math.max(peakToPeak * 0.05, stepAbs * 0.05, minAbs * 0.25);

  // Sample spacing for a ~0.5 s dwell inside the ±5% band (slide 15 settling)
  const dt =
    afterInclPeak.length >= 2
      ? Math.max(1e-4, afterInclPeak[1].time - afterInclPeak[0].time)
      : 0.08;
  const sustainN = Math.max(3, Math.ceil(0.5 / dt));

  // Settling only if the signal left the band (real transient), then stayed in-band for ~0.5 s
  let leftBand = false;
  let settlingTimeMs: number | null = null;
  for (let i = 0; i < afterInclPeak.length; i++) {
    const p = afterInclPeak[i];
    const err = Math.abs(p.value - finalMean);
    if (err > band) {
      leftBand = true;
      continue;
    }
    if (!leftBand) continue;
    const dwell = afterInclPeak.slice(i, i + sustainN);
    if (dwell.length < sustainN) continue;
    if (dwell.every((q) => Math.abs(q.value - finalMean) <= band)) {
      settlingTimeMs = (p.time - eventAt) * 1000;
      break;
    }
  }

  return {
    responseTimeMs: responseTimeMs != null ? Math.max(0, responseTimeMs) : null,
    riseTimeMs: riseTimeMs != null ? Math.max(0, riseTimeMs) : null,
    // Never report a bogus 0 ms settle from an already-quiet signal
    settlingTimeMs:
      settlingTimeMs != null && settlingTimeMs > 0 ? settlingTimeMs : null,
    peakOvershootPu: peakAbs,
    peakTimeMs: Math.max(0, (peakPt.time - eventAt) * 1000),
  };
}

export function formatMs(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '— ms';
  if (v < 1) return `${v.toFixed(2)} ms`;
  if (v < 10) return `${Number.isInteger(v) ? v : v.toFixed(1)} ms`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)} s`;
  return `${Math.round(v)} ms`;
}

export function formatPu(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '— pu';
  if (Math.abs(v) < 0.05) return `${v.toFixed(3)} pu`;
  return `${v.toFixed(2)} pu`;
}

/** Email §6 — Peak unit kA (from Ip_GEP_kA Main), not pu. */
export function formatKa(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '— kA';
  if (Math.abs(v) < 0.1) return `${v.toFixed(3)} kA`;
  return `${v.toFixed(2)} kA`;
}

/** CFG12/13 Peak on P_poc1 (Slide 18). */
export function formatMw(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '— MW';
  if (Math.abs(v) < 0.1) return `${v.toFixed(3)} MW`;
  return `${v.toFixed(2)} MW`;
}

/** CFG12/13 Peak on Q_poc1 (Slide 18). */
export function formatMvar(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '— MVAr';
  if (Math.abs(v) < 0.1) return `${v.toFixed(3)} MVAr`;
  return `${v.toFixed(2)} MVAr`;
}
