import React from 'react';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import { SvgHoverTitle } from './canvasSvgLabelHelpers';

/**
 * Title outside the block with a short leader + arrow toward the equipment.
 */
export default function ExternalPrimaryLabel({
  width,
  height,
  centerX,
  text,
  placement,
  fontPxDelta = 0,
  tooltip = null,
}) {
  if (!text) return null;

  const fs = adjSvgFontPx(text.length > 22 ? 9.5 : 11, fontPxDelta);
  const gap = 12 + Math.max(0, fontPxDelta) * 0.35;
  const cx = centerX ?? width / 2;
  const stroke = 'rgba(168, 198, 196, 0.72)';
  const fill = 'rgba(232, 240, 239, 0.96)';
  const arrowW = 4.5;

  if (placement === 'below') {
    const boxEdgeY = height;
    const textY = boxEdgeY + gap;
    const leaderTop = boxEdgeY + 1.5;
    const leaderBot = textY - fs * 0.35;
    return (
      <g className="canvas-external-primary-label" pointerEvents="none">
        <line
          x1={cx}
          y1={leaderTop}
          x2={cx}
          y2={leaderBot}
          stroke={stroke}
          strokeWidth={1.15}
          strokeLinecap="round"
        />
        <polygon
          points={`${cx},${leaderTop} ${cx - arrowW},${leaderTop + arrowW * 1.35} ${cx + arrowW},${leaderTop + arrowW * 1.35}`}
          fill={stroke}
        />
        <text
          x={cx}
          y={textY}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill={fill}
          fontSize={fs}
          fontWeight="600"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letterSpacing="0.02em"
        >
          {tooltip ? <SvgHoverTitle>{tooltip}</SvgHoverTitle> : null}
          {text}
        </text>
      </g>
    );
  }

  const boxEdgeY = 0;
  const textBaselineY = boxEdgeY - gap;
  const leaderTop = textBaselineY + fs * 0.25;
  const leaderBot = boxEdgeY - 1.5;
  return (
    <g className="canvas-external-primary-label" pointerEvents="none">
      <text
        x={cx}
        y={textBaselineY}
        textAnchor="middle"
        dominantBaseline="auto"
        fill={fill}
        fontSize={fs}
        fontWeight="600"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        letterSpacing="0.02em"
      >
        {tooltip ? <SvgHoverTitle>{tooltip}</SvgHoverTitle> : null}
        {text}
      </text>
      <line
        x1={cx}
        y1={leaderTop}
        x2={cx}
        y2={leaderBot}
        stroke={stroke}
        strokeWidth={1.15}
        strokeLinecap="round"
      />
      <polygon
        points={`${cx},${leaderBot} ${cx - arrowW},${leaderBot - arrowW * 1.35} ${cx + arrowW},${leaderBot - arrowW * 1.35}`}
        fill={stroke}
      />
    </g>
  );
}
