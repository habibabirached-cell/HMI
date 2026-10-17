/**
 * Canvas diagram label policy vs `canvasFontPxShift` (diagram font +/−).
 *
 * - **#5 progressive disclosure**: drop supplementary lines so primaries stay readable.
 */

/** From this delta upward, hide “secondary” rows (ratings, MW, ratio, CT ratio, etc.). */
export const CANVAS_LABEL_DELTA_HIDE_SUPPLEMENTARY_AT = 7;

/**
 * @param {number} canvasFontPxDelta
 * @returns {{ hideSupplementary: boolean }}
 */
export function getCanvasLabelFlags(canvasFontPxDelta) {
  const d = Number(canvasFontPxDelta) || 0;
  return {
    hideSupplementary: d >= CANVAS_LABEL_DELTA_HIDE_SUPPLEMENTARY_AT,
  };
}

/** External title mode: keep rating / kV / MVA rows inside the symbol even at large diagram font +. */
export function shouldHideSupplementaryLabels(canvasFontPxDelta, visualConfig) {
  if (visualConfig?.forceInlinePropertyLabel) return false;
  return getCanvasLabelFlags(canvasFontPxDelta).hideSupplementary;
}

/**
 * Minimum air gap (px, SVG user space) between schematic text and the symbol stroke.
 * Increases with diagram font +delta so labels “push out” at +6 / +7 instead of colliding.
 */
export function diagramSymbolLabelGap(canvasFontPxDelta) {
  const d = Math.max(0, Number(canvasFontPxDelta) || 0);
  return 6 + d * 1.05 + (d >= 6 ? (d - 5) * 0.55 : 0);
}
