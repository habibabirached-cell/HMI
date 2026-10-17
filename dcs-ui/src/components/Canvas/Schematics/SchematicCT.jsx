import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  shouldHideSupplementaryLabels,
  diagramSymbolLabelGap,
} from '../../../utils/canvasLabelPolicy';
import { SvgHoverTitle } from '../shapes/canvasSvgLabelHelpers';

function buildZigzagPath(x0, wireY, amp, x1, steps = 6) {
  const span = x1 - x0;
  const seg = span / steps;
  let d = `M ${x0} ${wireY}`;
  for (let i = 1; i < steps; i += 1) {
    const x = x0 + seg * i;
    const y = wireY + (i % 2 === 0 ? amp : -amp);
    d += ` L ${x} ${y}`;
  }
  d += ` L ${x1} ${wireY}`;
  return d;
}

/**
 * Current transformer one-line symbol: bold zigzag (resistor-style) centered vertically.
 * No visible box — transparent hit target only so the block stays draggable/selectable.
 */
function SchematicCT({
  width,
  height,
  strokeColor,
  zigzagColor,
  strokeWidthVal = 3,
  presentationOffline = false,
  primaryLabel,
  secondaryLabel,
  hidePrimaryLabel = false,
  forceInlinePropertyLabel = false,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const hideSupplementary = shouldHideSupplementaryLabels(fontPxDelta, {
    forceInlinePropertyLabel,
  });
  const fsP = adjSvgFontPx(11, fontPxDelta);
  const fsS = adjSvgFontPx(10, fontPxDelta);
  const maxW = width * 0.92;
  const lineGap = fsP * 1.12;
  const fullTooltip = [primaryLabel, secondaryLabel].filter(Boolean).join(' · ');
  const cx = width / 2;
  const margin = Math.max(2, width * 0.08);
  const x0 = margin;
  const x1 = width - margin;
  const steps = 6;

  const zigzagStroke = presentationOffline ? strokeColor : zigzagColor || strokeColor;
  const zigzagW = presentationOffline ? Math.max(4, strokeWidthVal) : 3;

  const gap = diagramSymbolLabelGap(fontPxDelta);
  /** Nominal zig amplitude (may be reduced when the cell is very short). */
  const ampNominal = Math.max(3, height * 0.09);

  const primaryLineExtent = fsP * 1.28;
  /**
   * Height from stacked `<text>` origin (hanging) through secondary `tspan` — mixed font sizes.
   */
  const stackedBlockExtent = fsP * 1.22 + lineGap + fsS * 1.22;

  const clearanceBelowZigzag = fsS;
  const secondaryAscentApprox = fsS * 0.88;

  const padTop = 4;
  const padBottom = 4;

  /** Provisional centered zigzag — only used to decide split vs stacked layout. */
  const wireY0 = height / 2;
  const zTop0 = wireY0 - ampNominal - zigzagW / 2 - 1;
  const zBot0 = wireY0 + ampNominal + zigzagW / 2 + 1;

  const minSecondaryBaseline =
    zBot0 + clearanceBelowZigzag + secondaryAscentApprox;
  const bottomBandFits = minSecondaryBaseline <= height - padBottom;
  let secondaryBaseline = bottomBandFits
    ? Math.min(height - padBottom, Math.max(minSecondaryBaseline, height - 10))
    : minSecondaryBaseline;

  const secondaryTopY = secondaryBaseline - secondaryAscentApprox;

  const primaryYForUnstacked = Math.max(
    padTop,
    zTop0 - gap - primaryLineExtent,
  );
  const primaryBottomUnstacked = primaryYForUnstacked + primaryLineExtent;

  const topClears = primaryBottomUnstacked <= zTop0 - gap + 1e-6;
  const bottomClears =
    bottomBandFits &&
    secondaryTopY >= zBot0 + clearanceBelowZigzag - 1e-6 &&
    secondaryBaseline <= height - padBottom + 1e-6;

  const stackAtTop =
    !hideSupplementary &&
    secondaryLabel &&
    !(topClears && bottomClears);

  /**
   * Zigzag **centerline stays at `height/2`** so orthogonal connections (mid-cell) meet the
   * symbol. Never offset the resistor vertically — that misaligns wires vs. the graphic.
   *
   * Stacked tspans only if they fit **above** the centered zig; otherwise fall back to split
   * (primary top / secondary bottom) even when split is tight.
   */
  const canStackAboveZigzag =
    padTop + stackedBlockExtent <= zTop0 - clearanceBelowZigzag - 1e-6;
  const useStackedTspans = stackAtTop && canStackAboveZigzag;

  const primaryY =
    hideSupplementary || !secondaryLabel
      ? primaryYForUnstacked
      : useStackedTspans
        ? padTop
        : primaryYForUnstacked;

  const wireYDraw = wireY0;
  const ampDraw = ampNominal;

  const zigzagD = buildZigzagPath(x0, wireYDraw, ampDraw, x1, steps);

  return (
    <>
      <rect width={width} height={height} fill="transparent" stroke="none" rx="4" />
      {/* Run-in stubs so bus/wires (anchored at x=0 / x=width, y≈height/2) meet the zigzag. */}
      <g pointerEvents="none">
        <line
          x1={0}
          y1={wireYDraw}
          x2={x0}
          y2={wireYDraw}
          stroke={zigzagStroke}
          strokeWidth={zigzagW}
          strokeLinecap="round"
        />
        <line
          x1={x1}
          y1={wireYDraw}
          x2={width}
          y2={wireYDraw}
          stroke={zigzagStroke}
          strokeWidth={zigzagW}
          strokeLinecap="round"
        />
      </g>
      <path
        d={zigzagD}
        fill="none"
        stroke={zigzagStroke}
        strokeWidth={zigzagW}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
      {!hidePrimaryLabel && useStackedTspans ? (
        <text
          x={cx}
          y={primaryY}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="#e0e0e0"
          fontSize={fsP}
          fontWeight="600"
          pointerEvents="none"
        >
          <SvgHoverTitle>{fullTooltip}</SvgHoverTitle>
          <tspan x={cx} dy={0}>
            {primaryLabel}
          </tspan>
          <tspan
            x={cx}
            dy={lineGap}
            fill="#999"
            fontSize={fsS}
            fontWeight="400"
          >
            {secondaryLabel}
          </tspan>
        </text>
      ) : !hidePrimaryLabel ? (
        <>
          <text
            x={cx}
            y={primaryY}
            textAnchor="middle"
            dominantBaseline="hanging"
            fill="#e0e0e0"
            fontSize={fsP}
            fontWeight="600"
            pointerEvents="none"
          >
            {hideSupplementary && secondaryLabel ? (
              <SvgHoverTitle>{fullTooltip}</SvgHoverTitle>
            ) : null}
            {primaryLabel}
          </text>
          {!hideSupplementary && secondaryLabel ? (
            <text
              x={cx}
              y={secondaryBaseline}
              textAnchor="middle"
              dominantBaseline="alphabetic"
              fill="#999"
              fontSize={fsS}
              pointerEvents="none"
            >
              {secondaryLabel}
            </text>
          ) : null}
        </>
      ) : !hideSupplementary && secondaryLabel ? (
        <text
          x={cx}
          y={secondaryBaseline}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          fill="#999"
          fontSize={fsS}
          pointerEvents="none"
        >
          <SvgHoverTitle>{fullTooltip}</SvgHoverTitle>
          {secondaryLabel}
        </text>
      ) : null}
    </>
  );
}

export default SchematicCT;
