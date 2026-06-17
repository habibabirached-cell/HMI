/** conf3: helpers for split design canvas (UpperCanvas / BelowCanvas). */

import { buildDesignSectionMemberIdSets } from './designSectionVisibility';

export const CANVAS_PANE_UPPER = 'upper';
export const CANVAS_PANE_LOWER = 'lower';

export function splitTopSharePercent(bottomSharePercent) {
  return 100 - bottomSharePercent;
}

/** Which pane contains this clientY inside the split root element. */
export function resolveSplitPaneAtClientY(splitRootEl, clientY, bottomSharePercent) {
  if (!splitRootEl) return 'top';
  const rect = splitRootEl.getBoundingClientRect();
  const y = clientY - rect.top;
  const topH = rect.height * (splitTopSharePercent(bottomSharePercent) / 100);
  return y < topH ? 'top' : 'bottom';
}

/** Read persisted pane from a component; legacy designs default to UpperCanvas only. */
export function resolveComponentCanvasPane(component) {
  const raw = component?.canvasPane ?? component?.properties?.canvasPane;
  if (raw === CANVAS_PANE_LOWER || raw === 'lower' || raw === 'bottom') {
    return CANVAS_PANE_LOWER;
  }
  return CANVAS_PANE_UPPER;
}

export function paneKeyFromCanvasPane(canvasPane) {
  return canvasPane === CANVAS_PANE_LOWER ? 'bottom' : 'top';
}

export function canvasPaneFromPaneKey(paneKey) {
  return paneKey === 'bottom' ? CANVAS_PANE_LOWER : CANVAS_PANE_UPPER;
}

/** H-family designs (H2, H3, …) with a stacked lower SLD section (BESS / STATCOM). */
export function designHasStackedSections(components) {
  if (!components?.length) return false;
  const { lower } = buildDesignSectionMemberIdSets(components);
  return lower.size > 0;
}

function componentsHaveExplicitCanvasPanes(components) {
  return components.some(
    (c) => c.canvasPane === CANVAS_PANE_UPPER || c.canvasPane === CANVAS_PANE_LOWER,
  );
}

/**
 * Map stacked design sections → canvas panes (upper SLD → UpperCanvas, lower → BelowCanvas).
 * Used for H2/H3 and similar dual-stack designs in conf3.
 */
export function assignDesignSectionCanvasPanes(components) {
  if (!components?.length) return components;
  const { lower } = buildDesignSectionMemberIdSets(components);
  return components.map((comp) => ({
    ...comp,
    canvasPane: lower.has(comp.id) ? CANVAS_PANE_LOWER : CANVAS_PANE_UPPER,
  }));
}

/**
 * Normalize loaded components for split canvas.
 * When the design has stacked sections and no saved pane tags, partition by Y band.
 */
export function normalizeLoadedCanvasComponents(components, options = {}) {
  if (!Array.isArray(components)) return [];
  const assignFromDesignSections =
    options.assignFromDesignSections === true ||
    (options.assignFromDesignSections !== false &&
      designHasStackedSections(components) &&
      !componentsHaveExplicitCanvasPanes(components));

  if (assignFromDesignSections) {
    return assignDesignSectionCanvasPanes(components);
  }

  return components.map((comp) => ({
    ...comp,
    // Keep saved pane tags; never re-derive from Y on reload after user edits.
    canvasPane: comp.canvasPane ? resolveComponentCanvasPane(comp) : CANVAS_PANE_UPPER,
  }));
}

export function filterComponentsForCanvasPane(components, canvasPane) {
  return components.filter((c) => resolveComponentCanvasPane(c) === canvasPane);
}

/** foreignObject readout width (218) + gap (8) beside equipment blocks */
export const CANVAS_READOUT_EXTENT_PX = 226;

/**
 * Center a pane's content in the viewport, including connection-readout overflow.
 */
export function computePaneCenteringPan(
  components,
  {
    viewWidthPx,
    paneHeightPx,
    zoom,
    canvasBlockTypeScale = {},
    paddingPx = 20,
    getVisualConfig,
    getBlockDimensions,
  },
) {
  if (!components?.length || viewWidthPx <= 0 || paneHeightPx <= 0 || !getVisualConfig || !getBlockDimensions) {
    return { x: 0, y: 0 };
  }
  const z = Math.max(Number(zoom) || 1, 0.01);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of components) {
    const vis = getVisualConfig(c.type);
    const { width, height } = getBlockDimensions(c, vis, canvasBlockTypeScale);
    const x = c.position?.x ?? 0;
    const y = c.position?.y ?? 0;
    let left = x;
    let right = x + width;
    if (c.connectionReadout) {
      const side = c.connectionReadout.side === 'right' ? 'right' : 'left';
      if (side === 'left') left -= CANVAS_READOUT_EXTENT_PX;
      else right += CANVAS_READOUT_EXTENT_PX;
    }
    minX = Math.min(minX, left);
    maxX = Math.max(maxX, right);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + height);
  }

  if (!Number.isFinite(minX)) return { x: 0, y: 0 };

  const pad = paddingPx;
  const contentW = (maxX - minX) * z;
  const contentH = (maxY - minY) * z;
  const availW = Math.max(0, viewWidthPx - pad * 2);
  const availH = Math.max(0, paneHeightPx - pad * 2);

  let x = (viewWidthPx - contentW) / 2 - minX * z;
  let y = (paneHeightPx - contentH) / 2 - minY * z;

  if (contentW > availW) {
    x = pad - minX * z;
  }
  if (contentH > availH) {
    y = pad - minY * z;
  }

  return { x, y };
}
