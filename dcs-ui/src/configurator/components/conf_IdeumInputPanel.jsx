import React, { useEffect } from 'react';
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
import { snapToLoadCompliance } from '../utils/conf_corridorRangeScale';
import { normalizeWacoLoadTier } from '../utils/conf_wacoLoadTier';
import {
  clearPersistedWacoLoadTier,
  notifyWacoLoadTierChanged,
  persistWacoLoadTierForDataVis,
} from '../dataVis/api/dataVisLoadMw';
import { preloadWacoWithDatasetQuality } from '../utils/conf_wacoPreload';
import { DEFAULT_WACO_LOAD_TIER } from '../utils/conf_wacoLoadTier';
import {
  martinStudyForStateId,
  persistMartinStudyForDataVis,
} from '../utils/conf_martinStudy';
function clampReliabilityTarget(value) {
  return snapToLoadCompliance(value);
}

function formatLoadComplianceDisplay(value) {
  const v = snapToLoadCompliance(value);
  if (v >= 100 - 1e-9) return '100%';
  if (Number.isInteger(v)) return `${v}%`;
  const decimals = String(v).split('.')[1]?.length ?? 0;
  return `${v.toFixed(decimals)}%`;
}

const IDEUM_LOCATION_OPTIONS = [
  { id: 'texas', label: 'Texas', cityId: 'dallas_tx' },
  { id: 'wisconsin', label: 'Wisconsin', cityId: 'madison_wi' },
];

const IDEUM_LOAD_MW_OPTIONS = [
  { value: 200, label: '200MW' },
  { value: 1000, label: '1000MW' },
];

