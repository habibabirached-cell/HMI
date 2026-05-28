import React from 'react';

/**
 * Full-cell line-art card: black fill, image, status border.
 */
export default function FramedTextureCard({
  width,
  height,
  textureUrl,
  textureOpacity = 0.88,
  strokeColor,
  strokeWidthVal,
  glowAccent = false,
  glowFilterId = 'texture-card-glow',
}) {
  if (!textureUrl) return null;
  const accentStroke = glowAccent ? 'rgba(46, 125, 125, 0.72)' : strokeColor;
  return (
    <>
      {glowAccent ? (
        <defs>
          <filter
            id={glowFilterId}
            x="-18%"
            y="-4%"
            width="136%"
            height="108%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      ) : null}
      <rect width={width} height={height} fill="#000000" rx="4" />
      <image
        href={textureUrl}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        opacity={textureOpacity}
        pointerEvents="none"
      />
      {glowAccent ? (
        <rect
          width={width}
          height={height}
          fill="none"
          stroke={accentStroke}
          strokeWidth={Math.max(1.2, strokeWidthVal * 1.35)}
          rx="4"
          opacity="0.42"
          filter={`url(#${glowFilterId})`}
          pointerEvents="none"
        />
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
