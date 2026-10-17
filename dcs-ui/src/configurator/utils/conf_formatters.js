/** Human-friendly formatting for configurator values. */

import { GRID_CONNECTION_MODES } from '../../configuratorData/conf_constants';

export function formatMW(mw) {
  const n = Number(mw);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 1 : 2)} GW`;
  return `${Math.round(n).toLocaleString()} MW`;
}

export function formatMWExact(mw, decimals = 0) {
  const n = Number(mw);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} MW`;
}

export function formatPercent(value, decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(decimals)}%`;
}

/** Waco CFE column is 0–1; KPIs may already be 0–100. */
export function normalizeCfePercentValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  if (n >= 0 && n <= 1.0001) return n * 100;
  return n;
}

/** Carbon-free energy — accept Waco fraction (0–1) or percent (0–100). */
export function formatCarbonFreePercent(value, decimals = 0) {
  const pct = normalizeCfePercentValue(value);
  if (!Number.isFinite(pct)) return '—';
  return formatPercent(pct, decimals);
}

export function formatCurrencyPerMWh(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `$${Math.round(n)}/MWh`;
}

/** Waco / Martin project CAPEX column is USD millions. */
export function formatProjectCapexUsdM(millions) {
  const n = Number(millions);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const billions = n / 1000;
    return `$${billions.toFixed(abs >= 10000 ? 1 : 2)}B`;
  }
  if (abs >= 100) return `$${Math.round(n).toLocaleString()}M`;
  return `$${n.toFixed(1)}M`;
}

/** Project CAPEX ($ M) normalized by data-center load nameplate → $/kW. */
export function projectCapexPerKwFromUsdM(millions, loadMW) {
  const capexM = Number(millions);
  const load = Number(loadMW);
  if (!Number.isFinite(capexM) || !Number.isFinite(load) || load <= 0) return NaN;
  return (capexM * 1_000_000) / (load * 1000);
}

export function formatProjectCapexPerKw(millions, loadMW) {
  const perKw = projectCapexPerKwFromUsdM(millions, loadMW);
  if (!Number.isFinite(perKw)) return '—';
  const rounded = Math.round(perKw);
  return `$${rounded.toLocaleString()}/kW`;
}

export function formatCarbonIntensity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n).toLocaleString()} lb CO₂/MWh`;
}

export function formatGWh(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)} GWh`;
}

export function formatGridMode(mode) {
  return mode === GRID_CONNECTION_MODES.ISLANDED ? 'Islanded' : 'Grid-Connected';
}

export function formatInputSummary(inputs) {
  const load = formatMW(inputs.loadMW);
  const techCount = inputs.technologies?.length ?? 0;
  const grid = formatGridMode(inputs.gridConnectionMode);
  const minCfe = inputs.minCfePercent ?? inputs.cfeTarget ?? 0;
  const cfeLabel = minCfe > 0 ? `≥${Math.round(minCfe)}% min CFE` : 'No min CFE';
  return `${load} • ${grid} • ${formatPercent(inputs.reliabilityTarget, inputs.reliabilityTarget >= 99.99 ? 3 : 2)} Availability • ${cfeLabel} • ${techCount} options`;
}
