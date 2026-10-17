import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import { shouldHideSupplementaryLabels } from '../../../utils/canvasLabelPolicy';
import { SvgHoverTitle } from '../shapes/canvasSvgLabelHelpers';
import { transformerVoltageRatioLabel } from './schematicUtils';

const LABEL_ART_GAP = 5;
const ART_MVA_GAP = 6;
/** Outline hugs content; not full symbol width/height */
const HUG_PAD_X = 6;
const HUG_PAD_TOP = 3;
const HUG_PAD_BOT = 4;

/**
 * Generator step-up: GSU label, voltage ratio, textured transformer art, MVA below.
 * Thin perimeter; labels spaced close to the art but not touching.
 */
function SchematicGSU({
  component,
  width,
  height,
  primaryLabel,
  mvaLabel,
  lineColor,
  textureHref,
  textureOpacity = 1,
  strokeColor = '#4caf50',
  strokeWidthVal = 3,
  presentationOffline = false,
  hidePrimaryLabel = false,
  forceInlinePropertyLabel = false,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const hideSupplementary = shouldHideSupplementaryLabels(fontPxDelta, {
    forceInlinePropertyLabel,
  });
  const fsP = adjSvgFontPx(11, fontPxDelta);
  const fsR = adjSvgFontPx(10, fontPxDelta);
  const fsM = adjSvgFontPx(10, fontPxDelta);
  const maxW = width * 0.92;
  const ratioDy = fsP * 1.12;
  const cx = width / 2;
  const voltageRatioLabel = transformerVoltageRatioLabel(component);
  const textureUrl =
    textureHref != null && textureHref !== ''
      ? `${process.env.PUBLIC_URL || ''}${textureHref}`
      : null;
  const artH = Math.max(32, height * 0.34);
  const primaryY = Math.max(7, height * 0.045);
  const topLabelBlockH = hidePrimaryLabel
    ? hideSupplementary
      ? 0
      : fsR * 1.15
    : fsP * 1.12 + (hideSupplementary ? 0 : fsR * 1.15);
  const artY = primaryY + topLabelBlockH + LABEL_ART_GAP;
  const artBottom = artY + artH;
  /** Baseline below art; ~8px cap height keeps a small visual gap from art bottom */
  const mvaY = Math.min(height - 6, artBottom + ART_MVA_GAP + 8);

  const fullTitle = [primaryLabel, voltageRatioLabel, mvaLabel]
    .filter(Boolean)
    .join(' · ');

  const artW = width * 0.84;
  const outlineW = Math.min(width - 2, artW + 2 * HUG_PAD_X);
  const outlineX = (width - outlineW) / 2;
  const outlineY = primaryY - HUG_PAD_TOP;
  const outlineBottom = hideSupplementary ? artBottom + HUG_PAD_BOT : mvaY + HUG_PAD_BOT;
  const outlineH = Math.max(1, outlineBottom - outlineY);
  const outlineRx = Math.min(4, outlineH / 2);

  return (
    <>
      <rect width={width} height={height} fill="transparent" stroke="none" rx="4" />
      {!hidePrimaryLabel || !hideSupplementary ? (
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
        <SvgHoverTitle>{fullTitle}</SvgHoverTitle>
        {!hidePrimaryLabel ? (
          <tspan x={cx} dy={0}>
            {primaryLabel}
          </tspan>
        ) : null}
        {!hideSupplementary ? (
          <tspan
            x={cx}
            dy={hidePrimaryLabel ? 0 : ratioDy}
            fill="#bdbdbd"
            fontSize={fsR}
            fontWeight="500"
          >
            {voltageRatioLabel}
          </tspan>
        ) : null}
      </text>
      ) : null}
      {textureUrl ? (
        <image
          href={textureUrl}
          x={cx - width * 0.42}
          y={artY}
          width={width * 0.84}
          height={artH}
          preserveAspectRatio="xMidYMid meet"
          opacity={textureOpacity}
          pointerEvents="none"
        />
      ) : (
        <g
          transform={`translate(${cx - width * 0.35}, ${artY}) scale(${(width * 0.7) / 120})`}
          pointerEvents="none"
        >
          <FallbackTransformerGraphic color={lineColor} />
        </g>
      )}
      {!hideSupplementary ? (
        <text
          x={cx}
          y={mvaY}
          textAnchor="middle"
          fill="#999"
          fontSize={fsM}
          pointerEvents="none"
        >
          {mvaLabel}
        </text>
      ) : null}
      <rect
        x={outlineX + 0.5}
        y={outlineY + 0.5}
        width={Math.max(1, outlineW - 1)}
        height={Math.max(1, outlineH - 1)}
        rx={outlineRx}
        fill="none"
        stroke={
          presentationOffline ? strokeColor : 'rgba(200, 200, 200, 0.32)'
        }
        strokeWidth={presentationOffline ? strokeWidthVal : 1}
        pointerEvents="none"
      />
    </>
  );
}

/** Inline fallback if texture URL missing — green strokes only. */
function FallbackTransformerGraphic({ color }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 100"
      width="120"
      height="100"
      fill="none"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 88h104" />
      <rect x="28" y="52" width="64" height="36" rx="2" />
      <line x1="36" y1="60" x2="50" y2="60" />
      <line x1="36" y1="68" x2="50" y2="68" />
      <line x1="36" y1="76" x2="50" y2="76" />
      <line x1="70" y1="60" x2="84" y2="60" />
      <line x1="70" y1="68" x2="84" y2="68" />
      <line x1="70" y1="76" x2="84" y2="76" />
      <circle cx="60" cy="68" r="10" />
      <path d="M56 65 L58 70 L60 64 L62 70 L64 65" />
      <line x1="38" y1="52" x2="38" y2="28" />
      <line x1="60" y1="52" x2="60" y2="24" />
      <line x1="82" y1="52" x2="82" y2="28" />
      <circle cx="38" cy="22" r="3.5" />
      <circle cx="60" cy="18" r="3.5" />
      <circle cx="82" cy="22" r="3.5" />
      <path d="M38 22 Q50 10 60 18 T82 22" />
    </svg>
  );
}

export default SchematicGSU;
