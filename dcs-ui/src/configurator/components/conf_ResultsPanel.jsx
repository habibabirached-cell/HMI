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

function ConfOutputViewNav({ resultsView, onSelectOutputView }) {
  return (
    <nav className="conf-output-nav" aria-label="Output views">
      <button
        type="button"
        className={`conf-output-nav__btn${resultsView === 'architecture' ? ' conf-output-nav__btn--active' : ''}`}
        onClick={() => onSelectOutputView('architecture')}
      >
        Architecture &amp; KPIs
      </button>
      {TRADE_SPACE_VIZ_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`conf-output-nav__btn${resultsView === opt.id ? ' conf-output-nav__btn--active' : ''}`}
          onClick={() => onSelectOutputView(opt.id)}
          title={opt.blurb}
        >
          {opt.label}
        </button>
      ))}
    </nav>
  );
}

export default function ConfResultsPanel({
  result,
  inputs,
  isGenerating,
  statusMessage,
  resultsView,
  wallDisplayMode = false,
  wallSessionStatus = 'idle',
  showOutputNav = false,
  onSelectOutputView,
}) {
  const nav = showOutputNav && onSelectOutputView && (result?.ok || TRADE_VIZ_IDS.has(resultsView))
    ? <ConfOutputViewNav resultsView={resultsView} onSelectOutputView={onSelectOutputView} />
    : null;

  if (isGenerating) {
    return (
      <div className="conf-results-panel conf-results-panel--loading" data-screen-region="results">
        {nav}
        <div className="conf-loading-state">
          <div className="conf-loading-spinner" aria-hidden="true" />
          <p>{statusMessage || 'Generating architecture…'}</p>
        </div>
      </div>
    );
  }

  if (resultsView && TRADE_VIZ_IDS.has(resultsView)) {
    return (
      <div className="conf-results-panel conf-results-panel--filled" data-screen-region="results">
        {nav}
        <ConfTradeSpacePanel vizId={resultsView} inputs={inputs} />
      </div>
    );
  }

  if (resultsView === 'architecture' && result?.ok) {
    return (
      <div className="conf-results-panel conf-results-panel--filled" data-screen-region="results">
        {nav}
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
        {wallDisplayMode ? (
          <>
            <h2>Ready — waiting for Ideum</h2>
            <p>
              This wall display is loaded and listening. On the Ideum touch table, open{' '}
              <strong>Data Center Configurator</strong>, set requirements, and press{' '}
              <strong>CONFIGURE</strong>.
            </p>
            <p className="conf-empty-state__hint">
              Maingear will compute the architecture and show the full results here — SLD, KPIs,
              trade-space charts, and more.
            </p>
            <p className="conf-empty-state__hint">
              Status:{' '}
              {wallSessionStatus === 'generating'
                ? 'Computing…'
                : 'Waiting for first configuration'}
            </p>
          </>
        ) : (
          <>
            <h2>Configure your data-center requirements</h2>
            <p>
              Set load, reliability, minimum CFE, grid mode, and technology options — then generate a
              least-cost recommended architecture.
            </p>
            <p className="conf-empty-state__hint">
              Or pick a <strong>Trade space idea</strong> below Generate Architecture to preview how
              load, reliability, CFE, and cost relate.
            </p>
          </>
        )}
        <span className="conf-synthetic-note">Synthetic demonstration data</span>
      </div>
    </div>
  );
}
