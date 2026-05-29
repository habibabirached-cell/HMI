import { getComponentVisualConfig } from '../data/componentVisuals';
import { getScaledCanvasBlockDimensions } from '../components/Canvas/shapes/canvasBlockUtils';
import {
  isTieBreakerNetwork,
  tieEffectiveDimensions,
} from './tieBreakerNetwork';
import {
  isGasTurbineBank,
  gasTurbineBankEffectiveDimensions,
} from './gasTurbineBank';

function getCanvasBlockTypeScale(canvasBlockTypeScale, type) {
  const n = Number(canvasBlockTypeScale?.[type]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Canvas-space bounds for hit-testing (uses render position including tie-collapse shift). */
export function getComponentCanvasBounds(
  component,
  canvasBlockTypeScale = {},
  positionOverride = null,
) {
  const visualConfig = getComponentVisualConfig(component.type);
  const { width: baseW, height: baseH } = getScaledCanvasBlockDimensions(
    component,
    visualConfig,
    canvasBlockTypeScale,
  );
  const { width, height } = isGasTurbineBank(component)
    ? gasTurbineBankEffectiveDimensions(component, baseW, baseH)
    : tieEffectiveDimensions(component, baseW, baseH);
  const pos = positionOverride ?? component.position;
  return {
    x: pos.x,
    y: pos.y,
    w: width,
    h: height,
    cx: pos.x + width / 2,
    cy: pos.y + height / 2,
  };
}

export function normalizeCanvasRect(x0, y0, x1, y1) {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.abs(x1 - x0),
    h: Math.abs(y1 - y0),
  };
}

export function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function clientToCanvasPoint(canvasEl, pan, zoom, clientX, clientY) {
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: (clientX - rect.left - pan.x) / zoom,
    y: (clientY - rect.top - pan.y) / zoom,
  };
}

/** Include tie-network members when the network or any member is selected. */
export function expandSelectionWithTieGroups(allComponents, componentIds) {
  const set = new Set(componentIds);
  const byId = new Map(allComponents.map((c) => [c.id, c]));

  const absorbTie = (tieComp) => {
    if (!tieComp || !isTieBreakerNetwork(tieComp)) return;
    set.add(tieComp.id);
    const mids = tieComp.properties?.tieGroup?.memberIds;
    if (Array.isArray(mids)) {
      for (const mid of mids) {
        if (mid) set.add(String(mid));
      }
    }
  };

  const absorbGasBank = (bankComp) => {
    if (!bankComp || !isGasTurbineBank(bankComp)) return;
    set.add(bankComp.id);
    const mids = bankComp.properties?.gasTurbineGroup?.memberIds;
    if (Array.isArray(mids)) {
      for (const mid of mids) {
        if (mid) set.add(String(mid));
      }
    }
  };

  for (const id of [...set]) {
    absorbTie(byId.get(id));
    absorbGasBank(byId.get(id));
    for (const c of allComponents) {
      if (isTieBreakerNetwork(c)) {
        const mids = c.properties?.tieGroup?.memberIds || [];
        if (mids.includes(id)) absorbTie(c);
      }
      if (isGasTurbineBank(c)) {
        const mids = c.properties?.gasTurbineGroup?.memberIds || [];
        if (mids.includes(id)) absorbGasBank(c);
      }
    }
  }

  return [...set];
}

/**
 * @param {object} params
 * @param {object[]} params.allComponents — full canvas list (incl. hidden tie members)
 * @param {object[]} params.renderComponents — visible render positions
 * @param {object[]} params.connections
 * @param {{ x:number,y:number,w:number,h:number }} params.marquee — canvas coords
 * @param {Record<string,number>} [params.tieCollapseShiftById]
 * @param {object} [params.canvasBlockTypeScale]
 * @param {Array<{ conn: object, segments: number[][] }>} [params.connectionSegments]
 */
