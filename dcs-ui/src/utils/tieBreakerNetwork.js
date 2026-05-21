/**
 * Tie breaker “network” aggregate: one `tie-breaker-network` block can hide/show
 * many member components via `properties.tieGroup`.
 *
 * Optional `tieGroup.stubLinks` (when collapsed): horizontal translation pulls flanking
 * equipment toward a fixed‑width aggregate (~50 px gutters) plus stub feeders to anchors.
 */

const TIE_STRIP_EXPANDED_WIDTH = 34;
/** Short bbox for collapse affordance only (dots + halo); authored height is unchanged in JSON. */
const TIE_STRIP_EXPANDED_HEIGHT = 24;

/** Suffix pattern for VoltVer-style tie bays (middle rungs). */
const VOLTVER_TIE_SUFFIXES = [
  'sw-a',
  'ct-a',
  'brk-l',
  'ct-b',
  'sw-b',
  'j1',
  'sw-c',
  'ct-c',
  'brk-m',
  'ct-d',
  'sw-d',
  'j2',
  'sw-e',
  'ct-e',
  'brk-r',
  'ct-f',
  'sw-f',
  'ret-l',
  'ret-r',
];

export function voltverStyleTieMemberIds(maxBay = 7) {
  const ids = [];
  for (let b = 1; b <= maxBay; b += 1) {
    for (const s of VOLTVER_TIE_SUFFIXES) {
      ids.push(`comp-tie-${b}-${s}`);
    }
  }
  return ids;
}

export function isTieBreakerNetwork(component) {
  return component?.type === 'tie-breaker-network';
}

/** True when members should be omitted from rendering (collapse). */
export function isTieNetworkCollapsed(component) {
  if (!isTieBreakerNetwork(component)) return false;
  const tg = component.properties?.tieGroup;
  if (!tg?.memberIds?.length) return false;
  return tg.collapsed !== false;
}

/** Expanded = members visible + thin collapse strip */
export function isTieStripMode(component) {
  if (!isTieBreakerNetwork(component)) return false;
  const tg = component.properties?.tieGroup;
  if (!tg?.memberIds?.length) return false;
  return tg.collapsed === false;
}

export function getTieHiddenMemberIdSet(components) {
  const hidden = new Set();
  if (!components?.length) return hidden;
  for (const c of components) {
    if (!isTieBreakerNetwork(c)) continue;
    if (!isTieNetworkCollapsed(c)) continue;
    const ids = c.properties?.tieGroup?.memberIds;
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (id) hidden.add(String(id));
    }
  }
  return hidden;
}

export function tieEffectiveDimensions(component, baseWidth, baseHeight) {
  if (isTieStripMode(component)) {
    return { width: TIE_STRIP_EXPANDED_WIDTH, height: TIE_STRIP_EXPANDED_HEIGHT };
  }
  return { width: baseWidth, height: baseHeight };
}

export function hasTieStubLinks(component) {
  const sl = component?.properties?.tieGroup?.stubLinks;
  return (
    sl &&
    Array.isArray(sl.leftAnchorIds) &&
    sl.leftAnchorIds.length > 0 &&
    Array.isArray(sl.rightAnchorIds) &&
    sl.rightAnchorIds.length > 0
  );
}

function compWidthPx(c, getComponentVisualConfig) {
  const vis = getComponentVisualConfig(c.type);
  return c.visualOverrides?.width ?? vis.width;
}

function anchorRightEdge(comp, getComponentVisualConfig) {
  const vis = getComponentVisualConfig(comp.type);
  const w = comp.visualOverrides?.width ?? vis.width;
  return comp.position.x + w;
}

function anchorLeftEdge(comp) {
  return comp.position.x;
}

function anchorCenterY(comp, getComponentVisualConfig) {
  const vis = getComponentVisualConfig(comp.type);
  const h = comp.visualOverrides?.height ?? vis.height;
  return comp.position.y + h / 2;
}

/**
 * When a tie network is collapsed with stubLinks, everything strictly left/right of the
 * aggregate’s horizontal span translates so inner flanks sit ~gapPx from the tie block;
 * tie width stays as saved in `visualOverrides` (does not inflate). Render-time only —
 * authored positions in JSON are unchanged.
 *
 * Left group: right edge strictly before tie left. Right group: left edge strictly after tie right.
 * Tie aggregate and tie member ids do not translate.
 *
 * Only the first collapsed tie with stubLinks is applied (covers VoltVer-style single shim).
 *
 * @returns {Map<string, number>} component id → delta x (add to position.x).
 */
