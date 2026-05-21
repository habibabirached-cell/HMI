/** Apply global toolbar font shift to SVG `fontSize` (px). Keeps labels readable. */
export function adjSvgFontPx(basePx, delta) {
  const b = Number(basePx);
  const d = Number(delta) || 0;
  if (!Number.isFinite(b)) return 7;
  return Math.max(6, Math.round(b + d));
}