export function computeMarqueeSelection({
  allComponents,
  renderComponents,
  connections,
  marquee,
  tieCollapseShiftById = new Map(),
  canvasBlockTypeScale = {},
  connectionSegments = [],
}) {
  const renderById = new Map(renderComponents.map((c) => [c.id, c]));
  const componentIds = [];

  for (const comp of allComponents) {
    const render = renderById.get(comp.id);
    if (!render) continue;
    const bounds = getComponentCanvasBounds(comp, canvasBlockTypeScale, render.position);
    if (rectsIntersect(marquee, bounds)) {
      componentIds.push(comp.id);
    }
  }

  const expandedIds = expandSelectionWithTieGroups(allComponents, componentIds);
  const idSet = new Set(expandedIds);

  const connectionIds = [];
  for (const row of connectionSegments) {
    const conn = row?.conn;
    if (!conn?.id) continue;
    const fromIn = idSet.has(conn.from);
    const toIn = idSet.has(conn.to);
    if (fromIn && toIn) {
      connectionIds.push(conn.id);
      continue;
    }
    const segs = row.segments || [];
    let hit = false;
    for (const [x1, y1, x2, y2] of segs) {
      const segBox = normalizeCanvasRect(x1, y1, x2, y2);
      segBox.w = Math.max(segBox.w, 2);
      segBox.h = Math.max(segBox.h, 2);
      if (rectsIntersect(marquee, segBox)) {
        hit = true;
        break;
      }
    }
    if (hit) connectionIds.push(conn.id);
  }

  return {
    componentIds: expandedIds,
    connectionIds: [...new Set(connectionIds)],
  };
}

/**
 * @returns {{ components: object[], connections: object[], anchor: { x:number, y:number } } | null}
 */
export function buildCanvasClipboardPayload(
  allComponents,
  connections,
  componentIds,
  connectionIds,
) {
  const idSet = new Set(expandSelectionWithTieGroups(allComponents, componentIds));
  const comps = allComponents
    .filter((c) => idSet.has(c.id))
    .map((c) => JSON.parse(JSON.stringify(c)));

  if (!comps.length) return null;

  const conns = connections
    .filter((c) => connectionIds.includes(c.id) && idSet.has(c.from) && idSet.has(c.to))
    .map((c) => JSON.parse(JSON.stringify(c)));

  let minX = Infinity;
  let minY = Infinity;
  for (const c of comps) {
    minX = Math.min(minX, c.position?.x ?? 0);
    minY = Math.min(minY, c.position?.y ?? 0);
  }

  return {
    components: comps,
    connections: conns,
    anchor: Number.isFinite(minX) ? { x: minX, y: minY } : { x: 0, y: 0 },
  };
}

const PASTE_GAP = 80;
const PASTE_MIN_OFFSET = 120;

