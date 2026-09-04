import { useLayoutEffect, useState } from 'react';
import GasTurbine3DViewer from './GasTurbine3DViewer';
import { getComponentVisualConfig } from '../../../data/componentVisuals';
import {
  getScaledCanvasBlockDimensions,
  primaryLabelText,
  secondaryLabelText,
} from '../shapes/canvasBlockUtils';
import {
  useCollapsedComponentFontPxDelta,
} from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  GAS_TURBINE_3D_TYPE,
  getGasTurbine3DLayout,
  getGasTurbine3DModelUrl,
  getGasTurbine3DNeutralLighting,
  getIdeumTurbineTurntableOnly,
  GT3D_TITLE_BASE_FONT,
  GT3D_MW_BASE_FONT,
  GT3D_TITLE_MARGIN,
} from '../../../utils/gasTurbine3dLayout';
import OverlayConnectionReadout from './OverlayConnectionReadout';

/**
 * Full-block WebGL + hollow title/MW overlays (above SVG accent rails).
 * Slots use canvas-local coordinates (pan + zoom) — not viewport fixed — so layout
 * changes (e.g. sim controls Hide/Reveal) do not stretch or drift the 3D viewers.
 */
export default function GasTurbine3DOverlays({
  components,
  pan,
  zoom,
  canvasRef,
  blockTypeScale = {},
  ideumTouchButtonByComponentId,
  onIdeumControlButtonClick,
  simulationData = [],
  ensembleMemberSimulationData = null,
  ensembleColumnGroups = [],
  simulationColumns = [],
  simulationTime = 0,
}) {
  const fontPxDelta = useCollapsedComponentFontPxDelta();
  const fsP = adjSvgFontPx(GT3D_TITLE_BASE_FONT, fontPxDelta);
  const fsMw = adjSvgFontPx(GT3D_MW_BASE_FONT, fontPxDelta);
  const [slots, setSlots] = useState([]);

  useLayoutEffect(() => {
    const canvasEl = canvasRef?.current;
    if (!canvasEl) {
      setSlots([]);
      return undefined;
    }

    const update = () => {
      const next = components
        .filter(
          (c) =>
            c.type === GAS_TURBINE_3D_TYPE &&
            c.properties?.collapsePlaceholderOnly !== true,
        )
        .map((component) => {
          const modelUrl = getGasTurbine3DModelUrl(component);
          const visualConfig = getComponentVisualConfig(component.type);
          const { width, height } = getScaledCanvasBlockDimensions(
            component,
            visualConfig,
            blockTypeScale,
          );
          getGasTurbine3DLayout(width, height, fsP, fsMw);
          const rotation = component.visualOverrides?.rotation || 0;
          const slotW = width * zoom;
          const slotH = height * zoom;

          return {
            id: component.id,
            left: pan.x + component.position.x * zoom,
            top: pan.y + component.position.y * zoom,
            width: slotW,
            height: slotH,
            pixelWidth: Math.max(8, Math.round(slotW)),
            pixelHeight: Math.max(8, Math.round(slotH)),
            rotation,
            modelUrl,
            turntableOnly: getIdeumTurbineTurntableOnly(component),
            neutralLighting: getGasTurbine3DNeutralLighting(component),
            lowPixelRatio: /7HA\.glb/i.test(modelUrl),
            title: primaryLabelText(component, visualConfig),
            mwLabel: secondaryLabelText(component, visualConfig),
            titleFontPx: fsP * zoom,
            mwFontPx: fsMw * zoom,
            titleMarginPx: GT3D_TITLE_MARGIN * zoom,
            connectionReadout: component.connectionReadout || null,
          };
        });
      setSlots(next);
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
  }, [components, pan, zoom, canvasRef, blockTypeScale, fsP, fsMw]);

  if (!slots.length) return null;

  return (
    <div className="gas-turbine-3d-overlay-root" aria-hidden>
      {slots.map((slot) => {
        const ideumButton = ideumTouchButtonByComponentId?.get?.(slot.id);
        const ideumTouch = !!ideumButton;
        return (
        <div
          key={slot.id}
          className={`gas-turbine-3d-overlay-slot${ideumTouch ? ' ideum-3d-touch-slot' : ''}`}
          style={{
            left: slot.left,
            top: slot.top,
            width: slot.width,
            height: slot.height,
            transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
            transformOrigin: 'center center',
          }}
          onClick={
            ideumTouch
              ? (e) => {
                  e.stopPropagation();
                  onIdeumControlButtonClick?.(ideumButton);
                }
              : undefined
          }
          role={ideumTouch ? 'button' : undefined}
          tabIndex={ideumTouch ? 0 : undefined}
          aria-label={ideumTouch ? ideumButton.label : undefined}
        >
          <GasTurbine3DViewer
            width={slot.pixelWidth}
            height={slot.pixelHeight}
            modelUrl={slot.modelUrl}
            turntableOnly={slot.turntableOnly}
            neutralLighting={slot.neutralLighting}
            lowPixelRatio={slot.lowPixelRatio}
          />
          <div
            className="gas-turbine-3d-title"
            style={{
              top: slot.titleMarginPx,
              fontSize: slot.titleFontPx,
            }}
          >
            {slot.title}
          </div>
          {slot.mwLabel ? (
            <div
              className="gas-turbine-3d-mw"
              style={{
                bottom: slot.titleMarginPx,
                fontSize: slot.mwFontPx,
              }}
            >
              {slot.mwLabel}
            </div>
          ) : null}
        </div>
        );
      })}
      {slots.map((slot) => (
        <OverlayConnectionReadout
          key={`readout-${slot.id}`}
          slot={slot}
          simulationData={simulationData}
          ensembleMemberSimulationData={ensembleMemberSimulationData}
          ensembleColumnGroups={ensembleColumnGroups}
          simulationColumns={simulationColumns}
          simulationTime={simulationTime}
        />
      ))}
    </div>
  );
}
