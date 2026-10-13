import React, { useEffect, useState } from 'react';
import ConfIdeumTechnologyHub from './conf_IdeumTechnologyHub';
import Conf3dToggleButton from './Conf3dToggleButton';
import IdeumCorridorRangeRail from './conf_IdeumCorridorRangeRail';
import { CONFIGURATOR_PRESET_SCENARIOS } from '../../configuratorData/conf_scenarios';
import {
  GRID_CONNECTION_MODES,
} from '../../configuratorData/conf_constants';
import {
  createDefaultTechnologyCapex,
  ideumConfiguratorTechnologyIds,
  normalizeTechnologyCapex,
} from '../utils/conf_technologyCapex';
import { formatPercent } from '../utils/conf_formatters';

const RELIABILITY_SLIDER_SCALE = 10000;

function clampReliabilityTarget(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 99.99;
  return Math.min(100, Math.max(99, Math.round(n * RELIABILITY_SLIDER_SCALE) / RELIABILITY_SLIDER_SCALE));
}

function formatReliabilityDisplay(value) {
  const clamped = clampReliabilityTarget(value);
  if (clamped >= 100 - 1e-9) return '100%';
  return formatPercent(clamped, 4);
}

function formatAvailabilityEndpoint(value) {
  const clamped = clampReliabilityTarget(value);
  if (clamped >= 100 - 1e-9) return '100%';
  if (clamped <= 99.00005) return '99%';
  return formatPercent(clamped, 4);
}

const IDEUM_LOCATION_OPTIONS = [
  { id: 'texas', label: 'Texas', cityId: 'dallas_tx' },
  { id: 'arizona', label: 'Arizona', cityId: 'phoenix_az' },
  { id: 'idaho', label: 'Idaho', cityId: 'boise_id' },
  { id: 'pennsylvania', label: 'Pennsylvania', cityId: 'philadelphia_pa' },
];

const LOAD_MW_MIN = 200;
const LOAD_MW_MAX = 1800;
const LOAD_MW_STEP = 50;

const LOAD_MW_TICKS = Array.from(
  { length: (LOAD_MW_MAX - LOAD_MW_MIN) / LOAD_MW_STEP + 1 },
  (_, index) => LOAD_MW_MIN + index * LOAD_MW_STEP,
);

function snapLoadMW(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return LOAD_MW_MIN;
  const snapped = Math.round(n / LOAD_MW_STEP) * LOAD_MW_STEP;
  return Math.min(LOAD_MW_MAX, Math.max(LOAD_MW_MIN, snapped));
}