/** Place paste beside the copied group's bbox so it does not sit on top of the original. */
export function computePasteOffsetForPayload(payload, canvasBlockTypeScale = {}) {
  if (!payload?.components?.length) {
    return { x: PASTE_MIN_OFFSET, y: PASTE_MIN_OFFSET };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of payload.components) {
    const b = getComponentCanvasBounds(c, canvasBlockTypeScale);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return {
    x: Math.max(PASTE_MIN_OFFSET, w + PASTE_GAP),
    y: Math.max(80, Math.round(h * 0.12) + PASTE_GAP),
  };
}

/**
 * Clone clipboard payload with new ids; returns items to add and id map.
 */
export function materializeCanvasPaste(payload, pasteOffset) {
  const offset =
    pasteOffset ??
    computePasteOffsetForPayload(payload) ??
    { x: PASTE_MIN_OFFSET, y: PASTE_MIN_OFFSET };
  if (!payload?.components?.length) return null;

  const stamp = Date.now();
  const idMap = new Map();
  payload.components.forEach((c, i) => {
    idMap.set(c.id, `paste-${stamp}-${i}-${Math.random().toString(36).slice(2, 7)}`);
  });

  const dx = offset.x;
  const dy = offset.y;

  const newComponents = payload.components.map((c) => {
    const next = { ...c, id: idMap.get(c.id) };
    next.position = {
      x: (c.position?.x ?? 0) + dx,
      y: (c.position?.y ?? 0) + dy,
    };
    if (isTieBreakerNetwork(next) && next.properties?.tieGroup) {
      const tg = next.properties.tieGroup;
      const stub = tg.stubLinks;
      next.properties = {
        ...next.properties,
        tieGroup: {
          ...tg,
          memberIds: Array.isArray(tg.memberIds)
            ? tg.memberIds.map((mid) => idMap.get(mid) ?? mid)
            : tg.memberIds,
          ...(stub
            ? {
                stubLinks: {
                  ...stub,
                  leftAnchorIds: (stub.leftAnchorIds || []).map(
                    (aid) => idMap.get(aid) ?? aid,
                  ),
                  rightAnchorIds: (stub.rightAnchorIds || []).map(
                    (aid) => idMap.get(aid) ?? aid,
                  ),
                },
              }
            : {}),
        },
      };
    }
    if (isGasTurbineBank(next) && next.properties?.gasTurbineGroup) {
      const g = next.properties.gasTurbineGroup;
      const stub = g.stubLinks;
      next.properties = {
        ...next.properties,
        gasTurbineGroup: {
          ...g,
          previewMemberId: g.previewMemberId
            ? idMap.get(g.previewMemberId) ?? g.previewMemberId
            : g.previewMemberId,
          collapseCompanionMemberId: g.collapseCompanionMemberId
            ? idMap.get(g.collapseCompanionMemberId) ?? g.collapseCompanionMemberId
            : g.collapseCompanionMemberId,
          collapseExtraMemberIds: Array.isArray(g.collapseExtraMemberIds)
            ? g.collapseExtraMemberIds.map((mid) => idMap.get(mid) ?? mid)
            : g.collapseExtraMemberIds,
          memberIds: Array.isArray(g.memberIds)
            ? g.memberIds.map((mid) => idMap.get(mid) ?? mid)
            : g.memberIds,
          ...(stub
            ? {
                stubLinks: {
                  ...stub,
                  leftAnchorIds: (stub.leftAnchorIds || []).map(
                    (aid) => idMap.get(aid) ?? aid,
                  ),
                  rightAnchorIds: (stub.rightAnchorIds || []).map(
                    (aid) => idMap.get(aid) ?? aid,
                  ),
                },
              }
            : {}),
        },
      };
    }
    return next;
  });

  const newConnections = (payload.connections || []).map((conn, i) => ({
    ...conn,
    id: `conn-paste-${stamp}-${i}`,
    from: idMap.get(conn.from) ?? conn.from,
    to: idMap.get(conn.to) ?? conn.to,
  }));

  return {
    components: newComponents,
    connections: newConnections,
    componentIds: newComponents.map((c) => c.id),
    connectionIds: newConnections.map((c) => c.id),
  };
}

/** Remove deleted ids from tieGroup member/stub lists on remaining components. */
export function scrubTieGroupReferencesAfterDelete(components, deletedIds) {
  const deleted = deletedIds instanceof Set ? deletedIds : new Set(deletedIds);
  if (!deleted.size) return components;

  return components.map((c) => {
    const tg = c.properties?.tieGroup;
    if (!tg) return c;

    let nextTg = tg;
    let changed = false;

    if (Array.isArray(tg.memberIds)) {
      const memberIds = tg.memberIds.filter((id) => !deleted.has(id));
      if (memberIds.length !== tg.memberIds.length) {
        nextTg = { ...nextTg, memberIds };
        changed = true;
      }
    }

    const stub = tg.stubLinks;
    if (stub) {
      let nextStub = stub;
      if (Array.isArray(stub.leftAnchorIds)) {
        const leftAnchorIds = stub.leftAnchorIds.filter((id) => !deleted.has(id));
        if (leftAnchorIds.length !== stub.leftAnchorIds.length) {
          nextStub = { ...nextStub, leftAnchorIds };
          changed = true;
        }
      }
      if (Array.isArray(stub.rightAnchorIds)) {
        const rightAnchorIds = stub.rightAnchorIds.filter((id) => !deleted.has(id));
        if (rightAnchorIds.length !== stub.rightAnchorIds.length) {
          nextStub = { ...nextStub, rightAnchorIds };
          changed = true;
        }
      }
      if (changed) {
        nextTg = { ...nextTg, stubLinks: nextStub };
      }
    }

    if (!changed) return c;
    return {
      ...c,
      properties: { ...c.properties, tieGroup: nextTg },
    };
  });
}
