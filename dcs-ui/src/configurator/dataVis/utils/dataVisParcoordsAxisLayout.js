import {
  DATAVIS_CFE_COL,
  DATAVIS_UNIT_COUNT_COLUMNS,
  dataVisParallelAxisLabelLines,
} from './dataVisColumnDisplayLabel';
import { parcoordsAxisIconForColumn } from './dataVisParcoordsAxisIcons';

export const DATAVIS_PARCOORDS_LCOE_COLORBAR_TITLE =
  'Levelized Cost of Electricity (LCOE)';

const LINE_HEIGHT_EM = 1.14;
/** Space between bottom of title block and top of axis spine (px). */
const TITLE_GAP_ABOVE_AXIS_PX = 30;
/** Extra lift above colorbar top (px). */
const TITLE_LIFT_ABOVE_COLORBAR_PX = 12;

const COLORBAR_COARSER_STEPS = [25, 20, 15, 10];
const COLORBAR_MAX_TICKS = 15;

function ticksForStep(lo, hi, step) {
  const ticks = [];
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t);
  return ticks;
}

/** LCOE colorbar ticks within [dataLo, dataHi]; every label ends in 0 or 5 (step 5 by default). */
export function colorbarTickvalsEndingZeroOrFive(dataLo, dataHi, targetCount = 6) {
  let lo = Math.floor(Number(dataLo) / 5) * 5;
  let hi = Math.ceil(Number(dataHi) / 5) * 5;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];

  if (hi <= lo) {
    const anchor = Math.round(Number(dataHi) / 5) * 5;
    const half = Math.floor((targetCount - 1) / 2);
    lo = anchor - 5 * half;
    hi = lo + 5 * (targetCount - 1);
  }

  let ticks = ticksForStep(lo, hi, 5);
  if (ticks.length > COLORBAR_MAX_TICKS) {
    for (const step of COLORBAR_COARSER_STEPS) {
      const candidate = ticksForStep(lo, hi, step);
      if (candidate.length >= 2 && candidate.length <= COLORBAR_MAX_TICKS) {
        ticks = candidate;
        break;
      }
    }
  }

  return ticks.length >= 2 ? ticks : [lo, lo + 5];
}

export function formatColorbarTickZeroOrFive(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n));
}

export function sortedParcoordsYAxes(graphDiv) {
  if (!graphDiv?.querySelector) return [];
  const controlView = graphDiv.querySelector('.parcoords-control-view');
  const nodes = controlView
    ? [...controlView.querySelectorAll('.y-axis')]
    : [...graphDiv.querySelectorAll('.parcoords .y-axis')];
  return nodes.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
}

export function parallelDimensionLayout(columnKey, axisRange) {
  const base = axisRange ? { range: axisRange } : {};

  if (columnKey === '7HA Unit #') {
    const maxV = Math.max(3, Math.ceil(Number(axisRange?.[1] ?? 3)));
    const tickvals = [];
    for (let t = 0; t <= maxV; t += 1) tickvals.push(t);
    return {
      range: [0, maxV],
      tickvals,
      ticktext: tickvals.map(String),
    };
  }

  if (columnKey === 'LM2500 Unit #') {
    const maxV = Math.max(1, Math.round(Number(axisRange?.[1] ?? 24)));
    const tickvals = [0, 1];
    for (let t = 2; t <= maxV; t += 2) tickvals.push(t);
    if (tickvals[tickvals.length - 1] < maxV) tickvals.push(maxV);
    return {
      range: [0, maxV],
      tickvals,
      ticktext: tickvals.map(String),
    };
  }

  if (columnKey === DATAVIS_CFE_COL) {
    const tickvals = [0, 25, 50, 75, 100];
    return {
      range: [0, 100],
      tickvals,
      ticktext: tickvals.map((t) => `${t}%`),
    };
  }

  return base;
}

function axisDomainEl(axisEl) {
  return (
    axisEl.querySelector('.axis path.domain')
    || axisEl.querySelector('path.domain, line.domain')
  );
}

