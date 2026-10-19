/** Min height for the bottom chart tray (px). */
export const CHART_PANEL_MIN_HEIGHT = 200;

/** Min width for the vertical chart dock beside the right “Controls” rail (px). */
export const CHART_PANEL_MIN_SIDE_WIDTH = 280;

/** Allow a wide strip but leave room for canvas + right rail. */
export function getChartPanelMaxSideWidthPx() {
  if (typeof window === 'undefined') return 900;
  return Math.floor(window.innerWidth * 0.55);
}

/** Open here when a layout configuration has never saved a drawer width. */
export const CHART_PANEL_DEFAULT_SIDE_FRACTION = 0.5;

export const CHART_DOCK_PRESETS = ['conf1', 'conf2', 'conf3', 'conf4', 'conf5'];

const CHART_DOCK_MAX_FRACTION = 0.55;

export function clampChartSideDockWidthPx(px) {
  const maxW = getChartPanelMaxSideWidthPx();
  const n = Number(px);
  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const fallback = Math.round(width * CHART_PANEL_DEFAULT_SIDE_FRACTION);
  if (!Number.isFinite(n)) {
    return Math.min(maxW, Math.max(CHART_PANEL_MIN_SIDE_WIDTH, fallback));
  }
  return Math.min(maxW, Math.max(CHART_PANEL_MIN_SIDE_WIDTH, Math.round(n)));
}

/** Keep only saved fractions for the five layout configurations. */
export function sanitizeChartDockFractions(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of CHART_DOCK_PRESETS) {
    const n = Number(raw[key]);
    if (Number.isFinite(n) && n > 0 && n <= CHART_DOCK_MAX_FRACTION + 0.001) {
      out[key] = Math.min(CHART_DOCK_MAX_FRACTION, n);
    }
  }
  return out;
}

/** Pixel width for one layout configuration. Missing entries open at half the screen. */
export function chartDockPxForPreset(fractions, preset) {
  const saved = fractions?.[preset];
  const frac = Number.isFinite(saved) && saved > 0
    ? saved
    : CHART_PANEL_DEFAULT_SIDE_FRACTION;
  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  return clampChartSideDockWidthPx(width * frac);
}

export function fractionForChartDockPx(px) {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  if (!width) return CHART_PANEL_DEFAULT_SIDE_FRACTION;
  return Math.min(CHART_DOCK_MAX_FRACTION, clampChartSideDockWidthPx(px) / width);
}

/** Fraction of viewport height the tray may use when resizing (user-requested ~90%). */
export const CHART_PANEL_MAX_HEIGHT_VIEWPORT = 0.9;

export function getChartPanelMaxHeightPx() {
  if (typeof window === 'undefined') return 800;
  return Math.floor(window.innerHeight * CHART_PANEL_MAX_HEIGHT_VIEWPORT);
}

/** Chart tray / plot surface opacity: 0 = fully transparent, 1 = opaque. */
export const CHART_PANEL_OPACITY_MIN = 0;
export const CHART_PANEL_OPACITY_MAX = 1;
export const CHART_PANEL_OPACITY_DEFAULT = 1;

export function clampChartPanelOpacity(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return CHART_PANEL_OPACITY_DEFAULT;
  return Math.min(
    CHART_PANEL_OPACITY_MAX,
    Math.max(CHART_PANEL_OPACITY_MIN, n),
  );
}
