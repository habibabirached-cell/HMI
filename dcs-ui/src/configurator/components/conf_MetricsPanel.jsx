import React from 'react';
import ConfInfoTooltip from './conf_InfoTooltip';
import { formatCurrencyPerMWh, formatCarbonIntensity, formatPercent, formatGWh } from '../utils/conf_formatters';

export default function ConfMetricsPanel({ result }) {
  if (!result?.kpis) return null;
  const { kpis, curtailment } = result;
  const carbonPct = Math.max(0, Math.min(100, ((800 - kpis.carbonIntensity) / 800) * 100));

  return (
    <>
      <div className="conf-metrics-row">
        <div className="conf-metric-card conf-metric-card--prominent">
          <div className="conf-metric-card__header">
            <span>Levelized Cost of Energy</span>
            <ConfInfoTooltip text="Estimated lifetime average cost of producing one megawatt-hour of electricity." />
          </div>
          <strong className="conf-metric-card__value">{formatCurrencyPerMWh(kpis.lcoe)}</strong>
          <small>Estimated portfolio LCOE</small>
        </div>
        <div className="conf-metric-card conf-metric-card--prominent">
          <div className="conf-metric-card__header">
            <span>Carbon Intensity</span>
            <ConfInfoTooltip text="Estimated portfolio emissions intensity based on the recommended supply mix." />
          </div>
          <strong className="conf-metric-card__value">{formatCarbonIntensity(kpis.carbonIntensity)}</strong>
          <div className="conf-carbon-gauge">
            <span>Lower emissions</span>
            <div className="conf-carbon-gauge__track">
              <div className="conf-carbon-gauge__fill" style={{ width: `${carbonPct}%` }} />
            </div>
            <span>Higher emissions</span>
          </div>
        </div>
      </div>

      {curtailment && (
        <section className="conf-result-section">
          <div className="conf-section-header">
            <h3>Renewable Curtailment</h3>
            <ConfInfoTooltip text="Share of available solar and wind energy that cannot be used due to oversupply or system constraints." />
          </div>
          <div className="conf-curtailment-grid">
            {curtailment.solarCurtailmentPercent != null && (
              <div className="conf-curtailment-stat">
                <span>Solar Curtailment</span>
                <strong>{formatPercent(curtailment.solarCurtailmentPercent, 1)}</strong>
              </div>
            )}
            {curtailment.windCurtailmentPercent != null && (
              <div className="conf-curtailment-stat">
                <span>Wind Curtailment</span>
                <strong>{formatPercent(curtailment.windCurtailmentPercent, 1)}</strong>
              </div>
            )}
            <div className="conf-curtailment-stat">
              <span>Total Renewable Curtailment</span>
              <strong>{formatPercent(curtailment.totalRenewableCurtailmentPercent, 1)}</strong>
            </div>
            <div className="conf-curtailment-stat">
              <span>Curtailed Energy</span>
              <strong>{formatGWh(curtailment.curtailedGWh)}</strong>
            </div>
          </div>
          <div className="conf-curtailment-bars">
            {curtailment.solarCurtailmentPercent != null && (
              <CurtailmentBar
                label="Solar"
                used={curtailment.renewableUsedGWh * 0.55}
                curtailed={curtailment.curtailedGWh * 0.55}
              />
            )}
            {curtailment.windCurtailmentPercent != null && (
              <CurtailmentBar
                label="Wind"
                used={curtailment.renewableUsedGWh * 0.45}
                curtailed={curtailment.curtailedGWh * 0.45}
              />
            )}
          </div>
        </section>
      )}
    </>
  );
}

function CurtailmentBar({ label, used, curtailed }) {
  const total = used + curtailed || 1;
  const usedPct = (used / total) * 100;
  const curtPct = (curtailed / total) * 100;
  return (
    <div className="conf-curtail-bar">
      <span className="conf-curtail-bar__label">{label}</span>
      <div className="conf-curtail-bar__stack">
        <div className="conf-curtail-bar__used" style={{ width: `${usedPct}%` }} title="Used" />
        <div className="conf-curtail-bar__curt" style={{ width: `${curtPct}%` }} title="Curtailed" />
      </div>
      <div className="conf-curtail-bar__legend">
        <span>Used</span>
        <span>Curtailed</span>
      </div>
    </div>
  );
}
