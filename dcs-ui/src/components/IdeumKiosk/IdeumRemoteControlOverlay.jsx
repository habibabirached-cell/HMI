import React, { useCallback, useEffect, useRef } from 'react';
import './IdeumRemoteControlOverlay.css';

/** Multiplier on finger delta before mapping to Maingear desktop bounds. */
const TRACKPAD_SENSITIVITY = 2;

/** Maingear wall trackpad — relative touch move + click over WebSocket :8767. */
export default function IdeumRemoteControlOverlay({
  mouseClientRef = null,
  onBack,
}) {
  const trackpadRef = useRef(null);
  const fingerDotRef = useRef(null);
  const boundsRef = useRef({ left: 0, top: 0, width: 1920, height: 1080 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const touchActiveRef = useRef(false);
  const lastSampleRef = useRef({ x: NaN, y: NaN, t: 0 });

  const paintFinger = useCallback((clientX, clientY) => {
    const el = trackpadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const dot = fingerDotRef.current;
    if (dot) {
      dot.style.display = 'block';
      dot.style.transform = `translate(${localX}px, ${localY}px)`;
    }
  }, []);

  const hideFinger = useCallback(() => {
    if (fingerDotRef.current) {
      fingerDotRef.current.style.display = 'none';
    }
  }, []);

  const getClient = useCallback(() => {
    const client = mouseClientRef?.current;
    if (client?.ws?.readyState === WebSocket.OPEN) {
      if (client.bounds?.width) {
        boundsRef.current = client.bounds;
      }
      return client;
    }
    return null;
  }, [mouseClientRef]);

  const pointerScale = useCallback(() => {
    const el = trackpadRef.current;
    if (!el) return { scaleX: 1, scaleY: 1 };
    const rect = el.getBoundingClientRect();
    const b = boundsRef.current;
    if (rect.width <= 0 || rect.height <= 0) {
      return { scaleX: 1, scaleY: 1 };
    }
    return {
      scaleX: b.width / rect.width,
      scaleY: b.height / rect.height,
    };
  }, []);

  const applyDelta = useCallback((clientX, clientY) => {
    paintFinger(clientX, clientY);

    const now = performance.now();
    const ls = lastSampleRef.current;
    if (ls.x === clientX && ls.y === clientY && now - ls.t < 8) {
      return;
    }
    ls.x = clientX;
    ls.y = clientY;
    ls.t = now;

    const dx = clientX - lastTouchRef.current.x;
    const dy = clientY - lastTouchRef.current.y;
    lastTouchRef.current = { x: clientX, y: clientY };

    if (dx === 0 && dy === 0) return;

    const { scaleX, scaleY } = pointerScale();
    getClient()?.sendMoveRelative(
      Math.round(dx * scaleX * TRACKPAD_SENSITIVITY),
      Math.round(dy * scaleY * TRACKPAD_SENSITIVITY),
    );
  }, [getClient, pointerScale, paintFinger]);

  useEffect(() => {
    const el = trackpadRef.current;
    if (!el) return undefined;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      touchActiveRef.current = true;
      const t = e.touches[0];
      lastTouchRef.current = { x: t.clientX, y: t.clientY };
      paintFinger(t.clientX, t.clientY);
    };

    const onTouchMove = (e) => {
      if (!touchActiveRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      paintFinger(t.clientX, t.clientY);
      applyDelta(t.clientX, t.clientY);
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        touchActiveRef.current = false;
        hideFinger();
        getClient()?.flushMoves();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [applyDelta, getClient, hideFinger, paintFinger]);

  const onTrackpadPointerDown = useCallback((e) => {
    e.preventDefault();
    touchActiveRef.current = true;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    paintFinger(e.clientX, e.clientY);
  }, [paintFinger]);

  const onTrackpadPointerMove = useCallback((e) => {
    if (!touchActiveRef.current) return;
    e.preventDefault();
    paintFinger(e.clientX, e.clientY);
    const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    for (const sample of samples) {
      applyDelta(sample.clientX, sample.clientY);
    }
  }, [applyDelta, paintFinger]);

  const onTrackpadPointerUp = useCallback(() => {
    touchActiveRef.current = false;
    hideFinger();
    getClient()?.flushMoves();
  }, [getClient, hideFinger]);

  const onClickButton = useCallback((e) => {
    e.preventDefault();
    getClient()?.sendClick();
  }, [getClient]);

  const onBackClick = useCallback((e) => {
    e.preventDefault();
    onBack?.();
  }, [onBack]);

  return (
    <div className="ideum-remote-control" role="dialog" aria-label="Maingear wall control">
      <div className="ideum-remote-control__sidebar">
        <button
          type="button"
          className="ideum-remote-control__back"
          onClick={onBackClick}
        >
          Back
        </button>
      </div>

      <div className="ideum-remote-control__main">
        <div
          ref={trackpadRef}
          className="ideum-remote-control__trackpad"
          onPointerDown={onTrackpadPointerDown}
          onPointerMove={onTrackpadPointerMove}
          onPointerUp={onTrackpadPointerUp}
          onPointerCancel={onTrackpadPointerUp}
          role="application"
          aria-label="Trackpad — relative move (Maingear mouse)"
        >
          <div ref={fingerDotRef} className="ideum-remote-control__finger-dot" aria-hidden />
        </div>

        <button
          type="button"
          className="ideum-remote-control__click"
          onClick={onClickButton}
        >
          Click
        </button>
      </div>
    </div>
  );
}
