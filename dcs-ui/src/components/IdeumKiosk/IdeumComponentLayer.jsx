import React, { useLayoutEffect, useState } from 'react';
import GasTurbine3DViewer from '../Canvas/Schematics/GasTurbine3DViewer';
import Bess3DViewer from '../Canvas/Schematics/Bess3DViewer';
import GFMe3DViewer from '../Canvas/Schematics/GFMe3DViewer';
import { getComponentVisualConfig } from '../../data/componentVisuals';
import { getScaledCanvasBlockDimensions } from '../Canvas/shapes/canvasBlockUtils';
import { getIdeumTurbineModelUrl, getIdeumTurbineTurntableOnly } from '../../utils/gasTurbine3dLayout';
import { getBess3DModelUrl } from '../../utils/bess3dLayout';
import { getGFMe3DModelUrl } from '../../utils/gfme3dLayout';
import {
  getIdeumComponents,
  getIdeumTitle,
  getIdeumPreviewImageUrl,
  getIdeumButtonStyleClass,
  ideumButtonPayload,
  isIdeumBessButton,
  isIdeumBessGfmeButton,
  isIdeumExpansionPanel,
  isIdeumGfmeButton,
  isIdeumMaingearViewPanel,
  isIdeumStartSimulationButton,
  isIdeumTurbineButton,
} from '../../utils/ideumComponent';
import './IdeumComponentLayer.css';

const BESS_VISUAL = getComponentVisualConfig('bess-50mw');
const TITLE_BAR_PX = 44;
const INNER_PAD_PX = 12;

function IdeumVerticalSwitch({ compact, onToggle, label, zoom, trackH }) {
  const trackW = Math.max(44, Math.round(56 * zoom));
  const thumbSize = Math.max(28, Math.round(36 * zoom));
  return (
    <button
      type="button"
      role="switch"
      className={`ideum-expansion-panel__switch${!compact ? ' ideum-expansion-panel__switch--on' : ''}`}
      style={{ width: trackW, height: trackH }}
      aria-checked={!compact}
      aria-label={compact ? `${label} compact` : `${label} expanded`}
      title={
        compact
          ? `${label} compact — tap to expand on Maingear`
          : `${label} expanded — tap to compact on Maingear`
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle?.();
      }}
    >
      <span
        className="ideum-expansion-panel__switch-thumb"
        style={{ width: thumbSize, height: thumbSize }}
        aria-hidden="true"
      />
    </button>
  );
}

function layoutIdeumSlot(component, blockTypeScale, pan, zoom) {
  const vis = getComponentVisualConfig(component.type);
  const { width, height } = getScaledCanvasBlockDimensions(component, vis, blockTypeScale);
  const x = component.position?.x ?? 0;
  const y = component.position?.y ?? 0;
  const slotW = width * zoom;
  const slotH = height * zoom;
  return {
    id: component.id,
    component,
    left: pan.x + x * zoom,
    top: pan.y + y * zoom,
    width: slotW,
    height: slotH,
    pixelWidth: Math.max(8, Math.round(slotW)),
    pixelHeight: Math.max(8, Math.round(slotH)),
    title: getIdeumTitle(component),
    titleFontPx: Math.max(14, Math.round(20 * zoom)),
    styleClass: getIdeumButtonStyleClass(component),
    previewImageUrl: getIdeumPreviewImageUrl(component),
    isGrouped: isIdeumBessGfmeButton(component),
    isTurbine: isIdeumTurbineButton(component),
    isBessOnly: isIdeumBessButton(component),
    isGfmeOnly: isIdeumGfmeButton(component),
  };
}

/**
 * Renders Ideum-only canvas components (HTML layer): bordered touch buttons with embedded 3D.
 */
