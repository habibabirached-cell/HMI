import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';

export const FONT_PX_DELTA_MIN = -12;
export const FONT_PX_DELTA_MAX = 24;

/** Legacy single slider — migrated into both UI & canvas once if new keys absent. */
const STORAGE_LEGACY_FONT_KEY = 'dcsGlobalFontPxShift';
const STORAGE_UI_FONT_KEY = 'dcsUiFontPxShift';
const STORAGE_CANVAS_FONT_KEY = 'dcsCanvasFontPxShift';

export function clampFontPxShift(n) {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(FONT_PX_DELTA_MAX, Math.max(FONT_PX_DELTA_MIN, Math.round(x)));
}

/**
 * Bootstrap from localStorage (browser). Design load overwrites App state afterward.
 */
export function readStoredUiCanvasFontPxShifts() {
  if (typeof window === 'undefined') {
    return { ui: 0, canvas: 0 };
  }
  try {
    const uiRawStored = window.localStorage.getItem(STORAGE_UI_FONT_KEY);
    const canvasRawStored = window.localStorage.getItem(STORAGE_CANVAS_FONT_KEY);
    const hasUi = uiRawStored != null && uiRawStored !== '';
    const hasCanvas = canvasRawStored != null && canvasRawStored !== '';
    const uiParsed = clampFontPxShift(Number.parseInt(uiRawStored, 10));
    const canvasParsed = clampFontPxShift(Number.parseInt(canvasRawStored, 10));

    if (!hasUi && !hasCanvas) {
      const legacyRaw = window.localStorage.getItem(STORAGE_LEGACY_FONT_KEY);
      if (legacyRaw != null && legacyRaw !== '') {
        const leg = clampFontPxShift(Number.parseInt(legacyRaw, 10));
        return { ui: leg, canvas: leg };
      }
      return { ui: 0, canvas: 0 };
    }

    return {
      ui: hasUi ? uiParsed : 0,
      canvas: hasCanvas ? canvasParsed : 0,
    };
  } catch {
    return { ui: 0, canvas: 0 };
  }
}

const FontScaleContext = createContext(null);

export function FontScaleProvider({
  children,
  uiFontPxShift,
  canvasFontPxShift,
  setUiFontPxShift,
  setCanvasFontPxShift,
}) {
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--ui-font-px-shift', `${uiFontPxShift}px`);
  }, [uiFontPxShift]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_UI_FONT_KEY, String(uiFontPxShift));
      window.localStorage.setItem(STORAGE_CANVAS_FONT_KEY, String(canvasFontPxShift));
    } catch {
      /* ignore */
    }
  }, [uiFontPxShift, canvasFontPxShift]);

  const bumpUi = useCallback(
    (dir) => setUiFontPxShift((prev) => clampFontPxShift(prev + dir)),
    [setUiFontPxShift],
  );
  const bumpCanvas = useCallback(
    (dir) => setCanvasFontPxShift((prev) => clampFontPxShift(prev + dir)),
    [setCanvasFontPxShift],
  );

  const value = useMemo(
    () => ({
      uiDelta: uiFontPxShift,
      canvasDelta: canvasFontPxShift,
      increaseUiFont: () => bumpUi(1),
      decreaseUiFont: () => bumpUi(-1),
      increaseCanvasFont: () => bumpCanvas(1),
      decreaseCanvasFont: () => bumpCanvas(-1),
      canDecreaseUi: uiFontPxShift > FONT_PX_DELTA_MIN,
      canIncreaseUi: uiFontPxShift < FONT_PX_DELTA_MAX,
      canDecreaseCanvas: canvasFontPxShift > FONT_PX_DELTA_MIN,
      canIncreaseCanvas: canvasFontPxShift < FONT_PX_DELTA_MAX,
    }),
    [
      uiFontPxShift,
      canvasFontPxShift,
      bumpUi,
      bumpCanvas,
    ],
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

/** Diagram SVG labels (+1 px steps). Outside provider → 0. */
export function useCanvasFontPxDelta() {
  const v = useContext(FontScaleContext);
  return v?.canvasDelta ?? 0;
}

/** Panels / Plotly / CSS-driven chrome (+1 px steps). Outside provider → 0. */
export function useUiFontPxDelta() {
  const v = useContext(FontScaleContext);
  return v?.uiDelta ?? 0;
}

/** Toolbar dual +/−. Outside provider → no-op stubs. */
export function useFontScaleToolbar() {
  const v = useContext(FontScaleContext);
  return (
    v ?? {
      uiDelta: 0,
      canvasDelta: 0,
      increaseUiFont: () => {},
      decreaseUiFont: () => {},
      increaseCanvasFont: () => {},
      decreaseCanvasFont: () => {},
      canDecreaseUi: false,
      canIncreaseUi: false,
      canDecreaseCanvas: false,
      canIncreaseCanvas: false,
    }
  );
}