export function buildTieCollapseHorizontalShiftMap(components, getComponentVisualConfig) {
  const shiftById = new Map();
  if (!components?.length) return shiftById;

  const anchors = components.filter(
    (c) => isTieBreakerNetwork(c) && isTieNetworkCollapsed(c) && hasTieStubLinks(c),
  );
  if (anchors.length === 0) return shiftById;

  const tie = anchors[0];
  const tg = tie.properties?.tieGroup;
  const excluded = new Set([...(tg?.memberIds || []), tie.id]);

  const baseVis = getComponentVisualConfig(tie.type);
  const tieLeft = tie.position?.x ?? 0;
  const tieW = tie.visualOverrides?.width ?? baseVis.width ?? 140;
  const tieRight = tieLeft + tieW;
  const gap = Number.isFinite(tg.stubLinks?.gapPx) ? tg.stubLinks.gapPx : 50;

  let leftMaxRight = -Infinity;
  let rightMinLeft = Infinity;
  /** @type {string[]} */
  const leftIds = [];
  /** @type {string[]} */
  const rightIds = [];

  for (const c of components) {
    if (!c?.id || excluded.has(c.id)) continue;
    const w = compWidthPx(c, getComponentVisualConfig);
    const cx = c.position?.x ?? 0;
    const right = cx + w;
    const left = cx;
    if (right < tieLeft) {
      leftIds.push(c.id);
      leftMaxRight = Math.max(leftMaxRight, right);
    } else if (left > tieRight) {
      rightIds.push(c.id);
      rightMinLeft = Math.min(rightMinLeft, left);
    }
  }

  if (!Number.isFinite(leftMaxRight) || !Number.isFinite(rightMinLeft)) {
    return shiftById;
  }

  /** Δx for strictly-left components (+x pulls the left flank inward toward the tie). */
  const dRightward = tieLeft - gap - leftMaxRight;
  /** Tie-right flank excess: subtract from each right-flank component’s x. */
  const dLeftward = rightMinLeft - (tieRight + gap);

  for (const id of leftIds) {
    shiftById.set(id, dRightward);
  }
  for (const id of rightIds) {
    shiftById.set(id, -dLeftward);
  }

  return shiftById;
}

/** `renderComponents` must already include collapse translations for anchor lookups. */
export function getTieCollapsedStubSegments(
  renderComponents,
  tieCompAnchors,
  tieRenderComp,
  getComponentVisualConfig,
) {
  if (
    !tieCompAnchors?.properties?.tieGroup?.stubLinks ||
    !isTieNetworkCollapsed(tieCompAnchors)
  ) {
    return [];
  }

  const sl = tieCompAnchors.properties.tieGroup.stubLinks;
  const baseVis = getComponentVisualConfig(tieRenderComp.type);
  const w = tieRenderComp.visualOverrides?.width ?? baseVis.width;
  const tieLeft = tieRenderComp.position.x;
  const tieRight = tieLeft + w;

  const segs = [];
  let ki = 0;
  for (const id of sl.leftAnchorIds || []) {
    const c = renderComponents.find((x) => x.id === id);
    if (!c) continue;
    const x1 = anchorRightEdge(c, getComponentVisualConfig);
    const y = anchorCenterY(c, getComponentVisualConfig);
    segs.push({
      key: `tie-stub-L-${ki}`,
      x1,
      y1: y,
      x2: tieLeft,
      y2: y,
    });
    ki += 1;
  }
  ki = 0;
  for (const id of sl.rightAnchorIds || []) {
    const c = renderComponents.find((x) => x.id === id);
    if (!c) continue;
    const x2 = anchorLeftEdge(c);
    const y = anchorCenterY(c, getComponentVisualConfig);
    segs.push({
      key: `tie-stub-R-${ki}`,
      x1: tieRight,
      y1: y,
      x2,
      y2: y,
    });
    ki += 1;
  }
  return segs;
}

export function tieStripExpandedWidthPx() {
  return TIE_STRIP_EXPANDED_WIDTH;
}
