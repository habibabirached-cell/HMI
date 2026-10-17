import React from 'react';

/**
 * Wind block shell: background + accent rails + status stroke.
 * 3D, title, and MW label live in WindTurbine3DOverlays (HTML layer).
 */
function SchematicWindTurbine3D({
  width,
  height,
  strokeColor,
  strokeWidthVal,
  placeholderOnly = false,
  glowFilterId = 'wind-turbine-3d-glow',
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

export default SchematicWindTurbine3D;
