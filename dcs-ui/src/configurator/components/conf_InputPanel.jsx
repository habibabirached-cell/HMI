import React, { useState } from 'react';
import ConfTechnologyTiles from './conf_TechnologyTiles';
import ConfInfoTooltip from './conf_InfoTooltip';
import { ConfTradeSpaceVizButtons } from './conf_TradeSpacePanel';
import { CONFIGURATOR_STATES, getCitiesForState } from '../../configuratorData/conf_locations';
import { CONFIGURATOR_PRESET_SCENARIOS } from '../../configuratorData/conf_scenarios';
import {
  RELIABILITY_LEVELS,
  MIN_CFE_PRESETS,
  GRID_CONNECTION_MODES,
  UI_MODES,
} from '../../configuratorData/conf_constants';
import { formatMW, formatInputSummary } from '../utils/conf_formatters';

export default function ConfInputPanel({
  inputs,
  onChange,
  onGenerate,
  onReset,
  onLoadPreset,
  isGenerating,
  isStale,
  uiMode,
  onUiModeChange,
  activeTradeVizId,
  onSelectTradeViz,
  generateLabel,
  hideTradeViz = false,
  fullWidth = false,
}) {
  const [showSiteContext, setShowSiteContext] = useState(false);
  const cities = getCitiesForState(inputs.stateId);
  const minCfe = inputs.minCfePercent ?? inputs.cfeTarget ?? 0;

  const update = (patch) => onChange({ ...inputs, ...patch });

  const handleStateChange = (stateId) => {
    const nextCities = getCitiesForState(stateId);
    update({
      stateId,
      cityId: nextCities[0]?.id ?? inputs.cityId,
    });
  };

  return (
    <aside className={`conf-input-panel${fullWidth ? ' conf-input-panel--full' : ''}`} data-screen-region="inputs">
      <div className="conf-input-panel__header">
        <h2>Configuration Requirements</h2>
        <div className="conf-mode-row">
          <span className="conf-mode-label">Mode</span>
          <div className="conf-segmented">
            <button
              type="button"
              className={`conf-segment${uiMode === UI_MODES.BASIC ? ' conf-segment--active' : ''}`}
              onClick={() => onUiModeChange(UI_MODES.BASIC)}
            >
              Basic
            </button>
            <button
              type="button"
              className="conf-segment conf-segment--disabled"
              disabled
              title="Advanced Mode — coming soon"
            >
              Advanced
            </button>
          </div>
        </div>
        <div className="conf-preset-row">
          <label htmlFor="conf-preset-select">Load Example Scenario</label>
          <select
            id="conf-preset-select"
            className="conf-select"
            defaultValue=""
            onChange={(e) => {
              const preset = CONFIGURATOR_PRESET_SCENARIOS.find((p) => p.id === e.target.value);
              if (preset) onLoadPreset(preset.inputs);
              e.target.value = '';
            }}
          >
            <option value="" disabled>Select scenario…</option>
            {CONFIGURATOR_PRESET_SCENARIOS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="conf-objective-note">
        <strong>Optimization:</strong> Least cost
        <ConfInfoTooltip text="MVP minimizes portfolio LCOE while meeting reliability and minimum CFE constraints. Future releases will support customer objectives such as lowest carbon or highest reliability." />
      </p>

      {/* PRIMARY INPUT 1 — Load */}
      <section className="conf-input-section conf-input-section--primary">
        <div className="conf-field">
          <label className="conf-field__label conf-field__label--primary" htmlFor="conf-load">
            Data Center Load
          </label>
          <div className="conf-load-row">
            <input
              id="conf-load"
              type="number"
              className="conf-number-input"
              min={50}
              max={2000}
              step={10}
              value={inputs.loadMW}
              onChange={(e) => update({ loadMW: Math.max(50, Math.min(2000, Number(e.target.value) || 50)) })}
            />
            <span className="conf-unit">MW</span>
            <span className="conf-load-formatted">{formatMW(inputs.loadMW)}</span>
          </div>
          <p className="conf-field__helper">Peak electrical demand to be supported.</p>
        </div>
      </section>

      {/* PRIMARY INPUT 2 — Reliability (prominent) */}
      <section className="conf-input-section conf-input-section--primary conf-input-section--reliability">
        <div className="conf-field__header">
          <label className="conf-field__label conf-field__label--primary">Reliability Target</label>
          <ConfInfoTooltip text="Minimum system availability the optimizer must meet or exceed. Higher reliability may require additional capacity and cost." />
        </div>
        <div className="conf-reliability-grid">
          {RELIABILITY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              className={`conf-reliability-btn${inputs.reliabilityTarget === level.value ? ' conf-reliability-btn--active' : ''}`}
              onClick={() => update({ reliabilityTarget: level.value })}
            >
              <strong>{level.label}</strong>
              <span>{level.sub}</span>
            </button>
          ))}
        </div>
        <p className="conf-field__helper">The recommended architecture will never fall below this level.</p>
      </section>

      {/* PRIMARY INPUT 3 — Minimum CFE */}
      <section className="conf-input-section conf-input-section--primary">
        <div className="conf-field__header">
          <label className="conf-field__label conf-field__label--primary">Minimum CFE %</label>
          <ConfInfoTooltip text="Minimum carbon-free energy share. 0% means no minimum — the optimizer may still select renewables if cost-effective." />
        </div>
        <div className="conf-cfe-readout">
          {minCfe > 0 ? `≥ ${Math.round(minCfe)}% carbon-free energy` : 'No minimum CFE constraint'}
        </div>
        <div className="conf-cfe-presets">
          {MIN_CFE_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              className={`conf-cfe-preset${minCfe === pct ? ' conf-cfe-preset--active' : ''}`}
              onClick={() => update({ minCfePercent: pct, cfeTarget: pct })}
            >
              {pct}%
            </button>
          ))}
        </div>
        <input
          type="range"
          className="conf-slider__input"
          min={0}
          max={100}
          step={1}
          value={minCfe}
          onChange={(e) => update({ minCfePercent: Number(e.target.value), cfeTarget: Number(e.target.value) })}
        />
      </section>

      {/* PRIMARY INPUT 4 — Grid mode */}
      <section className="conf-input-section conf-input-section--primary">
        <div className="conf-field__header">
          <label className="conf-field__label conf-field__label--primary">Grid Connection Mode</label>
          <ConfInfoTooltip text="Grid-connected sites may import power from the utility. Islanded sites must be fully self-sufficient with onsite generation." />
        </div>
        <div className="conf-segmented conf-segmented--full">
          <button
            type="button"
            className={`conf-segment${inputs.gridConnectionMode === GRID_CONNECTION_MODES.GRID_CONNECTED ? ' conf-segment--active' : ''}`}
            onClick={() => update({ gridConnectionMode: GRID_CONNECTION_MODES.GRID_CONNECTED })}
          >
            Grid-Connected
          </button>
          <button
            type="button"
            className={`conf-segment${inputs.gridConnectionMode === GRID_CONNECTION_MODES.ISLANDED ? ' conf-segment--active' : ''}`}
            onClick={() => update({ gridConnectionMode: GRID_CONNECTION_MODES.ISLANDED })}
          >
            Islanded
          </button>
        </div>
      </section>

      {/* Technology portfolio — soft constraints */}
      <section className="conf-input-section">
        <h3>Available Technology Portfolio</h3>
        <ConfTechnologyTiles
          selectedIds={inputs.technologies}
          onChange={(technologies) => update({ technologies })}
        />
      </section>

      {/* Site context — secondary */}
      <section className="conf-input-section conf-input-section--collapsible">
        <button
          type="button"
          className="conf-collapse-toggle"
          onClick={() => setShowSiteContext((v) => !v)}
          aria-expanded={showSiteContext}
        >
          Site Context (optional) {showSiteContext ? '▾' : '▸'}
        </button>
        {showSiteContext && (
          <div className="conf-geo-row">
            <div className="conf-field">
              <label className="conf-field__label" htmlFor="conf-state">State</label>
              <select
                id="conf-state"
                className="conf-select"
                value={inputs.stateId}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                {CONFIGURATOR_STATES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="conf-field">
              <label className="conf-field__label" htmlFor="conf-city">City / Region</label>
              <select
                id="conf-city"
                className="conf-select"
                value={inputs.cityId}
                onChange={(e) => update({ cityId: e.target.value })}
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Advanced mode placeholder */}
      <section className="conf-input-section conf-advanced-preview" aria-disabled="true">
        <h3>Advanced Mode <span className="conf-coming-soon">Coming soon</span></h3>
        <p className="conf-field__helper">
          Force minimum capacity or percentage for specific technologies (e.g., existing equipment, owned gas assets).
        </p>
      </section>

      <div className="conf-input-summary">{formatInputSummary(inputs)}</div>

      {isStale && (
        <div className="conf-stale-banner">Configuration modified — rerun to update results</div>
      )}

      <button
        type="button"
        className="conf-primary-btn"
        onClick={onGenerate}
        disabled={isGenerating || !inputs.technologies?.length}
      >
        {isGenerating ? 'Generating…' : (generateLabel || 'GENERATE ARCHITECTURE')}
      </button>

      {!hideTradeViz && (
        <ConfTradeSpaceVizButtons
          activeVizId={activeTradeVizId}
          onSelectViz={onSelectTradeViz}
          disabled={isGenerating}
        />
      )}

      <button type="button" className="conf-secondary-btn" onClick={onReset}>
        Reset
      </button>
    </aside>
  );
}
