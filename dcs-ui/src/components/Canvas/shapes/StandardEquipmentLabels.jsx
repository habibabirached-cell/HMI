import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import { getCanvasLabelFlags } from '../../../utils/canvasLabelPolicy';
import { fittedLineAttrs, SvgHoverTitle } from './canvasSvgLabelHelpers';

/**
 * Icon + primary + secondary lines for generic / framed-texture blocks.
 * Uses tspan stacking (#3), optional textLength squeeze (#4), hides supplementary rows (#5).
 */
export default function StandardEquipmentLabels({
  width,
  height,
  centerX,
  visualConfig,
  canvasPrimaryText,
  canvasSecondaryText,
  framedTextureLayout,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const { squeezeText, hideSupplementary } = getCanvasLabelFlags(fontPxDelta);
  const fsP = adjSvgFontPx(11, fontPxDelta);
  const fsS = adjSvgFontPx(10, fontPxDelta);
  const fsIcon = adjSvgFontPx(24, fontPxDelta);
  const lineGap = fsP * 1.14;
  const maxW = width * 0.92;
  const supTooltip =
    hideSupplementary && canvasSecondaryText
      ? `${canvasPrimaryText ?? ''}${canvasSecondaryText ? ` · ${canvasSecondaryText}` : ''}`.trim()
      : null;

  /** Tall narrow slots: rotate the title −90° (reads upward) so horizontal width is not overrun. */
  if (visualConfig.canvasPrimaryLabelVertical && !framedTextureLayout) {
    const vTitleFs = adjSvgFontPx(10.5, fontPxDelta);
    const vIconFs = adjSvgFontPx(20, fontPxDelta);
    return (
      <>
        {visualConfig.icon != null && String(visualConfig.icon).trim() !== '' ? (
          <text
            x={centerX}
            y={Math.min(height * 0.18, vIconFs + 4)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={visualConfig.color}
            fontSize={vIconFs}
            fontWeight="400"
            pointerEvents="none"
            opacity="0.92"
          >
            {visualConfig.icon}
          </text>
        ) : null}
        <g transform={`translate(${centerX}, ${height * 0.55}) rotate(-90)`} pointerEvents="none">
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e0e0e0"
            fontSize={vTitleFs}
            fontWeight="600"
            {...fittedLineAttrs(height * 0.85, squeezeText)}
          >
            {supTooltip ? <SvgHoverTitle>{supTooltip}</SvgHoverTitle> : null}
            {canvasPrimaryText}
          </text>
        </g>
        {!hideSupplementary && canvasSecondaryText ? (
          <text
            x={centerX}
            y={height - Math.max(5, vTitleFs * 0.45)}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="#999"
            fontSize={adjSvgFontPx(10, fontPxDelta)}
            pointerEvents="none"
            {...fittedLineAttrs(maxW, squeezeText)}
          >
            {canvasSecondaryText}
          </text>
        ) : null}
      </>
    );
  }

  /** Texture card: primary pinned top, secondary bottom (#3 reserves vertical band; no mid-cell overlap). */
  if (framedTextureLayout) {
    return (
      <>
        <text
          x={centerX}
          y={4}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="#e0e0e0"
          fontSize={fsP}
          fontWeight="600"
          pointerEvents="none"
          {...fittedLineAttrs(maxW, squeezeText)}
        >
          {supTooltip ? <SvgHoverTitle>{supTooltip}</SvgHoverTitle> : null}
          {canvasPrimaryText}
        </text>
        {!hideSupplementary && canvasSecondaryText ? (
          <text
            x={centerX}
            y={height - 4}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="#999"
            fontSize={fsS}
            pointerEvents="none"
            {...fittedLineAttrs(maxW, squeezeText)}
          >
            {canvasSecondaryText}
          </text>
        ) : null}
      </>
    );
  }

  return (
    <>
      {!framedTextureLayout && (
        <text
          x={centerX}
          y={height * 0.28}
          textAnchor="middle"
          fill={visualConfig.color}
          fontSize={fsIcon}
          fontWeight="400"
          pointerEvents="none"
          opacity="0.9"
          {...fittedLineAttrs(maxW, squeezeText)}
        >
          {visualConfig.icon}
        </text>
      )}
      <text
        x={centerX}
        y={height * 0.42}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#e0e0e0"
        fontSize={fsP}
        fontWeight="600"
        pointerEvents="none"
        {...fittedLineAttrs(maxW, squeezeText)}
      >
        {supTooltip ? <SvgHoverTitle>{supTooltip}</SvgHoverTitle> : null}
        <tspan x={centerX} dy={0}>
          {canvasPrimaryText}
        </tspan>
        {!hideSupplementary && canvasSecondaryText ? (
          <tspan x={centerX} dy={lineGap} fill="#999" fontSize={fsS} fontWeight="400">
            {canvasSecondaryText}
          </tspan>
        ) : null}
      </text>
    </>
  );
}
