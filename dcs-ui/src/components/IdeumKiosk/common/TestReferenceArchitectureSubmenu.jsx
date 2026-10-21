import React, { useEffect, useState } from 'react';
import { getComponentVisualConfig } from '../../../data/componentVisuals';
import { getBess3DModelUrl } from '../../../utils/bess3dLayout';
import { getGasTurbine3DModelUrl } from '../../../utils/gasTurbine3dLayout';
import { getIdeum08RootBucketChrome, IDEUM08_NAV_IMAGE_URLS } from '../../../utils/ideumKiosk/ideum08/navigation';
import IdeumSuperBucket from './IdeumSuperBucket';
import Ref200ExpansionTouchPanel from '../ideum08/Ref200ExpansionTouchPanel';
import Ref200HorizontalToggleRow from '../ideum08/Ref200HorizontalToggleRow';
import {
  REF200_IDEUM_COMMANDS,
  Ref200ColumnBucket,
  SubmenuModelTile,
  SubmenuUseCaseTile,
} from '../ideum08/Ref200MwSubmenu';
import {
  RSCAD_USE_OLD_SCENARIO,
  sendRscadAddBess,
  sendRscadAddMvups,
  sendRscadAiLoad,
  sendRscadBaseload,
  sendRscadConnectEms,
  sendRscadDisconnectEms,
  sendRscadEmsFrequency,
  sendRscadLmOnly,
  sendRscadResetBess,
  startRscadSimulation,
  stopRscadSimulation,
  subscribeRscadDriver,
} from '../../../rscad/client/rscadDriverClient';
import '../ideum08/DataCentersHub.css';
import '../ideum08/Ref200MwSubmenu.css';

const BESS_VISUAL = getComponentVisualConfig('bess-50mw');
const LM2500_3D_VISUAL = getComponentVisualConfig('gas-turbine-3d');
const LM2500_MODEL = getGasTurbine3DModelUrl(LM2500_3D_VISUAL);
const BESS_MODEL = getBess3DModelUrl(BESS_VISUAL);

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

