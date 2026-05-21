import React from 'react';

/**
 * SVG attributes for horizontal squeeze (#4). Omits attrs when inactive.
 */
export function fittedLineAttrs(maxWidthPx, squeezeEnabled) {
  if (!squeezeEnabled || maxWidthPx == null || maxWidthPx <= 0) return {};
  return {
    textLength: maxWidthPx,
    lengthAdjust: 'spacingAndGlyphs',
  };
}

/**
 * Optional `<title>` for progressive disclosure (#5).
 */
export function SvgHoverTitle({ children }) {
  if (children == null || children === '') return null;
  return <title>{children}</title>;
}
