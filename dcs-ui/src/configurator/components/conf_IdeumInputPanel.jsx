import React, { useEffect, useState } from 'react';
import ConfIdeumTechnologyHub from './conf_IdeumTechnologyHub';
import { CONFIGURATOR_PRESET_SCENARIOS } from '../../configuratorData/conf_scenarios';
import {
  RELIABILITY_LEVELS,
  MIN_CFE_PRESETS,
  GRID_CONNECTION_MODES,
} from '../../configuratorData/conf_constants';
import {
  createDefaultTechnologyPreferences,
  technologyIdsFromPreferences,
} from '../utils/conf_technologyPreferences';
import { formatPercent } from '../utils/conf_formatters';

const RELIABILITY_SLIDER_MIN = 990000;
const RELIABILITY_SLIDER_MAX = 999999;
const RELIABILITY_SLIDER_SCALE = 10000;

function clampReliabilityTarget(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 99.99;
  return Math.min(99.9999, Math.max(99, Math.round(n * RELIABILITY_SLIDER_SCALE) / RELIABILITY_SLIDER_SCALE));
}

function reliabilityTargetToSlider(value) {
  return Math.round(clampReliabilityTarget(value) * RELIABILITY_SLIDER_SCALE);
}

function sliderToReliabilityTarget(value) {
  return clampReliabilityTarget(Number(value) / RELIABILITY_SLIDER_SCALE);
}

function formatReliabilityDisplay(value) {
  return formatPercent(clampReliabilityTarget(value), 3);
}

function reliabilityPresetActive(target, presetValue) {
  return Math.abs(clampReliabilityTarget(target) - presetValue) < 0.00005;
}

const LOAD_MW_MIN = 50;
const LOAD_MW_MAX = 2000;
const LOAD_MW_STEP = 10;

function clampLoadMW(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return LOAD_MW_MIN;
  return Math.min(LOAD_MW_MAX, Math.max(LOAD_MW_MIN, Math.round(n)));
}

function IdeumLoadEditor({ loadMW, onChange }) {
  const [draft, setDraft] = useState(String(loadMW));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(loadMW));
    }
  }, [loadMW, focused]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onChange(LOAD_MW_MIN);
      setDraft(String(LOAD_MW_MIN));
      return;
    }
    const next = clampLoadMW(trimmed);
    onChange(next);
    setDraft(String(next));
  };

  const handleSliderChange = (value) => {
    const next = clampLoadMW(value);
    onChange(next);
    setDraft(String(next));
  };

  return (
    <div className="conf-ideum-hub-load-editor">
      <div className="conf-ideum-hub-load-field">
        <input
          id="conf-ideum-load"
          type="text"
          inputMode="numeric"
          className="conf-ideum-hub-load-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commitDraft();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          aria-label="Load in megawatts"
        />
        <span className="conf-ideum-hub-load-unit" aria-hidden="true">MW</span>
      </div>
      <input
        type="range"
        className="conf-ideum-hub-load-slider"
        min={LOAD_MW_MIN}
        max={LOAD_MW_MAX}
        step={LOAD_MW_STEP}
        value={clampLoadMW(loadMW)}
        onChange={(e) => handleSliderChange(e.target.value)}
        aria-label="Load in megawatts slider"
        aria-valuetext={`${clampLoadMW(loadMW)} MW`}
      />
    </div>
  );
}

