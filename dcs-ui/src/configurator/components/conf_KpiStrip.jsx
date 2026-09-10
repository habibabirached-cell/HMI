import React from 'react';
import { formatMW, formatPercent, formatCurrencyPerMWh } from '../utils/conf_formatters';

export default function ConfKpiStrip({ result }) {
  if (!result?.kpis) return null;
  const { kpis } = result;
  const minCfe = kpis.minCfePercent ?? kpis.cfeTarget ?? 0;
  const relMet = kpis.achievedReliability >= kpis.reliabilityTarget - 0.0001;
  const cfeMet = minCfe <= 0 || kpis.achievedCfe >= minCfe - 0.1;

  return (
    <div className="conf-kpi-strip" data-screen-region="kpis">
      <div className="conf-kpi-card">
        <span className="conf-kpi-card__label">Installed Capacity</span>
        <strong className="conf-kpi-card__value">{formatMW(kpis.installedCapacityMW)}</strong>
      </div>
      <div className={`conf-kpi-card ${relMet ? 'conf-kpi--met' : 'conf-kpi--miss'}`}>
        <span className="conf-kpi-card__label">Availability</span>
        <strong className="conf-kpi-card__value">{formatPercent(kpis.achievedReliability, 3)}</strong>
        <div className="conf-kpi-card__footnote">
          <small>Minimum: {formatPercent(kpis.reliabilityTarget, kpis.reliabilityTarget >= 99.99 ? 3 : 2)}</small>
          <span className="conf-kpi-card__status">{relMet ? '✓ Meets minimum' : '⚠ Below minimum'}</span>
        </div>
      </div>
      <div className={`conf-kpi-card ${cfeMet ? 'conf-kpi--met' : 'conf-kpi--miss'}`}>
        <span className="conf-kpi-card__label">Carbon-Free Energy</span>
        <strong className="conf-kpi-card__value">{formatPercent(kpis.achievedCfe, 0)}</strong>
        <div className="conf-kpi-card__footnote">
          <small>{minCfe > 0 ? `Minimum: ${formatPercent(minCfe, 0)}` : 'No minimum set'}</small>
          <span className="conf-kpi-card__status">{cfeMet ? '✓ Meets minimum' : '⚠ Below minimum'}</span>
        </div>
      </div>
      <div className="conf-kpi-card">
        <span className="conf-kpi-card__label">Portfolio LCOE</span>
        <strong className="conf-kpi-card__value">{formatCurrencyPerMWh(kpis.lcoe)}</strong>
        <small>Least-cost objective</small>
      </div>
    </div>
  );
}
