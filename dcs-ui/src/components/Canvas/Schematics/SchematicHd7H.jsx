import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import { getCanvasLabelFlags } from '../../../utils/canvasLabelPolicy';
import { SvgHoverTitle } from '../shapes/canvasSvgLabelHelpers';

const PAD_TOP = 4;
const PAD_BOT = 4;
const TITLE_BELOW_GAP = 4;

const HD_ORANGE = '#ff9500';
const HD_ORANGE_BRIGHT = '#ffc040';
const HD_ORANGE_GLOW = '#ff6600';
const HD_CARD_FILL = '#140a04';
/** Line-art scale vs Aero (same card size — art fills more of the tile). */
const HD_ART_SCALE = 1.7;

/**
 * Heavy-duty 7H/7HA thumbnail — cloned from LM2500 Andritz layout, mirrored orange line-art.
 */
function SchematicHd7H({
  width,
  height,
  primaryLabel,
  mwLabel,
  textureHref,
  textureOpacity = 1,
  strokeColor,
  strokeWidthVal,
  glowFilterId = 'hd7h-glow',
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const { hideSupplementary } = getCanvasLabelFlags(fontPxDelta);
  const fsP = adjSvgFontPx(13, fontPxDelta);
  const fsMw = adjSvgFontPx(11, fontPxDelta);
  const fullTooltip = [primaryLabel, mwLabel].filter(Boolean).join(' · ');
  const cx = width / 2;
  const textureUrl =
    textureHref != null && textureHref !== ''
      ? `${process.env.PUBLIC_URL || ''}${textureHref}`
      : null;

  const titleRowH = 14;
  const artY = PAD_TOP + titleRowH + TITLE_BELOW_GAP;
  const bottomTextH = 14;
  const artH = Math.max(26, height - artY - bottomTextH - PAD_BOT);
  const borderStroke = strokeColor || HD_ORANGE;
  const borderW = Math.max(strokeWidthVal || 0, 2.25);

  return (
    <>
      <defs>
        <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.35  0 0.55 0 0 0.12  0 0 0.15 0 0  0 0 0 0.85 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={width} height={height} fill={HD_CARD_FILL} rx="4" />
      <rect
        x={1.5}
        y={1.5}
        width={width - 3}
        height={height - 3}
        fill="none"
        stroke={HD_ORANGE_GLOW}
        strokeWidth={1}
        rx="3"
        opacity={0.35}
        pointerEvents="none"
      />
      {textureUrl ? (
        <image
          href={textureUrl}
          x={(width - width * HD_ART_SCALE) / 2}
          y={artY + (artH - artH * HD_ART_SCALE) / 2}
          width={width * HD_ART_SCALE}
          height={artH * HD_ART_SCALE}
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
        fill={HD_ORANGE_BRIGHT}
        fontSize={fsP}
        fontWeight="800"
        filter={`url(#${glowFilterId})`}
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
          fill={HD_ORANGE}
          fontSize={fsMw}
          fontWeight="700"
          filter={`url(#${glowFilterId})`}
          pointerEvents="none"
        >
          {mwLabel}
        </text>
      ) : null}
      <rect
        width={width}
        height={height}
        fill="none"
        stroke={borderStroke}
        strokeWidth={borderW}
        rx="4"
        filter={`url(#${glowFilterId})`}
      />
    </>
  );
}

export default SchematicHd7H;
