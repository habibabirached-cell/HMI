/** conf3: bottom-row (chart3 + chart4) share of the 2×2 grid height (%). */

export const QUAD_BOTTOM_ROW_SHARE_DEFAULT = 50;
export const QUAD_BOTTOM_ROW_SHARE_MIN = 25;
export const QUAD_BOTTOM_ROW_SHARE_MAX = 75;
export const QUAD_BOTTOM_ROW_SHARE_STEP = 0.5;

export function clampQuadBottomRowShare(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return QUAD_BOTTOM_ROW_SHARE_DEFAULT;
  const clamped = Math.min(
    QUAD_BOTTOM_ROW_SHARE_MAX,
    Math.max(QUAD_BOTTOM_ROW_SHARE_MIN, n),
  );
  const stepped =
    Math.round(clamped / QUAD_BOTTOM_ROW_SHARE_STEP) * QUAD_BOTTOM_ROW_SHARE_STEP;
  return Math.min(
    QUAD_BOTTOM_ROW_SHARE_MAX,
    Math.max(QUAD_BOTTOM_ROW_SHARE_MIN, stepped),
  );
}

export function quadGridRowStyleFromShare(share) {
  const bottom = clampQuadBottomRowShare(share);
  const top = 100 - bottom;
  return { gridTemplateRows: `${top}fr ${bottom}fr` };
}
