import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useCanvasFontPxDelta } from '../../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../../utils/svgFontDelta';
import { isInteractiveBreakerOpen } from '../../../utils/openBreakerConnections';
import {
  portAnchor,
  labelTextLayout,
  pickDoorHinge,
} from '../../../utils/interactiveBreakerPorts';

const CLOSED_GREEN = '#2d7a32';
const CLOSED_GREEN_BRIGHT = '#66bb6a';
const OPEN_AMBER = '#f9a825';
const OPEN_AMBER_BRIGHT = '#ffb74d';

const DOOR_MS = 550;

function resolvePortPoint(port, frameX, frameY, frameW, frameH) {
  if (port?.localX != null && port?.localY != null) {
    return { x: port.localX, y: port.localY };
  }
  return portAnchor(port?.side ?? 'top', frameX, frameY, frameW, frameH);
}

function easeOutBack(t) {
  const c1 = 1.45;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/**
 * Two-port breaker: closed = oblique A↔B (green + flow);
 * open = hinge at A or B, blade tip at box center (amber after swing).
 */
function SchematicInteractiveBreaker({
  component,
  width,
  height,
  strokeColor: _strokeColor,
  strokeWidthVal: _strokeWidthVal,
  primaryLabel,
  secondaryLabel: _secondaryLabel,
  breakerPorts = null,
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const fsLabel = adjSvgFontPx(13, fontPxDelta);
  const uid = useId().replace(/:/g, '');
  const isOpen = isInteractiveBreakerOpen(component);

  const pad = Math.max(5, Math.min(width, height) * 0.06);
  const frameX = pad;
  const frameY = pad;
  const frameW = width - pad * 2;
  const frameH = height - pad * 2;

  const ports = breakerPorts?.ports?.length >= 2
    ? breakerPorts.ports.slice(0, 2)
    : [
        { side: 'top', localX: frameX + frameW / 2, localY: frameY + 4 },
        { side: 'bottom', localX: frameX + frameW / 2, localY: frameY + frameH - 4 },
      ];
  const labelSide = breakerPorts?.labelSide ?? 'left';

  const ptA = resolvePortPoint(ports[0], frameX, frameY, frameW, frameH);
  const ptB = resolvePortPoint(ports[1], frameX, frameY, frameW, frameH);
  const labelPos = labelTextLayout(labelSide, frameX, frameY, frameW, frameH);

  const linkStroke = Math.max(5, Math.min(width, height) * 0.07);
  const label = primaryLabel || 'CB';

  const door = useMemo(
    () => pickDoorHinge(ptA, ptB, frameX, frameY, frameW, frameH),
    [ptA.x, ptA.y, ptB.x, ptB.y, frameX, frameY, frameW, frameH],
  );

  const targetTip = isOpen ? door.openTip : door.closedTip;
  const [bladeTip, setBladeTip] = useState(targetTip);
  const [linkOpen, setLinkOpen] = useState(isOpen);
  const bladeTipRef = useRef(targetTip);
  const animRef = useRef(null);

  useEffect(() => {
    bladeTipRef.current = bladeTip;
  }, [bladeTip]);

  useEffect(() => {
    const from = bladeTipRef.current;
    const to = targetTip;
    if (Math.hypot(from.x - to.x, from.y - to.y) < 0.5) {
      setBladeTip(to);
      bladeTipRef.current = to;
      setLinkOpen(isOpen);
      return undefined;
    }

    const t0 = performance.now();
    const run = (now) => {
      const t = Math.min(1, (now - t0) / DOOR_MS);
      const e = easeOutBack(t);
      const next = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
      };
      setBladeTip(next);
      bladeTipRef.current = next;
      if (t >= 1) {
        setLinkOpen(isOpen);
      } else {
        animRef.current = requestAnimationFrame(run);
      }
    };
    animRef.current = requestAnimationFrame(run);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetTip.x, targetTip.y, isOpen]);

  const wireColor = linkOpen ? OPEN_AMBER : CLOSED_GREEN;
  const wireBright = linkOpen ? OPEN_AMBER_BRIGHT : CLOSED_GREEN_BRIGHT;

  const atClosed =
    Math.hypot(bladeTip.x - door.closedTip.x, bladeTip.y - door.closedTip.y) < 1.5;
  const showFlow = !linkOpen && atClosed;

  return (
    <>
      <rect width={width} height={height} fill="transparent" stroke="none" rx="6" />

      <defs>
        <filter id={`ib-glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient
          id={`ib-link-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1={door.hinge.x}
          y1={door.hinge.y}
          x2={door.closedTip.x}
          y2={door.closedTip.y}
        >
          <stop offset="0%" stopColor={wireBright} />
          <stop offset="100%" stopColor={wireColor} />
        </linearGradient>
      </defs>

      <rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        rx={8}
        fill="#050508"
        stroke={wireColor}
        strokeWidth={2.5}
        pointerEvents="none"
        style={{ transition: 'stroke 0.45s ease' }}
      />

      <text
        x={labelPos.x}
        y={labelPos.y}
        textAnchor={labelPos.textAnchor}
        dominantBaseline={labelPos.dominantBaseline}
        fill="#ececec"
        fontSize={fsLabel}
        fontWeight="700"
        pointerEvents="none"
        opacity={0.95}
      >
        {label}
      </text>

      <g pointerEvents="none">
        <circle cx={ptA.x} cy={ptA.y} r={linkStroke * 0.42} fill={wireColor} style={{ transition: 'fill 0.45s ease' }} />
        <circle cx={ptB.x} cy={ptB.y} r={linkStroke * 0.42} fill={wireColor} style={{ transition: 'fill 0.45s ease' }} />
      </g>

      {/* Ghost: show where far port was when open */}
      <g
        pointerEvents="none"
        opacity={linkOpen ? 0.75 : 0}
        style={{ transition: 'opacity 0.35s ease' }}
      >
        <circle
          cx={door.closedTip.x}
          cy={door.closedTip.y}
          r={linkStroke * 0.32}
          fill="none"
          stroke={OPEN_AMBER}
          strokeWidth={2}
          strokeDasharray="4 5"
        />
      </g>

      {/* Blade: hinge → animated tip (closed = far port, open = center) */}
      <line
        x1={door.hinge.x}
        y1={door.hinge.y}
        x2={bladeTip.x}
        y2={bladeTip.y}
        stroke={showFlow ? `url(#ib-link-${uid})` : wireColor}
        strokeWidth={linkStroke}
        strokeLinecap="round"
        filter={`url(#ib-glow-${uid})`}
        className={showFlow ? 'interactive-breaker-link interactive-breaker-link--flow' : undefined}
        pointerEvents="none"
        style={{ transition: 'stroke 0.35s ease' }}
      />

      <circle
        cx={door.hinge.x}
        cy={door.hinge.y}
        r={linkStroke * 0.48}
        fill={wireColor}
        stroke="#050508"
        strokeWidth={1.5}
        pointerEvents="none"
        style={{ transition: 'fill 0.35s ease' }}
      />

      <circle
        cx={bladeTip.x}
        cy={bladeTip.y}
        r={linkStroke * 0.38}
        fill={wireBright}
        pointerEvents="none"
      />
    </>
  );
}

export default SchematicInteractiveBreaker;
