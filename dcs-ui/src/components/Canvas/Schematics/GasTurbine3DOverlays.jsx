import { useLayoutEffect, useState } from 'react';
import GasTurbine3DViewer from './GasTurbine3DViewer';
import { getComponentVisualConfig } from '../../../data/componentVisuals';
import {
  getScaledCanvasBlockDimensions,
  primaryLabelText,
  secondaryLabelText,
} from '../shapes/canvasBlockUtils';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  GAS_TURBINE_3D_TYPE,
  getGasTurbine3DLayout,
  getGasTurbine3DModelUrl,
  GT3D_TITLE_BASE_FONT,
  GT3D_MW_BASE_FONT,
  GT3D_TITLE_MARGIN,
} from '../../../utils/gasTurbine3dLayout';

/**
 * Full-block WebGL + hollow title/MW overlays (above SVG accent rails).
 */
export default function GasTurbine3DOverlays({
  components,
  pan,
  zoom,
  canvasRef,
  blockTypeScale = {},
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const fsP = adjSvgFontPx(GT3D_TITLE_BASE_FONT, fontPxDelta);
  const fsMw = adjSvgFontPx(GT3D_MW_BASE_FONT, fontPxDelta);
  const [slots, setSlots] = useState([]);

  useLayoutEffect(() => {
    const canvasEl = canvasRef?.current;
    if (!canvasEl) {
      setSlots([]);
      return undefined;
    }

    const modelUrl = getGasTurbine3DModelUrl();

    const update = () => {
      const canvasRect = canvasEl.getBoundingClientRect();
      const next = components
        .filter((c) => c.type === GAS_TURBINE_3D_TYPE)
        .map((component) => {
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
            left: canvasRect.left + pan.x + component.position.x * zoom,
            top: canvasRect.top + pan.y + component.position.y * zoom,
            width: slotW,
            height: slotH,
            pixelWidth: Math.max(8, Math.round(slotW)),
            pixelHeight: Math.max(8, Math.round(slotH)),
            rotation,
            modelUrl,
            title: primaryLabelText(component, visualConfig),
            mwLabel: secondaryLabelText(component, visualConfig),
            titleFontPx: fsP * zoom,
            mwFontPx: fsMw * zoom,
            titleMarginPx: GT3D_TITLE_MARGIN * zoom,
          };
        });
      setSlots(next);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [components, pan, zoom, canvasRef, blockTypeScale, fsP, fsMw]);

  if (!slots.length) return null;

  return (
    <div className="gas-turbine-3d-overlay-root" aria-hidden>
      {slots.map((slot) => (
        <div
          key={slot.id}
          className="gas-turbine-3d-overlay-slot"
          style={{
            left: slot.left,
            top: slot.top,
            width: slot.width,
            height: slot.height,
            transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
            transformOrigin: 'center center',
          }}
        >
          <GasTurbine3DViewer
            width={slot.pixelWidth}
            height={slot.pixelHeight}
            modelUrl={slot.modelUrl}
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
      ))}
    </div>
  );
}
