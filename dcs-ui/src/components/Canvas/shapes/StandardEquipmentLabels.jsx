import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import { getCanvasLabelFlags } from '../../../utils/canvasLabelPolicy';
import { SvgHoverTitle } from './canvasSvgLabelHelpers';

/**
 * Icon + primary + secondary lines for generic / framed-texture blocks.
 * Uses tspan stacking (#3), hides supplementary rows (#5).
 */
export default function StandardEquipmentLabels({
  width,
  height,
  centerX,
  primaryLabelX = null,
  hideEquipmentIcon = false,
  visualConfig,
  canvasPrimaryText,
  canvasSecondaryText,
  framedTextureLayout,
  /** When set, overrides diagram font delta (e.g. collapsed aggregate titles). */
  labelFontPxDelta = null,
}) {
  const canvasFontPxDelta = useCanvasFontPxDelta();
  const fontPxDelta = labelFontPxDelta ?? canvasFontPxDelta;
  const { hideSupplementary } = getCanvasLabelFlags(fontPxDelta);
  const fsP = adjSvgFontPx(11, fontPxDelta);
  const fsS = adjSvgFontPx(10, fontPxDelta);
  const fsIcon = adjSvgFontPx(24, fontPxDelta);
  const lineGap = fsP * 1.14;
  const supTooltip =
    hideSupplementary && canvasSecondaryText
      ? `${canvasPrimaryText ?? ''}${canvasSecondaryText ? ` · ${canvasSecondaryText}` : ''}`.trim()
      : null;
  const titleX = primaryLabelX ?? centerX;

  /** Tall narrow slots: horizontal title at top (reads left → right inside the cell). */
  if (visualConfig.canvasPrimaryLabelHorizontalAtTop && !framedTextureLayout) {
    const hTitleFs = adjSvgFontPx(8.5, fontPxDelta);
    const hWeight = visualConfig.canvasPrimaryLabelVerticalFontWeight ?? 500;
    const labelFill = visualConfig.textureGlowAccent
      ? 'rgba(220, 235, 234, 0.92)'
      : '#e0e0e0';
    const labelY = Math.max(hTitleFs + 5, height * 0.045);
    return (
      <>
        <text
          x={centerX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill={labelFill}
          fontSize={hTitleFs}
          fontWeight={hWeight}
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letterSpacing="0.03em"
          pointerEvents="none"
        >
          {supTooltip ? <SvgHoverTitle>{supTooltip}</SvgHoverTitle> : null}
          {canvasPrimaryText}
        </text>
        {!hideSupplementary && canvasSecondaryText ? (
          <text
            x={centerX}
            y={height - Math.max(5, hTitleFs * 0.45)}
            textAnchor="middle"
            dominantBaseline="auto"
            fill="#999"
            fontSize={adjSvgFontPx(10, fontPxDelta)}
            pointerEvents="none"
          >
            {canvasSecondaryText}
          </text>
        ) : null}
      </>
    );
  }

  /** Tall narrow slots: rotate title along the cell (default −90° upward). */
  if (visualConfig.canvasPrimaryLabelVertical && !framedTextureLayout) {
    const vTitleFs = adjSvgFontPx(9, fontPxDelta);
    const vIconFs = adjSvgFontPx(18, fontPxDelta);
    const vAngle =
      Number.isFinite(visualConfig.canvasPrimaryLabelVerticalAngle)
        ? visualConfig.canvasPrimaryLabelVerticalAngle
        : -90;
    const vWeight = visualConfig.canvasPrimaryLabelVerticalFontWeight ?? 500;
    const labelFill = visualConfig.textureGlowAccent
      ? 'rgba(220, 235, 234, 0.92)'
      : '#e0e0e0';
    const labelAtTop = visualConfig.canvasPrimaryLabelVerticalAnchor === 'top';
    const labelY = labelAtTop
      ? Math.max(vTitleFs * 1.15 + 6, height * 0.065)
      : height * 0.52;
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
        <g
          transform={`translate(${centerX}, ${labelY}) rotate(${vAngle})`}
          pointerEvents="none"
        >
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={labelFill}
            fontSize={vTitleFs}
            fontWeight={vWeight}
            fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
            letterSpacing="0.04em"
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
          >
            {canvasSecondaryText}
          </text>
        ) : null}
      </>
    );
  }

  return (
    <>
      {!framedTextureLayout && !hideEquipmentIcon && (
        <text
          x={centerX}
          y={height * 0.28}
          textAnchor="middle"
          fill={visualConfig.color}
          fontSize={fsIcon}
          fontWeight="400"
          pointerEvents="none"
          opacity="0.9"
        >
          {visualConfig.icon}
        </text>
      )}
      <text
        x={titleX}
        y={height * 0.42}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#e0e0e0"
        fontSize={fsP}
        fontWeight="600"
        pointerEvents="none"
      >
        {supTooltip ? <SvgHoverTitle>{supTooltip}</SvgHoverTitle> : null}
        <tspan x={titleX} dy={0}>
          {canvasPrimaryText}
        </tspan>
        {!hideSupplementary && canvasSecondaryText ? (
          <tspan x={titleX} dy={lineGap} fill="#999" fontSize={fsS} fontWeight="400">
            {canvasSecondaryText}
          </tspan>
        ) : null}
      </text>
    </>
  );
}