function shiftAxisTitleClientY(textEl, deltaClientY) {
  if (!deltaClientY || !Number.isFinite(deltaClientY)) return;
  const parent = textEl.parentNode;
  const svg = textEl.ownerSVGElement;
  if (!svg?.createSVGPoint || !parent?.getCTM) return;

  const y = parseFloat(textEl.getAttribute('y') || '0');
  const pt0 = svg.createSVGPoint();
  const pt1 = svg.createSVGPoint();
  pt0.x = 0;
  pt0.y = 0;
  pt1.x = 0;
  pt1.y = 1;
  const ctm = parent.getCTM();
  const local0 = pt0.matrixTransform(ctm);
  const local1 = pt1.matrixTransform(ctm);
  const pxPerLocalY = local1.y - local0.y;
  if (Math.abs(pxPerLocalY) < 1e-6) return;

  textEl.setAttribute('y', String(y + deltaClientY / pxPerLocalY));
}

/** Lift axis titles to ~colorbar top with clear space above each spine. */
export function applyParcoordsAxisTitleVerticalAlign(graphDiv) {
  if (!graphDiv?.querySelector) return;
  const axes = sortedParcoordsYAxes(graphDiv);
  if (!axes.length) return;

  const outline =
    graphDiv.querySelector('.cboutline')
    || graphDiv.querySelector('.cbbg');
  let refTop = outline?.getBoundingClientRect().top;
  if (refTop == null || !Number.isFinite(refTop)) {
    const domainTops = axes
      .map((axisEl) => axisDomainEl(axisEl)?.getBoundingClientRect().top)
      .filter((t) => Number.isFinite(t));
    if (!domainTops.length) return;
    refTop = Math.min(...domainTops) - 64;
  }

  axes.forEach((axisEl) => {
    const textEl = axisEl.querySelector('text.axis-title');
    const domain = axisDomainEl(axisEl);
    if (!textEl || !domain) return;

    const domainTop = domain.getBoundingClientRect().top;
    const titleRect = textEl.getBoundingClientRect();
    const titleHeight = titleRect.height || 24;

    let targetTop = refTop - TITLE_LIFT_ABOVE_COLORBAR_PX;
    const maxTitleBottom = domainTop - TITLE_GAP_ABOVE_AXIS_PX;
    if (targetTop + titleHeight > maxTitleBottom) {
      targetTop = maxTitleBottom - titleHeight;
    }

    const deltaClient = targetTop - titleRect.top;
    if (Math.abs(deltaClient) >= 0.5) {
      shiftAxisTitleClientY(textEl, deltaClient);
    }
  });
}

/** Ensure two-line axis titles on Plotly parcoords (`.axis-title`). */
export function applyParcoordsHorizontalAxisLabels(graphDiv, dimensionKeys) {
  if (!dimensionKeys?.length) return;
  const axes = sortedParcoordsYAxes(graphDiv);
  axes.forEach((axisEl, index) => {
    const key = dimensionKeys[index];
    if (!key) return;
    const lines = dataVisParallelAxisLabelLines(key);
    const textEl = axisEl.querySelector('text.axis-title');
    if (!textEl) return;

    textEl.removeAttribute('transform');
    textEl.setAttribute('text-anchor', 'middle');

    const anchorX = textEl.getAttribute('x') ?? '0';
    if (lines.length <= 1) {
      textEl.textContent = lines[0] ?? key;
      return;
    }

    textEl.textContent = '';
    lines.forEach((line, lineIndex) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.textContent = line;
      tspan.setAttribute('x', anchorX);
      tspan.setAttribute('text-anchor', 'middle');
      if (lineIndex === 0) {
        tspan.setAttribute('dy', `${-((lines.length - 1) / 2) * LINE_HEIGHT_EM}em`);
      } else {
        tspan.setAttribute('dy', `${LINE_HEIGHT_EM}em`);
      }
      textEl.appendChild(tspan);
    });
  });

  applyParcoordsAxisTitleVerticalAlign(graphDiv);
}

