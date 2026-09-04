import { getComponentVisualConfig } from '../data/componentVisuals';
import { getScaledCanvasBlockDimensions } from '../components/Canvas/shapes/canvasBlockUtils';
import { INTERACTIVE_STUB_BREAKER_TYPE } from './openBreakerConnections';

/** @typedef {'top'|'bottom'|'left'|'right'} BreakerPortSide */

const OPPOSITE = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const LABEL_SIDE_PREF = ['top', 'left', 'right', 'bottom'];

/**
 * Nearest bbox edge for a connection anchor in component-local coordinates.
 * @returns {BreakerPortSide}
 */
export function classifyAttachmentEdge(localX, localY, width, height) {
  const dTop = localY;
  const dBottom = height - localY;
  const dLeft = localX;
  const dRight = width - localX;
  const min = Math.min(dTop, dBottom, dLeft, dRight);
  if (min === dTop) return 'top';
  if (min === dBottom) return 'bottom';
  if (min === dLeft) return 'left';
  return 'right';
}

/** Inner-frame anchor for a port side (fallback when segment point missing). */
export function portAnchor(side, frameX, frameY, frameW, frameH, inset = 4) {
  switch (side) {
    case 'top':
      return { x: frameX + frameW / 2, y: frameY + inset };
    case 'bottom':
      return { x: frameX + frameW / 2, y: frameY + frameH - inset };
    case 'left':
      return { x: frameX + inset, y: frameY + frameH / 2 };
    case 'right':
      return { x: frameX + frameW - inset, y: frameY + frameH / 2 };
    default:
      return { x: frameX + frameW / 2, y: frameY + frameH / 2 };
  }
}

/** Label sits on the first side with no wire attachment. */
export function pickLabelSide(connectedSides) {
  for (const side of LABEL_SIDE_PREF) {
    if (!connectedSides.has(side)) return side;
  }
  return 'top';
}

export function labelTextLayout(side, frameX, frameY, frameW, frameH, pad = 10) {
  switch (side) {
    case 'top':
      return {
        x: frameX + frameW / 2,
        y: frameY + pad,
        textAnchor: 'middle',
        dominantBaseline: 'hanging',
      };
    case 'bottom':
      return {
        x: frameX + frameW / 2,
        y: frameY + frameH - pad,
        textAnchor: 'middle',
        dominantBaseline: 'auto',
      };
    case 'left':
      return {
        x: frameX + pad,
        y: frameY + frameH / 2,
        textAnchor: 'start',
        dominantBaseline: 'middle',
      };
    case 'right':
      return {
        x: frameX + frameW - pad,
        y: frameY + frameH / 2,
        textAnchor: 'end',
        dominantBaseline: 'middle',
      };
    default:
      return {
        x: frameX + frameW / 2,
        y: frameY + pad,
        textAnchor: 'middle',
        dominantBaseline: 'hanging',
      };
  }
}

/**
 * Wire exit/entry on the breaker bbox from routed segments (not logical center).
 * @returns {{ side: BreakerPortSide, localX: number, localY: number } | null}
 */
export function attachmentFromSegments(segments, comp, end, width, height) {
  if (!segments?.length || !comp?.position) return null;

  const bx = comp.position.x;
  const by = comp.position.y;
  let px;
  let py;

  if (end === 'from') {
    [px, py] = [segments[0][0], segments[0][1]];
  } else {
    const last = segments[segments.length - 1];
    [px, py] = [last[2], last[3]];
  }

  const localX = px - bx;
  const localY = py - by;
  return {
    side: classifyAttachmentEdge(localX, localY, width, height),
    localX,
    localY,
  };
}

function normalizePorts(rawPorts, frameX, frameY, frameW, frameH) {
  const bySide = new Map();
  for (const p of rawPorts) {
    bySide.set(p.side, p);
  }

  let ports = Array.from(bySide.values());
  if (ports.length >= 2) {
    return ports.slice(0, 2);
  }
  if (ports.length === 1) {
    const opp = OPPOSITE[ports[0].side];
    const anchor = portAnchor(opp, frameX, frameY, frameW, frameH);
    return [ports[0], { side: opp, localX: anchor.x, localY: anchor.y }];
  }
  const top = portAnchor('top', frameX, frameY, frameW, frameH);
  const bottom = portAnchor('bottom', frameX, frameY, frameW, frameH);
  return [
    { side: 'top', localX: top.x, localY: top.y },
    { side: 'bottom', localX: bottom.x, localY: bottom.y },
  ];
}

