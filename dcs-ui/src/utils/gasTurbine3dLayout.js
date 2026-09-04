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

export function getGasTurbine3DModelUrl(visualConfigOrComponent) {
  const raw =
    visualConfigOrComponent?.model3dUrl ??
    visualConfigOrComponent?.visualOverrides?.model3dUrl ??
    visualConfigOrComponent?.properties?.model3dUrl;
  if (raw && typeof raw === 'string') {
    const url = raw.trim();
    if (url.startsWith('/')) {
      return `${process.env.PUBLIC_URL || ''}${url}`;
    }
    return url;
  }
  return `${process.env.PUBLIC_URL || ''}/models/gasT3.glb`;
}

/** Ideum touch-table turbine button — optional per-component GLB override. */
export function getIdeumTurbineModelUrl(component) {
  return getGasTurbine3DModelUrl(component);
}

/** Y-axis turntable only (no shaft roll) — for SynCom-style previews. */
export function getIdeumTurbineTurntableOnly(component) {
  const flag =
    component?.visualOverrides?.model3dTurntableOnly ??
    component?.properties?.model3dTurntableOnly;
  if (flag === true || flag === 'true' || flag === 1) return true;
  return /7HA\.glb/i.test(getGasTurbine3DModelUrl(component));
}

/** Static studio lighting — cheaper than animated accent lights (large GLBs). */
export function getGasTurbine3DNeutralLighting(component) {
  const flag =
    component?.visualOverrides?.model3dNeutralLighting ??
    component?.properties?.model3dNeutralLighting;
  if (flag === true || flag === 'true' || flag === 1) return true;
  return /7HA\.glb/i.test(getGasTurbine3DModelUrl(component));
}
