/** SVG overlay: true thick pink stroke for lowest-LCOE row (Plotly parcoords cannot do per-line width/color). */

export const BEST_LCOE_OVERLAY_STROKE_PX = 3;
export const BEST_LCOE_OVERLAY_COLOR = '#ff1493';

const OVERLAY_CLASS = 'dataVis-best-lcoe-overlay';

function overlayRoots(mountEl, graphDiv) {
  const roots = new Set();
  if (graphDiv) roots.add(graphDiv);
  if (mountEl) {
    roots.add(mountEl);
    mountEl.querySelectorAll('.js-plotly-plot, .plot-container, .svg-container').forEach((el) => {
      roots.add(el);
    });
  }
  return [...roots];
}

function removeAllOverlays(mountEl, graphDiv) {
  overlayRoots(mountEl, graphDiv).forEach((root) => {
    root.querySelectorAll(`.${OVERLAY_CLASS}`).forEach((el) => el.remove());
  });
}

function parseAxisNumber(text) {
  if (text == null) return NaN;
  return Number(String(text || '').replace(/,/g, '').trim());
}

function sortedControlAxes(graphDiv) {
  const controlView = graphDiv.querySelector('.parcoords-control-view');
  const nodes = controlView
    ? [...controlView.querySelectorAll('.y-axis')]
    : [...graphDiv.querySelectorAll('.parcoords .y-axis')];
  return nodes.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
}

function axisDomainEl(axisEl) {
  return (
    axisEl.querySelector('.axis path.domain')
    || axisEl.querySelector('path.domain, line.domain')
  );
}

function numericRangeForAxis(axisEl, specRange) {
  if (
    specRange
    && specRange.length === 2
    && Number.isFinite(specRange[0])
    && Number.isFinite(specRange[1])
    && specRange[0] !== specRange[1]
  ) {
    return [specRange[0], specRange[1]];
  }
  const topText = parseAxisNumber(axisEl.querySelector('.axis-extent-top-text')?.textContent);
  const botText = parseAxisNumber(axisEl.querySelector('.axis-extent-bottom-text')?.textContent);
  if (!Number.isFinite(topText) || !Number.isFinite(botText) || topText === botText) {
    return null;
  }
  const lo = Math.min(topText, botText);
  const hi = Math.max(topText, botText);
  return [lo, hi];
}

function xSpineView(axisEl) {
  const domain = axisDomainEl(axisEl);
  if (domain) {
    const r = domain.getBoundingClientRect();
    return r.left + r.width / 2;
  }
  const brush = axisEl.querySelector('.axis-brush');
  if (brush) {
    const r = brush.getBoundingClientRect();
    return r.left + r.width / 2;
  }
  const ar = axisEl.getBoundingClientRect();
  return ar.left + ar.width / 2;
}

/** Map data value to screen Y using the d3 axis spine (matches WebGL line positions). */
function yForValueView(axisEl, value, specRange) {
  if (!Number.isFinite(Number(value))) return null;

  const domain = axisDomainEl(axisEl);
  const range = numericRangeForAxis(axisEl, specRange);
  if (!domain || !range) return null;

  const [lo, hi] = range;
  const dr = domain.getBoundingClientRect();
  if (dr.height < 1) return null;

  const yTop = dr.top;
  const yBot = dr.bottom;
  const t = (hi - Number(value)) / (hi - lo);
  const clamped = Math.max(0, Math.min(1, t));
  return yTop + clamped * (yBot - yTop);
}

function buildPoints(graphDiv, spec) {
  const keys = spec.dimensionKeys;
  const axes = sortedControlAxes(graphDiv);
  if (axes.length < 2) return [];

  const points = [];
  keys.forEach((key, index) => {
    const value = spec.valuesByDim[key];
    const axisEl = axes[index];
    if (!axisEl) return;
    const x = xSpineView(axisEl);
    const y = yForValueView(axisEl, value, spec.axisRanges?.[key]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    points.push({ x, y });
  });
  return points;
}

/**
 * @param {HTMLElement} mountEl chart wrapper
 * @param {HTMLElement} graphDiv Plotly graph div (.js-plotly-plot)
 * @param {object} spec overlay spec from DataVisParallelTab
 */
export function syncBestLcoeOverlay(mountEl, graphDiv, spec) {
  removeAllOverlays(mountEl, graphDiv);

  if (!graphDiv) return;

  if (!spec?.dimensionKeys?.length || !spec.valuesByDim) {
    return;
  }

  const points = buildPoints(graphDiv, spec);
  if (points.length < 2) return;

  const hostRect = graphDiv.getBoundingClientRect();
  if (hostRect.width < 8 || hostRect.height < 8) return;

  const localPoints = points.map((p) => ({
    x: p.x - hostRect.left,
    y: p.y - hostRect.top,
  }));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', OVERLAY_CLASS);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', String(hostRect.width));
  svg.setAttribute('height', String(hostRect.height));
  svg.setAttribute('viewBox', `0 0 ${hostRect.width} ${hostRect.height}`);
  Object.assign(svg.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${hostRect.width}px`,
    height: `${hostRect.height}px`,
    pointerEvents: 'none',
    zIndex: '100',
    overflow: 'visible',
  });

  if (getComputedStyle(graphDiv).position === 'static') {
    graphDiv.style.position = 'relative';
  }

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute(
    'points',
    localPoints.map((p) => `${p.x},${p.y}`).join(' '),
  );
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', BEST_LCOE_OVERLAY_COLOR);
  polyline.setAttribute('stroke-width', String(BEST_LCOE_OVERLAY_STROKE_PX));
  polyline.setAttribute('stroke-linecap', 'round');
  polyline.setAttribute('stroke-linejoin', 'round');
  polyline.setAttribute('opacity', '1');

  svg.appendChild(polyline);
  graphDiv.appendChild(svg);
}

export function removeBestLcoeOverlay(mountEl, graphDiv) {
  removeAllOverlays(mountEl, graphDiv);
}
