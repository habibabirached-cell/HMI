import React, { useLayoutEffect, useRef, useState } from 'react';
import { getComponentVisualConfig } from '../../../data/componentVisuals';
import { getBess3DModelUrl } from '../../../utils/bess3dLayout';
import { getGFMe3DModelUrl } from '../../../utils/gfme3dLayout';
import { getGasTurbine3DModelUrl } from '../../../utils/gasTurbine3dLayout';
import { getIdeum07RootBucketChrome, IDEUM07_NAV_IMAGE_URLS } from '../../../utils/ideumKiosk/ideum07/navigation';
import Ideum05Nav3DViewer from '../Ideum05Nav3DViewer';
import IdeumSuperBucket from '../common/IdeumSuperBucket';
import '../Ideum05NavLayer.css';
import './DataCentersHub.css';
import './Ref200MwSubmenu.css';

const BESS_VISUAL = getComponentVisualConfig('bess-50mw');
const LM2500_3D_VISUAL = getComponentVisualConfig('gas-turbine-3d');
const LM2500_MODEL = getGasTurbine3DModelUrl(LM2500_3D_VISUAL);
const BESS_MODEL = getBess3DModelUrl(BESS_VISUAL);
const GFME_MODEL = getGFMe3DModelUrl();

/** Same ideumCommand strings as ref200Mw.conf.json → P2R_18 presets on Maingear. */
export const REF200_IDEUM_COMMANDS = {
  baselineLm2500: 'add8Turbines',
  addBess: 'addBessOnly',
  addGfme: 'addGfmeOnly',
  addBessAndGfme: 'addStatcomAndGFMe',
  forcedPowerOscillation: 'add8Turbines',
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

function SubmenuUseCaseTile({
  label,
  imageUrl,
  imageAlt,
  disabled = false,
  dimmed = false,
  ideumCommand = null,
  onIdeumCommand,
  zoom = 1,
}) {
  const titleFontPx = Math.max(11, Math.round(12 * Math.max(Number(zoom) || 1, 0.01)));

  return (
    <button
      type="button"
      disabled={disabled}
      className={`ideum07-ref200__tile ideum07-ref200__tile--use-case ideum-component-btn ideum-component-btn--nav-card ideum07-root-subcard ideum07-root-subcard--applications${
        disabled ? ' ideum-component-btn--nav-card-disabled' : ' ideum-component-btn--nav-card-featured'
      }${dimmed ? ' ideum-component-btn--nav-card-dimmed' : ''}`}
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        if (ideumCommand && onIdeumCommand) {
          onIdeumCommand(ideumCommand);
        }
      }}
      aria-label={label}
      aria-disabled={disabled || undefined}
    >
      <span
        className="ideum-component-btn__title ideum07-ref200__use-case-title ideum-component-btn__title--featured"
        style={{ fontSize: titleFontPx }}
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

function SubmenuModelTile({
  label,
  modelUrl,
  modelUrlSecondary,
  fitScale = 0.72,
  fitScaleSecondary,
  modelYOffset = 0.12,
  cameraPitchLift = 0.48,
  disabled = false,
  dimmed = false,
  modelComingSoon = false,
  ideumCommand = null,
  onIdeumCommand,
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
      }${dimmed ? ' ideum-component-btn--nav-card-dimmed' : ''}${className ? ` ${className}` : ''}`}
      onClick={(e) => {
        if (disabled || modelComingSoon) return;
        e.preventDefault();
        e.stopPropagation();
        if (ideumCommand && onIdeumCommand) {
          onIdeumCommand(ideumCommand);
        }
      }}
      aria-label={label}
      aria-disabled={disabled || undefined}
    >
      <span
        ref={titleRef}
        className="ideum-component-btn__title ideum07-subnav-title ideum07-ref200__side-title ideum-component-btn__title--featured"
        style={{ fontSize: titleFontPx }}
      >
        <span className="ideum07-subnav-title__text ideum07-ref200__side-title-text">{label}</span>
      </span>
      <div
        ref={previewRef}
        className={`ideum05-nav-card__preview ideum05-nav-card__preview--3d ideum07-ref200__preview${
          modelComingSoon ? ' ideum07-nav-card__3d-coming-soon' : ''
        }${modelUrlSecondary ? ' ideum07-ref200__preview--dual' : ''}`}
      >
        {modelComingSoon ? (
          <span className="ideum07-nav-card__3d-coming-soon-label">Coming soon</span>
        ) : null}
        {!modelComingSoon && modelW > 0 && modelH > 0 && modelUrl && !modelUrlSecondary ? (
          <Ideum05Nav3DViewer
            width={modelW}
            height={modelH}
            modelUrl={modelUrl}
            fitScale={fitScale}
            modelYOffset={modelYOffset}
            cameraPitchLift={cameraPitchLift}
          />
        ) : null}
        {!modelComingSoon && modelW > 0 && modelH > 0 && modelUrl && modelUrlSecondary ? (
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
              />
            </div>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function Ref200ColumnBucket({
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

function DampedToggleRow({ zoom }) {
  const [damped, setDamped] = useState(true);
  const fontPx = Math.max(10, Math.round(11 * zoom));
  return (
    <div className="ideum07-ref200__toggle-row" style={{ fontSize: fontPx }}>
      <span className={`ideum07-ref200__toggle-label${damped ? ' ideum07-ref200__toggle-label--active' : ''}`}>
        Damped
      </span>
      <button
        type="button"
        role="switch"
        className={`ideum07-ref200__toggle${damped ? ' ideum07-ref200__toggle--on' : ''}`}
        aria-checked={damped}
        aria-label={damped ? 'Damped mode' : 'Undamped mode'}
        onClick={() => setDamped((v) => !v)}
      >
        <span className="ideum07-ref200__toggle-thumb" aria-hidden />
      </button>
      <span className={`ideum07-ref200__toggle-label${!damped ? ' ideum07-ref200__toggle-label--active' : ''}`}>
        Undamped
      </span>
    </div>
  );
}

export default function Ideum07Ref200MwSubmenu({
  zoom = 1,
  onBack,
  onHome,
  onIdeumCommand,
  onReset,
  onLiveRtds,
}) {
  const bucketChrome = getIdeum07RootBucketChrome(zoom);
  const hubInsetPx = Math.max(8, Math.round(8 * zoom));
  const titleFontPx = ref200SideTitleFontPx(zoom);

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
        onLiveRtds={onLiveRtds}
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
              className="ideum07-ref200__tile--baseline ideum07-root-subcard--stability"
              label="LM2500 Powered Island"
              modelUrl={LM2500_MODEL}
              fitScale={0.68}
              modelYOffset={0.1}
              cameraPitchLift={0.52}
              ideumCommand={REF200_IDEUM_COMMANDS.baselineLm2500}
              onIdeumCommand={onIdeumCommand}
            />
            <DampedToggleRow zoom={zoom} />
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
                  fitScale={0.55}
                  ideumCommand={REF200_IDEUM_COMMANDS.addBess}
                  onIdeumCommand={onIdeumCommand}
                />
                <SubmenuModelTile
                  zoom={zoom}
                  className="ideum07-ref200__tile--pair"
                  label="Add GFMe"
                  modelUrl={GFME_MODEL}
                  fitScale={0.58}
                  ideumCommand={REF200_IDEUM_COMMANDS.addGfme}
                  onIdeumCommand={onIdeumCommand}
                />
              </div>
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Add GFMe + BESS"
                modelUrl={BESS_MODEL}
                modelUrlSecondary={GFME_MODEL}
                fitScale={0.5}
                fitScaleSecondary={0.48}
                ideumCommand={REF200_IDEUM_COMMANDS.addBessAndGfme}
                onIdeumCommand={onIdeumCommand}
              />
              <SubmenuModelTile
                zoom={zoom}
                label="Add MVUPS"
                modelComingSoon
                disabled
                dimmed
              />
              <SubmenuModelTile
                zoom={zoom}
                label="Add SST"
                modelComingSoon
                disabled
                dimmed
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
                label="Forced Power Oscillation"
                imageUrl={IDEUM07_NAV_IMAGE_URLS.ref200ForcedPowerOscillation}
                ideumCommand={REF200_IDEUM_COMMANDS.forcedPowerOscillation}
                onIdeumCommand={onIdeumCommand}
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="Contingency scenarios"
                imageUrl={IDEUM07_NAV_IMAGE_URLS.ref200ContingencyScenarios}
                disabled
                dimmed
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="SSTI"
                imageUrl={IDEUM07_NAV_IMAGE_URLS.ref200Ssti}
                disabled
                dimmed
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="Ride through performance"
                imageUrl={IDEUM07_NAV_IMAGE_URLS.ref200RideThrough}
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
