import React, { useLayoutEffect, useRef, useState } from 'react';
import { getComponentVisualConfig } from '../../../data/componentVisuals';
import { getBess3DModelUrl } from '../../../utils/bess3dLayout';
import { getGFMe3DModelUrl } from '../../../utils/gfme3dLayout';
import { getGasTurbine3DModelUrl } from '../../../utils/gasTurbine3dLayout';
import { getIdeum08RootBucketChrome, IDEUM08_NAV_IMAGE_URLS } from '../../../utils/ideumKiosk/ideum08/navigation';
import Ideum05Nav3DViewer from '../Ideum05Nav3DViewer';
import IdeumSuperBucket from '../common/IdeumSuperBucket';
import '../Ideum05NavLayer.css';
import './DataCentersHub.css';
import './Ref200MwSubmenu.css';
import Ref200ExpansionTouchPanel from './Ref200ExpansionTouchPanel';
import Ref200HorizontalToggleRow from './Ref200HorizontalToggleRow';

const BESS_VISUAL = getComponentVisualConfig('bess-50mw');
const LM2500_3D_VISUAL = getComponentVisualConfig('gas-turbine-3d');
const LM2500_MODEL = getGasTurbine3DModelUrl(LM2500_3D_VISUAL);
const BESS_MODEL = getBess3DModelUrl(BESS_VISUAL);
const GFME_MODEL = getGFMe3DModelUrl();

/** Ref200 GFMe preview: ~3 cm left on screen (fraction of model maxDim). */
const REF200_GFME_SHIFT_SCREEN_X = -0.34;

const REF200_GFME_VIEWER_MOTION = {
  rotationMode: 'pendulum',
  pendulumAmplitudeDeg: 40,
  pendulumOffsetDeg: 120,
};

/** Same ideumCommand strings as ref200Mw.conf.json → P2R_18 presets on Maingear. */
export const REF200_IDEUM_COMMANDS = {
  baselineLm2500: 'add8Turbines',
  addBess: 'addBessOnly',
  addGfme: 'addGfmeOnly',
  addBessAndGfme: 'addStatcomAndGFMe',
  addMvups: 'addMvupsOnly',
  forcedPowerOscillation: 'showPlotsForCurrentDesign',
};

function ref200SideTitleFontPx(zoom = 1) {
  const z = Math.max(Number(zoom) || 1, 0.01);
  return Math.max(12, Math.round(11 * 1.12 * z));
}

function ref200BucketWellPadding(subsetGapPx) {
  return {
    paddingTop: subsetGapPx,
    paddingLeft: subsetGapPx,
    paddingRight: subsetGapPx,
    paddingBottom: subsetGapPx,
  };
}

const E_STATCOM_MARK = 'e-Statcom';

/** Keep “e-Statcom” mixed-case inside the uppercase side rail. */
function renderRef200SideTitle(label) {
  const text = String(label ?? '');
  const idx = text.indexOf(E_STATCOM_MARK);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="ideum07-ref200__keep-case">{E_STATCOM_MARK}</span>
      {text.slice(idx + E_STATCOM_MARK.length)}
    </>
  );
}

function TilePressMark({ pressState }) {
  if (pressState !== 'on' && pressState !== 'off') return null;
  const on = pressState === 'on';
  return (
    <span className={`ideum08-press-mark${on ? ' ideum08-press-mark--on' : ' ideum08-press-mark--off'}`}>
      {on ? 'ON' : 'OFF'}
    </span>
  );
}

