import React from 'react';
import { getTechnologyColor } from '../utils/conf_technologyColors';
import { formatMWExact, formatPercent } from '../utils/conf_formatters';

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function ChunkDonut({ slices, className = 'conf-chunk-donut' }) {
  const total = slices.reduce((sum, item) => sum + item.weight, 0) || 1;
  let cumulative = 0;
  const radius = 54;
  const cx = 60;
  const cy = 60;

  const paths = slices
    .filter((item) => item.weight > 0)
    .map((item) => {
      const share = (item.weight / total) * 100;
      const startAngle = (cumulative / 100) * 360;
      cumulative += share;
      const endAngle = (cumulative / 100) * 360;
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      const start = polar(cx, cy, radius, startAngle);
      const end = polar(cx, cy, radius, endAngle);
      const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
      return { d, color: getTechnologyColor(item.id), id: item.id };
    });

  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      {paths.map((slice) => (
        <path key={slice.id} d={slice.d} fill={slice.color} stroke="#fff" strokeWidth="1" />
      ))}
      <circle cx={cx} cy={cy} r={32} fill="#fff" />
    </svg>
  );
}

function BarGroup({
  title,
  rows,
  maxValue,
  renderValue,
  wheelSlices,
  className,
  variant,
}) {
  const isWall = variant === 'wall';
  const rowCount = rows.length;

  return (
    <section className={`conf-result-section ${isWall ? 'conf-bar-chunk' : ''} ${className || ''}`.trim()}>
      <h3>{title}</h3>
      {isWall ? (
        <div
          className="conf-bar-chunk__grid"
          style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
        >
          {rows.map((row) => {
            const pct = maxValue > 0 ? (row.value / maxValue) * 100 : 0;
            return (
              <React.Fragment key={row.id}>
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
                <span className="conf-bar-row__value conf-bar-row__value--after-wheel">
                  {renderValue(row)}
                </span>
              </React.Fragment>
            );
          })}
          <div className="conf-bar-chunk__wheel" style={{ gridRow: `1 / ${rowCount + 1}` }}>
            <ChunkDonut slices={wheelSlices} />
          </div>
        </div>
      ) : (
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
      )}
    </section>
  );
}

export default function ConfCapacityBars({ mix, capacityFactors, variant }) {
  if (!mix?.length) return null;
  const maxMW = Math.max(...mix.map((m) => m.installedMW));

  const sizingRows = mix.map((m) => ({
    id: m.id,
    label: m.label,
    value: m.installedMW,
    batteryMWh: m.batteryMWh,
    sharePercent: m.capacitySharePercent ?? m.percent ?? 0,
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

  const capacityWheelSlices = sizingRows.map((row) => ({
    id: row.id,
    weight: row.sharePercent,
  }));

  const utilizationWheelSlices = cfRows.map((row) => ({
    id: row.id,
    weight: row.isUtil ? row.raw.utilization : row.raw.capacityFactor * 100,
  }));

  return (
    <div className={`conf-capacity-bars${variant === 'wall' ? ' conf-capacity-bars--wall' : ''}`}>
      <BarGroup
        title="Installed Capacity (MW)"
        rows={sizingRows}
        maxValue={maxMW}
        wheelSlices={capacityWheelSlices}
        variant={variant}
        renderValue={(row) => (
          row.batteryMWh
            ? `${formatMWExact(row.value)} / ${Math.round(row.batteryMWh).toLocaleString()} MWh`
            : formatMWExact(row.value)
        )}
      />
      {cfRows.length > 0 && (
        <BarGroup
          title="Utilization (CF % or cycles/day)"
          className="conf-capacity-factor"
          rows={cfRows}
          maxValue={maxCf}
          wheelSlices={utilizationWheelSlices}
          variant={variant}
          renderValue={(row) => (
            row.isUtil
              ? `${row.raw.utilization.toFixed(1)} cycles/day`
              : formatPercent(row.raw.capacityFactor * 100, 0)
          )}
        />
      )}
    </div>
  );
}
