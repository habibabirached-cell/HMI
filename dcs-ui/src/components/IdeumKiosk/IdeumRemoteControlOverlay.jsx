import React, { useCallback, useEffect, useRef, useState } from 'react';
import './IdeumRemoteControlOverlay.css';

/**
 * Debug overlay: red finger dot + TCP send toggle isolate glass vs WebSocket.
 */
export default function IdeumRemoteControlOverlay({
  mouseClientRef = null,
  onBack,
}) {
  const trackpadRef = useRef(null);
  const fingerDotRef = useRef(null);
  const fingerPosHudRef = useRef(null);
  const debugHudRef = useRef(null);
  const boundsRef = useRef({ left: 0, top: 0, width: 1920, height: 1080 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const touchActiveRef = useRef(false);
  const tcpSendPausedRef = useRef(false);
  const fingerTrackCountRef = useRef(0);
  const [tcpSendPaused, setTcpSendPaused] = useState(false);

  const statsRef = useRef({
    touchMoveEvents: 0,
    pointerMoveEvents: 0,
    sends: 0,
    lastSource: '—',
    lastDx: 0,
    lastDy: 0,
    lastScaledDx: 0,
    lastScaledDy: 0,
    lastAt: 0,
    wsSends: 0,
    pendingDx: 0,
    pendingDy: 0,
    recentLines: [],
  });
  const lastSampleRef = useRef({ x: NaN, y: NaN, t: 0 });

  /** Independent finger tracker — direct DOM, no React, no WebSocket. */
  const paintFinger = useCallback((clientX, clientY, source) => {
    const el = trackpadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    fingerTrackCountRef.current += 1;

    const dot = fingerDotRef.current;
    if (dot) {
      dot.style.display = 'block';
      dot.style.transform = `translate(${localX}px, ${localY}px)`;
    }

    const posHud = fingerPosHudRef.current;
    if (posHud) {
      posHud.textContent = `finger #${fingerTrackCountRef.current}  x ${Math.round(localX)}  y ${Math.round(localY)}  (${source})`;
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

  const paintDebugHud = useCallback(() => {
    const el = debugHudRef.current;
    if (!el) return;
    const s = statsRef.current;
    const ago = s.lastAt ? `${Date.now() - s.lastAt}ms ago` : 'never';
    const tcp = tcpSendPausedRef.current ? 'PAUSED (not sending)' : 'SENDING';
    el.textContent = [
      `tcp: ${tcp}`,
      `source: ${s.lastSource}  (${ago})`,
      `last raw dx,dy: ${s.lastDx} , ${s.lastDy}`,
      `last sent dx,dy: ${s.lastScaledDx} , ${s.lastScaledDy}`,
      `browser events ${s.sends}  (touch ${s.touchMoveEvents} ptr ${s.pointerMoveEvents})`,
      `ws pending ${s.pendingDx} , ${s.pendingDy}  |  ws sent ${s.wsSends}`,
      '— recent —',
      ...(s.recentLines.length ? s.recentLines : ['(no dx/dy yet)']),
    ].join('\n');
  }, []);

  const applyDelta = useCallback((clientX, clientY, source) => {
    paintFinger(clientX, clientY, source);

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

    const s = statsRef.current;
    s.lastSource = source;
    s.lastDx = Math.round(dx * 10) / 10;
    s.lastDy = Math.round(dy * 10) / 10;
    s.lastAt = Date.now();

    if (dx === 0 && dy === 0) {
      paintDebugHud();
      return;
    }

    const { scaleX, scaleY } = pointerScale();
    const scaledDx = Math.round(dx * scaleX);
    const scaledDy = Math.round(dy * scaleY);
    s.lastScaledDx = scaledDx;
    s.lastScaledDy = scaledDy;
    s.sends += 1;
    s.recentLines.unshift(
      `#${s.sends} ${source}  raw(${s.lastDx}, ${s.lastDy})  sent(${scaledDx}, ${scaledDy})`,
    );
    if (s.recentLines.length > 8) {
      s.recentLines.length = 8;
    }

    if (!tcpSendPausedRef.current) {
      const client = getClient();
      if (client) {
        client.sendMoveRelative(scaledDx, scaledDy);
        const pending = client.getPendingDelta();
        s.pendingDx = Math.round(pending.dx);
        s.pendingDy = Math.round(pending.dy);
        s.wsSends = client.getWsSendCount();
      }
    }

    paintDebugHud();
  }, [getClient, pointerScale, paintDebugHud, paintFinger]);

  /** Raw touch/pointer → finger dot only (runs even when TCP paused). */
  useEffect(() => {
    const el = trackpadRef.current;
    if (!el) return undefined;

    const trackRaw = (clientX, clientY, source) => {
      paintFinger(clientX, clientY, source);
    };

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      touchActiveRef.current = true;
      const t = e.touches[0];
      lastTouchRef.current = { x: t.clientX, y: t.clientY };
      trackRaw(t.clientX, t.clientY, 'touchstart');
    };

    const onTouchMove = (e) => {
      if (!touchActiveRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      statsRef.current.touchMoveEvents += 1;
      const t = e.touches[0];
      trackRaw(t.clientX, t.clientY, 'touchmove');
      applyDelta(t.clientX, t.clientY, 'touchmove');
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        touchActiveRef.current = false;
        hideFinger();
        if (!tcpSendPausedRef.current) {
          getClient()?.flushMoves();
        }
      }
      statsRef.current.lastSource = 'touchend';
      statsRef.current.lastAt = Date.now();
      paintDebugHud();
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
  }, [applyDelta, getClient, hideFinger, paintDebugHud, paintFinger]);

  useEffect(() => {
    let frameId = 0;
    const tick = () => {
      const client = getClient();
      if (client && !tcpSendPausedRef.current) {
        const s = statsRef.current;
        s.wsSends = client.getWsSendCount();
        const pending = client.getPendingDelta();
        s.pendingDx = Math.round(pending.dx);
        s.pendingDy = Math.round(pending.dy);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [getClient]);

  const onTrackpadPointerDown = useCallback((e) => {
    e.preventDefault();
    touchActiveRef.current = true;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    paintFinger(e.clientX, e.clientY, 'pointerdown');
    statsRef.current.lastSource = 'pointerdown';
    statsRef.current.lastAt = Date.now();
    paintDebugHud();
  }, [paintDebugHud, paintFinger]);

  const onTrackpadPointerMove = useCallback((e) => {
    if (!touchActiveRef.current) return;
    e.preventDefault();
    statsRef.current.pointerMoveEvents += 1;
    paintFinger(e.clientX, e.clientY, e.pointerType === 'touch' ? 'ptr-touch' : 'pointermove');
    const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    for (const sample of samples) {
      applyDelta(sample.clientX, sample.clientY, 'pointermove');
    }
  }, [applyDelta, paintFinger]);

  const onTrackpadPointerUp = useCallback((e) => {
    touchActiveRef.current = false;
    hideFinger();
    statsRef.current.lastSource = 'pointerup';
    statsRef.current.lastAt = Date.now();
    if (!tcpSendPausedRef.current) {
      const client = getClient();
      client?.flushMoves();
      if (client) {
        statsRef.current.wsSends = client.getWsSendCount();
        statsRef.current.pendingDx = 0;
        statsRef.current.pendingDy = 0;
      }
    }
    paintDebugHud();
  }, [getClient, hideFinger, paintDebugHud]);

  const onClickButton = useCallback((e) => {
    e.preventDefault();
    if (!tcpSendPausedRef.current) {
      getClient()?.sendClick();
    }
  }, [getClient]);

  const onBackClick = useCallback((e) => {
    e.preventDefault();
    onBack?.();
  }, [onBack]);

  const onToggleTcp = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !tcpSendPausedRef.current;
    tcpSendPausedRef.current = next;
    setTcpSendPaused(next);
    paintDebugHud();
  }, [paintDebugHud]);

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
        <button
          type="button"
          className={`ideum-remote-control__tcp-toggle ${tcpSendPaused ? 'is-paused' : 'is-active'}`}
          onClick={onToggleTcp}
        >
          {tcpSendPaused ? 'Sending stopped' : 'Stop TCP/IP'}
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
          <pre ref={fingerPosHudRef} className="ideum-remote-control__finger-pos">
            finger — waiting for touch
          </pre>
          <pre ref={debugHudRef} className="ideum-remote-control__trackpad-debug">
            tcp: SENDING
            source: —
            last raw dx,dy: 0 , 0
            last sent dx,dy: 0 , 0
            browser events 0  (touch 0 ptr 0)
            ws pending 0 , 0  |  ws sent 0
            — recent —
            (no dx/dy yet)
          </pre>
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
