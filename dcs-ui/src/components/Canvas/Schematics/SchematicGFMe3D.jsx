import React from 'react';

/**
 * GFMe collapse tile shell: dark fill + status stroke.
 * WebGL preview and title live in GFMe3DOverlays (HTML layer), same pattern as gas turbine 3D.
 */
function SchematicGFMe3D({
  width,
  height,
  strokeColor,
  strokeWidthVal,
  glowFilterId = 'gfme-3d-glow',
}) {
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

export default SchematicGFMe3D;
