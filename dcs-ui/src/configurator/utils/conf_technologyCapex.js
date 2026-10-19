/** Installed CAPEX unit labels (Ideum touch hub). */
export const IDEUM_CAPEX_UNIT_KW = '($/kW)';
export const IDEUM_CAPEX_UNIT_KWH = '($/kWh)';

/**
 * Wheel figures are $/kW, $/kWh, and $/MMBtu on both load tiers.
 * Those are the units in the 200 MW study prices, so 200 MW is not rescaled.
 */
export function ideumCapexDisplayValue(storedValue, _loadMW) {
  const n = Number(storedValue);
  if (!Number.isFinite(n)) return storedValue;
  return n;
}

export function ideumCapexStoredValue(displayValue, _loadMW) {
  const n = Number(displayValue);
  if (!Number.isFinite(n)) return displayValue;
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

/** Study prices the 200 MW LCOE columns were built at (same for every case). */
export const HD_GT_CAPEX_DEFAULT_BY_MODE = {
  [HD_GT_CYCLE_MODE.COMBINED]: 2500,
  [HD_GT_CYCLE_MODE.SIMPLE]: 2500,
};

export const TECH_CAPEX_FIELD_DEFAULTS = {
  solar: { capexPerKwAc: 1600 },
  wind: { capexPerKw: 2000 },
  heavyDutyGT: {
    cycleMode: HD_GT_CYCLE_MODE.SIMPLE,
    capexPerKw: HD_GT_CAPEX_DEFAULT_BY_MODE[HD_GT_CYCLE_MODE.SIMPLE],
    gasPricePerMmbtu: 3.5,
  },
  aeroderivativeGT: { capexPerKw: 3000, gasPricePerMmbtu: 3.5 },
  battery: { capexPerKw: 372, capexPerKwh: 238 },
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

/** Touch-table wheel ranges. Spans include the study prices (1,600 / 2,000 / 2,500 / 3,000 / 238 / 3.50). */
export const CAPEX_WHEEL_PRESETS = {
  solarPerKwAc: { min: 800, max: 3200, step: 25 },
  generationPerKw: { min: 500, max: 4000, step: 25 },
  bessPowerPerKw: { min: 200, max: 600, step: 5 },
  bessEnergyPerKwh: { min: 100, max: 500, step: 1 },
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

export function ideumCapexWheelOptionsForLoad(wheelPreset, _loadMW) {
  return buildCapexWheelOptions(wheelPreset);
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
