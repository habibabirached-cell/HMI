import React from 'react';
import { formatMW, formatPercent, formatGridMode } from '../utils/conf_formatters';

export default function ConfDesignTargets({ result, inputs }) {
  if (!result?.targets || !result?.kpis) return null;
  const { targets, kpis } = result;
  const minCfe = kpis.minCfePercent ?? inputs.minCfePercent ?? 0;

  const rows = [
    {
      label: 'Reliability',
      value: `${formatPercent(kpis.achievedReliability, 3)} achieved (≥ ${formatPercent(kpis.reliabilityTarget, 3)} required)`,
      met: targets.relMet,
    },
    {
      label: 'Carbon-Free Energy',
      value: minCfe > 0
        ? `${formatPercent(kpis.achievedCfe, 0)} achieved (≥ ${formatPercent(minCfe, 0)} minimum)`
        : `${formatPercent(kpis.achievedCfe, 0)} achieved (no minimum)`,
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
