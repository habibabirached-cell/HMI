/** Collapse-tile BESS blocks that use the Bess.c.glb preview. */
export const BESS_COLLAPSE_3D_TYPES = new Set([
  'bess',
  'bess-30mw',
  'bess-50mw',
  'mvups-3d',
]);

export const BESS3D_TITLE_MARGIN = 2;
export const BESS3D_TITLE_BASE_FONT = 11;
export const BESS3D_SUBTITLE_BASE_FONT = 10;

/** Full-block 3D viewport; title/subtitle are HTML overlays on top of the viewer. */
export function getBess3DLayout(
  blockWidth,
  blockHeight,
  titleFontPx = BESS3D_TITLE_BASE_FONT,
  subtitleFontPx = BESS3D_SUBTITLE_BASE_FONT,
) {
  const m = BESS3D_TITLE_MARGIN;
  return {
    viewerY: 0,
    viewerH: blockHeight,
    blockWidth,
    blockHeight,
    titleFontPx,
    subtitleFontPx,
    titleMargin: m,
    bottomTextH: subtitleFontPx + m * 2,
  };
}

export function getBess3DModelUrl(visualConfig) {
  if (visualConfig?.model3dUrl) {
    const url = visualConfig.model3dUrl;
    if (url.startsWith('/')) {
      return `${process.env.PUBLIC_URL || ''}${url}`;
    }
    return url;
  }
  return `${process.env.PUBLIC_URL || ''}/models/Bess.c.glb`;
}
