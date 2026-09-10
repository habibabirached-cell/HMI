import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'dcs-configurator-enable3d';

const Conf3dContext = createContext({
  enable3d: true,
  setEnable3d: () => {},
  toggle3d: () => {},
});

function readStoredEnable3d() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch (_) {
    /* sessionStorage unavailable */
  }
  return true;
}

export function Conf3dProvider({ children }) {
  const [enable3d, setEnable3dState] = useState(readStoredEnable3d);

  const setEnable3d = useCallback((next) => {
    setEnable3dState((prev) => {
      const value = typeof next === 'function' ? next(prev) : Boolean(next);
      try {
        sessionStorage.setItem(STORAGE_KEY, value ? '1' : '0');
      } catch (_) {
        /* ignore */
      }
      return value;
    });
  }, []);

  const toggle3d = useCallback(() => setEnable3d((v) => !v), [setEnable3d]);

  const value = useMemo(
    () => ({ enable3d, setEnable3d, toggle3d }),
    [enable3d, setEnable3d, toggle3d],
  );

  return (
    <Conf3dContext.Provider value={value}>
      {children}
    </Conf3dContext.Provider>
  );
}

export function useConf3d() {
  return useContext(Conf3dContext);
}
