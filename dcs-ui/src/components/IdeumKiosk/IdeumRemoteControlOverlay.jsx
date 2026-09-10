import React, { useCallback, useEffect, useRef } from 'react';
import './IdeumRemoteControlOverlay.css';

/**
 * Full-screen Ideum wall-control mode after Grid Connected.
 * Touch table: native touch events (touchmove) — pointermove is unreliable on Ideum glass.
 */
export default function IdeumRemoteControlOverlay({
  mouseClientRef = null,
  onBack,
}) {
  const trackpadRef = useRef(null);
  const boundsRef = useRef({ left: 0, top: 0, width: 1920, height: 1080 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const touchActiveRef = useRef(false);
  const moveCountRef = useRef(0);

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
    const client = getClient();
    if (!client) return;

    const dx = clientX - lastTouchRef.current.x;
    const dy = clientY - lastTouchRef.current.y;
    lastTouchRef.current = { x: clientX, y: clientY };

    if (dx === 0 && dy === 0) return;

    const { scaleX, scaleY } = pointerScale();
    client.sendMoveRelative(dx * scaleX, dy * scaleY, { immediate: true });
    moveCountRef.current += 1;
  }, [getClient, pointerScale]);

  useEffect(() => {
    const el = trackpadRef.current;
    if (!el) return undefined;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      touchActiveRef.current = true;
      const t = e.touches[0];
      lastTouchRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchMove = (e) => {
      if (!touchActiveRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      applyDelta(t.clientX, t.clientY);
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        touchActiveRef.current = false;
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
  }, [applyDelta, getClient]);

  const onTrackpadPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    touchActiveRef.current = true;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onTrackpadPointerMove = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    if (!touchActiveRef.current) return;
    e.preventDefault();
    const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    for (const sample of samples) {
      applyDelta(sample.clientX, sample.clientY);
    }
  }, [applyDelta]);

  const onTrackpadPointerUp = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    touchActiveRef.current = false;
    getClient()?.flushMoves();
  }, [getClient]);

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
      <button
        type="button"
        className="ideum-remote-control__back"
        onClick={onBackClick}
      >
        Back
      </button>

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
          <span className="ideum-remote-control__trackpad-label">Trackpad</span>
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
