import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IdeumRemoteMouseClient, resolveMaingearMouseWebSocketUrl } from '../../utils/ideumRemoteMouse';
import './IdeumRemoteControlOverlay.css';

/**
 * Full-screen Ideum wall-control mode after Grid Connected.
 * Left: Back | Center: relative trackpad | Bottom: Click
 */
export default function IdeumRemoteControlOverlay({
  machineRole,
  onBack,
}) {
  const trackpadRef = useRef(null);
  const clientRef = useRef(null);
  const boundsRef = useRef({ left: 0, top: 0, width: 1920, height: 1080 });
  const activePointerRef = useRef(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [status, setStatus] = useState('connecting');
  const [statusDetail, setStatusDetail] = useState('');
  const moveCountRef = useRef(0);

  useEffect(() => {
    const url = resolveMaingearMouseWebSocketUrl(machineRole);
    setStatusDetail(url);
    const client = new IdeumRemoteMouseClient(url);
    clientRef.current = client;
    let cancelled = false;

    (async () => {
      try {
        const bounds = await client.connect();
        if (bounds?.width && bounds?.height) {
          boundsRef.current = bounds;
        }
        if (!cancelled) setStatus('connected');
      } catch (e) {
        console.warn('[ideum-mouse]', e);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      client.disconnect();
      clientRef.current = null;
    };
  }, [machineRole]);

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

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    if (dx === 0 && dy === 0) return;

    const { scaleX, scaleY } = pointerScale();
    clientRef.current?.sendMoveRelative(dx * scaleX, dy * scaleY);
    moveCountRef.current += 1;
    if (moveCountRef.current % 8 === 0) {
      setStatusDetail(`${resolveMaingearMouseWebSocketUrl(machineRole)} · moves ${moveCountRef.current}`);
    }
  }, [pointerScale, machineRole]);

  const onTrackpadPointerUp = useCallback((e) => {
    if (activePointerRef.current === e.pointerId) {
      activePointerRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onClickButton = useCallback((e) => {
    e.preventDefault();
    clientRef.current?.sendClick();
  }, []);

  return (
    <div className="ideum-remote-control" role="dialog" aria-label="Maingear wall control">
      <button
        type="button"
        className="ideum-remote-control__back"
        onClick={onBack}
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

        <p className={`ideum-remote-control__status ideum-remote-control__status--${status}`}>
          {status === 'connecting' && 'Connecting mouse bridge…'}
          {status === 'error' && 'Mouse bridge offline — on Maingear run debug\\debug-maingear-mouse-bridge.bat'}
          {status === 'connected' && 'Mouse bridge connected'}
          {statusDetail ? ` · ${statusDetail}` : ''}
        </p>
      </div>
    </div>
  );
}
