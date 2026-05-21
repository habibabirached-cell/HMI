import React from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';

/**
 * Icon + primary + secondary lines for generic / framed-texture blocks.
 */
export default function StandardEquipmentLabels({
  width,
  height,
  centerX,
  visualConfig,
  canvasPrimaryText,
  canvasSecondaryText,
  framedTextureLayout,
}) {
  const fontPxDelta = useCanvasFontPxDelta();

  /** Tall narrow slots: rotate the title −90° (reads upward) so horizontal width is not overrun. */
  if (visualConfig.canvasPrimaryLabelVertical && !framedTextureLayout) {
    const vTitleFs = adjSvgFontPx(10.5, fontPxDelta);
    const vIconFs = adjSvgFontPx(20, fontPxDelta);
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
        <g transform={`translate(${centerX}, ${height * 0.55}) rotate(-90)`} pointerEvents="none">
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e0e0e0"
            fontSize={vTitleFs}
            fontWeight="600"
          >
            {canvasPrimaryText}
          </text>
        </g>
        {canvasSecondaryText ? (
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

  return (
    <>
      {!framedTextureLayout && (
        <text
          x={centerX}
          y={height * 0.28}
          textAnchor="middle"
          fill={visualConfig.color}
          fontSize={adjSvgFontPx(24, fontPxDelta)}
          fontWeight="400"
          pointerEvents="none"
          opacity="0.9"
        >
          {visualConfig.icon}
        </text>
      )}
      <text
        x={centerX}
        y={framedTextureLayout ? 4 : height * 0.52}
        textAnchor="middle"
        dominantBaseline={framedTextureLayout ? 'hanging' : 'auto'}
        fill="#e0e0e0"
        fontSize={adjSvgFontPx(11, fontPxDelta)}
        fontWeight="600"
        pointerEvents="none"
      >
        {canvasPrimaryText}
      </text>
      <text
        x={centerX}
        y={framedTextureLayout ? height - 4 : height * 0.68}
        textAnchor="middle"
        fill="#999"
        fontSize={adjSvgFontPx(10, fontPxDelta)}
        pointerEvents="none"
      >
        {canvasSecondaryText}
      </text>
    </>
  );
}
