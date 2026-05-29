import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import { getCanvasLabelFlags } from '../../../utils/canvasLabelPolicy';
import { SvgHoverTitle } from '../shapes/canvasSvgLabelHelpers';

const PAD_TOP = 4;
const PAD_BOT = 4;
const TITLE_BELOW_GAP = 4;

/**
 * LM2500 Andritz (and similar line-art turbines): dark card, title, centered texture, MW line, status stroke.
 * Mirrors the old framed-texture path in CanvasBlock, but lives under Schematics/ for consistency with GSU / BESS xfmr.
 */
function SchematicLm2500Andritz({
  width,
  height,
  primaryLabel,
  mwLabel,
  textureHref,
  textureOpacity = 0.88,
  strokeColor,
  strokeWidthVal,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const { hideSupplementary } = getCanvasLabelFlags(fontPxDelta);
  const fsP = adjSvgFontPx(11, fontPxDelta);
  const fsMw = adjSvgFontPx(10, fontPxDelta);
  const maxW = width * 0.92;
  const fullTooltip = [primaryLabel, mwLabel].filter(Boolean).join(' · ');
  const cx = width / 2;
  const textureUrl =
    textureHref != null && textureHref !== ''
      ? `${process.env.PUBLIC_URL || ''}${textureHref}`
      : null;

  const titleRowH = 12;
  const artY = PAD_TOP + titleRowH + TITLE_BELOW_GAP;
  const bottomTextH = 12;
  const artH = Math.max(26, height - artY - bottomTextH - PAD_BOT);

  return (
    <>
      <rect width={width} height={height} fill="#000000" rx="4" />
      {textureUrl ? (
        <image
          href={textureUrl}
          x={0}
          y={artY}
          width={width}
          height={artH}
          preserveAspectRatio="xMidYMid meet"
          opacity={textureOpacity}
          pointerEvents="none"
        />
      ) : null}
      <text
        x={cx}
        y={PAD_TOP}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#e0e0e0"
        fontSize={fsP}
        fontWeight="600"
        pointerEvents="none"
      >
        {hideSupplementary && mwLabel ? (
          <SvgHoverTitle>{fullTooltip}</SvgHoverTitle>
        ) : null}
        {primaryLabel}
      </text>
      {!hideSupplementary && mwLabel ? (
        <text
          x={cx}
          y={height - PAD_BOT}
          textAnchor="middle"
          dominantBaseline="auto"
          fill="#999"
          fontSize={fsMw}
          pointerEvents="none"
        >
          {mwLabel}
        </text>
      ) : null}
      <rect
        width={width}
        height={height}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidthVal}
        rx="4"
      />
    </>
  );
}

export default SchematicLm2500Andritz;
