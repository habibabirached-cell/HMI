import React from 'react';
import { getTechnologyColor } from '../utils/conf_technologyColors';
import { formatMWExact, formatPercent } from '../utils/conf_formatters';

function DonutChart({ mix }) {
  const total = mix.reduce((s, m) => s + m.percent, 0) || 1;
  let cumulative = 0;
  const radius = 54;
  const cx = 60;
  const cy = 60;

  const slices = mix.map((item) => {
    const startAngle = (cumulative / 100) * 360;
    cumulative += (item.percent / total) * 100;
    const endAngle = (cumulative / 100) * 360;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const start = polar(cx, cy, radius, startAngle);
    const end = polar(cx, cy, radius, endAngle);
    const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    return { d, color: getTechnologyColor(item.id), id: item.id };
  });

  return (
    <svg className="conf-donut" viewBox="0 0 120 120" aria-hidden="true">
      {slices.map((s) => (
        <path key={s.id} d={s.d} fill={s.color} stroke="#fff" strokeWidth="1" />
      ))}
      <circle cx={cx} cy={cy} r={32} fill="#fff" />
    </svg>
  );
}

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function ConfSupplyMixChart({ mix }) {
  if (!mix?.length) return null;
  return (
    <section className="conf-result-section">
      <h3>Optimal Supply Mix</h3>
      <div className="conf-supply-mix">
        <div className="conf-supply-mix__chart">
          <DonutChart mix={mix} />
        </div>
        <table className="conf-table conf-supply-table">
          <thead>
            <tr>
              <th>Technology</th>
              <th>Capacity</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {mix.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="conf-color-dot" style={{ background: getTechnologyColor(row.id) }} />
                  {row.label}
                </td>
                <td>
                  {formatMWExact(row.installedMW)}
                  {row.batteryMWh ? ` / ${Math.round(row.batteryMWh).toLocaleString()} MWh` : ''}
                </td>
                <td>{formatPercent(row.percent, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
