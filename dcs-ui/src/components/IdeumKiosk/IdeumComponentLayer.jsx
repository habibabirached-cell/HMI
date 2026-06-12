import React, { useLayoutEffect, useState } from 'react';
import GasTurbine3DViewer from '../Canvas/Schematics/GasTurbine3DViewer';
import Bess3DViewer from '../Canvas/Schematics/Bess3DViewer';
import GFMe3DViewer from '../Canvas/Schematics/GFMe3DViewer';
import { getComponentVisualConfig } from '../../data/componentVisuals';
import { getScaledCanvasBlockDimensions } from '../Canvas/shapes/canvasBlockUtils';
import { getGasTurbine3DModelUrl } from '../../utils/gasTurbine3dLayout';
import { getBess3DModelUrl } from '../../utils/bess3dLayout';
import { getGFMe3DModelUrl } from '../../utils/gfme3dLayout';
import {
  getIdeumComponents,
  getIdeumTitle,
  ideumButtonPayload,
  isIdeumBessGfmeButton,
  isIdeumTurbineButton,
} from '../../utils/ideumComponent';
import './IdeumComponentLayer.css';

const BESS_VISUAL = getComponentVisualConfig('bess-50mw');
const TITLE_BAR_PX = 44;
const INNER_PAD_PX = 12;

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
    isGrouped: isIdeumBessGfmeButton(component),
    isTurbine: isIdeumTurbineButton(component),
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

  return (
    <div className="ideum-component-layer" aria-hidden={false}>
      {slots.map((slot) => {
        const previewH = Math.max(
          80,
          slot.pixelHeight - Math.round((TITLE_BAR_PX + INNER_PAD_PX * 2) * zoom),
        );
        const halfW = Math.max(80, Math.floor((slot.pixelWidth - INNER_PAD_PX * 3) / 2));

        return (
          <button
            key={slot.id}
            type="button"
            className={`ideum-component-btn${
              slot.isGrouped ? ' ideum-component-btn--grouped' : ' ideum-component-btn--turbine'
            }`}
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
              {slot.isTurbine && (
                <div className="ideum-component-btn__preview-single">
                  <GasTurbine3DViewer
                    width={slot.pixelWidth - INNER_PAD_PX * 2}
                    height={previewH}
                    modelUrl={getGasTurbine3DModelUrl()}
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
            </div>
          </button>
        );
      })}
    </div>
  );
}
