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

function compHeightPx(c, getComponentVisualConfig) {
  const vis = getComponentVisualConfig(c.type);
  return c.visualOverrides?.height ?? vis.height;
}

function verticalSpansOverlap(topA, bottomA, topB, bottomB) {
  return topA < bottomB && bottomA > topB;
}

/** True when component bbox overlaps the tie block’s authored vertical span. */
function componentOverlapsTieVerticalSpan(c, tie, getComponentVisualConfig) {
  const cTop = c.position?.y ?? 0;
  const cBottom = cTop + compHeightPx(c, getComponentVisualConfig);
  const tieTop = tie.position?.y ?? 0;
  const tieBottom = tieTop + compHeightPx(tie, getComponentVisualConfig);
  return verticalSpansOverlap(cTop, cBottom, tieTop, tieBottom);
}

function flankExtentsFromStubLinks(tie, components, getComponentVisualConfig) {
  const sl = tie.properties?.tieGroup?.stubLinks;
  if (!sl) return { leftMaxRight: NaN, rightMinLeft: NaN };
  const byId = new Map(components.map((x) => [x.id, x]));
  let leftMaxRight = -Infinity;
  let rightMinLeft = Infinity;
  for (const id of sl.leftAnchorIds || []) {
    const c = byId.get(id);
    if (!c) continue;
    leftMaxRight = Math.max(leftMaxRight, anchorRightEdge(c, getComponentVisualConfig));
  }
  for (const id of sl.rightAnchorIds || []) {
    const c = byId.get(id);
    if (!c) continue;
    rightMinLeft = Math.min(rightMinLeft, anchorLeftEdge(c));
  }
  if (!Number.isFinite(leftMaxRight) || !Number.isFinite(rightMinLeft)) {
    return { leftMaxRight: NaN, rightMinLeft: NaN };
  }
  return { leftMaxRight, rightMinLeft };
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

/** Flank CBs in the same vertical band as the tie (render positions, post-collapse shift). */
function flankStubCandidates(renderComponents, tieRenderComp, side, getComponentVisualConfig) {
  const baseVis = getComponentVisualConfig(tieRenderComp.type);
  const tieW = tieRenderComp.visualOverrides?.width ?? baseVis.width;
  const tieLeft = tieRenderComp.position?.x ?? 0;
  const tieRight = tieLeft + tieW;

  return renderComponents
    .filter((c) => {
      if (!c?.id || c.id === tieRenderComp.id) return false;
      if (!componentOverlapsTieVerticalSpan(c, tieRenderComp, getComponentVisualConfig)) {
        return false;
      }
      const w = compWidthPx(c, getComponentVisualConfig);
      const cx = c.position?.x ?? 0;
      const right = cx + w;
      const left = cx;
      if (side === 'left') return right <= tieLeft + 1;
      return left >= tieRight - 1;
    })
    .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0));
}

/**
 * Map configured stub anchor ids to render components beside this tie.
 * Uses the configured id when it overlaps the tie band; otherwise the i-th flank
 * candidate in that band (copy-paste stacks still share original anchor ids).
 */
