import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Bess3DViewer from '../../components/Canvas/Schematics/Bess3DViewer';
import GasTurbine3DViewer from '../../components/Canvas/Schematics/GasTurbine3DViewer';
import WindTurbine3DViewer from '../../components/Canvas/Schematics/WindTurbine3DViewer';
import Ideum05Nav3DViewer from '../../components/IdeumKiosk/Ideum05Nav3DViewer';
import { CONFIGURATOR_TECHNOLOGIES } from '../../configuratorData/conf_technologies';
import { getBess3DModelUrl } from '../../utils/bess3dLayout';
import { getGasTurbine3DModelUrl } from '../../utils/gasTurbine3dLayout';
import { IDEUM05_NAV_MODEL_URLS } from '../../utils/ideum05Navigation';
import {
  CAPEX_WHEEL_PRESETS,
  formatGasPriceDisplay,
  HD_GT_CYCLE_MODE,
  IDEUM_CAPEX_DISABLED_TECH_IDS,
  IDEUM_CAPEX_UNIT_KW,
  IDEUM_CAPEX_UNIT_KWH,
  ideumCapexDisplayValue,
  ideumCapexStoredValue,
  ideumCapexWheelOptionsForLoad,
  normalizeTechnologyCapex,
  setHeavyDutyCycleMode,
  setTechnologyCapexField,
} from '../utils/conf_technologyCapex';
import ConfCapexValueField from './conf_CapexValueField';
import IdeumCorridorRangeRail from './conf_IdeumCorridorRangeRail';
import { useConf3d } from '../utils/conf_3dContext';

const SOLAR_MW_BAND_MAX = 4000;
const WIND_MW_BAND_MAX = 3000;

