import { useLayoutEffect, useState } from 'react';
import Bess3DViewer from './Bess3DViewer';
import { getComponentVisualConfig } from '../../../data/componentVisuals';
import {
  getScaledCanvasBlockDimensions,
  primaryLabelText,
  secondaryLabelText,
} from '../shapes/canvasBlockUtils';
import { useCollapsedComponentFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  getBess3DLayout,
  getBess3DModelUrl,
  BESS3D_TITLE_BASE_FONT,
  BESS3D_SUBTITLE_BASE_FONT,
  BESS3D_TITLE_MARGIN,
} from '../../../utils/bess3dLayout';
import { isBessCollapseAggregateSurface } from '../../../utils/collapseAggregate';
import OverlayConnectionReadout from './OverlayConnectionReadout';

/**
 * Full-block WebGL + hollow title overlays for collapsed BESS tiles.
 */
export default function Bess3DOverlays({
  renderComponents,
  allComponents,
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
  const fsTitle = adjSvgFontPx(BESS3D_TITLE_BASE_FONT, fontPxDelta);
  const fsSub = adjSvgFontPx(BESS3D_SUBTITLE_BASE_FONT, fontPxDelta);
  const [slots, setSlots] = useState([]);

  useLayoutEffect(() => {
    const canvasEl = canvasRef?.current;
    if (!canvasEl) {
      setSlots([]);
      return undefined;
    }

    const update = () => {
      const next = renderComponents
        .filter((c) => isBessCollapseAggregateSurface(c, allComponents))
        .map((component) => {
          const baseVisual = getComponentVisualConfig(component.type);
          const visualConfig =
            component.visualOverrides?.model3dUrl != null
              ? { ...baseVisual, model3dUrl: component.visualOverrides.model3dUrl }
              : baseVisual;
          const { width, height } = getScaledCanvasBlockDimensions(
            component,
            visualConfig,
            blockTypeScale,
          );
          getBess3DLayout(width, height, fsTitle, fsSub);
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
            modelUrl: getBess3DModelUrl(visualConfig),
            viewerProfile: component.type === 'mvups-3d' ? 'mvups' : 'bess',
            title: component.properties?.ideumDecorOnly
              ? ''
              : primaryLabelText(component, visualConfig),
            subtitle: component.properties?.ideumDecorOnly
              ? ''
              : secondaryLabelText(component, visualConfig),
            titleFontPx: fsTitle * zoom,
            subtitleFontPx: fsSub * zoom,
            titleMarginPx: BESS3D_TITLE_MARGIN * zoom,
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
  }, [renderComponents, allComponents, pan, zoom, canvasRef, blockTypeScale, fsTitle, fsSub]);

  if (!slots.length) return null;

  return (
    <div className="bess-3d-overlay-root gas-turbine-3d-overlay-root" aria-hidden>
      {slots.map((slot) => {
        const ideumButton = ideumTouchButtonByComponentId?.get?.(slot.id);
        const ideumTouch = !!ideumButton;
        return (
        <div
          key={slot.id}
          className={`bess-3d-overlay-slot gas-turbine-3d-overlay-slot${ideumTouch ? ' ideum-3d-touch-slot' : ''}`}
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
          <Bess3DViewer
            width={slot.pixelWidth}
            height={slot.pixelHeight}
            modelUrl={slot.modelUrl}
            viewerProfile={slot.viewerProfile}
          />
          <div
            className="bess-3d-title gas-turbine-3d-title"
            style={{
              top: slot.titleMarginPx,
              fontSize: slot.titleFontPx,
            }}
          >
            {slot.title}
          </div>
          {slot.subtitle ? (
            <div
              className="bess-3d-subtitle gas-turbine-3d-mw"
              style={{
                bottom: slot.titleMarginPx,
                fontSize: slot.subtitleFontPx,
              }}
            >
              {slot.subtitle}
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
