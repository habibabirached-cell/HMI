import React from 'react';

/**
 * Optional `<title>` for progressive disclosure (#5).
 */
export function SvgHoverTitle({ children }) {
  if (children == null || children === '') return null;
  return <title>{children}</title>;
}