function formatMwBandValue(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString()} MW`;
}

const DISABLED_HUB_TECH = new Set(IDEUM_CAPEX_DISABLED_TECH_IDS);

const HUB_MODEL_URLS = {
  battery: getBess3DModelUrl(),
  aeroderivativeGT: getGasTurbine3DModelUrl(),
  heavyDutyGT: `${process.env.PUBLIC_URL || ''}/models/7HA.glb`,
  wind: `${process.env.PUBLIC_URL || ''}/models/windTurbineField.glb`,
  solar: `${process.env.PUBLIC_URL || ''}/models/solar/model.gltf`,
  fuelCell: `${process.env.PUBLIC_URL || ''}/models/FuelCell/model.gltf`,
  recipEngine: `${process.env.PUBLIC_URL || ''}/models/recipEngine/model.gltf`,
  nuclearPhoto: `${process.env.PUBLIC_URL || ''}/models/conf-nuclear-bwrx300.jpg`,
};

/** Hub card metadata — model3d for in-card WebGL previews where available. */
const IDEUM_HUB_TECH_META = {
  heavyDutyGT: {
    slot: 'left-top',
    category: 'Heavy Duty Gas Turbine',
    modelName: '7HA-class',
    model3d: 'turbine',
    model3dUrl: HUB_MODEL_URLS.heavyDutyGT,
  },
  aeroderivativeGT: {
    slot: 'left-mid',
    category: 'Aeroderivatives',
    modelName: 'LM2500',
    model3d: 'turbine',
  },
  battery: {
    slot: 'left-bottom',
    category: 'Energy Storage',
    modelName: 'Grid-scale BESS',
    model3d: 'bess',
  },
  solar: {
    slot: 'right-top',
    category: 'Renewables',
    modelName: 'Solar PV',
    model3d: 'turbine',
    model3dUrl: HUB_MODEL_URLS.solar,
  },
  wind: {
    slot: 'right-mid',
    category: 'Renewables',
    modelName: 'Onshore Wind',
    model3d: 'wind',
    model3dUrl: HUB_MODEL_URLS.wind,
  },
  recipEngine: {
    slot: 'bottom',
    category: 'Reciprocating Engine',
    modelName: 'Genset',
    model3d: 'turbine',
    model3dUrl: HUB_MODEL_URLS.recipEngine,
    model3dCameraDist: 1.0,
  },
  nuclear: {
    slot: 'bottom-mid',
    category: 'Nuclear Energy',
    modelName: 'BWRX-300 SMR',
    previewImageUrl: HUB_MODEL_URLS.nuclearPhoto,
    previewImageAlt: 'GE Hitachi BWRX-300 small modular reactor site',
  },
  fuelCell: {
    slot: 'right-bottom',
    category: 'Fuel Cell',
    modelName: 'Solid-oxide FC',
    model3d: 'turbine',
    model3dUrl: HUB_MODEL_URLS.fuelCell,
    model3dNeutralLight: true,
  },
};

const SLOT_GRID_AREAS = {
  'left-top': 'lt',
  'left-mid': 'lm',
  'left-bottom': 'lb',
  'right-top': 'rt',
  'right-mid': 'rm',
  'right-bottom': 'rb',
  bottom: 'recip',
};

const TECH_ICONS = {
  turbine: '⚙',
  aero: '✈',
  solar: '☀',
  wind: '💨',
  battery: '🔋',
  fuelcell: '⚡',
  recip: '▣',
  nuclear: '☢',
};

const BOTTOM_TIER_SLOTS = new Set(['left-bottom', 'bottom', 'bottom-mid', 'right-bottom']);
const BOTTOM_TIER_ORDER = ['left-bottom', 'bottom', 'bottom-mid', 'right-bottom'];

const COMING_SOON_RIBBONS = {
  nuclear: 'Coming Q4 2027',
  fuelCell: 'Coming Q2 2027',
  recipEngine: 'Coming soon',
};
function TechCapexPanel({ techId, capex, onCapexChange, loadMW }) {
  const patch = useCallback((field, raw) => {
    onCapexChange(setTechnologyCapexField(capex, techId, field, raw));
  }, [capex, onCapexChange, techId]);

  const commitKwCapex = useCallback((field, displayValue) => {
    patch(field, ideumCapexStoredValue(displayValue, loadMW));
  }, [loadMW, patch]);

  if (techId === 'solar') {
    return (
      <ConfCapexValueField
        id="conf-capex-solar"
        label="Installed CAPEX"
        unit={IDEUM_CAPEX_UNIT_KW}
        value={ideumCapexDisplayValue(capex.solar.capexPerKwAc, loadMW)}
        wheelOptions={ideumCapexWheelOptionsForLoad(CAPEX_WHEEL_PRESETS.solarPerKwAc, loadMW)}
        onCommit={(v) => commitKwCapex('capexPerKwAc', v)}
      />
    );
  }
  if (techId === 'wind') {
    return (
      <ConfCapexValueField
        id="conf-capex-wind"
        label="Installed CAPEX"
        unit={IDEUM_CAPEX_UNIT_KW}
        value={ideumCapexDisplayValue(capex.wind.capexPerKw, loadMW)}
        wheelOptions={ideumCapexWheelOptionsForLoad(CAPEX_WHEEL_PRESETS.generationPerKw, loadMW)}
        onCommit={(v) => commitKwCapex('capexPerKw', v)}
      />
    );
  }
  if (techId === 'aeroderivativeGT') {
    return (
      <div className="conf-ideum-capex-panel conf-ideum-capex-panel--gt">
        <ConfCapexValueField
          id="conf-capex-aero"
          label="Installed CAPEX"
          unit={IDEUM_CAPEX_UNIT_KW}
          value={ideumCapexDisplayValue(capex.aeroderivativeGT.capexPerKw, loadMW)}
          wheelOptions={ideumCapexWheelOptionsForLoad(CAPEX_WHEEL_PRESETS.generationPerKw, loadMW)}
          onCommit={(v) => commitKwCapex('capexPerKw', v)}
        />
        <ConfCapexValueField
          id="conf-capex-aero-gas"
          label="Gas price"
          unit="/ MMBtu"
          value={capex.aeroderivativeGT.gasPricePerMmbtu}
          wheelPreset={CAPEX_WHEEL_PRESETS.gasPricePerMmbtu}
          formatDisplay={formatGasPriceDisplay}
          onCommit={(v) => patch('gasPricePerMmbtu', v)}
        />
      </div>
    );
  }
  if (techId === 'heavyDutyGT') {
    const isSimple = capex.heavyDutyGT.cycleMode === HD_GT_CYCLE_MODE.SIMPLE;
    return (
      <div className="conf-ideum-capex-panel conf-ideum-capex-panel--hd">
        <div
          className={`conf-ideum-capex-vswitch${isSimple ? ' conf-ideum-capex-vswitch--simple' : ''}`}
          role="group"
          aria-label="Heavy duty gas turbine cycle type"
        >
          <span className="conf-ideum-capex-vswitch__thumb" aria-hidden="true" />
          <button
            type="button"
            className="conf-ideum-capex-vswitch__option conf-ideum-capex-vswitch__option--disabled"
            aria-pressed={false}
            disabled
            title="Combined cycle — not available yet"
          >
            Combined cycle
          </button>
          <button
            type="button"
            className="conf-ideum-capex-vswitch__option"
            aria-pressed={isSimple}
            onClick={() => onCapexChange(setHeavyDutyCycleMode(capex, HD_GT_CYCLE_MODE.SIMPLE))}
          >
            Simple cycle
          </button>
        </div>
        <ConfCapexValueField
          id="conf-capex-hd"
          label="Installed CAPEX"
          unit={IDEUM_CAPEX_UNIT_KW}
          value={ideumCapexDisplayValue(capex.heavyDutyGT.capexPerKw, loadMW)}
          wheelOptions={ideumCapexWheelOptionsForLoad(CAPEX_WHEEL_PRESETS.generationPerKw, loadMW)}
          onCommit={(v) => commitKwCapex('capexPerKw', v)}
        />
        <ConfCapexValueField
          id="conf-capex-hd-gas"
          label="Gas price"
          unit="/ MMBtu"
          value={capex.heavyDutyGT.gasPricePerMmbtu}
          wheelPreset={CAPEX_WHEEL_PRESETS.gasPricePerMmbtu}
          formatDisplay={formatGasPriceDisplay}
          onCommit={(v) => patch('gasPricePerMmbtu', v)}
        />
      </div>
    );
  }
  if (techId === 'battery') {
    return (
      <ConfCapexValueField
        id="conf-capex-bess-kwh"
        label="Installed CAPEX"
        unit={IDEUM_CAPEX_UNIT_KWH}
        value={ideumCapexDisplayValue(capex.battery.capexPerKwh, loadMW)}
        wheelOptions={ideumCapexWheelOptionsForLoad(CAPEX_WHEEL_PRESETS.bessEnergyPerKwh, loadMW)}
        onCommit={(v) => commitKwCapex('capexPerKwh', v)}
      />
    );
  }
  return null;
}

function TechPlaceholderArt({ icon }) {
  return (
    <div className="conf-ideum-tech-card__placeholder" aria-hidden="true">
      <span>{TECH_ICONS[icon] || '◆'}</span>
    </div>
  );
}

function TechCard3DPreview({ tech, meta }) {
  const { enable3d } = useConf3d();
  const hostRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = enable3d && size.w > 24 && size.h > 24;

  if (meta.previewImageUrl) {
    return (
      <div ref={hostRef} className="conf-ideum-tech-card__media-viewer conf-ideum-tech-card__media-viewer--photo">
        <img
          className="conf-ideum-tech-card__photo"
          src={meta.previewImageUrl}
          alt={meta.previewImageAlt || tech.label}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div ref={hostRef} className="conf-ideum-tech-card__media-viewer">
      {!enable3d && <TechPlaceholderArt icon={tech.icon} />}
      {ready && meta.model3d === 'bess' && (
        <Bess3DViewer width={size.w} height={size.h} modelUrl={HUB_MODEL_URLS.battery} />
      )}
      {ready && meta.model3d === 'turbine' && (
        <GasTurbine3DViewer
          width={size.w}
          height={size.h}
          modelUrl={meta.model3dUrl || HUB_MODEL_URLS.aeroderivativeGT}
          turntableOnly
          cameraDist={meta.model3dCameraDist}
          neutralLighting={meta.model3dNeutralLight}
        />
      )}
      {ready && meta.model3d === 'wind' && (
        <WindTurbine3DViewer
          width={size.w}
          height={size.h}
          modelUrl={meta.model3dUrl || HUB_MODEL_URLS.wind}
        />
      )}
      {enable3d && !meta.model3d && <TechPlaceholderArt icon={tech.icon} />}
    </div>
  );
}

function RenewableMwBand({ techId, band }) {
  if (!band) return null;
  const isSolar = techId === 'solar';
  const fallbackMax = isSolar ? SOLAR_MW_BAND_MAX : WIND_MW_BAND_MAX;
  const rangeMin = band.rangeMin ?? 0;
  const rangeMax = band.rangeMax ?? fallbackMax;
  const title = isSolar ? 'Solar' : 'Wind';
  return (
    <div className="conf-ideum-tech-card__capacity-band" aria-label={`${title} nameplate band`}>
      <IdeumCorridorRangeRail
        side="right"
        layout="tech"
        label={title}
        min={rangeMin}
        max={rangeMax}
        step={10}
        minBandSpan={10}
        lowerValue={band.lower}
        upperValue={band.upper}
        formatValue={formatMwBandValue}
        gutterTicks={[rangeMin, rangeMax]}
        onChange={band.onChange}
        ariaLabel={`${title} AC nameplate acceptable range in megawatts`}
      />
    </div>
  );
}

function HubTechCard({
  tech,
  meta,
  capex,
  disabled,
  cardRef,
  onCapexChange,
  loadMW,
  capacityBand = null,
}) {
  const gridArea = BOTTOM_TIER_SLOTS.has(meta.slot)
    ? undefined
    : SLOT_GRID_AREAS[meta.slot];
  const showCapacityBand = capacityBand && (tech.id === 'solar' || tech.id === 'wind') && !disabled;

  return (
    <article
      ref={cardRef}
      className={`conf-ideum-tech-card conf-ideum-tech-card--${meta.slot}${tech.id === 'fuelCell' ? ' conf-ideum-tech-card--fuel-cell' : ''}${tech.id === 'nuclear' ? ' conf-ideum-tech-card--nuclear' : ''}${disabled ? ' conf-ideum-tech-card--disabled' : ''}${showCapacityBand ? ' conf-ideum-tech-card--with-capacity-band' : ''}`}
      style={gridArea ? { gridArea } : undefined}
      aria-disabled={disabled || undefined}
    >
      <div className="conf-ideum-tech-card__head">
        <div className="conf-ideum-tech-card__titles">
          <span className="conf-ideum-tech-card__category">
            {meta.category}
            {meta.modelName ? (
              <span className="conf-ideum-tech-card__model"> - ({meta.modelName})</span>
            ) : null}
          </span>
        </div>
      </div>

      <div className={`conf-ideum-tech-card__body${showCapacityBand ? ' conf-ideum-tech-card__body--with-band' : ''}`}>
        {COMING_SOON_RIBBONS[tech.id] && (
          <span className="conf-ideum-tech-card__ribbon" aria-hidden="true">
            {COMING_SOON_RIBBONS[tech.id]}
          </span>
        )}
        <div
          className={`conf-ideum-tech-card__capex${disabled ? ' conf-ideum-tech-card__capex--empty' : ''}`}
          aria-label={disabled ? `${meta.category} (coming soon)` : `${meta.category} CAPEX`}
        >
          {!disabled && capex && onCapexChange ? (
            <TechCapexPanel
              techId={tech.id}
              capex={capex}
              onCapexChange={onCapexChange}
              loadMW={loadMW}
            />
          ) : null}
        </div>
        <div className="conf-ideum-tech-card__media">
          <TechCard3DPreview tech={tech} meta={meta} />
        </div>
        {showCapacityBand ? (
          <RenewableMwBand techId={tech.id} band={capacityBand} />
        ) : null}
      </div>
    </article>
  );
}

function HubCenter({ loadEditor, gridEditor, centerStageRef }) {
  const { enable3d } = useConf3d();
  const hostRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setStageRef = useCallback((node) => {
    hostRef.current = node;
    if (centerStageRef) centerStageRef.current = node;
  }, [centerStageRef]);

  return (
    <div
      className="conf-ideum-tech-hub__center"
    >
      <div className="conf-ideum-tech-hub__center-label">
        {loadEditor || (
          <>
            <span className="conf-ideum-tech-hub__center-eyebrow conf-ideum-title-3d">Data Center Load</span>
            <strong>Critical IT Infrastructure</strong>
          </>
        )}
      </div>
      <div
        ref={setStageRef}
        className="conf-ideum-tech-hub__center-stage"
      >
        {!enable3d && (
          <div className="conf-ideum-tech-hub__center-placeholder" aria-hidden="true">
            <span>◆</span>
          </div>
        )}
        {enable3d && size.w > 40 && size.h > 40 && (
          <Ideum05Nav3DViewer
            width={size.w}
            height={size.h}
            modelUrl={IDEUM05_NAV_MODEL_URLS.outdoorDataCenter}
            fitScale={0.82}
            modelYOffset={-0.04}
            cameraPitchLift={0.38}
          />
        )}
      </div>
      {gridEditor && (
        <div className="conf-ideum-tech-hub__center-footer">
          {gridEditor}
        </div>
      )}
    </div>
  );
}

export default function ConfIdeumTechnologyHub({
  technologyCapex,
  onCapexChange,
  loadMW = 200,
  loadEditor = null,
  gridEditor = null,
  corridor,
  renewableCapacityBands = null,
}) {
  const hubRef = useRef(null);
  const centerStageRef = useRef(null);
  const cardRefs = useRef({});

  const capex = useMemo(
    () => normalizeTechnologyCapex(technologyCapex),
    [technologyCapex],
  );

  const hubItems = useMemo(
    () => CONFIGURATOR_TECHNOLOGIES.map((tech) => ({
      tech,
      meta: IDEUM_HUB_TECH_META[tech.id] || {
        slot: 'bottom',
        category: tech.label,
        modelName: tech.shortLabel,
      },
    })),
    [],
  );

  const upperHubItems = useMemo(
    () => hubItems.filter(({ meta }) => !BOTTOM_TIER_SLOTS.has(meta.slot)),
    [hubItems],
  );

  const bottomHubItems = useMemo(
    () => BOTTOM_TIER_ORDER
      .map((slot) => hubItems.find(({ meta }) => meta.slot === slot))
      .filter(Boolean),
    [hubItems],
  );

  return (
    <div className="conf-ideum-tech-hub" ref={hubRef}>
      {upperHubItems.map(({ tech, meta }) => (
        <HubTechCard
          key={tech.id}
          tech={tech}
          meta={meta}
          capex={capex}
          disabled={DISABLED_HUB_TECH.has(tech.id)}
          cardRef={(el) => { cardRefs.current[tech.id] = el; }}
          onCapexChange={onCapexChange}
          loadMW={loadMW}
          capacityBand={renewableCapacityBands?.[tech.id]}
        />
      ))}

      <div className="conf-ideum-tech-hub__bottom-tier">
        {bottomHubItems.map(({ tech, meta }) => (
          <HubTechCard
            key={tech.id}
            tech={tech}
            meta={meta}
            capex={capex}
            disabled={DISABLED_HUB_TECH.has(tech.id)}
            cardRef={(el) => { cardRefs.current[tech.id] = el; }}
            onCapexChange={onCapexChange}
            loadMW={loadMW}
            capacityBand={renewableCapacityBands?.[tech.id]}
          />
        ))}
      </div>

      {corridor?.top && (
        <div className="conf-ideum-corridor conf-ideum-corridor--top">{corridor.top}</div>
      )}
      {corridor?.bottom && (
        <div className="conf-ideum-corridor conf-ideum-corridor--bottom">{corridor.bottom}</div>
      )}

      <div className="conf-ideum-input-band" aria-label="Input region">
        {corridor?.left && (
          <div className="conf-ideum-corridor conf-ideum-corridor--left">{corridor.left}</div>
        )}
        <HubCenter
          loadEditor={loadEditor}
          gridEditor={gridEditor}
          centerStageRef={centerStageRef}
        />
        {corridor?.right && (
          <div className="conf-ideum-corridor conf-ideum-corridor--right">{corridor.right}</div>
        )}
      </div>
    </div>
  );
}
