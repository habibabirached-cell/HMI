import React, { useCallback, useRef } from 'react';
import './IdeumRemoteControlOverlay.css';

/**
 * Full-screen Ideum wall-control mode after Grid Connected.
 * Left: Back | Center: relative trackpad | Bottom: Click
 * Uses a pre-connected mouseClient from App when available.
 */
export default function IdeumRemoteControlOverlay({
  mouseClientRef = null,
  onBack,
}) {
  const trackpadRef = useRef(null);
  const boundsRef = useRef({ left: 0, top: 0, width: 1920, height: 1080 });
  const activePointerRef = useRef(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
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

  const onTrackpadPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerRef.current = e.pointerId;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onTrackpadPointerMove = useCallback((e) => {
    if (activePointerRef.current !== e.pointerId) return;
    e.preventDefault();

    const client = getClient();
    if (!client) return;

    const { scaleX, scaleY } = pointerScale();
    // Browser merges many touch samples into one event — coalesced list has the real path.
    const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    for (const sample of samples) {
      const dx = sample.clientX - lastPointerRef.current.x;
      const dy = sample.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: sample.clientX, y: sample.clientY };
      if (dx === 0 && dy === 0) continue;
      client.sendMoveRelative(dx * scaleX, dy * scaleY);
      moveCountRef.current += 1;
    }
  }, [pointerScale, getClient]);

  const onTrackpadPointerUp = useCallback((e) => {
    getClient()?.flushMoves();
    if (activePointerRef.current === e.pointerId) {
      activePointerRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
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
