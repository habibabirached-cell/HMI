/** Human-friendly formatting for configurator values. */

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

export function formatReliabilityLabel(value) {
  const n = Number(value);
  if (n >= 99.999) return 'Five Nines';
  if (n >= 99.99) return 'Four Nines';
  if (n >= 99.9) return 'Three Nines';
  return `${n.toFixed(2)}%`;
}

export function formatGWh(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)} GWh`;
}

export function formatInputSummary(inputs, stateLabel) {
  const load = formatMW(inputs.loadMW);
  const techCount = inputs.technologies?.length ?? 0;
  return `${load} • ${stateLabel || '—'} • ${formatPercent(inputs.reliabilityTarget, 2)} Reliability • ${Math.round(inputs.cfeTarget)}% CFE • ${techCount} Technologies`;
}
