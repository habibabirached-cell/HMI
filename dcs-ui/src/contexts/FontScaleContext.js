import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'dcsGlobalFontPxShift';
export const GLOBAL_FONT_DELTA_MIN = -12;
export const GLOBAL_FONT_DELTA_MAX = 24;

function readStoredDelta() {
  if (typeof window === 'undefined') return 0;
  try {
    const n = Number.parseInt(window.localStorage.getItem(STORAGE_KEY), 10);
    if (!Number.isFinite(n)) return 0;
    return Math.min(GLOBAL_FONT_DELTA_MAX, Math.max(GLOBAL_FONT_DELTA_MIN, n));
  } catch {
    return 0;
  }
}

const FontScaleContext = createContext(null);

export function FontScaleProvider({ children }) {
  const [delta, setDelta] = useState(readStoredDelta);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--global-font-px-shift', `${delta}px`);
  }, [delta]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(delta));
    } catch {
      /* ignore */
    }
  }, [delta]);

  const bump = useCallback((dir) => {
    setDelta((d) =>
      Math.min(GLOBAL_FONT_DELTA_MAX, Math.max(GLOBAL_FONT_DELTA_MIN, d + dir)),
    );
  }, []);

  const value = useMemo(
    () => ({
      delta,
      increaseFont: () => bump(1),
      decreaseFont: () => bump(-1),
      canDecrease: delta > GLOBAL_FONT_DELTA_MIN,
      canIncrease: delta < GLOBAL_FONT_DELTA_MAX,
    }),
    [delta, bump],
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

/** Shallow consumer for canvas / Plotly (+1 px steps). Outside provider → 0. */
export function useFontPxDelta() {
  const v = useContext(FontScaleContext);
  return v?.delta ?? 0;
}

/** Toolbar (+/− buttons). Outside provider → no-op. */
export function useFontScaleToolbar() {
  const v = useContext(FontScaleContext);
  return (
    v ?? {
      delta: 0,
      increaseFont: () => {},
      decreaseFont: () => {},
      canDecrease: false,
      canIncrease: false,
    }
  );
}
