import React, { useMemo } from 'react';
import {
  buildHeatmapGrid,
  buildParallelScenarios,
  TRADE_SPACE_VIZ_OPTIONS,
} from '../../configuratorData/conf_tradeSpaceMockData';
import ConfVizSensitivityHeatmap from './tradeSpace/conf_VizSensitivityHeatmap';
import ConfVizParallelCoordinates from './tradeSpace/conf_VizParallelCoordinates';

export { TRADE_SPACE_VIZ_OPTIONS };

export default function ConfTradeSpacePanel({ vizId, inputs }) {
  const loadMW = inputs?.loadMW ?? 1000;

  const parallelScenarios = useMemo(() => buildParallelScenarios(), []);

  const option = TRADE_SPACE_VIZ_OPTIONS.find((o) => o.id === vizId);

  return (
    <div className="conf-results-panel conf-results-panel--filled conf-trade-space" data-screen-region="trade-viz">
      <header className="conf-results-header">
        <div>
          <h2 className="conf-trade-space__title">{option?.label || 'Trade Space'}</h2>
          <p className="conf-results-summary">{option?.blurb}</p>
          <span className="conf-optimizer-badge">Concept mockup — synthetic demonstration data</span>
        </div>
      </header>

      {vizId === 'sensitivity-heatmap' && (
        <ConfVizSensitivityHeatmap initialLoad={loadMW} buildGrid={buildHeatmapGrid} />
      )}
      {vizId === 'parallel-coordinates' && (
        <ConfVizParallelCoordinates scenarios={parallelScenarios} />
      )}

      <p className="conf-trade-space__footer">
        These views explore how load, availability, minimum CFE, and portfolio LCOE relate — for
        executive review only, not engineering certification.
      </p>
    </div>
  );
}

export function ConfTradeSpaceVizButtons({ activeVizId, onSelectViz, disabled }) {
  return (
    <div className="conf-trade-viz-buttons">
      <span className="conf-trade-viz-buttons__label">Trade space ideas (show &amp; tell)</span>
      {TRADE_SPACE_VIZ_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`conf-trade-viz-btn${activeVizId === opt.id ? ' conf-trade-viz-btn--active' : ''}`}
          onClick={() => onSelectViz(opt.id)}
          disabled={disabled}
          title={opt.blurb}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
