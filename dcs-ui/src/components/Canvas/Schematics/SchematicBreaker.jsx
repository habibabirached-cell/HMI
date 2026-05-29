import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  getCanvasLabelFlags,
  diagramSymbolLabelGap,
} from '../../../utils/canvasLabelPolicy';
import { SvgHoverTitle } from '../shapes/canvasSvgLabelHelpers';

/**
 * One-line diagram style breaker: horizontal bar + diagonal blade.
 * Transparent hit target only — no frame. Stack: primary label → symbol (centered) → secondary label.
 */
function SchematicBreaker({
  width,
  height,
  strokeColor,
  strokeWidthVal: _strokeWidthVal,
  primaryLabel,
  secondaryLabel,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const { hideSupplementary } = getCanvasLabelFlags(fontPxDelta);
  const fsP = adjSvgFontPx(11, fontPxDelta);
  const fsS = adjSvgFontPx(10, fontPxDelta);
  const cx = width / 2;
  const maxW = width * 0.92;
  const lineGap = fsP * 1.12;
  const fullTooltip = [primaryLabel, secondaryLabel].filter(Boolean).join(' · ');
  /** Nudge symbol down so labels don’t touch the blade / hinge line. */
  const symY = height / 2 + 6;
  const symX1 = Math.max(4, width * 0.1);
  const symX2 = width - symX1;
  const bladeTipX = width * 0.48;
  const bladeRootX = width * 0.2;
  const bladeRise = Math.min(13, height * 0.2);
  const bladeRootY = symY - bladeRise;
  const barStroke = 2.5;
  const gap = diagramSymbolLabelGap(fontPxDelta);
  /** Top of blade / wire stroke envelope — keep primary text above. */
  const symbolTopY = bladeRootY - barStroke / 2 - 2;
  const symbolBotY = symY + barStroke / 2 + 2;
  /**
   * CT measures clearance to `zTop0` (true top of zig ink). Breaker `symbolTopY` sits on the
   * hinge envelope; shift the layout datum **up** so primary gets CT-like policy `gap` to ink.
   */
  const labelDatumY =
    symbolTopY - (fsP * 0.52 + 5.5 + Math.min(3, Math.max(0, fontPxDelta) * 0.5));

  const padTop = 4;
  /** Match `SchematicCT` cap metric + small allowance for descenders. */
  const primaryLineExtent = fsP * 1.3;
  const stackedBlockExtent = fsP * 1.14 + lineGap + fsS * 1.12;

  /** Same idea as CT: one secondary em below the symbol stroke + ascent to alphabetic baseline. */
  const clearanceBelowSymbol = fsS;
  const secondaryAscentApprox = fsS * 0.88;

  const padBottom = 4;
  const minSecondaryBaseline =
    symbolBotY + clearanceBelowSymbol + secondaryAscentApprox;
  const bottomBandFits = minSecondaryBaseline <= height - padBottom;
  let secondaryBaseline = bottomBandFits
    ? Math.min(height - padBottom, Math.max(minSecondaryBaseline, height - 10))
    : minSecondaryBaseline;
  const secondaryTopY = secondaryBaseline - secondaryAscentApprox;

  /** Match CT: don’t floor to an arbitrary `6` — that can lift the line into the symbol. */
  const primaryYForUnstacked = Math.max(
    padTop,
    labelDatumY - gap - primaryLineExtent,
  );
  const primaryBottomUnstacked = primaryYForUnstacked + primaryLineExtent;

  const topClears = primaryBottomUnstacked <= labelDatumY - gap + 1e-6;
  const bottomClears =
    bottomBandFits &&
    secondaryTopY >= symbolBotY + clearanceBelowSymbol - 1e-6 &&
    secondaryBaseline <= height - padBottom + 1e-6;

  const stackAtTop =
    !hideSupplementary &&
    secondaryLabel &&
    !(topClears && bottomClears);

  /**
   * Only stack with `<tspan>` when both lines **fit above** `labelDatumY`. Otherwise
   * `primaryY` clamped to `padTop` still leaves the block overlapping the blade/bar.
   */
  const canStackAboveSymbol =
    padTop + stackedBlockExtent <= labelDatumY - gap - 1e-6;
  const useStackedTspans = stackAtTop && canStackAboveSymbol;

  const primaryY =
    hideSupplementary || !secondaryLabel
      ? primaryYForUnstacked
      : useStackedTspans
        ? Math.max(
            padTop,
            labelDatumY - gap - clearanceBelowSymbol - stackedBlockExtent,
          )
        : primaryYForUnstacked;

  return (
    <>
      <rect width={width} height={height} fill="transparent" stroke="none" rx="4" />
      <g pointerEvents="none">
        <line
          x1={symX1}
          y1={symY}
          x2={symX2}
          y2={symY}
          stroke={strokeColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <line
          x1={bladeRootX}
          y1={bladeRootY}
          x2={bladeTipX}
          y2={symY}
          stroke={strokeColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </g>
      {useStackedTspans ? (
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
      ) : (
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
      )}
    </>
  );
}

export default SchematicBreaker;