/** Keep every colorbar tick label visible (Plotly may cull when labels are large). */
export function applyParcoordsColorbarTickLabels(graphDiv) {
  if (!graphDiv?.querySelector) return;
  const cb = graphDiv.querySelector('g.cb');
  if (!cb) return;
  cb.querySelectorAll('.tick').forEach((tickG) => {
    tickG.removeAttribute('visibility');
    tickG.style.display = '';
    tickG.style.visibility = 'visible';
    tickG.style.opacity = '1';
    const textEl = tickG.querySelector('text');
    if (textEl) {
      textEl.removeAttribute('visibility');
      textEl.style.display = '';
      textEl.style.visibility = 'visible';
      textEl.style.opacity = '1';
    }
  });
}

const PARCOORDS_CB_TITLE_CLASS = 'dataVis-parcoords-cb-title';
const PARCOORDS_CB_TITLE_HTML_CLASS = 'dataVis-parcoords-cb-title-html';
export const PARCOORDS_AXIS_ICONS_LAYER_CLASS = 'dataVis-parcoords-axis-icons';

export function removeParcoordsAxisIcons(mount) {
  mount?.querySelector?.(`.${PARCOORDS_AXIS_ICONS_LAYER_CLASS}`)?.remove();
}

/** HTML icons centered above each parcoords axis title (Explore Data). */
export function applyParcoordsAxisTitleIcons(graphDiv, dimensionKeys, { compact = false } = {}) {
  const mount = parcoordsChartMount(graphDiv);
  if (!mount || !dimensionKeys?.length) return;

  removeParcoordsAxisIcons(mount);
  const layer = document.createElement('div');
  layer.className = PARCOORDS_AXIS_ICONS_LAYER_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  mount.appendChild(layer);

  const mountRect = mount.getBoundingClientRect();
  const iconSize = compact ? 120 : 48;
  const gapAboveTitle = 8;
  const axes = sortedParcoordsYAxes(graphDiv);

  axes.forEach((axisEl, index) => {
    const key = dimensionKeys[index];
    const meta = parcoordsAxisIconForColumn(key);
    if (!meta) return;
    const textEl = axisEl.querySelector('text.axis-title');
    if (!textEl) return;
    const titleRect = textEl.getBoundingClientRect();
    if (titleRect.width < 2 || titleRect.height < 2) return;

    const wrap = document.createElement('div');
    wrap.className = 'dataVis-parcoords-axis-icon';
    const img = document.createElement('img');
    img.src = meta.src;
    img.alt = '';
    img.title = meta.alt || '';
    img.draggable = false;
    img.width = iconSize;
    img.height = iconSize;
    wrap.appendChild(img);

    const centerX = titleRect.left + titleRect.width / 2 - mountRect.left;
    const top = titleRect.top - mountRect.top - iconSize - gapAboveTitle;
    wrap.style.left = `${centerX}px`;
    wrap.style.top = `${top}px`;
    wrap.style.width = `${iconSize}px`;
    wrap.style.height = `${iconSize}px`;
    wrap.style.transform = 'translateX(-50%)';
    layer.appendChild(wrap);
  });
}

function parcoordsChartMount(graphDiv) {
  return graphDiv?.closest?.('.dataVis-chartBlock--parcoords') || graphDiv?.parentElement || null;
}

function parcoordsColorbarOutline(graphDiv) {
  if (!graphDiv?.querySelector) return null;
  return (
    graphDiv.querySelector('g.cb .cboutline') ||
    graphDiv.querySelector('g.cb .cbbg') ||
    graphDiv.querySelector('.cboutline') ||
    graphDiv.querySelector('.cbbg')
  );
}

export function removeParcoordsColorbarTitleOverlay(mount) {
  mount?.querySelector?.(`.${PARCOORDS_CB_TITLE_HTML_CLASS}`)?.remove();
}

