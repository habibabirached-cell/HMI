import { useLayoutEffect, useState } from 'react';
import GFMe3DViewer from './GFMe3DViewer';
import { getComponentVisualConfig } from '../../../data/componentVisuals';
import {
  getScaledCanvasBlockDimensions,
  primaryLabelText,
  secondaryLabelText,
} from '../shapes/canvasBlockUtils';
import { useCollapsedComponentFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  getGFMe3DLayout,
  getGFMe3DModelUrl,
  GFME3D_TITLE_BASE_FONT,
  GFME3D_SUBTITLE_BASE_FONT,
  GFME3D_TITLE_MARGIN,
} from '../../../utils/gfme3dLayout';
import { isGFMeCollapseAggregateSurface } from '../../../utils/collapseAggregate';

/**
 * Full-block WebGL + hollow title overlays for collapsed GFMe STATCOM tiles.
 */
export default function GFMe3DOverlays({
  renderComponents,
  allComponents,
  pan,
  zoom,
  canvasRef,
  blockTypeScale = {},
}) {
  const fontPxDelta = useCollapsedComponentFontPxDelta();
  const fsTitle = adjSvgFontPx(GFME3D_TITLE_BASE_FONT, fontPxDelta);
  const fsSub = adjSvgFontPx(GFME3D_SUBTITLE_BASE_FONT, fontPxDelta);
  const [slots, setSlots] = useState([]);

  useLayoutEffect(() => {
    const canvasEl = canvasRef?.current;
    if (!canvasEl) {
      setSlots([]);
      return undefined;
    }

    const modelUrl = getGFMe3DModelUrl();

    const update = () => {
      const next = renderComponents
        .filter((c) => isGFMeCollapseAggregateSurface(c, allComponents))
        .map((component) => {
          const visualConfig = getComponentVisualConfig(component.type);
          const { width, height } = getScaledCanvasBlockDimensions(
            component,
            visualConfig,
            blockTypeScale,
          );
          getGFMe3DLayout(width, height, fsTitle, fsSub);
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
            title: component.properties?.ideumDecorOnly
              ? ''
              : primaryLabelText(component, visualConfig),
            subtitle: component.properties?.ideumDecorOnly
              ? ''
              : secondaryLabelText(component, visualConfig),
            titleFontPx: fsTitle * zoom,
            subtitleFontPx: fsSub * zoom,
            titleMarginPx: GFME3D_TITLE_MARGIN * zoom,
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
  }, [renderComponents, allComponents, pan, zoom, canvasRef, blockTypeScale, fsTitle, fsSub]);

  if (!slots.length) return null;

  return (
    <div className="gfme-3d-overlay-root gas-turbine-3d-overlay-root" aria-hidden>
      {slots.map((slot) => (
        <div
          key={slot.id}
          className="gfme-3d-overlay-slot gas-turbine-3d-overlay-slot"
          style={{
            left: slot.left,
            top: slot.top,
            width: slot.width,
            height: slot.height,
            transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
            transformOrigin: 'center center',
          }}
        >
          <GFMe3DViewer
            width={slot.pixelWidth}
            height={slot.pixelHeight}
            modelUrl={slot.modelUrl}
          />
          <div
            className="gfme-3d-title gas-turbine-3d-title"
            style={{
              top: slot.titleMarginPx,
              fontSize: slot.titleFontPx,
            }}
          >
            {slot.title}
          </div>
          {slot.subtitle ? (
            <div
              className="gfme-3d-subtitle gas-turbine-3d-mw"
              style={{
                bottom: slot.titleMarginPx,
                fontSize: slot.subtitleFontPx,
              }}
            >
              {slot.subtitle}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