export function SubmenuUseCaseTile({
  label,
  imageUrl,
  imageAlt,
  titleClassName = '',
  disabled = false,
  dimmed = false,
  ideumCommand = null,
  onIdeumCommand,
  onPress = null,
  pressState = null,
  zoom = 1,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`ideum07-ref200__tile ideum07-ref200__tile--use-case ideum-component-btn ideum-component-btn--nav-card ideum07-root-subcard ideum07-root-subcard--applications${
        disabled ? ' ideum-component-btn--nav-card-disabled' : ' ideum-component-btn--nav-card-featured'
      }${dimmed ? ' ideum-component-btn--nav-card-dimmed' : ''}${
        pressState === 'on' ? ' ideum08-press-tile--on' : ''
      }${pressState === 'off' ? ' ideum08-press-tile--off' : ''}`}
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        if (onPress) onPress();
        if (ideumCommand && onIdeumCommand) {
          onIdeumCommand(ideumCommand);
        }
      }}
      aria-label={pressState ? `${label}, ${pressState}` : label}
      aria-pressed={pressState ? pressState === 'on' : undefined}
      aria-disabled={disabled || undefined}
    >
      <TilePressMark pressState={pressState} />
      <span
        className={`ideum-component-btn__title ideum07-ref200__use-case-title${
          disabled ? ' ideum-component-btn__title--disabled' : ' ideum-component-btn__title--featured'
        }${titleClassName ? ` ${titleClassName}` : ''}`}
      >
        {label}
      </span>
      <div className="ideum05-nav-card__preview ideum05-nav-card__preview--image ideum07-ref200__use-case-preview">
        <img
          className="ideum05-nav-card__preview-image ideum05-nav-card__preview-image--fill"
          src={imageUrl}
          alt={imageAlt || label}
          draggable={false}
        />
      </div>
    </button>
  );
}

