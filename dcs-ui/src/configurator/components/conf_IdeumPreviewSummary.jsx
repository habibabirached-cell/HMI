import React from 'react';
import { formatMW, formatPercent, formatCurrencyPerMWh } from '../utils/conf_formatters';

/** One-line preview after successful wall submit. */
export default function ConfIdeumPreviewSummary({ result }) {
  if (!result?.ok || !result.kpis) return null;
  const { kpis } = result;

  return (
    <section className="conf-ideum-block conf-ideum-block--preview" aria-label="Preview">
      <span className="conf-ideum-preview-strip">
        <strong>Sent</strong>
        <span>{formatMW(kpis.installedCapacityMW)}</span>
        <span>{formatPercent(kpis.achievedReliability, 2)}</span>
        <span>CFE {formatPercent(kpis.achievedCfe, 0)}</span>
        <span>{formatCurrencyPerMWh(kpis.lcoe)}</span>
      </span>
    </section>
  );
}
