import React from 'react';

/**
 * Gas Turbine block shell: background + accent rails + status stroke.
 * 3D, title (hollow over viewer), and MW label live in GasTurbine3DOverlays (HTML layer).
 */
function SchematicGasTurbine3D({
  width,
  height,
  strokeColor,
  strokeWidthVal,
  glowFilterId = 'gas-turbine-3d-glow',
}) {
  const accentStroke = 'rgba(88, 160, 255, 0.55)';

  return (
    <>
      <defs>
        <filter
          id={glowFilterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={width} height={height} fill="#0d1117" rx="4" />
      <line
        x1={0}
        y1={0.5}
        x2={width}
        y2={0.5}
        stroke={accentStroke}
        strokeWidth={1.2}
        opacity="0.45"
        filter={`url(#${glowFilterId})`}
        pointerEvents="none"
      />
      <line
        x1={0}
        y1={height - 0.5}
        x2={width}
        y2={height - 0.5}
        stroke={accentStroke}
        strokeWidth={1.2}
        opacity="0.45"
        filter={`url(#${glowFilterId})`}
        pointerEvents="none"
      />
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

export default SchematicGasTurbine3D;
