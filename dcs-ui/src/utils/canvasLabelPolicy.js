/**
 * Canvas diagram label policy vs `canvasFontPxShift` (diagram font +/−).
 *
 * - **#4 squeeze**: use SVG `textLength` + `spacingAndGlyphs` when delta is high (large type).
 * - **#5 progressive disclosure**: drop supplementary lines so primaries stay readable.
 */

/** From this delta upward, apply textLength squeeze on schematic labels. */
export const CANVAS_LABEL_DELTA_SQUEEZE_AT = 3;

/** From this delta upward, hide “secondary” rows (ratings, MW, ratio, CT ratio, etc.). */
export const CANVAS_LABEL_DELTA_HIDE_SUPPLEMENTARY_AT = 7;

/**
 * @param {number} canvasFontPxDelta
 * @returns {{ squeezeText: boolean, hideSupplementary: boolean }}
 */
export function getCanvasLabelFlags(canvasFontPxDelta) {
  const d = Number(canvasFontPxDelta) || 0;
  return {
    squeezeText: d >= CANVAS_LABEL_DELTA_SQUEEZE_AT,
    hideSupplementary: d >= CANVAS_LABEL_DELTA_HIDE_SUPPLEMENTARY_AT,
  };
}

/**
 * Minimum air gap (px, SVG user space) between schematic text and the symbol stroke.
 * Increases with diagram font +delta so labels “push out” at +6 / +7 instead of colliding.
 */
export function diagramSymbolLabelGap(canvasFontPxDelta) {
  const d = Math.max(0, Number(canvasFontPxDelta) || 0);
  return 6 + d * 1.05 + (d >= 6 ? (d - 5) * 0.55 : 0);
}

/**
 * Optional: shorten very long primary names before squeeze (keeps glyph count sane).
 * Tooltip / `<title>` should still carry the full string.
 */
export function abbreviateLabelPrimary(text, maxChars = 22) {
  const s = text == null ? '' : String(text);
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(0, maxChars - 1))}…`;
}
