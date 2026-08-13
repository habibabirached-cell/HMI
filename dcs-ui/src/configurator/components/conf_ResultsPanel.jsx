import React from 'react';
import ConfKpiStrip from './conf_KpiStrip';
import ConfSupplyMixChart from './conf_SupplyMixChart';
import ConfCapacityBars from './conf_CapacityBars';
import ConfMetricsPanel from './conf_MetricsPanel';
import ConfArchitectureFlow from './conf_ArchitectureFlow';
import ConfDesignTargets from './conf_DesignTargets';
import ConfConfigDetailsTable from './conf_ConfigDetailsTable';

export default function ConfResultsPanel({ result, inputs, isGenerating, statusMessage }) {
  if (isGenerating) {
    return (
      <div className="conf-results-panel conf-results-panel--loading">
        <div className="conf-loading-state">
          <div className="conf-loading-spinner" aria-hidden="true" />
          <p>{statusMessage || 'Generating architecture…'}</p>
        </div>
      </div>
    );
  }

  if (!result?.ok) {
    return (
      <div className="conf-results-panel conf-results-panel--empty">
        <div className="conf-empty-state">
          <div className="conf-empty-illustration" aria-hidden="true">
            <div className="conf-empty-node conf-empty-node--source" />
            <div className="conf-empty-line" />
            <div className="conf-empty-node conf-empty-node--hub" />
            <div className="conf-empty-line" />
            <div className="conf-empty-node conf-empty-node--load" />
          </div>
          <h2>Configure your data-center requirements</h2>
          <p>Generate a conceptual supply architecture based on reliability, carbon-free energy, geography, and demand.</p>
          <span className="conf-synthetic-note">Synthetic demonstration data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="conf-results-panel conf-results-panel--filled">
      <header className="conf-results-header">
        <div>
          <h2>Recommended Architecture</h2>
          <p className="conf-results-summary">{result.summary}</p>
        </div>
        <span className="conf-synthetic-note">Synthetic scenario — demonstration purposes only</span>
      </header>

      <ConfArchitectureFlow mix={result.supplyMix} loadMW={inputs.loadMW} />
      <ConfKpiStrip result={result} />
      <ConfSupplyMixChart mix={result.supplyMix} />
      <ConfCapacityBars mix={result.supplyMix} capacityFactors={result.capacityFactors} />
      <ConfMetricsPanel result={result} />
      <ConfDesignTargets result={result} inputs={inputs} />
      <ConfConfigDetailsTable mix={result.supplyMix} />
    </div>
  );
}
