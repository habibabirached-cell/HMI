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
  countElevatedTechnologies,
  isTechnologyElevated,
  normalizeTechnologyPreferences,
  setTechnologyPreference,
  TECH_PREFERENCE,
} from '../utils/conf_technologyPreferences';
import { playIdeumPrefClick } from '../utils/conf_ideumPrefFeedback';

const HUB_MODEL_URLS = {
  battery: getBess3DModelUrl(),
  aeroderivativeGT: getGasTurbine3DModelUrl(),
  heavyDutyGT: `${process.env.PUBLIC_URL || ''}/models/7HA.glb`,
  wind: `${process.env.PUBLIC_URL || ''}/models/windTurbineField.glb`,
  solar: `${process.env.PUBLIC_URL || ''}/models/solar/model.gltf`,
  fuelCell: `${process.env.PUBLIC_URL || ''}/models/FuelCell/model.gltf`,
  recipEngine: `${process.env.PUBLIC_URL || ''}/models/recipEngine/model.gltf`,
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
  fuelCell: {
    slot: 'right-bottom',
    category: 'Fuel Cell',
    modelName: 'Solid-oxide FC',
    model3d: 'turbine',
    model3dUrl: HUB_MODEL_URLS.fuelCell,
    model3dNeutralLight: true,
  },
  recipEngine: {
    slot: 'bottom',
    category: 'Reciprocating Engine',
    modelName: 'Genset',
    model3d: 'turbine',
    model3dUrl: HUB_MODEL_URLS.recipEngine,
    model3dCameraDist: 1.0,
  },
};

const PREF_ROWS = [
  { key: TECH_PREFERENCE.MUST, label: 'Must have' },
  { key: TECH_PREFERENCE.SHOULD, label: 'Should have' },
  { key: TECH_PREFERENCE.IF_NECESSARY, label: 'If necessary', locked: true },
];

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
};

const BOTTOM_TIER_SLOTS = new Set(['left-bottom', 'bottom', 'right-bottom']);
const BOTTOM_TIER_ORDER = ['left-bottom', 'bottom', 'right-bottom'];
const PULSE_TRAVEL_MS = 1100;
const PULSE_GAP_MS = 280;
const PULSE_REPEAT_COUNT = 5;
const CENTER_FLASH_MS = 480;

function TechPlaceholderArt({ icon }) {
  return (
    <div className="conf-ideum-tech-card__placeholder" aria-hidden="true">
      <span>{TECH_ICONS[icon] || '◆'}</span>
    </div>
  );
}

function TechCard3DPreview({ tech, meta }) {
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

  const ready = size.w > 24 && size.h > 24;

  return (
    <div ref={hostRef} className="conf-ideum-tech-card__media-viewer">
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
      {!meta.model3d && <TechPlaceholderArt icon={tech.icon} />}
    </div>
  );
}

function HubTechCard({
  tech,
  meta,
  preference,
  elevated,
  integrating,
  cardRef,
  onPreferenceClick,
}) {
  const [popKey, setPopKey] = useState(null);
  const popTimerRef = useRef(null);

  useEffect(() => () => {
    if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
  }, []);

  const handlePrefClick = useCallback((rowKey, isLocked) => {
    if (isLocked) return;
    playIdeumPrefClick();
    setPopKey(rowKey);
    if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
    popTimerRef.current = window.setTimeout(() => setPopKey(null), 360);
    onPreferenceClick(tech.id, rowKey);
  }, [onPreferenceClick, tech.id]);

  const gridArea = BOTTOM_TIER_SLOTS.has(meta.slot)
    ? undefined
    : SLOT_GRID_AREAS[meta.slot];

  return (
    <article
      ref={cardRef}
      className={`conf-ideum-tech-card conf-ideum-tech-card--${meta.slot}${elevated ? ' conf-ideum-tech-card--selected' : ''}${integrating ? ' conf-ideum-tech-card--integrating' : ''}`}
      style={gridArea ? { gridArea } : undefined}
    >
      <div className="conf-ideum-tech-card__head">
        <div className="conf-ideum-tech-card__titles">
          <span className="conf-ideum-tech-card__category">{meta.category}</span>
          <span className="conf-ideum-tech-card__model">{meta.modelName}</span>
        </div>
        {elevated && <span className="conf-ideum-tech-card__integrated-badge">Integrated</span>}
      </div>

      <div className="conf-ideum-tech-card__body">
        <div className="conf-ideum-tech-card__prefs" role="group" aria-label={`${meta.category} priority`}>
          {PREF_ROWS.map((row) => {
            const checked = row.key === TECH_PREFERENCE.IF_NECESSARY
              ? true
              : preference === row.key;
            const isLocked = row.locked === true;
            return (
              <button
                key={row.key}
                type="button"
                className={`conf-ideum-tech-pref${checked ? ' conf-ideum-tech-pref--checked' : ''}${isLocked ? ' conf-ideum-tech-pref--locked' : ''}${popKey === row.key ? ' conf-ideum-tech-pref--pop' : ''}`}
                aria-pressed={checked}
                disabled={isLocked}
                onClick={() => handlePrefClick(row.key, isLocked)}
              >
                <span className="conf-ideum-tech-pref__box" aria-hidden="true">
                  {checked ? '✓' : ''}
                </span>
                <span className="conf-ideum-tech-pref__label">{row.label}</span>
              </button>
            );
          })}
        </div>
        <div className="conf-ideum-tech-card__media">
          <TechCard3DPreview tech={tech} meta={meta} />
        </div>
      </div>
    </article>
  );
}

