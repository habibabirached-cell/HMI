import { fetchDataVisMeta } from '../dataVis/api/conf_dataVisApi';

export const COL_SOLAR_NAMEPLATE = 'Solar AC Nameplate (MWac)';
export const COL_WIND_NAMEPLATE = 'Wind Nameplate (MWac)';

const MW_BAND_STEP = 10;

const FALLBACK_BOUNDS = {
  solar: { min: 0, max: 4000 },
  wind: { min: 0, max: 3000 },
};

function statMinMax(columnStats, columnKey) {
  const entry = columnStats?.find((s) => s.column === columnKey);
  const min = Number(entry?.min);
  const max = Number(entry?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

function snapMwBounds({ min, max }, step = MW_BAND_STEP) {
  let lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (hi <= lo) hi = lo + step;
  return { min: lo, max: hi };
}

/** Min/max MW rails from active dataVis dataframe (clean or original per server mode). */
export function renewableMwBoundsFromMeta(meta) {
  const stats = meta?.column_stats;
  const solarRaw = statMinMax(stats, COL_SOLAR_NAMEPLATE);
  const windRaw = statMinMax(stats, COL_WIND_NAMEPLATE);
  return {
    solar: snapMwBounds(solarRaw ?? FALLBACK_BOUNDS.solar),
    wind: snapMwBounds(windRaw ?? FALLBACK_BOUNDS.wind),
  };
}

export function clampRenewableBand(value, bounds) {
  const n = Number(value);
  if (!Number.isFinite(n) || !bounds) return n;
  return Math.min(bounds.max, Math.max(bounds.min, n));
}

/** Set corridor bands to full filtered-data span (snapped). */
export function inputsWithRenewableDataSpan(inputs, bounds) {
  if (!bounds) return inputs;
  const minSolarMW = bounds.solar.min;
  const maxSolarMW = bounds.solar.max;
  const minWindMW = bounds.wind.min;
  const maxWindMW = bounds.wind.max;
  return {
    ...inputs,
    minSolarMW,
    maxSolarMW,
    minWindMW,
    maxWindMW,
  };
}

export async function fetchRenewableMwBoundsFromDataVis(loadMW) {
  const meta = await fetchDataVisMeta(loadMW);
  return renewableMwBoundsFromMeta(meta);
}
