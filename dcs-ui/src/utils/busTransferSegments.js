import { getComponentVisualConfig } from '../data/componentVisuals';
import { getScaledCanvasBlockDimensions } from '../components/Canvas/shapes/canvasBlockUtils';
import { isInteractiveBreakerOpen } from './openBreakerConnections';

const HORIZONTAL_BUS_TYPES = new Set(['bus-hv', 'bus-mv', 'bus-lv', 'bus-dc', 'bus-main']);

export function normalizeBusTransferSegments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (seg) =>
      seg &&
      typeof seg.id === 'string' &&
      typeof seg.busId === 'string' &&
      typeof seg.endpointA === 'string' &&
      typeof seg.endpointB === 'string' &&
      Array.isArray(seg.rules) &&
      seg.rules.length > 0,
  );
}

function getBreakerState(components, breakerId) {
  const comp = (components || []).find((c) => c.id === breakerId);
  if (!comp) return null;
  return isInteractiveBreakerOpen(comp) ? 'open' : 'closed';
}

function ruleMatches(when, components) {
  if (!when || typeof when !== 'object') return false;
  for (const [breakerId, expected] of Object.entries(when)) {
    if (expected !== 'open' && expected !== 'closed') return false;
    if (getBreakerState(components, breakerId) !== expected) return false;
  }
  return true;
}

/** Bus attachment point for a component that connects to `busId`. */
function findBusTap(connectionRenderList, busId, anchorComponentId) {
  for (const row of connectionRenderList || []) {
    if (!row?.conn) continue;
    const { conn, fromCenterX, fromCenterY, toCenterX, toCenterY } = row;
    if (conn.to === busId && conn.from === anchorComponentId) {
      return { x: toCenterX, y: toCenterY };
    }
    if (conn.from === busId && conn.to === anchorComponentId) {
      return { x: fromCenterX, y: fromCenterY };
    }
  }
  return null;
}

/** Fallback tap X: anchor column center clamped to bus width. */
function fallbackBusTapX(compById, busComp, anchorComponentId, canvasBlockTypeScale) {
  const anchor = compById.get(anchorComponentId);
  if (!anchor || !busComp) return null;
  const visual = getComponentVisualConfig(anchor.type);
  const { width: anchorW } = getScaledCanvasBlockDimensions(anchor, visual, canvasBlockTypeScale);
  const busVisual = getComponentVisualConfig(busComp.type);
  const { width: busW } = getScaledCanvasBlockDimensions(busComp, busVisual, canvasBlockTypeScale);
  const anchorCenterX = anchor.position.x + anchorW / 2;
  const busLeft = busComp.position.x;
  const busRight = busComp.position.x + busW;
  return Math.min(busRight, Math.max(busLeft, anchorCenterX));
}

function busMidlineY(busComp, canvasBlockTypeScale) {
  const visual = getComponentVisualConfig(busComp.type);
  const { height } = getScaledCanvasBlockDimensions(busComp, visual, canvasBlockTypeScale);
  return busComp.position.y + height / 2;
}

function normalizeDirection(raw) {
  const d = String(raw || '').trim();
  if (d === 'AtoB' || d === 'aToB') return 'AtoB';
  if (d === 'BtoA' || d === 'bToA') return 'BtoA';
  return null;
}

/**
 * Resolve conditional horizontal bus transfer overlays from design config + live topology.
 *
 * @returns {Array<{
 *   key: string,
 *   busId: string,
 *   x1: number, y1: number, x2: number, y2: number,
 *   flowForward: boolean,
 *   strokeWidth: number,
 *   color: string
 * }>}
 */
export function resolveBusTransferSegments({
  busTransferSegments,
  components,
  renderComponents,
  connectionRenderList,
  canvasBlockTypeScale = {},
}) {
  const configs = normalizeBusTransferSegments(busTransferSegments);
  if (!configs.length) return [];

  const compById = new Map((renderComponents || []).map((c) => [c.id, c]));
  const out = [];

  for (const cfg of configs) {
    const busComp = compById.get(cfg.busId);
    if (!busComp || !HORIZONTAL_BUS_TYPES.has(busComp.type)) continue;

    const tapA =
      findBusTap(connectionRenderList, cfg.busId, cfg.endpointA) ??
      (() => {
        const x = fallbackBusTapX(compById, busComp, cfg.endpointA, canvasBlockTypeScale);
        return x == null ? null : { x, y: 0 };
      })();
    const tapB =
      findBusTap(connectionRenderList, cfg.busId, cfg.endpointB) ??
      (() => {
        const x = fallbackBusTapX(compById, busComp, cfg.endpointB, canvasBlockTypeScale);
        return x == null ? null : { x, y: 0 };
      })();
    if (!tapA || !tapB) continue;

    let direction = null;
    for (const rule of cfg.rules) {
      if (ruleMatches(rule.when, components)) {
        direction = normalizeDirection(rule.direction);
        if (direction) break;
      }
    }
    if (!direction) continue;

    const y = busMidlineY(busComp, canvasBlockTypeScale);
    const xA = tapA.x;
    const xB = tapB.x;
    const drawX1 = Math.min(xA, xB);
    const drawX2 = Math.max(xA, xB);
    if (Math.abs(drawX2 - drawX1) < 2) continue;

    const animForward =
      direction === 'AtoB' ? xA <= xB : xA > xB;

    const style = cfg.style && typeof cfg.style === 'object' ? cfg.style : {};
    out.push({
      key: cfg.id,
      busId: cfg.busId,
      x1: drawX1,
      y1: y,
      x2: drawX2,
      y2: y,
      flowForward: animForward,
      strokeWidth:
        Number.isFinite(style.thickness) && style.thickness > 0 ? style.thickness : 5,
      color: typeof style.color === 'string' && style.color ? style.color : '#2d7a32',
    });
  }

  return out;
}