function HubCenter({ elevatedCount, loadEditor, gridEditor, centerStageRef, flash }) {
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
      className={`conf-ideum-tech-hub__center${elevatedCount > 0 ? ' conf-ideum-tech-hub__center--active' : ''}`}
      data-integrated-count={elevatedCount}
    >
      <div className="conf-ideum-tech-hub__center-label">
        <span className="conf-ideum-tech-hub__center-eyebrow conf-ideum-title-3d">Data Center Load</span>
        {loadEditor || <strong>Critical IT Infrastructure</strong>}
      </div>
      <div
        ref={setStageRef}
        className={`conf-ideum-tech-hub__center-stage${flash ? ' conf-ideum-tech-hub__center-stage--flash' : ''}`}
      >
        {size.w > 40 && size.h > 40 && (
          <Ideum05Nav3DViewer
            width={size.w}
            height={size.h}
            modelUrl={IDEUM05_NAV_MODEL_URLS.outdoorDataCenter}
            fitScale={0.88}
            modelYOffset={-0.04}
            cameraPitchLift={0.38}
          />
        )}
        {elevatedCount > 0 && (
          <div className="conf-ideum-tech-hub__center-glow" aria-hidden="true" />
        )}
        {flash && <div className="conf-ideum-tech-hub__center-burst" aria-hidden="true" />}
        {elevatedCount > 0 && (
          <div className="conf-ideum-tech-hub__center-count">
            {elevatedCount} integrated
          </div>
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

function IntegrationPulseLayer({ pulses }) {
  if (!pulses.length) return null;
  return (
    <div className="conf-ideum-tech-hub__fx" aria-hidden="true">
      {pulses.map((pulse) => (
        <span
          key={pulse.id}
          className="conf-ideum-tech-hub__pulse"
          style={{
            '--pulse-from-x': `${pulse.fromX}px`,
            '--pulse-from-y': `${pulse.fromY}px`,
            '--pulse-dx': `${pulse.dx}px`,
            '--pulse-dy': `${pulse.dy}px`,
            '--pulse-travel-ms': `${PULSE_TRAVEL_MS}ms`,
          }}
        >
          <span className="conf-ideum-tech-hub__pulse-core" />
          <span className="conf-ideum-tech-hub__pulse-trail" />
          {pulse.icon && (
            <span className="conf-ideum-tech-hub__pulse-icon">{TECH_ICONS[pulse.icon] || '◆'}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export default function ConfIdeumTechnologyHub({
  technologyPreferences,
  onPreferencesChange,
  loadEditor = null,
  gridEditor = null,
  corridor,
}) {
  const hubRef = useRef(null);
  const centerStageRef = useRef(null);
  const cardRefs = useRef({});
  const pulseTimersRef = useRef([]);
  const [pulses, setPulses] = useState([]);
  const [integratingIds, setIntegratingIds] = useState([]);
  const [centerFlash, setCenterFlash] = useState(false);

  const preferences = useMemo(
    () => normalizeTechnologyPreferences(technologyPreferences),
    [technologyPreferences],
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

  const elevatedCount = countElevatedTechnologies(preferences);

  useEffect(() => () => {
    pulseTimersRef.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const spawnPulse = useCallback((techId, pulseIndex) => {
    const hub = hubRef.current;
    const cardEl = cardRefs.current[techId];
    const centerEl = centerStageRef.current;
    const tech = CONFIGURATOR_TECHNOLOGIES.find((t) => t.id === techId);
    if (!hub || !cardEl || !centerEl) return;

    const hubRect = hub.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    const centerRect = centerEl.getBoundingClientRect();

    const fromX = cardRect.left + cardRect.width / 2 - hubRect.left;
    const fromY = cardRect.top + cardRect.height / 2 - hubRect.top;
    const toX = centerRect.left + centerRect.width / 2 - hubRect.left;
    const toY = centerRect.top + centerRect.height / 2 - hubRect.top;

    const pulseId = `${techId}-${Date.now()}-${pulseIndex}`;
    setPulses((prev) => [...prev, {
      id: pulseId,
      fromX,
      fromY,
      dx: toX - fromX,
      dy: toY - fromY,
      icon: tech?.icon,
    }]);

    const clearPulse = window.setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== pulseId));
    }, PULSE_TRAVEL_MS);
    pulseTimersRef.current.push(clearPulse);

    const flashCenter = window.setTimeout(() => {
      setCenterFlash(true);
      const clearFlash = window.setTimeout(() => setCenterFlash(false), CENTER_FLASH_MS);
      pulseTimersRef.current.push(clearFlash);
    }, PULSE_TRAVEL_MS - 100);
    pulseTimersRef.current.push(flashCenter);
  }, []);

  const triggerIntegrationFxRepeat = useCallback((techId) => {
    setIntegratingIds((prev) => (prev.includes(techId) ? prev : [...prev, techId]));

    for (let i = 0; i < PULSE_REPEAT_COUNT; i += 1) {
      const startTimer = window.setTimeout(() => {
        spawnPulse(techId, i);
      }, i * (PULSE_TRAVEL_MS + PULSE_GAP_MS));
      pulseTimersRef.current.push(startTimer);
    }

    const totalMs = PULSE_REPEAT_COUNT * (PULSE_TRAVEL_MS + PULSE_GAP_MS);
    const clearIntegrating = window.setTimeout(() => {
      setIntegratingIds((prev) => prev.filter((id) => id !== techId));
    }, totalMs);
    pulseTimersRef.current.push(clearIntegrating);
  }, [spawnPulse]);

  const handlePreferenceClick = useCallback((techId, prefKey) => {
    if (prefKey === TECH_PREFERENCE.IF_NECESSARY) return;

    const prev = preferences[techId];
    const nextPrefs = setTechnologyPreference(preferences, techId, prefKey);
    const wasElevated = isTechnologyElevated(prev);
    const nowElevated = isTechnologyElevated(nextPrefs[techId]);

    onPreferencesChange(nextPrefs);

    if (!wasElevated && nowElevated) {
      requestAnimationFrame(() => triggerIntegrationFxRepeat(techId));
    }
  }, [preferences, onPreferencesChange, triggerIntegrationFxRepeat]);

  return (
    <div className="conf-ideum-tech-hub" ref={hubRef}>
      <IntegrationPulseLayer pulses={pulses} />

      {upperHubItems.map(({ tech, meta }) => {
        const pref = preferences[tech.id] || TECH_PREFERENCE.IF_NECESSARY;
        return (
          <HubTechCard
            key={tech.id}
            tech={tech}
            meta={meta}
            preference={pref}
            elevated={isTechnologyElevated(pref)}
            integrating={integratingIds.includes(tech.id)}
            cardRef={(el) => { cardRefs.current[tech.id] = el; }}
            onPreferenceClick={handlePreferenceClick}
          />
        );
      })}

      <div className="conf-ideum-tech-hub__bottom-tier">
        {bottomHubItems.map(({ tech, meta }) => {
          const pref = preferences[tech.id] || TECH_PREFERENCE.IF_NECESSARY;
          return (
            <HubTechCard
              key={tech.id}
              tech={tech}
              meta={meta}
              preference={pref}
              elevated={isTechnologyElevated(pref)}
              integrating={integratingIds.includes(tech.id)}
              cardRef={(el) => { cardRefs.current[tech.id] = el; }}
              onPreferenceClick={handlePreferenceClick}
            />
          );
        })}
      </div>

      {corridor?.top && (
        <div className="conf-ideum-corridor conf-ideum-corridor--top">{corridor.top}</div>
      )}
      {corridor?.left && (
        <div className="conf-ideum-corridor conf-ideum-corridor--left">{corridor.left}</div>
      )}
      {corridor?.right && (
        <div className="conf-ideum-corridor conf-ideum-corridor--right">{corridor.right}</div>
      )}
      {corridor?.bottom && (
        <div className="conf-ideum-corridor conf-ideum-corridor--bottom">{corridor.bottom}</div>
      )}

      <HubCenter
        elevatedCount={elevatedCount}
        loadEditor={loadEditor}
        gridEditor={gridEditor}
        centerStageRef={centerStageRef}
        flash={centerFlash}
      />
    </div>
  );
}