export default function IdeumComponentLayer({
  components = [],
  pan,
  zoom,
  canvasRef,
  blockTypeScale = {},
  onIdeumClick,
  ideumExpansionMirror = { breakersCompact: true, peripheralsCompact: true },
  onIdeumExpansionToggle,
  ideumMaingearViewCompact = true,
  onIdeumMaingearViewToggle,
  ideumSimulationMirror = false,
  onIdeumSimulationClick,
}) {
  const [slots, setSlots] = useState([]);

  useLayoutEffect(() => {
    const canvasEl = canvasRef?.current;
    const ideumComps = getIdeumComponents(components);
    if (!canvasEl || !ideumComps.length) {
      setSlots([]);
      return undefined;
    }

    const update = () => {
      setSlots(
        ideumComps.map((c) => layoutIdeumSlot(c, blockTypeScale, pan, zoom)),
      );
    };

    update();

    const container = canvasEl.parentElement;
    if (typeof ResizeObserver !== 'undefined' && container) {
      const ro = new ResizeObserver(update);
      ro.observe(container);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [components, pan, zoom, canvasRef, blockTypeScale]);

  if (!slots.length) return null;

  const handleActivate = (e, component) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = ideumButtonPayload(component);
    if (payload) onIdeumClick?.(payload);
  };

  const buttonSlots = slots.filter(
    (s) =>
      !isIdeumExpansionPanel(s.component) &&
      !isIdeumMaingearViewPanel(s.component) &&
      !isIdeumStartSimulationButton(s.component),
  );
  const expansionSlots = slots.filter((s) => isIdeumExpansionPanel(s.component));
  const maingearViewSlots = slots.filter((s) => isIdeumMaingearViewPanel(s.component));
  const startSimSlots = slots.filter((s) => isIdeumStartSimulationButton(s.component));

  return (
    <div className="ideum-component-layer" aria-hidden={false}>
      {maingearViewSlots.map((slot) => {
        const titlePx = Math.max(16, Math.round(24 * zoom));
        const labelPx = Math.max(20, Math.round(32 * zoom));
        const rowPad = Math.max(16, Math.round(24 * zoom));
        const switchTrackH = Math.max(
          140,
          Math.round(slot.pixelHeight - titlePx - rowPad * 3),
        );

        return (
          <div
            key={slot.id}
            className="ideum-expansion-panel"
            style={{
              left: slot.left,
              top: slot.top,
              width: slot.width,
              height: slot.height,
              padding: rowPad,
            }}
            aria-label="Maingear view remote control"
          >
            <div
              className="ideum-expansion-panel__title"
              style={{ fontSize: titlePx, marginBottom: rowPad }}
            >
              Maingear
            </div>
            <div className="ideum-expansion-panel__row">
              <span
                className="ideum-expansion-panel__label"
                style={{ fontSize: labelPx }}
              >
                Detail
              </span>
              <IdeumVerticalSwitch
                compact={ideumMaingearViewCompact !== false}
                onToggle={() => onIdeumMaingearViewToggle?.()}
                label="Detail"
                zoom={zoom}
                trackH={switchTrackH}
              />
            </div>
          </div>
        );
      })}
      {expansionSlots.map((slot) => {
        const titlePx = Math.max(16, Math.round(24 * zoom));
        const labelPx = Math.max(20, Math.round(32 * zoom));
        const rowPad = Math.max(16, Math.round(24 * zoom));
        const switchTrackH = Math.max(
          140,
          Math.round((slot.pixelHeight - titlePx - rowPad * 4) / 2),
        );

        return (
          <div
            key={slot.id}
            className="ideum-expansion-panel"
            style={{
              left: slot.left,
              top: slot.top,
              width: slot.width,
              height: slot.height,
              padding: rowPad,
            }}
            aria-label="Expansion remote controls"
          >
            <div
              className="ideum-expansion-panel__title"
              style={{ fontSize: titlePx, marginBottom: rowPad }}
            >
              Expansion
            </div>
            <div className="ideum-expansion-panel__row" style={{ marginBottom: rowPad }}>
              <span
                className="ideum-expansion-panel__label"
                style={{ fontSize: labelPx }}
              >
                Breakers
              </span>
              <IdeumVerticalSwitch
                compact={ideumExpansionMirror?.breakersCompact !== false}
                onToggle={() => onIdeumExpansionToggle?.('breakers')}
                label="Breakers"
                zoom={zoom}
                trackH={switchTrackH}
              />
            </div>
            <div className="ideum-expansion-panel__row">
              <span
                className="ideum-expansion-panel__label"
                style={{ fontSize: labelPx }}
              >
                Peripherals
              </span>
              <IdeumVerticalSwitch
                compact={ideumExpansionMirror?.peripheralsCompact !== false}
                onToggle={() => onIdeumExpansionToggle?.('peripherals')}
                label="Peripherals"
                zoom={zoom}
                trackH={switchTrackH}
              />
            </div>
          </div>
        );
      })}
      {startSimSlots.map((slot) => {
        const labelPx = Math.max(18, Math.round(28 * zoom));
        const running = !!ideumSimulationMirror;
        return (
          <button
            key={slot.id}
            type="button"
            className={`ideum-component-btn ideum-component-btn--start-sim${
              running ? ' ideum-component-btn--start-sim-running' : ''
            }`}
            style={{
              left: slot.left,
              top: slot.top,
              width: slot.width,
              height: slot.height,
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onIdeumSimulationClick?.();
            }}
            aria-label={running ? 'Stop Simulation' : 'Start Simulation'}
          >
            <span
              className="ideum-component-btn__start-sim-label"
              style={{ fontSize: labelPx }}
            >
              {running ? '⏹ Stop Simulation' : '▶ Start Simulation'}
            </span>
          </button>
        );
      })}
      {buttonSlots.map((slot) => {
        const previewH = Math.max(
          80,
          slot.pixelHeight - Math.round((TITLE_BAR_PX + INNER_PAD_PX * 2) * zoom),
        );
        const halfW = Math.max(80, Math.floor((slot.pixelWidth - INNER_PAD_PX * 3) / 2));

        return (
          <button
            key={slot.id}
            type="button"
            className={`ideum-component-btn ${slot.styleClass}`}
            style={{
              left: slot.left,
              top: slot.top,
              width: slot.width,
              height: slot.height,
            }}
            onClick={(e) => handleActivate(e, slot.component)}
            aria-label={slot.title}
          >
            <span
              className="ideum-component-btn__title"
              style={{ fontSize: slot.titleFontPx, height: TITLE_BAR_PX * zoom }}
            >
              {slot.title}
            </span>
            <div
              className="ideum-component-btn__preview"
              style={{ padding: INNER_PAD_PX * zoom }}
            >
              {slot.previewImageUrl ? (
                <div className="ideum-component-btn__preview-single">
                  <img
                    className="ideum-component-btn__preview-image"
                    src={slot.previewImageUrl}
                    alt=""
                    draggable={false}
                  />
                </div>
              ) : (
                <>
              {slot.isTurbine && (
                <div className="ideum-component-btn__preview-single">
                  <GasTurbine3DViewer
                    width={slot.pixelWidth - INNER_PAD_PX * 2}
                    height={previewH}
                    modelUrl={getIdeumTurbineModelUrl(slot.component)}
                    turntableOnly={getIdeumTurbineTurntableOnly(slot.component)}
                  />
                </div>
              )}
              {slot.isBessOnly && (
                <div className="ideum-component-btn__preview-single">
                  <Bess3DViewer
                    width={slot.pixelWidth - INNER_PAD_PX * 2}
                    height={previewH}
                    modelUrl={getBess3DModelUrl(BESS_VISUAL)}
                  />
                </div>
              )}
              {slot.isGfmeOnly && (
                <div className="ideum-component-btn__preview-single">
                  <GFMe3DViewer
                    width={slot.pixelWidth - INNER_PAD_PX * 2}
                    height={previewH}
                    modelUrl={getGFMe3DModelUrl()}
                  />
                </div>
              )}
              {slot.isGrouped && (
                <div className="ideum-component-btn__preview-dual">
                  <div className="ideum-component-btn__preview-cell">
                    <Bess3DViewer
                      width={halfW}
                      height={previewH}
                      modelUrl={getBess3DModelUrl(BESS_VISUAL)}
                    />
                  </div>
                  <div className="ideum-component-btn__preview-cell">
                    <GFMe3DViewer
                      width={halfW}
                      height={previewH}
                      modelUrl={getGFMe3DModelUrl()}
                    />
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