function IdeumLoadEditor({ loadMW, onChange }) {
  const [draft, setDraft] = useState(String(loadMW));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(loadMW));
    }
  }, [loadMW, focused]);

  useEffect(() => {
    const snapped = snapLoadMW(loadMW);
    if (snapped !== loadMW) {
      onChange(snapped);
    }
  }, [loadMW, onChange]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onChange(LOAD_MW_MIN);
      setDraft(String(LOAD_MW_MIN));
      return;
    }
    const next = snapLoadMW(trimmed);
    onChange(next);
    setDraft(String(next));
  };

  const handleSliderChange = (value) => {
    const next = snapLoadMW(value);
    onChange(next);
    setDraft(String(next));
  };

  const snappedLoadMW = snapLoadMW(loadMW);

  return (
    <div className="conf-ideum-hub-load-editor">
      <div className="conf-ideum-hub-load-header">
        <span className="conf-ideum-tech-hub__center-eyebrow conf-ideum-title-3d">Data Center Load</span>
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
      </div>
      <div className="conf-ideum-hub-load-slider-wrap">
        <input
          type="range"
          className="conf-ideum-hub-load-slider"
          min={LOAD_MW_MIN}
          max={LOAD_MW_MAX}
          step={LOAD_MW_STEP}
          value={snappedLoadMW}
          onChange={(e) => handleSliderChange(e.target.value)}
          aria-label="Load in megawatts slider"
          aria-valuemin={LOAD_MW_MIN}
          aria-valuemax={LOAD_MW_MAX}
          aria-valuenow={snappedLoadMW}
          aria-valuetext={`${snappedLoadMW} MW`}
          list="conf-ideum-load-ticks"
        />
        <datalist id="conf-ideum-load-ticks">
          {LOAD_MW_TICKS.map((tick) => (
            <option key={tick} value={tick} />
          ))}
        </datalist>
        <div className="conf-ideum-hub-load-ticks" aria-hidden="true">
          {LOAD_MW_TICKS.map((tick) => (
            <span
              key={tick}
              className={`conf-ideum-hub-load-tick${tick === snappedLoadMW ? ' conf-ideum-hub-load-tick--active' : ''}`}
            />
          ))}
        </div>
        <div className="conf-ideum-hub-load-tick-labels" aria-hidden="true">
          <span>{LOAD_MW_MIN}</span>
          <span>{LOAD_MW_MAX}</span>
        </div>
      </div>
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
  const maxCfe = inputs.maxCfePercent ?? 100;
  const minSolarMW = inputs.minSolarMW ?? 0;
  const maxSolarMW = inputs.maxSolarMW ?? 4000;
  const minWindMW = inputs.minWindMW ?? 0;
  const maxWindMW = inputs.maxWindMW ?? 3000;
  const reliabilityTarget = clampReliabilityTarget(inputs.reliabilityTarget ?? 99.99);
  const update = (patch) => onChange({ ...inputs, ...patch });

  useEffect(() => {
    if (inputs.gridConnectionMode !== GRID_CONNECTION_MODES.ISLANDED) {
      update({ gridConnectionMode: GRID_CONNECTION_MODES.ISLANDED });
    }
  }, [inputs.gridConnectionMode]);

  useEffect(() => {
    if (!inputs.technologies?.length) {
      update({ technologies: ideumConfiguratorTechnologyIds() });
    }
  }, [inputs.technologies?.length]);

  const handleCapexChange = (technologyCapex) => {
    update({
      technologyCapex: normalizeTechnologyCapex(technologyCapex),
      technologies: ideumConfiguratorTechnologyIds(),
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
      <IdeumCorridorRangeRail
        side="left"
        label="Availability"
        min={99}
        max={100}
        step={0.0001}
        minBandSpan={0}
        fixedUpper={100}
        gutterTicks={[99, 100]}
        lowerValue={reliabilityTarget}
        upperValue={100}
        scaleMode="availability-nines"
        formatValue={formatAvailabilityEndpoint}
        onChange={(lower) => update({ reliabilityTarget: clampReliabilityTarget(lower) })}
        ariaLabel="Minimum availability target"
      />
    ),
    right: (
      <IdeumCorridorRangeRail
        side="right"
        label="Carbon Free"
        min={0}
        max={100}
        step={1}
        lowerValue={minCfe}
        upperValue={maxCfe}
        onChange={(lower, upper) => update({
          minCfePercent: lower,
          maxCfePercent: upper,
          cfeTarget: lower,
        })}
        ariaLabel="Carbon-free energy acceptable band"
      />
    ),
  };

  return (
    <aside className="conf-input-panel conf-input-panel--ideum" data-screen-region="inputs">
      <div className="conf-ideum-grid">
        <section className="conf-ideum-block conf-ideum-block--tech">
          <ConfIdeumTechnologyHub
            technologyCapex={inputs.technologyCapex || createDefaultTechnologyCapex()}
            onCapexChange={handleCapexChange}
            loadEditor={loadEditor}
            gridEditor={gridEditor}
            corridor={corridor}
            renewableCapacityBands={{
              solar: {
                lower: minSolarMW,
                upper: maxSolarMW,
                onChange: (lower, upper) => update({ minSolarMW: lower, maxSolarMW: upper }),
              },
              wind: {
                lower: minWindMW,
                upper: maxWindMW,
                onChange: (lower, upper) => update({ minWindMW: lower, maxWindMW: upper }),
              },
            }}
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
            disabled={isGenerating}
          >
            {isGenerating ? 'Sending…' : generateLabel}
          </button>
          <Conf3dToggleButton variant="footer" className="conf-3d-toggle--ideum-footer" />
          <button type="button" className="conf-ideum-reset-btn" onClick={onReset}>
            Reset
          </button>
        </footer>
      </div>
    </aside>
  );
}
