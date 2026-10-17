import { normalizeWacoLoadTier } from './conf_wacoLoadTier';

/** Installed CAPEX unit labels (Ideum touch hub). */
export const IDEUM_CAPEX_UNIT_KW = '($/kW)';
export const IDEUM_CAPEX_UNIT_KWH = '($/kWh)';

/** 200 MW tier: show stored $/kW ÷ 0.2 (same basis as 1 GW study). */
export const IDEUM_CAPEX_200_MW_DISPLAY_DIVISOR = 0.2;

export function ideumCapexDisplayValue(storedValue, loadMW) {
  const n = Number(storedValue);
  if (!Number.isFinite(n)) return storedValue;
  if (normalizeWacoLoadTier(loadMW) === 200) {
    return n / IDEUM_CAPEX_200_MW_DISPLAY_DIVISOR;
  }
  return n;
}

export function ideumCapexStoredValue(displayValue, loadMW) {
  const n = Number(displayValue);
  if (!Number.isFinite(n)) return displayValue;
  if (normalizeWacoLoadTier(loadMW) === 200) {
    return n * IDEUM_CAPEX_200_MW_DISPLAY_DIVISOR;
  }
  return n;
}

/** Unit CAPEX defaults for Ideum configurator hub (not yet wired to optimizer). */

export const IDEUM_CAPEX_TECH_IDS = [
  'solar',
  'wind',
  'heavyDutyGT',
  'aeroderivativeGT',
  'battery',
];

export const IDEUM_CAPEX_DISABLED_TECH_IDS = ['recipEngine', 'nuclear', 'fuelCell'];

export const HD_GT_CYCLE_MODE = {
  COMBINED: 'combined',
  SIMPLE: 'simple',
};

/** Installed/EPC-style indicative defaults (global, not location-adjusted). */
export const HD_GT_CAPEX_DEFAULT_BY_MODE = {
  [HD_GT_CYCLE_MODE.COMBINED]: 1000,
  [HD_GT_CYCLE_MODE.SIMPLE]: 836,
};

export const TECH_CAPEX_FIELD_DEFAULTS = {
  solar: { capexPerKwAc: 1500 },
  wind: { capexPerKw: 1400 },
  heavyDutyGT: {
    cycleMode: HD_GT_CYCLE_MODE.SIMPLE,
    capexPerKw: HD_GT_CAPEX_DEFAULT_BY_MODE[HD_GT_CYCLE_MODE.SIMPLE],
    gasPricePerMmbtu: 6,
  },
  aeroderivativeGT: { capexPerKw: 1200, gasPricePerMmbtu: 6 },
  battery: { capexPerKw: 372, capexPerKwh: 334 },
};

export function createDefaultTechnologyCapex() {
  return JSON.parse(JSON.stringify(TECH_CAPEX_FIELD_DEFAULTS));
}

