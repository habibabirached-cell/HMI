import React from 'react';
import { getComponentVisualConfig } from '../../../data/componentVisuals';
import { getBess3DModelUrl } from '../../../utils/bess3dLayout';
import { getWindTurbine3DModelUrl } from '../../../utils/windTurbine3dLayout';
import { getIdeum08RootBucketChrome, IDEUM08_NAV_IMAGE_URLS } from '../../../utils/ideumKiosk/ideum08/navigation';
import { IDEUM05_NAV_MODEL_URLS } from '../../../utils/ideum05Navigation';
import IdeumSuperBucket from './IdeumSuperBucket';
import { DISPATCHABLE_WIND_BASELINE_IDEUM_COMMAND } from '../../../utils/ideumDevMaingearTab';
import {
  Ref200ColumnBucket,
  SubmenuModelTile,
  SubmenuUseCaseTile,
} from '../ideum08/Ref200MwSubmenu';
import '../ideum08/DataCentersHub.css';
import '../ideum08/Ref200MwSubmenu.css';

const BESS_VISUAL = getComponentVisualConfig('bess-50mw');
const WIND_3D_VISUAL = getComponentVisualConfig('wind-turbine-3d');
const WIND_MODEL = getWindTurbine3DModelUrl(WIND_3D_VISUAL);
const BESS_MODEL = getBess3DModelUrl(BESS_VISUAL);

const BASELINE_LABEL = '200 MW GFL Wind + 200 MW GFMe BESS';

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

/** Reference Architectures → Dispatchable wind powered 200 MW (3-column submenu). */
export default function DispatchableWind200MwSubmenu({
  zoom = 1,
  onBack,
  onHome,
  onIdeumCommand,
  onReset,
  onIdeumToggleSimulation,
}) {
  const bucketChrome = getIdeum08RootBucketChrome(zoom);
  const hubInsetPx = Math.max(8, Math.round(8 * zoom));
  const titleFontPx = ref200SideTitleFontPx(zoom);

  return (
    <div
      className="ideum07-hub ideum07-ref200-submenu ideum05-nav-layer ideum08-dispatchable-wind-200"
      role="region"
      aria-label="Dispatchable wind powered 200 MW architecture"
      style={{
        padding: hubInsetPx,
        '--ideum07-ref200-title-font': `${titleFontPx}px`,
      }}
    >
      <IdeumSuperBucket
        className="ideum07-hub-screen"
        contentClassName="ideum07-hub-screen__content ideum07-ref200-submenu__content"
        contentStyle={ref200BucketWellPadding(bucketChrome.subsetGapPx)}
        title="Dispatchable Wind Powered 200 MW Architecture"
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
            contentClassName="ideum07-ref200-submenu__bucket-content--baseline ideum08-dispatchable-wind-200__baseline"
          >
            <SubmenuModelTile
              zoom={zoom}
              className="ideum07-ref200__tile--baseline ideum08-ref200__tile--baseline ideum07-root-subcard--stability ideum08-dispatchable-wind-200__baseline-tile"
              label={BASELINE_LABEL}
              modelUrl={WIND_MODEL}
              modelUrlSecondary={BESS_MODEL}
              fitScale={0.58}
              fitScaleSecondary={0.95}
              modelYOffset={0.08}
              cameraPitchLift={0.45}
              ideumCommand={DISPATCHABLE_WIND_BASELINE_IDEUM_COMMAND}
              onIdeumCommand={onIdeumCommand}
            />
            <div className="ideum08-ref200__toggle-stack ideum08-dispatchable-wind-200__toggle-stack">
              <button
                type="button"
                className="ideum08-ref200__sim-toggle-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onIdeumToggleSimulation?.();
                }}
              >
                Toggle simulation
              </button>
            </div>
          </Ref200ColumnBucket>

          <Ref200ColumnBucket
            title="Augmented Configurations"
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
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Make wind GFM"
                previewImageUrl={IDEUM08_NAV_IMAGE_URLS.dispatchableWind200Mw}
                previewImageAlt="Wind farm with grid-forming conversion"
              />
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Add Stability Solutions"
                previewImageUrl={IDEUM08_NAV_IMAGE_URLS.ref200Mvups}
                previewImageAlt="Grid stability and power conditioning equipment"
                disabled
                dimmed
              />
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Add Solar"
                modelUrl={IDEUM05_NAV_MODEL_URLS.solarField}
                fitScale={0.72}
                modelYOffset={0.14}
                cameraPitchLift={0.52}
                disabled
                dimmed
              />
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Hyperscaler Architecture"
                previewImageUrl={IDEUM08_NAV_IMAGE_URLS.renewablePoweredDatacenters}
                previewImageAlt="Hyperscale datacenter campus"
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
                label="Change wind speed"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.ref200ForcedPowerOscillation}
                imageAlt="Operator adjusting wind plant setpoints"
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="Torsional oscillations"
                titleClassName="ideum07-ref200__use-case-title--multiline"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.ref200Ssti}
                imageAlt="Sub-synchronous torsional interaction study"
                disabled
                dimmed
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="LVRT"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.ref200RideThrough}
                imageAlt="Low voltage ride-through performance"
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