/** HIL → Test Reference Architecture (3-column layout like 200 MW Architecture). */
export default function TestReferenceArchitectureSubmenu({
  zoom = 1,
  onBack,
  onHome,
  onIdeumCommand,
  onReset,
  ideumExpansionMirror,
  onIdeumExpansionToggle,
}) {
  const bucketChrome = getIdeum08RootBucketChrome(zoom);
  const hubInsetPx = Math.max(8, Math.round(8 * zoom));
  const titleFontPx = ref200SideTitleFontPx(zoom);
  const [rscad, setRscad] = useState({ simulationId: null, busy: false, statusText: '' });
  const [loadMode, setLoadMode] = useState('off');
  const [bessOn, setBessOn] = useState(false);
  const [mvupsOn, setMvupsOn] = useState(false);
  const [emsFreqOn, setEmsFreqOn] = useState(false);
  const [emsControl, setEmsControl] = useState(false);
  const running = Boolean(rscad.simulationId);

  useEffect(() => subscribeRscadDriver(setRscad), []);

  useEffect(() => {
    if (running) {
      setLoadMode('baseload');
      setBessOn(false);
      setMvupsOn(false);
      setEmsFreqOn(false);
      setEmsControl(false);
      return;
    }
    setLoadMode('off');
    setBessOn(false);
    setMvupsOn(false);
    setEmsFreqOn(false);
    setEmsControl(false);
  }, [rscad.simulationId, running]);

  return (
    <div
      className="ideum07-hub ideum07-ref200-submenu ideum05-nav-layer ideum08-test-ref-arch"
      role="region"
      aria-label="Test Reference Architecture"
      style={{
        padding: hubInsetPx,
        '--ideum07-ref200-title-font': `${titleFontPx}px`,
      }}
    >
      <IdeumSuperBucket
        className="ideum07-hub-screen"
        contentClassName="ideum07-hub-screen__content ideum07-ref200-submenu__content"
        contentStyle={ref200BucketWellPadding(bucketChrome.subsetGapPx)}
        title="Test Reference Architecture"
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
              label="8xLM2500"
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
                leftLabel="Manual Control"
                rightLabel="EMS Control"
                rightActive={emsControl}
                onToggle={() => {
                  if (running && rscad.busy) return;
                  const next = !emsControl;
                  setEmsControl(next);
                  const send = next ? sendRscadConnectEms : sendRscadDisconnectEms;
                  void send().then((result) => {
                    if (!result?.ok) setEmsControl(!next);
                  });
                }}
                ariaLabel="Manual control or EMS control"
              />
              <div className="ideum08-test-ref-arch__bess-actions">
                <button
                  type="button"
                  className="ideum08-ref200__sim-toggle-btn"
                  disabled={running && rscad.busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (running && rscad.busy) return;
                    void sendRscadResetBess().then((result) => {
                      if (result?.ok) setBessOn(false);
                    });
                  }}
                >
                  Reset BESS
                </button>
                <button
                  type="button"
                  className="ideum08-ref200__sim-toggle-btn"
                  disabled={running && rscad.busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (running && rscad.busy) return;
                    void sendRscadLmOnly().then((result) => {
                      if (result?.ok) {
                        setMvupsOn(true);
                        setLoadMode('baseload');
                      }
                    });
                  }}
                >
                  LM Only
                </button>
              </div>
              <div className="ideum08-test-ref-arch__rscad-actions" aria-label="RSCAD simulation">
                <button
                  type="button"
                  className={`ideum08-test-ref-arch__rscad-btn${running ? ' ideum08-press-tile--on' : ' ideum08-press-tile--off'}`}
                  disabled={rscad.busy}
                  aria-pressed={running}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startRscadSimulation();
                  }}
                >
                  <span className={`ideum08-press-mark ideum08-press-mark--btn${running ? ' ideum08-press-mark--on' : ' ideum08-press-mark--off'}`}>
                    {running ? 'ON' : 'OFF'}
                  </span>
                  <span>Start</span>
                  {rscad.simulationId ? (
                    <span className="ideum08-test-ref-arch__rscad-id">{rscad.simulationId}</span>
                  ) : null}
                  {!rscad.simulationId && rscad.statusText ? (
                    <span className="ideum08-test-ref-arch__rscad-id">{rscad.statusText}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="ideum08-test-ref-arch__rscad-btn"
                  disabled={rscad.busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    stopRscadSimulation();
                  }}
                >
                  Stop
                </button>
              </div>
              {running && rscad.statusText ? (
                <p className="ideum08-test-ref-arch__rscad-id">{rscad.statusText}</p>
              ) : null}
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
                label="Add BESS"
                modelUrl={BESS_MODEL}
                fitScale={1.0}
                modelYOffset={0.04}
                cameraPitchLift={0.38}
                pressState={bessOn ? 'on' : 'off'}
                onPress={() => {
                  if (running && rscad.busy) return;
                  const prevBess = bessOn;
                  const prevMvups = mvupsOn;
                  const clearsMvups = RSCAD_USE_OLD_SCENARIO;
                  setBessOn(true);
                  if (clearsMvups) setMvupsOn(false);
                  void (async () => {
                    try {
                      if (onIdeumCommand) {
                        await onIdeumCommand(REF200_IDEUM_COMMANDS.addBess);
                      }
                      const result = await sendRscadAddBess();
                      if (!result.ok) {
                        setBessOn(prevBess);
                        if (clearsMvups) setMvupsOn(prevMvups);
                      }
                    } catch {
                      setBessOn(prevBess);
                      if (clearsMvups) setMvupsOn(prevMvups);
                    }
                  })();
                }}
              />
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Add MVUPS"
                previewImageUrl={IDEUM08_NAV_IMAGE_URLS.ref200Mvups}
                previewImageAlt="Medium-voltage UPS skid"
                pressState={mvupsOn ? 'on' : 'off'}
                onPress={() => {
                  if (running && rscad.busy) return;
                  const prevBess = bessOn;
                  const prevMvups = mvupsOn;
                  const clearsBess = RSCAD_USE_OLD_SCENARIO;
                  setMvupsOn(true);
                  if (clearsBess) setBessOn(false);
                  void (async () => {
                    try {
                      if (onIdeumCommand) {
                        await onIdeumCommand(REF200_IDEUM_COMMANDS.addMvups);
                      }
                      const result = await sendRscadAddMvups();
                      if (!result.ok) {
                        if (clearsBess) setBessOn(prevBess);
                        setMvupsOn(prevMvups);
                        return;
                      }
                      setLoadMode('ai');
                    } catch {
                      if (clearsBess) setBessOn(prevBess);
                      setMvupsOn(prevMvups);
                    }
                  })();
                }}
              />
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Add SST"
                previewImageUrl={IDEUM08_NAV_IMAGE_URLS.ref200Sst}
                previewImageAlt="Solid-state transformer skid"
                disabled
                dimmed
                modelComingSoon
                comingSoonLabel="Coming soon"
              />
              <SubmenuModelTile
                zoom={zoom}
                className="ideum07-ref200__tile--tall"
                label="Add SST & Storage"
                previewImageUrl={IDEUM08_NAV_IMAGE_URLS.ref200Sst}
                previewImageAlt="Solid-state transformer and battery storage"
                disabled
                dimmed
                modelComingSoon
                comingSoonLabel="Coming soon"
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
                label="Baseload"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.ref200ContingencyScenarios}
                imageAlt="Baseload power delivery at a large substation"
                pressState={running && loadMode === 'baseload' ? 'on' : 'off'}
                onPress={() => {
                  if (running && rscad.busy) return;
                  void sendRscadBaseload().then((result) => {
                    if (result.ok) {
                      setLoadMode('baseload');
                      setEmsFreqOn(false);
                    }
                  });
                }}
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="AI Load"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.renewablePoweredDatacenters}
                imageAlt="High-density datacenter AI load"
                pressState={running && loadMode === 'ai' ? 'on' : 'off'}
                onPress={() => {
                  if (running && rscad.busy) return;
                  void sendRscadAiLoad().then((result) => {
                    if (result.ok) setLoadMode('ai');
                  });
                }}
              />
              <SubmenuUseCaseTile
                zoom={zoom}
                label="EMS Frequency Regulation"
                imageUrl={IDEUM08_NAV_IMAGE_URLS.emsFrequencyRegulation}
                imageAlt="Control room holding grid frequency steady beside a substation"
                pressState={emsFreqOn ? 'on' : 'off'}
                onPress={() => {
                  if ((running && rscad.busy) || emsFreqOn) return;
                  void sendRscadEmsFrequency().then((result) => {
                    if (result.ok) setEmsFreqOn(true);
                  });
                }}
              />
            </div>
          </Ref200ColumnBucket>
        </div>
      </IdeumSuperBucket>
    </div>
  );
}