export function SubmenuModelTile({
  label,
  modelUrl,
  modelUrlSecondary,
  fitScale = 0.72,
  fitScaleSecondary,
  modelYOffset = 0.12,
  cameraPitchLift = 0.48,
  shiftScreenX = 0,
  shiftScreenXSecondary = 0,
  rotationMode = 'turntable',
  pendulumAmplitudeDeg,
  pendulumPeriodMs,
  pendulumOffsetDeg,
  rotationModeSecondary = 'turntable',
  pendulumAmplitudeDegSecondary,
  pendulumPeriodMsSecondary,
  pendulumOffsetDegSecondary,
  disabled = false,
  dimmed = false,
  modelComingSoon = false,
  comingSoonLabel = 'Coming soon',
  previewImageUrl = null,
  previewImageAlt,
  ideumCommand = null,
  onIdeumCommand,
  onPress = null,
  pressState = null,
  className = '',
  zoom = 1,
}) {
  const titleFontPx = ref200SideTitleFontPx(zoom);
  const subcardVariant = className.includes('ideum07-root-subcard--stability')
    ? 'ideum07-root-subcard--stability'
    : 'ideum07-root-subcard--applications';
  const tileRef = useRef(null);
  const titleRef = useRef(null);
  const previewRef = useRef(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = tileRef.current;
    const previewEl = previewRef.current;
    if (!el) return undefined;
    const measure = () => {
      const pv = previewRef.current;
      setPreviewSize({
        width: pv ? Math.max(0, pv.clientWidth) : 0,
        height: pv ? Math.max(0, pv.clientHeight) : 0,
      });
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      if (titleRef.current) ro.observe(titleRef.current);
      if (previewEl) ro.observe(previewEl);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [label, titleFontPx, modelUrlSecondary]);

  const showPreviewImage = Boolean(previewImageUrl);
  const show3d = !modelComingSoon && !showPreviewImage;

  const modelW = Math.max(48, previewSize.width);
  const modelH = Math.max(48, previewSize.height);
  const dualGap = 6;
  const dualCellW = Math.max(24, Math.floor((modelW - dualGap) / 2));

  return (
    <button
      ref={tileRef}
      type="button"
      disabled={disabled}
      className={`ideum07-ref200__tile ideum07-ref200__tile--side-title ideum-component-btn ideum-component-btn--nav-card ideum07-root-subcard ${subcardVariant}${
        disabled ? ' ideum-component-btn--nav-card-disabled' : ' ideum-component-btn--nav-card-featured'
      }${dimmed ? ' ideum-component-btn--nav-card-dimmed' : ''}${
        pressState === 'on' ? ' ideum08-press-tile--on' : ''
      }${pressState === 'off' ? ' ideum08-press-tile--off' : ''}${className ? ` ${className}` : ''}`}
      onClick={(e) => {
        if (disabled || modelComingSoon) return;
        e.preventDefault();
        e.stopPropagation();
        if (onPress) onPress();
        if (ideumCommand && onIdeumCommand) {
          onIdeumCommand(ideumCommand);
        }
      }}
      aria-label={pressState ? `${label}, ${pressState}` : label}
      aria-pressed={pressState ? pressState === 'on' : undefined}
      aria-disabled={disabled || undefined}
    >
      <TilePressMark pressState={pressState} />
      <span
        ref={titleRef}
        className="ideum-component-btn__title ideum07-subnav-title ideum07-ref200__side-title ideum-component-btn__title--featured"
        style={{ fontSize: titleFontPx }}
      >
        <span className={`ideum07-subnav-title__text ideum07-ref200__side-title-text${String(label).includes(E_STATCOM_MARK) ? ' ideum07-ref200__side-title-text--wrap' : ''}`}>{renderRef200SideTitle(label)}</span>
      </span>
      <div
        ref={previewRef}
        className={`ideum05-nav-card__preview ideum07-ref200__preview${
          showPreviewImage ? ' ideum05-nav-card__preview--image' : ' ideum05-nav-card__preview--3d'
        }${modelComingSoon ? ' ideum07-nav-card__3d-coming-soon' : ''}${
          modelUrlSecondary ? ' ideum07-ref200__preview--dual' : ''
        }`}
      >
        {modelComingSoon ? (
          <span className="ideum07-nav-card__3d-coming-soon-label">{comingSoonLabel}</span>
        ) : null}
        {showPreviewImage ? (
          <img
            className="ideum05-nav-card__preview-image ideum05-nav-card__preview-image--fill"
            src={previewImageUrl}
            alt={previewImageAlt || label}
            draggable={false}
          />
        ) : null}
        {show3d && modelW > 0 && modelH > 0 && modelUrl && !modelUrlSecondary ? (
          <Ideum05Nav3DViewer
            width={modelW}
            height={modelH}
            modelUrl={modelUrl}
            fitScale={fitScale}
            modelYOffset={modelYOffset}
            cameraPitchLift={cameraPitchLift}
            shiftScreenX={shiftScreenX}
            rotationMode={rotationMode}
            pendulumAmplitudeDeg={pendulumAmplitudeDeg}
            pendulumPeriodMs={pendulumPeriodMs}
            pendulumOffsetDeg={pendulumOffsetDeg}
          />
        ) : null}
        {show3d && modelW > 0 && modelH > 0 && modelUrl && modelUrlSecondary ? (
          <div className="ideum05-nav-card__preview-dual ideum07-ref200__preview-dual">
            <div className="ideum05-nav-card__preview-dual-cell">
              <Ideum05Nav3DViewer
                width={dualCellW}
                height={modelH}
                modelUrl={modelUrl}
                fitScale={fitScale}
                modelYOffset={modelYOffset}
                cameraPitchLift={cameraPitchLift}
              />
            </div>
            <div className="ideum05-nav-card__preview-dual-cell">
              <Ideum05Nav3DViewer
                width={dualCellW}
                height={modelH}
                modelUrl={modelUrlSecondary}
                fitScale={fitScaleSecondary ?? fitScale}
                modelYOffset={modelYOffset}
                cameraPitchLift={cameraPitchLift}
                shiftScreenX={shiftScreenXSecondary}
                rotationMode={rotationModeSecondary}
                pendulumAmplitudeDeg={pendulumAmplitudeDegSecondary}
                pendulumPeriodMs={pendulumPeriodMsSecondary}
                pendulumOffsetDeg={pendulumOffsetDegSecondary}
              />
            </div>
          </div>
        ) : null}
      </div>
    </button>
  );
}

export function Ref200ColumnBucket({
  title,
  variant,
  bucketChrome,
  className = '',
  contentClassName = '',
  onHome,
  onReset,
  children,
}) {
  const { subsetGapPx } = bucketChrome;
  return (
    <IdeumSuperBucket
      className={`ideum07-hub-bucket ideum07-ref200-submenu__column-bucket${className ? ` ${className}` : ''}`}
      contentClassName={`ideum07-hub-bucket__content ideum07-ref200-submenu__bucket-content${contentClassName ? ` ${contentClassName}` : ''}`}
      contentStyle={ref200BucketWellPadding(subsetGapPx)}
      title={title}
      variant={variant}
      bucketChrome={bucketChrome}
      showHome={Boolean(onHome)}
      onHome={onHome}
      onReset={onReset}
    >
      {children}
    </IdeumSuperBucket>
  );
}

export default function Ideum08Ref200MwSubmenu({
  zoom = 1,
  onBack,
  onHome,
  onIdeumCommand,
  onReset,
  ideumExpansionMirror,
  onIdeumExpansionToggle,
  onIdeumToggleSimulation,
  ideumSimulationOn = true,
  ideumSimulationBusy = false,
}) {
  const bucketChrome = getIdeum08RootBucketChrome(zoom);
  const hubInsetPx = Math.max(8, Math.round(8 * zoom));
  const titleFontPx = ref200SideTitleFontPx(zoom);

  // remember this <live RTDS> button to be used later.
  // Was: IdeumSuperBucket onLiveRtds={onLiveRtds} → handleIdeum05LiveRtds → cluster command liveRtds → handleLiveRtds().

  return (
    <div
      className="ideum07-hub ideum07-ref200-submenu ideum05-nav-layer"
      role="region"
      aria-label="200 MW Architecture"
      style={{
        padding: hubInsetPx,
        '--ideum07-ref200-title-font': `${titleFontPx}px`,
      }}
    >
      <IdeumSuperBucket
        className="ideum07-hub-screen"
        contentClassName="ideum07-hub-screen__content ideum07-ref200-submenu__content"
        contentStyle={ref200BucketWellPadding(bucketChrome.subsetGapPx)}
        title="200 MW Architecture"
        bucketChrome={bucketChrome}
        showBack
        onBack={onBack}
        showHome={Boolean(onHome)}
        onHome={onHome}
        showMaingearTouchActions
        onReset={onReset}
      >
        <div
          className="ideum07-hub__row ideum07-ref200-submenu__row"
          style={{ gap: bucketChrome.bucketGapPx }}
        >
          <Ref200ColumnBucket
            title="Baseline Configuration"
            bucketChrome={bucketChrome}
            onHome={onHome}
            onReset={onReset}
            className="ideum07-ref200-submenu__bucket ideum07-ref200-submenu__bucket--baseline"
            contentClassName="ideum07-ref200-submenu__bucket-content--baseline"
          >
            <SubmenuModelTile
              zoom={zoom}
              className="ideum07-ref200__tile--baseline ideum08-ref200__tile--baseline ideum07-root-subcard--stability"
              label="LM2500 Powered Island"
              modelUrl={LM2500_MODEL}
              fitScale={1.12}
              modelYOffset={0.06}
              cameraPitchLift={0.44}
              ideumCommand={REF200_IDEUM_COMMANDS.baselineLm2500}
              onIdeumCommand={onIdeumCommand}
            />
            <div className="ideum08-ref200__toggle-stack">
              <Ref200ExpansionTouchPanel
                zoom={zoom}
                ideumExpansionMirror={ideumExpansionMirror}
                onIdeumExpansionToggle={onIdeumExpansionToggle}
              />
              <Ref200HorizontalToggleRow
                zoom={zoom}
                leftLabel="Simulation on"
                rightLabel="Simulation off"
                rightActive={!ideumSimulationOn}
                onToggle={onIdeumToggleSimulation}
                ariaLabel="Simulation on or simulation off"
                disabled={ideumSimulationBusy}
              />
            </div>
          </Ref200ColumnBucket>

          <Ref200ColumnBucket
            title="Augmented Configuration"
            variant="applications"
            bucketChrome={bucketChrome}
            onHome={onHome}
            onReset={onReset}
            className="ideum07-ref200-submenu__bucket"
          >
            <div
              className="ideum07-ref200-submenu__stack ideum07-ref200-submenu__stack--augmented"
              style={{ gap: bucketChrome.subsetGapPx }}
            >
              <div
                className="ideum07-ref200-submenu__pair-row"
                style={{ gap: bucketChrome.subsetGapPx }}
              >
                <SubmenuModelTile
                  zoom={zoom}
                  className="ideum07-ref200__tile--pair"
                  label="Add BESS"
                  modelUrl={BESS_MODEL}
                  fitScale={1.0}
                  modelYOffset={0.04}
                  cameraPitchLift={0.38}
                  ideumCommand={REF200_IDEUM_COMMANDS.addBess}
                  onIdeumCommand={onIdeumCommand}
                />
                <SubmenuModelTile
                  zoom={zoom}
                  className="ideum07-ref200__tile--pair"
                  label="Add (GFME) e-Statcom"
                  modelUrl={GFME_MODEL}
                  fitScale={1.4}
                  modelYOffset={0}
                  cameraPitchLift={0.34}
                  shiftScreenX={REF200_GFME_SHIFT_SCREEN_X}
                  {...REF200_GFME_VIEWER_MOTION}
                  ideumCommand={REF200_IDEUM_COMMANDS.addGfme}
                  onIdeumCommand={onIdeumCommand}
                />
              </div>
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Add (GFME) e-Statcom + BESS"
                modelUrl={BESS_MODEL}
                modelUrlSecondary={GFME_MODEL}
                fitScale={1.15}
                fitScaleSecondary={1.45}
                shiftScreenXSecondary={REF200_GFME_SHIFT_SCREEN_X}
                rotationModeSecondary={REF200_GFME_VIEWER_MOTION.rotationMode}
                pendulumAmplitudeDegSecondary={REF200_GFME_VIEWER_MOTION.pendulumAmplitudeDeg}
                pendulumOffsetDegSecondary={REF200_GFME_VIEWER_MOTION.pendulumOffsetDeg}
                ideumCommand={REF200_IDEUM_COMMANDS.addBessAndGfme}
                onIdeumCommand={onIdeumCommand}
              />
              <SubmenuModelTile
                zoom={zoom}
                label="Add MVUPS"
                previewImageUrl={IDEUM08_NAV_IMAGE_URLS.ref200Mvups}
                previewImageAlt="Medium voltage UPS skid"
                ideumCommand={REF200_IDEUM_COMMANDS.addMvups}
                onIdeumCommand={onIdeumCommand}
              />
              <SubmenuModelTile
                zoom={zoom}
                label="Add SST"
                previewImageUrl={IDEUM08_NAV_IMAGE_URLS.ref200Sst}
                previewImageAlt="Solid-state transformer skid"
                disabled
                dimmed
                modelComingSoon
                comingSoonLabel="Coming very soon"
              />
            </div>
          </Ref200ColumnBucket>

          <Ref200ColumnBucket
            title="Use Cases"
            bucketChrome={bucketChrome}
            onHome={onHome}
            onReset={onReset}
            className="ideum07-ref200-submenu__bucket"
          >
            <div
              className="ideum07-ref200-submenu__stack"
              style={{ gap: bucketChrome.subsetGapPx }}
            >
              <SubmenuUseCaseTile
                zoom={zoom}
                label="Forced Power Oscillation (FPO)"
                titleClassName="ideum07-ref200__use-case-title--multiline"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.ref200ForcedPowerOscillation}
                ideumCommand={REF200_IDEUM_COMMANDS.forcedPowerOscillation}
                onIdeumCommand={onIdeumCommand}
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="Sub-Synchronous Torsional Interaction (SSTI)"
                titleClassName="ideum07-ref200__use-case-title--multiline"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.ref200Ssti}
                disabled
                dimmed
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="Contingency scenarios"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.ref200ContingencyScenarios}
                disabled
                dimmed
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="Ride through performance"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.ref200RideThrough}
                disabled
                dimmed
              />
            </div>
          </Ref200ColumnBucket>
        </div>
      </IdeumSuperBucket>
    </div>
  );
}
