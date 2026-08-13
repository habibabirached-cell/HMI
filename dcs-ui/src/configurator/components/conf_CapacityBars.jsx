import React from 'react';
import { getTechnologyColor } from '../utils/conf_technologyColors';
import { formatMWExact, formatPercent } from '../utils/conf_formatters';

function BarGroup({ title, rows, maxValue, renderValue, className }) {
  return (
    <section className={`conf-result-section ${className || ''}`}>
      <h3>{title}</h3>
      <div className="conf-bar-list">
        {rows.map((row) => {
          const pct = maxValue > 0 ? (row.value / maxValue) * 100 : 0;
          return (
            <div key={row.id} className="conf-bar-row">
              <span className="conf-bar-row__label">{row.label}</span>
              <div className="conf-bar-row__track">
                <div
                  className="conf-bar-row__fill"
                  style={{
                    width: `${pct}%`,
                    background: getTechnologyColor(row.id),
                  }}
                />
              </div>
              <span className="conf-bar-row__value">{renderValue(row)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ConfCapacityBars({ mix, capacityFactors }) {
  if (!mix?.length) return null;
  const maxMW = Math.max(...mix.map((m) => m.installedMW));

  const sizingRows = mix.map((m) => ({
    id: m.id,
    label: m.label,
    value: m.installedMW,
    batteryMWh: m.batteryMWh,
  }));

  const cfRows = (capacityFactors || [])
    .filter((r) => r.capacityFactor != null || r.utilization != null)
    .map((r) => ({
      id: r.id,
      label: r.label,
      value: r.capacityFactor != null ? r.capacityFactor * 100 : r.utilization * 10,
      isUtil: r.utilization != null,
      raw: r,
    }));

  const maxCf = Math.max(...cfRows.map((r) => r.value), 1);

  return (
    <>
      <BarGroup
        title="Capacity Sizing"
        rows={sizingRows}
        maxValue={maxMW}
        renderValue={(row) => (
          row.batteryMWh
            ? `${formatMWExact(row.value)} / ${Math.round(row.batteryMWh).toLocaleString()} MWh`
            : formatMWExact(row.value)
        )}
      />
      {cfRows.length > 0 && (
        <BarGroup
          title="Capacity Factor"
          className="conf-capacity-factor"
          rows={cfRows}
          maxValue={maxCf}
          renderValue={(row) => (
            row.isUtil
              ? `${row.raw.utilization.toFixed(1)} cycles/day`
              : formatPercent(row.raw.capacityFactor * 100, 0)
          )}
        />
      )}
    </>
  );
}
