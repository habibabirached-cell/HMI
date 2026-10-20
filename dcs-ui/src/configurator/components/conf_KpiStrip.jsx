import React from 'react';
import {
  formatMW,
  formatPercent,
  formatCarbonFreePercent,
  formatCurrencyPerMWh,
  formatProjectCapexPerKw,
  normalizeCfePercentValue,
} from '../utils/conf_formatters';
import { resolveWacoLoadTierForDataVis } from '../utils/conf_wacoLoadTier';

export default function ConfKpiStrip({ result }) {
  if (!result?.kpis) return null;
  const { kpis } = result;
  const minCfe = kpis.minCfePercent ?? kpis.cfeTarget ?? 0;
  const relMet = kpis.achievedReliability >= kpis.reliabilityTarget - 0.0001;
  const achievedCfePct = normalizeCfePercentValue(kpis.achievedCfe);
  const minCfePct = normalizeCfePercentValue(minCfe);
  const cfeMet = minCfePct <= 0 || achievedCfePct >= minCfePct - 0.1;
  const hasCapex = Number.isFinite(Number(kpis.projectCapexUsdM)) && Number(kpis.projectCapexUsdM) > 0;
  const loadMW = resolveWacoLoadTierForDataVis(result?.inputs?.loadMW);

  return (
    <div className="conf-kpi-strip" data-screen-region="kpis">
      <div className="conf-kpi-strip__row conf-kpi-strip__row--top">
        <div className="conf-kpi-card">
          <span className="conf-kpi-card__label">Portfolio LCOE</span>
          <strong className="conf-kpi-card__value">{formatCurrencyPerMWh(kpis.lcoe)}</strong>
          <small>
            {kpis.lcoeCapexApplied
              ? 'Includes your installed CAPEX and gas price'
              : kpis.lcoeCapexLocked
                ? 'Not used on the Wisconsin 1 GW study'
                : kpis.lcoeCapexPending
                  ? 'This study file has no CAPEX and fuel split to scale'
                  : 'Least-cost objective'}
          </small>
        </div>
        <div className="conf-kpi-card">
          <span className="conf-kpi-card__label">Project CAPEX</span>
          <strong className="conf-kpi-card__value">
            {hasCapex ? formatProjectCapexPerKw(kpis.projectCapexUsdM, loadMW) : '—'}
          </strong>
          <small>Least-cost case · per {loadMW.toLocaleString()} MW load</small>
        </div>
      </div>
      <div className="conf-kpi-strip__row conf-kpi-strip__row--bottom">
        <div className="conf-kpi-card">
          <span className="conf-kpi-card__label">Installed Capacity</span>
          <strong className="conf-kpi-card__value">{formatMW(kpis.installedCapacityMW)}</strong>
        </div>
        <div className={`conf-kpi-card ${relMet ? 'conf-kpi--met' : 'conf-kpi--miss'}`}>
          <span className="conf-kpi-card__label">Data Center Uptime</span>
          <strong className="conf-kpi-card__value">{formatPercent(kpis.achievedReliability, 3)}</strong>
          <div className="conf-kpi-card__footnote">
            <small>Minimum: {formatPercent(kpis.reliabilityTarget, kpis.reliabilityTarget >= 99.99 ? 3 : 2)}</small>
            <span className="conf-kpi-card__status">{relMet ? '✓ Meets minimum' : '⚠ Below minimum'}</span>
          </div>
        </div>
        <div className={`conf-kpi-card ${cfeMet ? 'conf-kpi--met' : 'conf-kpi--miss'}`}>
          <span className="conf-kpi-card__label">Percent Carbon Free Power</span>
          <strong className="conf-kpi-card__value">{formatCarbonFreePercent(kpis.achievedCfe, 0)}</strong>
          <div className="conf-kpi-card__footnote">
            <small>{minCfePct > 0 ? `Minimum: ${formatCarbonFreePercent(minCfe, 0)}` : 'No minimum set'}</small>
            <span className="conf-kpi-card__status">{cfeMet ? '✓ Meets minimum' : '⚠ Below minimum'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
