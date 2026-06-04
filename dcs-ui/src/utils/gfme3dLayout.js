/** Collapse-tile GFMe STATCOM blocks that use the g2x2 GLTF preview. */
export const GFME_STATCOM_TYPE = 'gfme-statcom';

export const GFME3D_TITLE_MARGIN = 2;
export const GFME3D_TITLE_BASE_FONT = 11;
export const GFME3D_SUBTITLE_BASE_FONT = 10;

/** Full-block 3D viewport; title/subtitle are HTML overlays on top of the viewer. */
export function getGFMe3DLayout(
  blockWidth,
  blockHeight,
  titleFontPx = GFME3D_TITLE_BASE_FONT,
  subtitleFontPx = GFME3D_SUBTITLE_BASE_FONT,
) {
  const m = GFME3D_TITLE_MARGIN;
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

export function getGFMe3DModelUrl() {
  return `${process.env.PUBLIC_URL || ''}/models/gfme/g2x2.gltf`;
}
