/**
 * Stability chart X / CSV fetch tick (Δt) — Gyan WhatsApp 16 Aug / DOC §3.1
 *
 * Root cause: fixed steps (e.g. 0.02 or 0.005) skip samples when the case is
 * 0.00025 / 0.0001 / 0.001 / …. Always step by that CFG(+event) CSV’s own Δt.
 *
 * Prefer derive from two consecutive `t Main` samples; optional hardcode fallback.
 */

import type { StabilityEventType } from './stabilityDatabank';

/** Fallback ticks (s) when a crop has <2 usable samples — from Aug14 / All_CFG_Preevent_Gyan. */
export const STABILITY_TICK_FALLBACK_SEC: Record<string, number> = {
  CFG1: 0.00025,
  CFG2: 0.001,
  CFG3: 0.001,
  CFG4: 0.00025,
  CFG5: 0.0001,
  CFG6: 0.0001,
  CFG7: 0.0001,
  CFG8: 0.0001,
  CFG9: 0.0005,
  CFG10: 0.0001,
  CFG11: 0.001,
  CFG12: 0.019,
  CFG13: 0.014,
};

const TICK_MIN = 1e-6;
const TICK_MAX = 0.05;

/** Round to stable float for maps / comparisons (avoid 0.000250000000001). */
export function normalizeTickSec(dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return STABILITY_TICK_FALLBACK_SEC.CFG1;
  const clamped = Math.min(TICK_MAX, Math.max(TICK_MIN, dt));
  return Number(clamped.toPrecision(6));
}

/**
 * Derive tick from consecutive times (WhatsApp: “taking 2 samples of time from target CSV”).
 * Uses median of early positive deltas so one bad row does not dominate.
 */
export function deriveTickSizeFromTimes(times: number[]): number | null {
  if (!times || times.length < 2) return null;
  const deltas: number[] = [];
  const n = Math.min(times.length - 1, 64);
  for (let i = 0; i < n; i++) {
    const a = times[i];
    const b = times[i + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const d = b - a;
    if (d > TICK_MIN && d < TICK_MAX) deltas.push(d);
  }
  if (!deltas.length) return null;
  deltas.sort((x, y) => x - y);
  const mid = deltas[Math.floor(deltas.length / 2)];
  return normalizeTickSec(mid);
}

export function deriveTickSizeFromRows(rows: Array<{ time?: number }> | null | undefined): number | null {
  if (!rows?.length) return null;
  const times: number[] = [];
  for (let i = 0; i < rows.length && times.length < 80; i++) {
    const t = Number(rows[i]?.time);
    if (Number.isFinite(t)) times.push(t);
  }
  return deriveTickSizeFromTimes(times);
}

export function tickFallbackForCfg(cfgName: string | null | undefined): number {
  if (!cfgName) return STABILITY_TICK_FALLBACK_SEC.CFG1;
  const match = cfgName.toUpperCase().match(/CFGR?(\d+)/);
  const key = match ? `CFG${match[1]}` : cfgName.toUpperCase().trim();
  return STABILITY_TICK_FALLBACK_SEC[key] ?? STABILITY_TICK_FALLBACK_SEC.CFG1;
}

/**
 * Resolve tick for a CFG (+ optional event). Prefer rows from the target CSV;
 * else hardcoded CFG fallback.
 */
export function resolveTickSize(
  cfgName: string | null | undefined,
  _event: 'none' | StabilityEventType | null | undefined,
  rows?: Array<{ time?: number }> | null,
): number {
  const derived = deriveTickSizeFromRows(rows ?? undefined);
  if (derived != null) return derived;
  return normalizeTickSec(tickFallbackForCfg(cfgName));
}

/** How many CSV ticks to advance per UI frame (~20 ms).
 *  Call #4: slightly faster than 0.02 sim-s/frame (was very slow).
 *  Event post-window is much longer than the ~2 s pre loop — use a higher
 *  target so after-click playback feels closer to idle speed (tick size unchanged). */
export function ticksPerUiFrame(
  tickSec: number,
  targetSimPerFrame = 0.028,
): number {
  const t = tickSec > 0 ? tickSec : STABILITY_TICK_FALLBACK_SEC.CFG1;
  return Math.max(1, Math.round(targetSimPerFrame / t));
}

/** Idle / pre-event loop (~2 s clip). */
export const IDLE_SIM_PER_FRAME_SEC = 0.028;

/** After event click — longer post window; keep Δt, advance more ticks/frame. */
export const EVENT_SIM_PER_FRAME_SEC = 0.055;
