import React from 'react';
import ConfKpiStrip from './conf_KpiStrip';
import ConfSupplyMixChart from './conf_SupplyMixChart';
import ConfCapacityBars from './conf_CapacityBars';
import ConfMetricsPanel from './conf_MetricsPanel';
import ConfSldDiagram from './conf_SldDiagram';
import ConfDesignTargets from './conf_DesignTargets';
import ConfConfigDetailsTable from './conf_ConfigDetailsTable';
import ConfTradeSpacePanel, { TRADE_SPACE_VIZ_OPTIONS } from './conf_TradeSpacePanel';

const TRADE_VIZ_IDS = new Set(TRADE_SPACE_VIZ_OPTIONS.map((o) => o.id));

export default function ConfResultsPanel({ result, inputs, isGenerating, statusMessage, resultsView }) {
  if (isGenerating) {
    return (
      <div className="conf-results-panel conf-results-panel--loading" data-screen-region="results">
        <div className="conf-loading-state">
          <div className="conf-loading-spinner" aria-hidden="true" />
          <p>{statusMessage || 'Generating architecture…'}</p>
        </div>
      </div>
    );
  }

  if (resultsView && TRADE_VIZ_IDS.has(resultsView)) {
    return <ConfTradeSpacePanel vizId={resultsView} inputs={inputs} />;
  }

  if (resultsView === 'architecture' && result?.ok) {
    return (
    <div className="conf-results-panel conf-results-panel--filled" data-screen-region="results">
      <header className="conf-results-header">
        <div>
          <p className="conf-results-summary">{result.summary}</p>
          <span className="conf-optimizer-badge">Optimizer-calculated — not customer-selected capacities</span>
        </div>
        <span className="conf-synthetic-note">Synthetic scenario — demonstration purposes only</span>
      </header>

      <ConfSldDiagram
        supplyMix={result.supplyMix}
        loadMW={inputs.loadMW}
        gridConnectionMode={result.gridConnectionMode || inputs.gridConnectionMode}
      />
      <ConfKpiStrip result={result} />
      <ConfSupplyMixChart mix={result.supplyMix} />
      <ConfCapacityBars mix={result.supplyMix} capacityFactors={result.capacityFactors} />
      <ConfMetricsPanel result={result} />
      <ConfDesignTargets result={result} inputs={inputs} />
      <ConfConfigDetailsTable mix={result.supplyMix} />
    </div>
    );
  }

  return (
    <div className="conf-results-panel conf-results-panel--empty" data-screen-region="results">
      <div className="conf-empty-state">
        <h2>Configure your data-center requirements</h2>
        <p>
          Set load, reliability, minimum CFE, grid mode, and technology options — then generate a
          least-cost recommended architecture.
        </p>
        <p className="conf-empty-state__hint">
          Or pick a <strong>Trade space idea</strong> below Generate Architecture to preview how
          load, reliability, CFE, and cost relate.
        </p>
        <span className="conf-synthetic-note">Synthetic demonstration data</span>
      </div>
    </div>
  );
}
