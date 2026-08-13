import React from 'react';
import { formatMW, formatPercent, formatCurrencyPerMWh } from '../utils/conf_formatters';

function statusClass(met, near) {
  if (met) return 'conf-kpi--met';
  if (near) return 'conf-kpi--near';
  return 'conf-kpi--miss';
}

export default function ConfKpiStrip({ result }) {
  if (!result?.kpis) return null;
  const { kpis } = result;
  const relMet = kpis.achievedReliability >= kpis.reliabilityTarget - 0.001;
  const relNear = !relMet && kpis.achievedReliability >= kpis.reliabilityTarget - 0.01;
  const cfeMet = kpis.achievedCfe >= kpis.cfeTarget - 0.5;
  const cfeNear = !cfeMet && kpis.achievedCfe >= kpis.cfeTarget - 5;

  return (
    <div className="conf-kpi-strip">
      <div className="conf-kpi-card">
        <span className="conf-kpi-card__label">Installed Capacity</span>
        <strong className="conf-kpi-card__value">{formatMW(kpis.installedCapacityMW)}</strong>
      </div>
      <div className={`conf-kpi-card ${statusClass(relMet, relNear)}`}>
        <span className="conf-kpi-card__label">Reliability</span>
        <strong className="conf-kpi-card__value">{formatPercent(kpis.achievedReliability, 3)}</strong>
        <small>Target: {formatPercent(kpis.reliabilityTarget, 2)}</small>
        <span className="conf-kpi-card__status">{relMet ? '✓ Target Met' : relNear ? '◐ Near Target' : '⚠ Below Target'}</span>
      </div>
      <div className={`conf-kpi-card ${statusClass(cfeMet, cfeNear)}`}>
        <span className="conf-kpi-card__label">CFE</span>
        <strong className="conf-kpi-card__value">{formatPercent(kpis.achievedCfe, 0)}</strong>
        <small>Target: {formatPercent(kpis.cfeTarget, 0)}</small>
        <span className="conf-kpi-card__status">{cfeMet ? '✓ Target Met' : cfeNear ? '◐ Near Target' : '⚠ Below Target'}</span>
      </div>
      <div className="conf-kpi-card">
        <span className="conf-kpi-card__label">LCOE</span>
        <strong className="conf-kpi-card__value">{formatCurrencyPerMWh(kpis.lcoe)}</strong>
      </div>
    </div>
  );
}