/**
 * Open position: blade hinged at `hinge`, tip rests at frame center (circuit broken at far port).
 * @returns {{ openTip: { x: number, y: number } }}
 */
export function computeDoorCenterOpen(hinge, closedTip, frameX, frameY, frameW, frameH) {
  void hinge;
  void closedTip;
  return {
    openTip: {
      x: frameX + frameW / 2,
      y: frameY + frameH / 2,
    },
  };
}

/** Pick hinge port so rotation from closed→center sweeps through the box interior. */
export function pickDoorHinge(ptA, ptB, frameX, frameY, frameW, frameH) {
  const center = {
    x: frameX + frameW / 2,
    y: frameY + frameH / 2,
  };

  const sweep = (hinge, closedTip) => {
    const aClosed = Math.atan2(closedTip.y - hinge.y, closedTip.x - hinge.x);
    const aCenter = Math.atan2(center.y - hinge.y, center.x - hinge.x);
    let d = aCenter - aClosed;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d);
  };

  const sweepA = sweep(ptA, ptB);
  const sweepB = sweep(ptB, ptA);
  if (sweepA >= sweepB) {
    return { hinge: ptA, closedTip: ptB, openTip: center };
  }
  return { hinge: ptB, closedTip: ptA, openTip: center };
}

/**
 * @deprecated Use pickDoorHinge + computeDoorCenterOpen — open tip is box center, not far wall.
 */
export function computeDoorOpenGeometry(hinge, closedTip, frameX, frameY, frameW, frameH) {
  return {
    tip: computeDoorCenterOpen(hinge, closedTip, frameX, frameY, frameW, frameH).openTip,
    angleRad: 0,
  };
}

/**
 * @returns {Map<string, { ports: Array<{ side: BreakerPortSide, localX: number, localY: number }>, labelSide: BreakerPortSide }>}
 */
export function buildInteractiveBreakerPortsById(
  connectionRenderList,
  renderComponents,
  canvasBlockTypeScale = {},
) {
  const byCompId = new Map();
  const compById = new Map((renderComponents || []).map((c) => [c.id, c]));

  for (const row of connectionRenderList || []) {
    if (!row?.conn || !row.segments?.length) continue;
    const { conn, segments } = row;

    for (const [compId, end] of [
      [conn.from, 'from'],
      [conn.to, 'to'],
    ]) {
      const comp = compById.get(compId);
      if (!comp || comp.type !== INTERACTIVE_STUB_BREAKER_TYPE) continue;

      const visual = getComponentVisualConfig(comp.type);
      const { width, height } = getScaledCanvasBlockDimensions(
        comp,
        visual,
        canvasBlockTypeScale,
      );
      const att = attachmentFromSegments(segments, comp, end, width, height);
      if (!att) continue;

      if (!byCompId.has(compId)) {
        byCompId.set(compId, []);
      }
      byCompId.get(compId).push(att);
    }
  }

  const result = new Map();
  for (const [compId, rawPorts] of byCompId) {
    const comp = compById.get(compId);
    const visual = getComponentVisualConfig(comp.type);
    const { width, height } = getScaledCanvasBlockDimensions(
      comp,
      visual,
      canvasBlockTypeScale,
    );
    const pad = Math.max(5, Math.min(width, height) * 0.06);
    const frameX = pad;
    const frameY = pad;
    const frameW = width - pad * 2;
    const frameH = height - pad * 2;

    const ports = normalizePorts(rawPorts, frameX, frameY, frameW, frameH);
    const connected = new Set(ports.map((p) => p.side));
    result.set(compId, {
      ports,
      labelSide: pickLabelSide(connected),
    });
  }

  for (const comp of renderComponents || []) {
    if (comp.type !== INTERACTIVE_STUB_BREAKER_TYPE || result.has(comp.id)) continue;
    const visual = getComponentVisualConfig(comp.type);
    const { width, height } = getScaledCanvasBlockDimensions(
      comp,
      visual,
      canvasBlockTypeScale,
    );
    const pad = Math.max(5, Math.min(width, height) * 0.06);
    const frameX = pad;
    const frameY = pad;
    const frameW = width - pad * 2;
    const frameH = height - pad * 2;
    const top = portAnchor('top', frameX, frameY, frameW, frameH);
    const bottom = portAnchor('bottom', frameX, frameY, frameW, frameH);
    result.set(comp.id, {
      ports: [
        { side: 'top', localX: top.x, localY: top.y },
        { side: 'bottom', localX: bottom.x, localY: bottom.y },
      ],
      labelSide: 'left',
    });
  }

  return result;
}
