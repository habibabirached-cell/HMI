/** Default Waco workbook when no load button was pressed (Ideum). */
export const DEFAULT_WACO_LOAD_TIER = 200;

/** @returns {200 | 1000 | null} */
export function normalizeWacoLoadTier(loadMW) {
  const n = Number(loadMW);
  if (!Number.isFinite(n)) return null;
  const tier = Math.round(n);
  if (tier === 200 || tier === 1000) return tier;
  return null;
}
/** Tier for dataVis / preload — explicit 200|1000 only; otherwise 200 MW workbook. */
export function resolveWacoLoadTierForDataVis(loadMW) {
  return normalizeWacoLoadTier(loadMW) ?? DEFAULT_WACO_LOAD_TIER;
}

