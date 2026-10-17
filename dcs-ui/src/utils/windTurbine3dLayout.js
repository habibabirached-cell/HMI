/** Canvas type id for the 3D wind field / turbine preview block. */
export const WIND_TURBINE_3D_TYPE = 'wind-turbine-3d';

export const WT3D_TITLE_MARGIN = 2;
export const WT3D_TITLE_BASE_FONT = 11;
export const WT3D_MW_BASE_FONT = 10;

/** Full-block 3D viewport; title/MW are HTML overlays on top of the viewer. */
export function getWindTurbine3DLayout(
  blockWidth,
  blockHeight,
  titleFontPx = WT3D_TITLE_BASE_FONT,
  mwFontPx = WT3D_MW_BASE_FONT,
) {
  const m = WT3D_TITLE_MARGIN;
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

export function getWindTurbine3DModelUrl(visualConfigOrComponent) {
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
  return `${process.env.PUBLIC_URL || ''}/models/windTurbineField.glb`;
}