function resolveStubAnchorRenderComponents(
  anchorIds,
  side,
  tieRenderComp,
  renderComponents,
  getComponentVisualConfig,
) {
  const pool = flankStubCandidates(
    renderComponents,
    tieRenderComp,
    side,
    getComponentVisualConfig,
  );
  const resolved = [];
  for (let i = 0; i < (anchorIds || []).length; i += 1) {
    const id = anchorIds[i];
    let c = renderComponents.find((x) => x.id === id);
    if (
      c &&
      componentOverlapsTieVerticalSpan(c, tieRenderComp, getComponentVisualConfig)
    ) {
      resolved.push(c);
      continue;
    }
    const refType = c?.type;
    const typed = refType != null ? pool.filter((x) => x.type === refType) : pool;
    if (typed[i]) {
      resolved.push(typed[i]);
    } else if (pool[i]) {
      resolved.push(pool[i]);
    }
  }
  return resolved;
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
 * Each collapsed tie with stubLinks applies its own shim. Flank inset distances come from
 * `stubLinks` anchor ids when present; otherwise a geometric scan. When multiple tie networks
 * exist (e.g. copy-paste stack), only components overlapping that tie’s vertical span move.
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

  const scopeByVerticalBand =
    components.filter((c) => isTieBreakerNetwork(c)).length > 1;

  for (const tie of anchors) {
    const tg = tie.properties?.tieGroup;
    const excluded = new Set([...(tg?.memberIds || []), tie.id]);

    const baseVis = getComponentVisualConfig(tie.type);
    const tieLeft = tie.position?.x ?? 0;
    const tieW = tie.visualOverrides?.width ?? baseVis.width ?? 140;
    const tieRight = tieLeft + tieW;
    const gap = Number.isFinite(tg.stubLinks?.gapPx) ? tg.stubLinks.gapPx : 50;

    let { leftMaxRight, rightMinLeft } = flankExtentsFromStubLinks(
      tie,
      components,
      getComponentVisualConfig,
    );

    if (!Number.isFinite(leftMaxRight) || !Number.isFinite(rightMinLeft)) {
      leftMaxRight = -Infinity;
      rightMinLeft = Infinity;
      for (const c of components) {
        if (!c?.id || excluded.has(c.id)) continue;
        if (
          scopeByVerticalBand &&
          !componentOverlapsTieVerticalSpan(c, tie, getComponentVisualConfig)
        ) {
          continue;
        }
        const w = compWidthPx(c, getComponentVisualConfig);
        const cx = c.position?.x ?? 0;
        const right = cx + w;
        const left = cx;
        if (right < tieLeft) {
          leftMaxRight = Math.max(leftMaxRight, right);
        } else if (left > tieRight) {
          rightMinLeft = Math.min(rightMinLeft, left);
        }
      }
    }

    if (!Number.isFinite(leftMaxRight) || !Number.isFinite(rightMinLeft)) {
      continue;
    }

    const dRightward = tieLeft - gap - leftMaxRight;
    const dLeftward = rightMinLeft - (tieRight + gap);

    for (const c of components) {
      if (!c?.id || excluded.has(c.id)) continue;
      if (
        scopeByVerticalBand &&
        !componentOverlapsTieVerticalSpan(c, tie, getComponentVisualConfig)
      ) {
        continue;
      }
      const w = compWidthPx(c, getComponentVisualConfig);
      const cx = c.position?.x ?? 0;
      const right = cx + w;
      const left = cx;
      if (right < tieLeft) {
        shiftById.set(c.id, dRightward);
      } else if (left > tieRight) {
        shiftById.set(c.id, -dLeftward);
      }
    }
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
  const tieKey = tieCompAnchors.id || tieRenderComp.id || 'tie';

  const leftAnchors = resolveStubAnchorRenderComponents(
    sl.leftAnchorIds,
    'left',
    tieRenderComp,
    renderComponents,
    getComponentVisualConfig,
  );
  const rightAnchors = resolveStubAnchorRenderComponents(
    sl.rightAnchorIds,
    'right',
    tieRenderComp,
    renderComponents,
    getComponentVisualConfig,
  );

  const segs = [];
  let ki = 0;
  for (const c of leftAnchors) {
    const x1 = anchorRightEdge(c, getComponentVisualConfig);
    const y = anchorCenterY(c, getComponentVisualConfig);
    segs.push({
      key: `tie-stub-L-${tieKey}-${ki}`,
      x1,
      y1: y,
      x2: tieLeft,
      y2: y,
    });
    ki += 1;
  }
  ki = 0;
  for (const c of rightAnchors) {
    const x2 = anchorLeftEdge(c);
    const y = anchorCenterY(c, getComponentVisualConfig);
    segs.push({
      key: `tie-stub-R-${tieKey}-${ki}`,
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
