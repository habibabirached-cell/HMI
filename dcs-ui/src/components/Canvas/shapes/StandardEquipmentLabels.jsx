import React from 'react';
import { useFontPxDelta } from '../../../contexts/FontScaleContext';
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
  const fontPxDelta = useFontPxDelta();
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