/** Touch-table input layout — full viewport, no scroll, minimal copy. */
export default function ConfIdeumInputPanel({
  inputs,
  onChange,
  onGenerate,
  onReset,
  onLoadPreset,
  isGenerating,
  generateLabel = 'CONFIGURE',
  previewSlot = null,
}) {
  const minCfe = inputs.minCfePercent ?? inputs.cfeTarget ?? 0;
  const reliabilityTarget = clampReliabilityTarget(inputs.reliabilityTarget ?? 99.99);
  const reliabilitySliderValue = reliabilityTargetToSlider(reliabilityTarget);
  const reliabilityDisplay = formatReliabilityDisplay(reliabilityTarget);
  const update = (patch) => onChange({ ...inputs, ...patch });

  const handlePreferencesChange = (technologyPreferences) => {
    update({
      technologyPreferences,
      technologies: technologyIdsFromPreferences(technologyPreferences),
    });
  };

  const loadEditor = (
    <IdeumLoadEditor
      loadMW={inputs.loadMW}
      onChange={(loadMW) => update({ loadMW })}
    />
  );

  const gridEditor = (
    <>
      <span className="conf-ideum-hub-grid-label">Grid</span>
      <div className="conf-ideum-hub-grid-segment">
        <button
          type="button"
          className={`conf-ideum-hub-grid-btn${inputs.gridConnectionMode === GRID_CONNECTION_MODES.GRID_CONNECTED ? ' conf-ideum-hub-grid-btn--active' : ''}`}
          onClick={() => update({ gridConnectionMode: GRID_CONNECTION_MODES.GRID_CONNECTED })}
        >
          Connected
        </button>
        <button
          type="button"
          className={`conf-ideum-hub-grid-btn${inputs.gridConnectionMode === GRID_CONNECTION_MODES.ISLANDED ? ' conf-ideum-hub-grid-btn--active' : ''}`}
          onClick={() => update({ gridConnectionMode: GRID_CONNECTION_MODES.ISLANDED })}
        >
          Islanded
        </button>
      </div>
    </>
  );

  const corridor = {
    left: (
      <>
        <span className="conf-ideum-corridor-label">Reliability</span>
        <div className="conf-ideum-corridor-slider-controls conf-ideum-corridor-slider-controls--left">
          <input
            type="range"
            className="conf-ideum-corridor-slider conf-ideum-corridor-slider--vertical"
            min={RELIABILITY_SLIDER_MIN}
            max={RELIABILITY_SLIDER_MAX}
            step={1}
            value={reliabilitySliderValue}
            onChange={(e) => update({ reliabilityTarget: sliderToReliabilityTarget(e.target.value) })}
            aria-label="Reliability fine adjust"
            aria-valuetext={reliabilityDisplay}
          />
          <div className="conf-ideum-corridor-value" aria-live="polite">
            {reliabilityDisplay}
          </div>
          <div className="conf-ideum-corridor-stack">
            {RELIABILITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                className={`conf-ideum-corridor-btn${reliabilityPresetActive(reliabilityTarget, level.value) ? ' conf-ideum-corridor-btn--active' : ''}`}
                onClick={() => update({ reliabilityTarget: level.value })}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      </>
    ),
    right: (
      <>
        <span className="conf-ideum-corridor-label">Min CFE</span>
        <div className="conf-ideum-corridor-slider-controls conf-ideum-corridor-slider-controls--right">
          <div className="conf-ideum-corridor-value" aria-live="polite">
            {Math.round(minCfe)}%
          </div>
          <div className="conf-ideum-corridor-stack">
            {MIN_CFE_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                className={`conf-ideum-corridor-btn conf-ideum-corridor-btn--sm${minCfe === pct ? ' conf-ideum-corridor-btn--active' : ''}`}
                onClick={() => update({ minCfePercent: pct, cfeTarget: pct })}
              >
                {pct}%
              </button>
            ))}
          </div>
          <input
            type="range"
            className="conf-ideum-corridor-slider conf-ideum-corridor-slider--vertical"
            min={0}
            max={100}
            step={1}
            value={minCfe}
            onChange={(e) => update({ minCfePercent: Number(e.target.value), cfeTarget: Number(e.target.value) })}
            aria-label="Min CFE fine adjust"
          />
        </div>
      </>
    ),
  };

  return (
    <aside className="conf-input-panel conf-input-panel--ideum" data-screen-region="inputs">
      <div className="conf-ideum-grid">
        <section className="conf-ideum-block conf-ideum-block--tech">
          <span className="conf-ideum-label">Technologies</span>
          <ConfIdeumTechnologyHub
            technologyPreferences={inputs.technologyPreferences || createDefaultTechnologyPreferences()}
            onPreferencesChange={handlePreferencesChange}
            loadEditor={loadEditor}
            gridEditor={gridEditor}
            corridor={corridor}
          />
        </section>

        <section className="conf-ideum-block conf-ideum-block--preset">
          <label className="conf-ideum-label" htmlFor="conf-ideum-preset">Example Scenario</label>
          <select
            id="conf-ideum-preset"
            className="conf-ideum-select"
            defaultValue=""
            onChange={(e) => {
              const preset = CONFIGURATOR_PRESET_SCENARIOS.find((p) => p.id === e.target.value);
              if (preset) onLoadPreset(preset.inputs);
              e.target.value = '';
            }}
          >
            <option value="" disabled>Choose example…</option>
            {CONFIGURATOR_PRESET_SCENARIOS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </section>

        {previewSlot}

        <footer className="conf-ideum-block conf-ideum-block--actions">
          <button
            type="button"
            className="conf-ideum-configure-btn"
            onClick={onGenerate}
            disabled={isGenerating || !inputs.technologies?.length}
          >
            {isGenerating ? 'Sending…' : generateLabel}
          </button>
          <button type="button" className="conf-ideum-reset-btn" onClick={onReset}>
            Reset
          </button>
        </footer>
      </div>
    </aside>
  );
}
