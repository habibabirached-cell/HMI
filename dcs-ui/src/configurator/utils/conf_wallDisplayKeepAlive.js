import { useEffect } from 'react';

/**
 * Request Screen Wake Lock while the wall display tab is visible.
 * Helps prevent browser-level dimming; pair with backend display_keepalive for OLED panels.
 */
export function useWallDisplayKeepAlive(enabled) {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return undefined;
    }

    let wakeLock = null;
    let cancelled = false;

    const release = async () => {
      if (!wakeLock) return;
      try {
        await wakeLock.release();
      } catch (_) {
        /* already released */
      }
      wakeLock = null;
    };

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (wakeLock) return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      } catch (_) {
        /* blocked by policy or unsupported context */
      }
    };

    acquire();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      } else {
        release();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      release();
    };
  }, [enabled]);
}