function parsePositiveNumber(value, fallback) {
  if (value === '' || value == null) return fallback;
  const n = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function normalizeTechnologyCapex(raw) {
  const base = createDefaultTechnologyCapex();
  if (!raw || typeof raw !== 'object') return base;

  base.solar.capexPerKwAc = parsePositiveNumber(
    raw.solar?.capexPerKwAc,
    base.solar.capexPerKwAc,
  );
  base.wind.capexPerKw = parsePositiveNumber(raw.wind?.capexPerKw, base.wind.capexPerKw);
  base.aeroderivativeGT.capexPerKw = parsePositiveNumber(
    raw.aeroderivativeGT?.capexPerKw,
    base.aeroderivativeGT.capexPerKw,
  );
  base.battery.capexPerKw = parsePositiveNumber(
    raw.battery?.capexPerKw,
    base.battery.capexPerKw,
  );
  base.battery.capexPerKwh = parsePositiveNumber(
    raw.battery?.capexPerKwh,
    base.battery.capexPerKwh,
  );

  // Combined cycle not selectable in UI yet — always simple cycle.
  base.heavyDutyGT.cycleMode = HD_GT_CYCLE_MODE.SIMPLE;
  const hdDefault = HD_GT_CAPEX_DEFAULT_BY_MODE[HD_GT_CYCLE_MODE.SIMPLE];
  base.heavyDutyGT.capexPerKw = parsePositiveNumber(
    raw.heavyDutyGT?.capexPerKw,
    hdDefault,
  );
  base.heavyDutyGT.gasPricePerMmbtu = parsePositiveNumber(
    raw.heavyDutyGT?.gasPricePerMmbtu,
    base.heavyDutyGT.gasPricePerMmbtu,
  );
  base.aeroderivativeGT.gasPricePerMmbtu = parsePositiveNumber(
    raw.aeroderivativeGT?.gasPricePerMmbtu,
    base.aeroderivativeGT.gasPricePerMmbtu,
  );

  return base;
}

export function setTechnologyCapexField(capex, techId, field, value) {
  const next = normalizeTechnologyCapex(capex);
  if (!next[techId]) return next;
  next[techId] = { ...next[techId], [field]: value };
  return normalizeTechnologyCapex(next);
}

export function setHeavyDutyCycleMode(capex, mode) {
  const next = normalizeTechnologyCapex(capex);
  if (mode !== HD_GT_CYCLE_MODE.SIMPLE) {
    return next;
  }
  const resolved = HD_GT_CYCLE_MODE.SIMPLE;
  const prevDefault = HD_GT_CAPEX_DEFAULT_BY_MODE[next.heavyDutyGT.cycleMode];
  const nextDefault = HD_GT_CAPEX_DEFAULT_BY_MODE[resolved];
  const wasDefault = next.heavyDutyGT.capexPerKw === prevDefault;
  next.heavyDutyGT.cycleMode = resolved;
  if (wasDefault) {
    next.heavyDutyGT.capexPerKw = nextDefault;
  }
  return normalizeTechnologyCapex(next);
}

export function formatCapexDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Math.round(n).toLocaleString('en-US');
}

export function formatGasPriceDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Touch-table wheel ranges (installed unit CAPEX). */
export const CAPEX_WHEEL_PRESETS = {
  solarPerKwAc: { min: 800, max: 2400, step: 25 },
  generationPerKw: { min: 500, max: 2200, step: 25 },
  bessPowerPerKw: { min: 200, max: 600, step: 5 },
  bessEnergyPerKwh: { min: 100, max: 500, step: 5 },
  gasPricePerMmbtu: { min: 2, max: 16, step: 0.25 },
};

export function buildCapexWheelOptions({ min, max, step }) {
  const lo = Number(min);
  const hi = Number(max);
  const st = Number(step);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(st) || st <= 0) return [];
  const out = [];
  for (let v = lo; v <= hi + st * 0.001; v += st) {
    out.push(Math.round(v * 1000) / 1000);
  }
  return out;
}

export function ideumCapexWheelOptionsForLoad(wheelPreset, loadMW) {
  const base = buildCapexWheelOptions(wheelPreset);
  if (normalizeWacoLoadTier(loadMW) === 200) {
    return base.map((v) => v / IDEUM_CAPEX_200_MW_DISPLAY_DIVISOR);
  }
  return base;
}

export function nearestCapexWheelOption(value, options) {
  if (!options?.length) return Number(value);
  const n = Number(value);
  if (!Number.isFinite(n)) return options[0];
  let best = options[0];
  let bestDist = Math.abs(best - n);
  for (let i = 1; i < options.length; i += 1) {
    const d = Math.abs(options[i] - n);
    if (d < bestDist) {
      best = options[i];
      bestDist = d;
    }
  }
  return best;
}

export function ideumConfiguratorTechnologyIds() {
  return [...IDEUM_CAPEX_TECH_IDS];
}
