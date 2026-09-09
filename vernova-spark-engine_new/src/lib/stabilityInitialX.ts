/**
 * Initial X-axis window size per CFG — Gyan WhatsApp 16 Aug afternoon (DOC §3.5).
 *
 * Initially keep chart X max at this value. Do not shrink on event click.
 * When playback reaches the boundary, extend by time-before-event so full
 * postevent CSV fits; then stop at end.
 *
 * Pack cross-check (§9.3): InitialX[CFG] == (t_last − t_event) of postevent.
 */

/** Hardcoded Initial X size (seconds) for CFG1–13. */
export const STABILITY_INITIAL_X_SEC: Record<string, number> = {
  CFG1: 40,
  CFG2: 40,
  CFG3: 40,
  CFG4: 70,
  CFG5: 40,
  CFG6: 70,
  CFG7: 75,
  CFG8: 40,
  CFG9: 40,
  CFG10: 40,
  CFG11: 30,
  CFG12: 15,
  CFG13: 10,
};

export function getInitialXSize(cfgName: string | null | undefined): number | null {
  if (!cfgName) return null;
  const match = cfgName.toUpperCase().match(/CFGR?(\d+)/);
  const key = match ? `CFG${match[1]}` : cfgName.toUpperCase().trim();
  const v = STABILITY_INITIAL_X_SEC[key];
  return v != null && v > 0 ? v : null;
}

/**
 * WhatsApp event stop / axis end:
 *   x_max = x_pre + InitialX   (InitialX ≡ post span)
 * Fallback when CFG has no table entry (CFG12/13): x_pre + (t_last − t_event).
 */
export function computeEventXMax(opts: {
  cfgName: string | null | undefined;
  xPre: number;
  tEvent: number;
  tLast: number;
}): number {
  const { xPre, tEvent, tLast } = opts;
  const fromCsv = Math.max(0, tLast - tEvent);
  const initial = getInitialXSize(opts.cfgName);
  const postSpan = initial != null ? Math.max(initial, fromCsv) : fromCsv;
  return xPre + postSpan;
}

/**
 * Visible X-axis max: never below Initial X; grow with playback / event end.
 * Replaces the old hard-coded `Math.max(40, …)` for every CFG.
 */
export function chartXAxisMax(opts: {
  cfgName: string | null | undefined;
  graphTime: number;
  eventXMax: number | null;
  hasPoints: boolean;
}): number {
  const initial = getInitialXSize(opts.cfgName) ?? 40;
  if (!opts.hasPoints) return initial;
  return Math.max(initial, opts.graphTime, opts.eventXMax ?? 0, 1);
}