function IdeumLoadEditor({ loadMW, onChange, stateId }) {
  const tier = normalizeWacoLoadTier(loadMW);
  const loadOptions = stateId === 'wisconsin'
    ? IDEUM_LOAD_MW_OPTIONS.filter((option) => option.value === 200)
    : IDEUM_LOAD_MW_OPTIONS;

  const pickLoadTier = (nextTier) => {
    onChange(nextTier);
  };

  return (
    <div className="conf-ideum-hub-load-editor">
      <span className="conf-ideum-tech-hub__center-eyebrow conf-ideum-title-3d conf-ideum-hub-load-title">
        Data Center Load
      </span>
      {tier == null && stateId !== 'wisconsin' ? (
        <p className="conf-ideum-hub-load-hint">chose Data Center Load...</p>
      ) : null}
      <div
        className="conf-ideum-hub-load-options"
        role="group"
        aria-label="Data center load"
      >
        {loadOptions.map((option) => {
          const active = tier === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`conf-ideum-hub-load-btn${active ? ' conf-ideum-hub-load-btn--active' : ''}`}
              aria-pressed={active}
              onClick={() => pickLoadTier(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Touch-table input layout — full viewport, no scroll, minimal copy. */
export default function ConfIdeumInputPanel({
  inputs,
  onChange,
  onExploreData,
  onOptimizedConfiguration,
  onReset,
  onLoadPreset,
  isOptimizedBusy = false,
  previewSlot = null,
  renewableMwBounds = null,
}) {
  const minCfe = inputs.minCfePercent ?? inputs.cfeTarget ?? 0;
  const maxCfe = inputs.maxCfePercent ?? 100;
  const solarSpan = renewableMwBounds?.solar;
  const windSpan = renewableMwBounds?.wind;
  const minSolarMW = inputs.minSolarMW ?? solarSpan?.min ?? 0;
  const maxSolarMW = inputs.maxSolarMW ?? solarSpan?.max ?? 4000;
  const minWindMW = inputs.minWindMW ?? windSpan?.min ?? 0;
  const maxWindMW = inputs.maxWindMW ?? windSpan?.max ?? 3000;
  const reliabilityTarget = clampReliabilityTarget(inputs.reliabilityTarget ?? 97);
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

  useEffect(() => {
    const known = IDEUM_LOCATION_OPTIONS.some((option) => option.id === inputs.stateId);
    if (known) {
      persistMartinStudyForDataVis(martinStudyForStateId(inputs.stateId));
      return;
    }
    update({ stateId: 'texas', cityId: 'dallas_tx' });
  }, [inputs.stateId]);

  const handleCapexChange = (technologyCapex) => {
    update({
      technologyCapex: normalizeTechnologyCapex(technologyCapex),
      technologies: ideumConfiguratorTechnologyIds(),
    });
  };

  const handleLoadTierChange = (loadMW) => {
    const stateId = inputs.stateId || 'texas';
    update({ loadMW });
    persistWacoLoadTierForDataVis(loadMW);
    notifyWacoLoadTierChanged(loadMW);
    void preloadWacoWithDatasetQuality(loadMW, null, stateId).then(() => {
      if (stateId === 'texas') {
        onExploreData?.();
      }
    });
  };

  const handleLocationChange = async (nextStateId) => {
    const option = IDEUM_LOCATION_OPTIONS.find((entry) => entry.id === nextStateId);
    persistMartinStudyForDataVis(martinStudyForStateId(nextStateId));

    if (nextStateId === 'wisconsin') {
      update({
        stateId: nextStateId,
        cityId: option?.cityId ?? inputs.cityId,
        loadMW: 200,
      });
      persistWacoLoadTierForDataVis(200);
      notifyWacoLoadTierChanged(200);
      try {
        await preloadWacoWithDatasetQuality(200, null, nextStateId);
        onExploreData?.();
      } catch {
        /* preload failure logged in preload helper */
      }
      return;
    }

    clearPersistedWacoLoadTier();
    update({
      stateId: nextStateId,
      cityId: option?.cityId ?? inputs.cityId,
      loadMW: undefined,
    });
  };

  const loadEditor = (
    <IdeumLoadEditor
      loadMW={inputs.loadMW}
      stateId={inputs.stateId || 'texas'}
      onChange={handleLoadTierChange}
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
            void handleLocationChange(e.target.value);
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
        labelLines={['Data', 'Center', 'Uptime']}
        min={97}
        max={100}
        step={0.0001}
        minBandSpan={0}
        fixedUpper={100}
        lowerValue={reliabilityTarget}
        upperValue={100}
        scaleMode="load-compliance-snaps"
        formatValue={formatLoadComplianceDisplay}
        onChange={(lower) => update({ reliabilityTarget: clampReliabilityTarget(lower) })}
        ariaLabel="Data center uptime minimum target"
      />
    ),
    right: (
      <IdeumCorridorRangeRail
        side="right"
        labelLines={['Percent', 'Carbon', 'Free', 'Power']}
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
        ariaLabel="Percent carbon free power acceptable band"
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
            loadMW={inputs.loadMW ?? DEFAULT_WACO_LOAD_TIER}
            loadEditor={loadEditor}
            gridEditor={gridEditor}
            corridor={corridor}
            renewableCapacityBands={{
              solar: {
                lower: minSolarMW,
                upper: maxSolarMW,
                rangeMin: solarSpan?.min ?? 0,
                rangeMax: solarSpan?.max ?? 4000,
                onChange: (lower, upper) => update({ minSolarMW: lower, maxSolarMW: upper }),
              },
              wind: {
                lower: minWindMW,
                upper: maxWindMW,
                rangeMin: windSpan?.min ?? 0,
                rangeMax: windSpan?.max ?? 3000,
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
          <div className="conf-ideum-footer-primary-actions">
            <button
              type="button"
              className="conf-ideum-explore-data-btn"
              onClick={onExploreData}
            >
              Explore Data
            </button>
            <button
              type="button"
              className="conf-ideum-configure-btn conf-ideum-configure-btn--optimized"
              onClick={onOptimizedConfiguration}
              disabled={isOptimizedBusy}
            >
              {isOptimizedBusy ? 'Sending…' : 'Optimized Configuration'}
            </button>
          </div>
          <Conf3dToggleButton variant="footer" className="conf-3d-toggle--ideum-footer" />
          <button type="button" className="conf-ideum-reset-btn" onClick={onReset}>
            Reset
          </button>
        </footer>
      </div>
    </aside>
  );
}
