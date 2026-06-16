/** Default playback loop window (seconds). */
export const DEFAULT_PLAYBACK_T1 = 8;
export const DEFAULT_PLAYBACK_T2 = 60;

export const DEFAULT_PLAYBACK_TIME_RANGE = {
  t1: DEFAULT_PLAYBACK_T1,
  t2: DEFAULT_PLAYBACK_T2,
};

/** Coerce saved / edited values to a valid { t1, t2 } pair. */
export function normalizePlaybackTimeRange(
  raw,
  fallback = DEFAULT_PLAYBACK_TIME_RANGE,
) {
  const fb = normalizePair(fallback);
  if (!raw || typeof raw !== 'object') return fb;
  let t1 = Number(raw.t1 ?? raw.start);
  let t2 = Number(raw.t2 ?? raw.end);
  if (!Number.isFinite(t1)) t1 = fb.t1;
  if (!Number.isFinite(t2)) t2 = fb.t2;
  return normalizePair({ t1, t2 });
}

function normalizePair({ t1, t2 }) {
  let a = Math.max(0, t1);
  let b = Math.max(0, t2);
  if (a > b) [a, b] = [b, a];
  return { t1: a, t2: b };
}

/**
 * User loop window clamped to available CSV span.
 * Falls back to data bounds when the user window does not overlap data.
 */
export function resolvePlaybackLoopBounds(userRange, dataMin, dataMax) {
  const { t1, t2 } = normalizePlaybackTimeRange(userRange);
  const dMin = Number.isFinite(Number(dataMin)) ? Number(dataMin) : t1;
  const dMax = Number.isFinite(Number(dataMax)) ? Number(dataMax) : t2;
  const loopStart = Math.max(t1, dMin);
  const loopEnd = Math.min(t2, dMax);
  if (loopEnd > loopStart) {
    return { loopStart, loopEnd };
  }
  if (dMax > dMin) {
    return { loopStart: dMin, loopEnd: dMax };
  }
  return { loopStart: t1, loopEnd: t2 };
}
