import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  getCanvasLabelFlags,
  diagramSymbolLabelGap,
} from '../../../utils/canvasLabelPolicy';
import { SvgHoverTitle } from '../shapes/canvasSvgLabelHelpers';

/**
 * IEC-style open manual disconnect on a one-line: gap in the bar + diagonal blade.
 * Full-width transparent hit rect (matches other schematics).
 */
function SchematicManualLineSwitch({
  width,
  height,
  strokeColor,
  strokeWidthVal: _strokeWidthVal,
  primaryLabel,
  secondaryLabel,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const { hideSupplementary } = getCanvasLabelFlags(fontPxDelta);
  const fsP = adjSvgFontPx(9, fontPxDelta);
  const fsS = adjSvgFontPx(8, fontPxDelta);
  const maxW = width * 0.92;
  const lineGap = fsP * 1.12;
  const fullTooltip = [primaryLabel, secondaryLabel].filter(Boolean).join(' · ');
  const midY = height / 2 + 2;
  const gapL = width * 0.34;
  const gapR = width * 0.66;
  const wireInset = Math.max(2, width * 0.06);
  const bladeX0 = gapL;
  const bladeX1 = gapR;
  const bladeUp = Math.min(14, height * 0.32);

  const wireStroke = 2.25;
  const gap = diagramSymbolLabelGap(fontPxDelta);
  const bladeTipY = midY - bladeUp;
  const symbolTopY = bladeTipY - wireStroke / 2 - 2;
  const symbolBotY = midY + wireStroke / 2 + 2;

  const primaryLineExtent = fsP * 1.28;
  const stackedBlockExtent = fsP * 1.14 + lineGap + fsS * 1.12;

  const padBottom = 4;
  const minSecondaryBaseline = symbolBotY + gap + fsS * 1.05;
  const bottomBandFits = minSecondaryBaseline <= height - padBottom;
  let secondaryBaseline = bottomBandFits
    ? Math.min(height - padBottom, Math.max(minSecondaryBaseline, height - 10))
    : minSecondaryBaseline;
  const secondaryTop = secondaryBaseline - fsS * 1.05;

  const primaryYForUnstacked = Math.max(
    5,
    symbolTopY - gap - primaryLineExtent,
  );
  const primaryBottomUnstacked = primaryLabel
    ? primaryYForUnstacked + primaryLineExtent
    : 0;

  const topClears =
    !primaryLabel || primaryBottomUnstacked <= symbolTopY - gap + 1e-6;
  const bottomClears =
    bottomBandFits &&
    (!secondaryLabel ||
      (secondaryTop >= symbolBotY + gap - 1e-6 &&
        secondaryBaseline <= height - padBottom + 1e-6));

  const stackAtTop =
    !!primaryLabel &&
    !!secondaryLabel &&
    !hideSupplementary &&
    !(topClears && bottomClears);

  const primaryY =
    !primaryLabel
      ? primaryYForUnstacked
      : hideSupplementary || !secondaryLabel
        ? primaryYForUnstacked
        : stackAtTop
          ? Math.max(5, symbolTopY - gap - stackedBlockExtent)
          : primaryYForUnstacked;

  return (
    <>
      <rect width={width} height={height} fill="transparent" stroke="none" />
      <g pointerEvents="none">
        <line
          x1={wireInset}
          y1={midY}
          x2={gapL}
          y2={midY}
          stroke={strokeColor}
          strokeWidth={2.25}
          strokeLinecap="round"
        />
        <line
          x1={gapR}
          y1={midY}
          x2={width - wireInset}
          y2={midY}
          stroke={strokeColor}
          strokeWidth={2.25}
          strokeLinecap="round"
        />
        {/* Open blade: diagonal from left jaw upward-right */}
        <line
          x1={bladeX0}
          y1={midY}
          x2={bladeX1}
          y2={midY - bladeUp}
          stroke={strokeColor}
          strokeWidth={2.25}
          strokeLinecap="round"
        />
      </g>
      {stackAtTop ? (
        <text
          x={width / 2}
          y={primaryY}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="#c5c5c5"
          fontSize={fsP}
          fontWeight="600"
          pointerEvents="none"
        >
          <SvgHoverTitle>{fullTooltip}</SvgHoverTitle>
          <tspan x={width / 2} dy={0}>
            {primaryLabel}
          </tspan>
          <tspan
            x={width / 2}
            dy={lineGap}
            fill="#9e9e9e"
            fontSize={fsS}
            fontWeight="400"
          >
            {secondaryLabel}
          </tspan>
        </text>
      ) : (
        <>
          {primaryLabel ? (
            <text
              x={width / 2}
              y={primaryY}
              textAnchor="middle"
              dominantBaseline="hanging"
              fill="#c5c5c5"
              fontSize={fsP}
              fontWeight="600"
              pointerEvents="none"
            >
              {hideSupplementary && secondaryLabel ? (
                <SvgHoverTitle>{fullTooltip}</SvgHoverTitle>
              ) : null}
              {primaryLabel}
            </text>
          ) : null}
          {!hideSupplementary && secondaryLabel ? (
            <text
              x={width / 2}
              y={secondaryBaseline}
              textAnchor="middle"
              dominantBaseline="auto"
              fill="#9e9e9e"
              fontSize={fsS}
              pointerEvents="none"
            >
              {secondaryLabel}
            </text>
          ) : null}
        </>
      )}
    </>
  );
}

export default SchematicManualLineSwitch;
