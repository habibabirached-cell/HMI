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
  placeholderOnly = false,
  glowFilterId = 'gas-turbine-3d-glow',
}) {
  if (placeholderOnly) {
    return (
      <rect
        width={width}
        height={height}
        fill="#141414"
        stroke="#555"
        strokeWidth={2}
        strokeDasharray="12 8"
        rx="6"
      />
    );
  }

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
