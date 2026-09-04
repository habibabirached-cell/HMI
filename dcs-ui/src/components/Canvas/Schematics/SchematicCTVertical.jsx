import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import {
  getCanvasLabelFlags,
  diagramSymbolLabelGap,
} from '../../../utils/canvasLabelPolicy';
import { SvgHoverTitle } from '../shapes/canvasSvgLabelHelpers';

function buildVerticalZigzagPath(y0, wireX, amp, y1, steps = 6) {
  const span = y1 - y0;
  const seg = span / steps;
  let d = `M ${wireX} ${y0}`;
  for (let i = 1; i < steps; i += 1) {
    const y = y0 + seg * i;
    const x = wireX + (i % 2 === 0 ? amp : -amp);
    d += ` L ${x} ${y}`;
  }
  d += ` L ${wireX} ${y1}`;
  return d;
}

/**
 * Vertical current-transformer symbol: zigzag along a vertical conductor (bus drops).
 */
function SchematicCTVertical({
  width,
  height,
  strokeColor,
  zigzagColor,
  strokeWidthVal = 3,
  presentationOffline = false,
  primaryLabel,
  secondaryLabel,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const { hideSupplementary } = getCanvasLabelFlags(fontPxDelta);
  const fsP = adjSvgFontPx(11, fontPxDelta);
  const fsS = adjSvgFontPx(10, fontPxDelta);
  const fullTooltip = [primaryLabel, secondaryLabel].filter(Boolean).join(' · ');
  const cy = height / 2;
  const margin = Math.max(2, height * 0.08);
  const y0 = margin;
  const y1 = height - margin;
  const steps = 6;

  const zigzagStroke = presentationOffline ? strokeColor : zigzagColor || strokeColor;
  const zigzagW = presentationOffline ? Math.max(4, strokeWidthVal) : 3;
  const gap = diagramSymbolLabelGap(fontPxDelta);
  const ampNominal = Math.max(3, width * 0.09);

  const padLeft = 4;
  const padRight = 4;
  const wireX = width / 2;

  const zLeft0 = wireX - ampNominal - zigzagW / 2 - 1;
  const zRight0 = wireX + ampNominal + zigzagW / 2 + 1;

  const primaryX = Math.max(padLeft, zLeft0 - gap - fsP * 0.6);
  const secondaryX = Math.min(width - padRight, zRight0 + gap + fsS * 0.4);

  const wireXDraw = wireX;
  const ampDraw = ampNominal;
  const zigzagD = buildVerticalZigzagPath(y0, wireXDraw, ampDraw, y1, steps);

  return (
    <>
      <rect width={width} height={height} fill="transparent" stroke="none" rx="4" />
      <g pointerEvents="none">
        <line
          x1={wireXDraw}
          y1={0}
          x2={wireXDraw}
          y2={y0}
          stroke={zigzagStroke}
          strokeWidth={zigzagW}
          strokeLinecap="round"
        />
        <line
          x1={wireXDraw}
          y1={y1}
          x2={wireXDraw}
          y2={height}
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
      <text
        x={primaryX}
        y={cy}
        textAnchor="end"
        dominantBaseline="middle"
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
          x={secondaryX}
          y={cy}
          textAnchor="start"
          dominantBaseline="middle"
          fill="#999"
          fontSize={fsS}
          pointerEvents="none"
        >
          {secondaryLabel}
        </text>
      ) : null}
    </>
  );
}

export default SchematicCTVertical;
