import React, { useEffect, useState } from 'react';
import ConfIdeumTechnologyHub from './conf_IdeumTechnologyHub';
import IdeumCorridorRail from './conf_IdeumCorridorRail';
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

const RELIABILITY_SLIDER_SCALE = 10000;

function clampReliabilityTarget(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 99.99;
  return Math.min(99.9999, Math.max(99, Math.round(n * RELIABILITY_SLIDER_SCALE) / RELIABILITY_SLIDER_SCALE));
}

function formatReliabilityDisplay(value) {
  return formatPercent(clampReliabilityTarget(value), 4);
}

function reliabilityPresetActive(target, presetValue) {
  return Math.abs(clampReliabilityTarget(target) - presetValue) < 0.00005;
}

const RELIABILITY_PRESETS = RELIABILITY_LEVELS.map((level) => ({
  value: level.value,
  label: level.label,
}));

const CFE_PRESETS = MIN_CFE_PRESETS.map((pct) => ({
  value: pct,
  label: `${pct}%`,
}));

const IDEUM_LOCATION_OPTIONS = [
  { id: 'texas', label: 'Texas', cityId: 'dallas_tx' },
];

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
  const update = (patch) => onChange({ ...inputs, ...patch });

  useEffect(() => {
    if (inputs.gridConnectionMode !== GRID_CONNECTION_MODES.ISLANDED) {
      update({ gridConnectionMode: GRID_CONNECTION_MODES.ISLANDED });
    }
  }, [inputs.gridConnectionMode]);

  useEffect(() => {
    const texas = IDEUM_LOCATION_OPTIONS[0];
    if (inputs.stateId !== texas.id) {
      update({ stateId: texas.id, cityId: texas.cityId });
    }
  }, [inputs.stateId]);

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
    <div className="conf-ideum-hub-site-bar">
      <div className="conf-ideum-hub-site-bar__section conf-ideum-hub-site-bar__section--grid">
        <span className="conf-ideum-hub-grid-label">Grid</span>
        <span className="conf-ideum-hub-grid-badge" aria-current="true">Islanded</span>
      </div>

      <div className="conf-ideum-hub-site-bar__divider" aria-hidden="true" />

      <div className="conf-ideum-hub-site-bar__section conf-ideum-hub-site-bar__section--location">
        <label className="conf-ideum-hub-grid-label" htmlFor="conf-ideum-location">Location</label>
        <select
          id="conf-ideum-location"
          className="conf-ideum-hub-location-select"
          value={inputs.stateId || 'texas'}
          onChange={(e) => {
            const option = IDEUM_LOCATION_OPTIONS.find((entry) => entry.id === e.target.value);
            update({
              stateId: e.target.value,
              cityId: option?.cityId ?? inputs.cityId,
            });
          }}
        >
          {IDEUM_LOCATION_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const corridor = {
    left: (
      <IdeumCorridorRail
        side="left"
        label="Reliability"
        min={99}
        max={99.9999}
        step={0.0001}
        value={reliabilityTarget}
        onChange={(reliabilityTarget) => update({ reliabilityTarget: clampReliabilityTarget(reliabilityTarget) })}
        presets={RELIABILITY_PRESETS}
        formatDisplay={formatReliabilityDisplay}
        isPresetActive={(presetValue) => reliabilityPresetActive(reliabilityTarget, presetValue)}
        ariaLabel="Reliability fine adjust"
      />
    ),
    right: (
      <IdeumCorridorRail
        side="right"
        label="Min CFE"
        min={0}
        max={100}
        step={1}
        value={minCfe}
        onChange={(next) => update({ minCfePercent: next, cfeTarget: next })}
        presets={CFE_PRESETS}
        formatDisplay={(v) => `${Math.round(v)}%`}
        isPresetActive={(presetValue) => Math.round(minCfe) === presetValue}
        ariaLabel="Min CFE fine adjust"
      />
    ),
  };

  return (
    <aside className="conf-input-panel conf-input-panel--ideum" data-screen-region="inputs">
      <div className="conf-ideum-grid">
        <section className="conf-ideum-block conf-ideum-block--tech">
          <ConfIdeumTechnologyHub
            technologyPreferences={inputs.technologyPreferences || createDefaultTechnologyPreferences()}
            onPreferencesChange={handlePreferencesChange}
            loadEditor={loadEditor}
            gridEditor={gridEditor}
            corridor={corridor}
          />
        </section>

        {previewSlot}

        <footer className="conf-ideum-block conf-ideum-block--actions">
          <select
            id="conf-ideum-preset"
            className="conf-ideum-select conf-ideum-select--actions"
            aria-label="Example scenario"
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
