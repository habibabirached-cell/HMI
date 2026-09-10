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

export function formatCurrencyPerMWh(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `$${Math.round(n)}/MWh`;
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
