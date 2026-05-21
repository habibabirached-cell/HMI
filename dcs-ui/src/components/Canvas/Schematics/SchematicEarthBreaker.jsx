import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  getCanvasLabelFlags,
  diagramSymbolLabelGap,
} from '../../../utils/canvasLabelPolicy';
import { fittedLineAttrs, SvgHoverTitle } from '../shapes/canvasSvgLabelHelpers';

/**
 * Earth / chassis circuit breaker symbol (vertical stem + three graded horizontal bars).
 * Transparent hit target only. Stack: primary label → symbol (centered) → secondary label.
 */
function SchematicEarthBreaker({
  width,
  height,
  strokeColor,
  strokeWidthVal: _strokeWidthVal,
  primaryLabel,
  secondaryLabel,
  /** One-line square frame (e.g. sectional CB on bus), width/height = one grid cell. */
  showFrame = false,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const { squeezeText, hideSupplementary } = getCanvasLabelFlags(fontPxDelta);
  const fsP = adjSvgFontPx(11, fontPxDelta);
  const fsS = adjSvgFontPx(10, fontPxDelta);
  const maxW = width * 0.92;
  const lineGap = fsP * 1.12;
  const fullTooltip = [primaryLabel, secondaryLabel].filter(Boolean).join(' · ');
  const cx = width / 2;
  /** Slight downward shift + compact bars so top/bottom labels clear the graphic. */
  const symY = height / 2 + 1;
  const stemTop = symY - Math.min(10, height * 0.15);
  const stemBot = symY + 1;
  const w1 = Math.max(6, width * 0.12);
  const w2 = Math.max(10, width * 0.2);
  const w3 = Math.max(14, width * 0.28);
  const step = Math.min(3, height * 0.048);
  const y1 = stemBot + step * 1.2;
  const y2 = y1 + step;
  const y3 = y2 + step;

  const barStroke = 2.5;
  const strokeHalf = barStroke / 2;
  const gap = diagramSymbolLabelGap(fontPxDelta);
  const bladeTipY = stemTop;
  const symbolTopY = Math.min(bladeTipY, stemBot) - strokeHalf - 3;
  const symbolBotY = y3 + strokeHalf + 3;
  const labelDatumY =
    symbolTopY - (fsP * 0.52 + 5.5 + Math.min(3, Math.max(0, fontPxDelta) * 0.5));

  const padTop = 4;
  const primaryLineExtent = fsP * 1.3;
  const stackedBlockExtent = fsP * 1.14 + lineGap + fsS * 1.12;

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

  const pad = 1.5;
  return (
    <>
      <rect width={width} height={height} fill="transparent" stroke="none" rx="4" />
      {showFrame ? (
        <rect
          x={pad}
          y={pad}
          width={width - 2 * pad}
          height={height - 2 * pad}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          rx={3}
          pointerEvents="none"
        />
      ) : null}
      <g pointerEvents="none">
        <line
          x1={cx}
          y1={stemTop}
          x2={cx}
          y2={stemBot}
          stroke={strokeColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <line
          x1={cx - w1}
          y1={y1}
          x2={cx + w1}
          y2={y1}
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={cx - w2}
          y1={y2}
          x2={cx + w2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={cx - w3}
          y1={y3}
          x2={cx + w3}
          y2={y3}
          stroke={strokeColor}
          strokeWidth={2}
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
          {...fittedLineAttrs(maxW, squeezeText)}
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
            {...fittedLineAttrs(maxW, squeezeText)}
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
            {...fittedLineAttrs(maxW, squeezeText)}
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
              {...fittedLineAttrs(maxW, squeezeText)}
            >
              {secondaryLabel}
            </text>
          ) : null}
        </>
      )}
    </>
  );
}

export default SchematicEarthBreaker;
