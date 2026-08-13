import React from 'react';
import { formatMW, formatPercent } from '../utils/conf_formatters';

export default function ConfDesignTargets({ result, inputs }) {
  if (!result?.targets || !result?.kpis) return null;
  const { targets, kpis } = result;

  const rows = [
    {
      label: 'Reliability',
      value: `${formatPercent(kpis.achievedReliability, 3)} / ${formatPercent(kpis.reliabilityTarget, 3)} required`,
      met: targets.relMet,
    },
    {
      label: 'CFE',
      value: `${formatPercent(kpis.achievedCfe, 0)} / ${formatPercent(kpis.cfeTarget, 0)} required`,
      met: targets.cfeMet,
    },
    {
      label: 'Peak Load Coverage',
      value: formatMW(inputs.loadMW),
      met: targets.loadMet,
    },
  ];

  return (
    <section className="conf-targets-panel">
      <h3>Design Targets</h3>
      <ul className="conf-targets-list">
        {rows.map((row) => (
          <li key={row.label} className={row.met ? 'conf-target--met' : 'conf-target--miss'}>
            <span className="conf-target__label">{row.label}</span>
            <span className="conf-target__value">{row.value}</span>
            <span className="conf-target__status">{row.met ? '✓ Meets target' : '⚠ Target not achieved'}</span>
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
