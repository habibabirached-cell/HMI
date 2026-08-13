import React from 'react';
import ConfTechnologyTiles from './conf_TechnologyTiles';
import ConfSliderControl from './conf_SliderControl';
import ConfInfoTooltip from './conf_InfoTooltip';
import { CONFIGURATOR_STATES, getCitiesForState } from '../../configuratorData/conf_locations';
import { CONFIGURATOR_PRESET_SCENARIOS } from '../../configuratorData/conf_scenarios';
import { formatMW, formatPercent, formatInputSummary } from '../utils/conf_formatters';

export default function ConfInputPanel({
  inputs,
  onChange,
  onGenerate,
  onReset,
  onLoadPreset,
  isGenerating,
  isStale,
  resourceIndicators,
  stateLabel,
}) {
  const cities = getCitiesForState(inputs.stateId);

  const update = (patch) => onChange({ ...inputs, ...patch });

  const handleStateChange = (stateId) => {
    const nextCities = getCitiesForState(stateId);
    update({
      stateId,
      cityId: nextCities[0]?.id ?? inputs.cityId,
    });
  };

  return (
    <aside className="conf-input-panel">
      <div className="conf-input-panel__header">
        <h2>Configuration Requirements</h2>
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

      <section className="conf-input-section">
        <div className="conf-field">
          <div className="conf-field__header">
            <label className="conf-field__label" htmlFor="conf-load">Data Center Load</label>
          </div>
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
          <input
            type="range"
            className="conf-slider__input"
            min={50}
            max={2000}
            step={10}
            value={inputs.loadMW}
            onChange={(e) => update({ loadMW: Number(e.target.value) })}
          />
          <p className="conf-field__helper">Peak electrical demand to be supported by the generation portfolio.</p>
        </div>
      </section>

      <section className="conf-input-section">
        <h3>Available Technology Portfolio</h3>
        <p className="conf-field__helper">Select the technologies the configurator is allowed to consider.</p>
        <ConfTechnologyTiles
          selectedIds={inputs.technologies}
          onChange={(technologies) => update({ technologies })}
        />
      </section>

      <section className="conf-input-section">
        <ConfSliderControl
          label="Reliability Target"
          value={inputs.reliabilityTarget}
          min={99.9}
          max={99.999}
          step={0.001}
          onChange={(reliabilityTarget) => update({ reliabilityTarget })}
          formatValue={(v) => formatPercent(v, 3)}
          helperText="Target system availability"
          tooltip="Target reliability used when evaluating whether the generation portfolio can adequately serve the data-center load."
          marks={[
            { value: 99.9, label: '99.9%', sub: 'Three Nines' },
            { value: 99.99, label: '99.99%', sub: 'Four Nines' },
            { value: 99.999, label: '99.999%', sub: 'Five Nines' },
          ]}
        />
      </section>

      <section className="conf-input-section">
        <ConfSliderControl
          label="Carbon-Free Energy Target"
          value={inputs.cfeTarget}
          min={0}
          max={100}
          step={1}
          onChange={(cfeTarget) => update({ cfeTarget })}
          formatValue={(v) => `${Math.round(v)}% CFE`}
          helperText="Target percentage of energy supplied from carbon-free resources."
          tooltip="Target share of annual energy from carbon-free resources such as solar, wind, and qualifying storage."
          marks={[
            { value: 0, label: '0%' },
            { value: 25, label: '25%' },
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
            { value: 100, label: '100%' },
          ]}
        />
      </section>

      <section className="conf-input-section">
        <h3>Geographic Focus</h3>
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
        {resourceIndicators && (
          <div className="conf-resource-indicators">
            <span>Solar Resource: <strong>{resourceIndicators.solarResource}</strong></span>
            <span>Wind Resource: <strong>{resourceIndicators.windResource}</strong></span>
          </div>
        )}
      </section>

      <div className="conf-input-summary">
        {formatInputSummary(inputs, stateLabel)}
      </div>

      {isStale && (
        <div className="conf-stale-banner">Configuration modified — rerun to update results</div>
      )}

      <button
        type="button"
        className="conf-primary-btn"
        onClick={onGenerate}
        disabled={isGenerating || !inputs.technologies?.length}
      >
        {isGenerating ? 'Generating…' : 'GENERATE ARCHITECTURE'}
      </button>

      <button type="button" className="conf-secondary-btn" onClick={onReset}>
        Reset
      </button>
    </aside>
  );
}
