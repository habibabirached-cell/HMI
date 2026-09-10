import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IdeumRemoteMouseClient, resolveMaingearMouseWebSocketUrl } from '../../utils/ideumRemoteMouse';
import './IdeumRemoteControlOverlay.css';

/**
 * Full-screen Ideum wall-control mode after Grid Connected.
 * Left: Back | Center: trackpad | Bottom: Click
 */
export default function IdeumRemoteControlOverlay({
  machineRole,
  onBack,
}) {
  const trackpadRef = useRef(null);
  const clientRef = useRef(null);
  const boundsRef = useRef({ left: 0, top: 0, width: 1920, height: 1080 });
  const activePointerRef = useRef(null);
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

  const mapTouchToDesktop = useCallback((clientX, clientY) => {
    const el = trackpadRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;

    const b = boundsRef.current;
    return {
      x: b.left + nx * b.width,
      y: b.top + ny * b.height,
    };
  }, []);

  const onTrackpadPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerRef.current = e.pointerId;
    const pos = mapTouchToDesktop(e.clientX, e.clientY);
    if (pos) {
      clientRef.current?.sendMoveAbsolute(pos.x, pos.y);
      moveCountRef.current += 1;
    }
  }, [mapTouchToDesktop]);

  const onTrackpadPointerMove = useCallback((e) => {
    if (activePointerRef.current !== e.pointerId) return;
    e.preventDefault();
    const pos = mapTouchToDesktop(e.clientX, e.clientY);
    if (pos) {
      clientRef.current?.sendMoveAbsolute(pos.x, pos.y);
      moveCountRef.current += 1;
      if (moveCountRef.current % 8 === 0) {
        setStatusDetail(`${resolveMaingearMouseWebSocketUrl(machineRole)} · moves ${moveCountRef.current}`);
      }
    }
  }, [mapTouchToDesktop, machineRole]);

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
          aria-label="Trackpad — move Maingear mouse"
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
