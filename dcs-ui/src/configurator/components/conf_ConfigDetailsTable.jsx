import React, { useState } from 'react';
import { formatMWExact, formatPercent, formatGWh } from '../utils/conf_formatters';

export default function ConfConfigDetailsTable({ mix }) {
  const [open, setOpen] = useState(false);
  if (!mix?.length) return null;

  return (
    <section className="conf-details-section">
      <button
        type="button"
        className="conf-details-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Configuration Details {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="conf-details-table-wrap">
          <table className="conf-table conf-details-table">
            <thead>
              <tr>
                <th>Technology</th>
                <th>Installed Capacity</th>
                <th>Energy Contribution</th>
                <th>Capacity Factor / Utilization</th>
                <th>CFE Classification</th>
                <th>Est. Annual Generation</th>
              </tr>
            </thead>
            <tbody>
              {mix.map((row) => (
                <tr key={row.id}>
                  <td>{row.fullLabel || row.label}</td>
                  <td>
                    {formatMWExact(row.installedMW)}
                    {row.batteryMWh ? ` / ${Math.round(row.batteryMWh).toLocaleString()} MWh` : ''}
                  </td>
                  <td>{formatPercent(row.energySharePercent, 1)}</td>
                  <td>
                    {row.utilization != null
                      ? `${row.utilization.toFixed(1)} cycles/day`
                      : formatPercent((row.capacityFactor ?? 0) * 100, 0)}
                  </td>
                  <td>{row.cfeClass}</td>
                  <td>{formatGWh(row.energyContributionGWh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
