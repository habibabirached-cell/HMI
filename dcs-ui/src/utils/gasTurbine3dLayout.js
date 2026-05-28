/** Canvas type id for the 3D GLB gas turbine block. */
export const GAS_TURBINE_3D_TYPE = 'gas-turbine-3d';

/** Grid cell size in Canvas.jsx — 10×5 blocks = 500×250 px. */
export const GT3D_GRID_CELL = 50;

export const GT3D_TITLE_MARGIN = 2;
export const GT3D_TITLE_BASE_FONT = 11;
export const GT3D_MW_BASE_FONT = 10;

/** Full-block 3D viewport; title/MW are HTML overlays on top of the viewer. */
export function getGasTurbine3DLayout(
  blockWidth,
  blockHeight,
  titleFontPx = GT3D_TITLE_BASE_FONT,
  mwFontPx = GT3D_MW_BASE_FONT,
) {
  const m = GT3D_TITLE_MARGIN;
  return {
    viewerY: 0,
    viewerH: blockHeight,
    blockWidth,
    blockHeight,
    titleFontPx,
    mwFontPx,
    titleMargin: m,
    bottomTextH: mwFontPx + m * 2,
  };
}

/** @deprecated use getGasTurbine3DLayout */
export function getGasTurbine3DArtRegion(blockWidth, blockHeight, titleFontPx, mwFontPx) {
  const layout = getGasTurbine3DLayout(blockWidth, blockHeight, titleFontPx, mwFontPx);
  return {
    artY: layout.viewerY,
    artH: layout.viewerH,
    titleRowH: layout.titleFontPx + layout.titleMargin * 2,
    bottomTextH: layout.bottomTextH,
    titleMargin: layout.titleMargin,
  };
}

export function getGasTurbine3DModelUrl() {
  return `${process.env.PUBLIC_URL || ''}/models/gasT3.glb`;
}
