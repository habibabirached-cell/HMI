import React from 'react';
import {
  formatMW,
  formatPercent,
  formatCarbonFreePercent,
  formatGridMode,
} from '../utils/conf_formatters';

export default function ConfDesignTargets({ result, inputs }) {
  if (!result?.targets || !result?.kpis) return null;
  const { targets, kpis } = result;
  const minCfe = kpis.minCfePercent ?? inputs.minCfePercent ?? 0;

  const rows = [
    {
      label: 'Availability',
      value: `${formatPercent(kpis.achievedReliability, 3)} achieved (≥ ${formatPercent(kpis.reliabilityTarget, 3)} required)`,
      met: targets.relMet,
    },
    {
      label: 'Percent Carbon Free Power',
      value: minCfe > 0
        ? `${formatCarbonFreePercent(kpis.achievedCfe, 0)} achieved (≥ ${formatCarbonFreePercent(minCfe, 0)} minimum)`
        : `${formatCarbonFreePercent(kpis.achievedCfe, 0)} achieved (no minimum)`,
      met: targets.cfeMet,
    },
    {
      label: 'Peak Load',
      value: formatMW(inputs.loadMW),
      met: targets.loadMet,
    },
    {
      label: 'Grid Mode',
      value: formatGridMode(inputs.gridConnectionMode),
      met: true,
    },
  ];

  return (
    <section className="conf-targets-panel" data-screen-region="targets">
      <h3>Constraint Compliance</h3>
      <ul className="conf-targets-list">
        {rows.map((row) => (
          <li key={row.label} className={row.met ? 'conf-target--met' : 'conf-target--miss'}>
            <span className="conf-target__label">{row.label}</span>
            <span className="conf-target__value">{row.value}</span>
            <span className="conf-target__status">{row.met ? '✓ Satisfied' : '⚠ Not satisfied'}</span>
          </li>
        ))}
      </ul>
      {targets.notes?.length > 0 && (
        <div className="conf-target-notes">
          {targets.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
    </section>
  );
}