function applyParcoordsColorbarTitleHtml(graphDiv, { compact = false } = {}) {
  const mount = parcoordsChartMount(graphDiv);
  const outline = parcoordsColorbarOutline(graphDiv);
  if (!mount || !outline) return false;

  const cb = graphDiv.querySelector('g.cb');
  const tickTexts = cb
    ? [...cb.querySelectorAll('.tick text')]
    : [...graphDiv.querySelectorAll('g.cb .tick text')];

  let el = mount.querySelector(`.${PARCOORDS_CB_TITLE_HTML_CLASS}`);
  if (!el) {
    el = document.createElement('div');
    el.className = PARCOORDS_CB_TITLE_HTML_CLASS;
    el.setAttribute('aria-hidden', 'true');
    mount.appendChild(el);
  }
  el.textContent = DATAVIS_PARCOORDS_LCOE_COLORBAR_TITLE;

  const barRect = outline.getBoundingClientRect();
  let anchorRight = barRect.right;
  if (tickTexts.length) {
    anchorRight = Math.max(...tickTexts.map((node) => node.getBoundingClientRect().right));
  }
  const mountRect = mount.getBoundingClientRect();
  const centerY = (barRect.top + barRect.bottom) / 2;
  const titleGapPx = compact ? 10 : 12;
  const titleSizePx = compact ? 20 : 22;

  el.style.position = 'absolute';
  el.style.left = `${anchorRight - mountRect.left + titleGapPx}px`;
  el.style.top = `${centerY - mountRect.top}px`;
  el.style.transform = 'translateY(-50%) rotate(-90deg)';
  el.style.transformOrigin = 'center center';
  el.style.fontSize = `${titleSizePx}px`;
  el.style.fontWeight = '700';
  el.style.color = '#1f2933';
  el.style.fontFamily = 'system-ui, sans-serif';
  el.style.whiteSpace = 'nowrap';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '6';
  el.style.lineHeight = '1';
  return true;
}

/** Vertical LCOE colorbar title to the right of tick labels (matches axis title size). */
export function applyParcoordsColorbarTitleLayout(graphDiv, { compact = false } = {}) {
  if (!graphDiv?.querySelector) return;

  graphDiv.querySelectorAll(`.${PARCOORDS_CB_TITLE_CLASS}`).forEach((node) => node.remove());

  const plotlyTitleEls = graphDiv.querySelectorAll('.cbtitle text, .cbtitleunshift text');
  plotlyTitleEls.forEach((el) => {
    el.textContent = DATAVIS_PARCOORDS_LCOE_COLORBAR_TITLE;
    el.removeAttribute('visibility');
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.display = '';
  });

  const plotlyTitleRendered = [...plotlyTitleEls].some((el) => {
    const box = el.getBoundingClientRect();
    return box.width > 2 && box.height > 2;
  });

  const mount = parcoordsChartMount(graphDiv);
  if (plotlyTitleRendered) {
    removeParcoordsColorbarTitleOverlay(mount);
    return;
  }

  applyParcoordsColorbarTitleHtml(graphDiv, { compact });
}

export function applyParcoordsIntegerUnitTicks(graphDiv, dimensionKeys) {
  if (!graphDiv?.querySelector || !dimensionKeys?.length) return;
  const unitSet = new Set(DATAVIS_UNIT_COUNT_COLUMNS);
  const axes = sortedParcoordsYAxes(graphDiv);
  axes.forEach((axisEl, index) => {
    const col = dimensionKeys[index];
    if (col === DATAVIS_CFE_COL) {
      axisEl.querySelectorAll('.axis .tick text, .axis-extent-top-text, .axis-extent-bottom-text').forEach((textEl) => {
        const n = Number(String(textEl.textContent).replace(/[%\s,]/g, ''));
        if (Number.isFinite(n)) textEl.textContent = `${Math.round(n)}%`;
      });
      return;
    }
    if (!unitSet.has(col)) return;
    axisEl.querySelectorAll('.axis .tick text').forEach((textEl) => {
      const n = Number(String(textEl.textContent).replace(/,/g, ''));
      if (Number.isFinite(n)) textEl.textContent = String(Math.round(n));
    });
  });
}
