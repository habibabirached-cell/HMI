import {
  DATAVIS_CFE_COL,
  DATAVIS_UNIT_COUNT_COLUMNS,
  dataVisParallelAxisLabelLines,
} from './dataVisColumnDisplayLabel';
import {
  exploreWallAxisEnergyKind,
  exploreWallSwimlaneSpec,
  orderExploreWallParallelDimensions,
} from './dataVisExploreWallParallelOrder';
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

function parcoordsDimensionAxes(graphDiv, dimensionKeys) {
  if (!graphDiv?.querySelector || !dimensionKeys?.length) return [];
  const withTitle = sortedParcoordsYAxes(graphDiv).filter((el) =>
    el.querySelector('text.axis-title'),
  );
  if (withTitle.length === dimensionKeys.length) return withTitle;
  const byX = new Map();
  withTitle.forEach((el) => {
    const x = Math.round(el.getBoundingClientRect().left);
    if (!byX.has(x)) byX.set(x, el);
  });
  const deduped = [...byX.values()].sort(
    (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,
  );
  if (deduped.length >= dimensionKeys.length) {
    return deduped.slice(0, dimensionKeys.length);
  }
  return withTitle.slice(0, dimensionKeys.length);
}

function axisCenterX(axisEl) {
  const domain =
    axisEl.querySelector('.axis path.domain')
    || axisEl.querySelector('path.domain')
    || axisEl.querySelector('.axis')
    || axisEl;
  const r = domain.getBoundingClientRect();
  return (r.left + r.right) / 2;
}

function axisHeaderSpanRect(mount, dimensionAxes, fromIndex, toIndex, { padX = 10 } = {}) {
  if (fromIndex < 0 || toIndex >= dimensionAxes.length || fromIndex > toIndex) return null;
  const mountRect = mount.getBoundingClientRect();
  const centers = dimensionAxes.slice(fromIndex, toIndex + 1).map(axisCenterX);
  const left = Math.min(...centers) - mountRect.left - padX;
  const right = Math.max(...centers) - mountRect.left + padX;
  return {
    left: Math.max(0, left),
    width: Math.max(12, right - left),
  };
}

const EXPLORE_AXIS_KIND_CLASS = {
  green: 'dataVis-parcoords-axis--green',
  carbon: 'dataVis-parcoords-axis--carbon',
};

const EXPLORE_AXIS_SPINE_STROKE = {
  green: '#22c55e',
  carbon: '#171717',
};

const EXPLORE_AXIS_SPINE_WIDTH = 3.5;

function paintParcoordsAxisSpine(axisEl, kind) {
  const stroke = kind ? EXPLORE_AXIS_SPINE_STROKE[kind] : '#000';
  const width = kind ? EXPLORE_AXIS_SPINE_WIDTH : 1;
  axisEl.querySelectorAll('path.domain, line.domain').forEach((node) => {
    node.setAttribute('stroke', stroke);
    node.setAttribute('stroke-width', String(width));
    node.style.stroke = stroke;
    node.style.strokeWidth = `${width}px`;
    node.style.strokeOpacity = '1';
  });
}

export function applyParcoordsExploreWallAxisSpines(graphDiv, dimensionKeys) {
  if (!graphDiv?.querySelector) return;
  const ordered = orderExploreWallParallelDimensions(dimensionKeys);
  const axes = parcoordsDimensionAxes(graphDiv, ordered);
  sortedParcoordsYAxes(graphDiv).forEach((axisEl) => {
    axisEl.classList.remove(
      EXPLORE_AXIS_KIND_CLASS.green,
      EXPLORE_AXIS_KIND_CLASS.carbon,
    );
    paintParcoordsAxisSpine(axisEl, null);
  });
  axes.forEach((axisEl, index) => {
    const kind = exploreWallAxisEnergyKind(ordered[index]);
    if (!kind) return;
    axisEl.classList.add(EXPLORE_AXIS_KIND_CLASS[kind]);
    paintParcoordsAxisSpine(axisEl, kind);
  });
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
export const PARCOORDS_SWIMLANE_LAYER_CLASS = 'dataVis-parcoords-swimlane';

export function removeParcoordsAxisIcons(mount) {
  mount?.querySelector?.(`.${PARCOORDS_AXIS_ICONS_LAYER_CLASS}`)?.remove();
  mount?.querySelector?.(`.${PARCOORDS_SWIMLANE_LAYER_CLASS}`)?.remove();
}

const SWIMLANE_BRACKET_STROKE = {
  'dataVis-parcoords-swimlane-label--parent': '#00695c',
  'dataVis-parcoords-swimlane-label--outcomes': '#475569',
  'dataVis-parcoords-swimlane-label--green': '#22c55e',
  'dataVis-parcoords-swimlane-label--carbon': '#171717',
};

const SWIMLANE_BRACKET_WIDTH = 4;

/** Horizontal crochet/bracket opening downward (label sits above). */
function swimlaneBracketStroke(className) {
  if (className.includes('--outcomes')) return SWIMLANE_BRACKET_STROKE['dataVis-parcoords-swimlane-label--outcomes'];
  if (className.includes('--green')) return SWIMLANE_BRACKET_STROKE['dataVis-parcoords-swimlane-label--green'];
  if (className.includes('--carbon')) return SWIMLANE_BRACKET_STROKE['dataVis-parcoords-swimlane-label--carbon'];
  if (className.includes('--parent')) return SWIMLANE_BRACKET_STROKE['dataVis-parcoords-swimlane-label--parent'];
  return '#64748b';
}

function appendSwimlaneBracket(layer, rect, topPx, className) {
  if (!rect || rect.width < 8) return;
  const w = Math.round(rect.width);
  const h = 18;
  const r = Math.min(14, Math.max(6, w * 0.07));
  const stroke = swimlaneBracketStroke(className);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `dataVis-parcoords-swimlane-bracket ${className}`);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.left = `${rect.left}px`;
  svg.style.top = `${Math.max(0, topPx)}px`;
  svg.style.width = `${w}px`;
  svg.style.height = `${h}px`;
  svg.style.overflow = 'visible';

  const d = `M 0,${h} C 0,${r} ${r},2 ${r * 2},2 L ${w - r * 2},2 C ${w - r},2 ${w},${r} ${w},${h}`;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', String(SWIMLANE_BRACKET_WIDTH));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  layer.appendChild(svg);
}

function placeSwimlaneGroup(layer, rect, labelTopPx, bracketTopPx, className, text) {
  if (!rect) return;
  const label = document.createElement('div');
  label.className = `dataVis-parcoords-swimlane-label ${className}`;
  label.textContent = text;
  label.style.left = `${rect.left}px`;
  label.style.width = `${rect.width}px`;
  label.style.top = `${Math.max(0, labelTopPx)}px`;
  layer.appendChild(label);
  appendSwimlaneBracket(layer, rect, bracketTopPx, className);
}

/** Top swim-lane headers (run after axis icons so brackets sit above pictures). */
export function applyParcoordsExploreWallSwimlaneHeaders(graphDiv, dimensionKeys) {
  const mount = parcoordsChartMount(graphDiv);
  if (!mount || !dimensionKeys?.length) return;

  const ordered = orderExploreWallParallelDimensions(dimensionKeys);
  const dimensionAxes = parcoordsDimensionAxes(graphDiv, ordered);
  if (dimensionAxes.length !== ordered.length) return;

  mount.querySelector(`.${PARCOORDS_SWIMLANE_LAYER_CLASS}`)?.remove();

  const spec = exploreWallSwimlaneSpec(ordered);
  if (!spec.energy && !spec.outcomes) return;

  const layer = document.createElement('div');
  layer.className = PARCOORDS_SWIMLANE_LAYER_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  mount.appendChild(layer);

  const mountRect = mount.getBoundingClientRect();
  const iconNodes = mount.querySelectorAll(
    `.${PARCOORDS_AXIS_ICONS_LAYER_CLASS} .dataVis-parcoords-axis-icon`,
  );
  let minIconTopRel = null;
  iconNodes.forEach((node) => {
    const t = node.getBoundingClientRect().top - mountRect.top;
    if (Number.isFinite(t)) {
      minIconTopRel = minIconTopRel == null ? t : Math.min(minIconTopRel, t);
    }
  });
  if (minIconTopRel == null) {
    const titleTops = dimensionAxes
      .map((el) => el.querySelector('text.axis-title')?.getBoundingClientRect().top)
      .filter((t) => Number.isFinite(t));
    const minTitleTop = titleTops.length ? Math.min(...titleTops) : mountRect.top + 160;
    minIconTopRel = minTitleTop - mountRect.top - 80;
  }

  const BRACKET_H = 20;
  const ICON_CLEARANCE = 16;
  const LABEL_H = 28;
  const ROW_GAP = 10;

  const subBracketTop = minIconTopRel - ICON_CLEARANCE - BRACKET_H;
  const subLabelTop = subBracketTop - ROW_GAP - LABEL_H;
  const parentBracketTop = subLabelTop - ROW_GAP - BRACKET_H;
  const parentLabelTop = parentBracketTop - ROW_GAP - LABEL_H;

  const energyRect = spec.energy
    ? axisHeaderSpanRect(mount, dimensionAxes, spec.energy.from, spec.energy.to)
    : null;
  const greenRect = spec.green
    ? axisHeaderSpanRect(mount, dimensionAxes, spec.green.from, spec.green.to)
    : null;
  const carbonRect = spec.carbon
    ? axisHeaderSpanRect(mount, dimensionAxes, spec.carbon.from, spec.carbon.to)
    : null;
  const outcomesRect = spec.outcomes
    ? axisHeaderSpanRect(mount, dimensionAxes, spec.outcomes.from, spec.outcomes.to)
    : null;

  placeSwimlaneGroup(
    layer,
    energyRect,
    parentLabelTop,
    parentBracketTop,
    'dataVis-parcoords-swimlane-label--parent',
    'Energy sources',
  );
  placeSwimlaneGroup(
    layer,
    outcomesRect,
    parentLabelTop,
    parentBracketTop,
    'dataVis-parcoords-swimlane-label--parent dataVis-parcoords-swimlane-label--outcomes',
    'Outcomes',
  );
  placeSwimlaneGroup(
    layer,
    greenRect,
    subLabelTop,
    subBracketTop,
    'dataVis-parcoords-swimlane-label--green',
    'Green energy',
  );
  placeSwimlaneGroup(
    layer,
    carbonRect,
    subLabelTop,
    subBracketTop,
    'dataVis-parcoords-swimlane-label--carbon',
    'Fossil Energy',
  );
}

/** Axis icons (Explore Data); swim-lane row replaces per-axis pills. */
export function applyParcoordsAxisTitleIcons(graphDiv, dimensionKeys, { compact = false } = {}) {
  const mount = parcoordsChartMount(graphDiv);
  if (!mount || !dimensionKeys?.length) return;

  const ordered = orderExploreWallParallelDimensions(dimensionKeys);
  const dimensionAxes = parcoordsDimensionAxes(graphDiv, ordered);

  mount.querySelector(`.${PARCOORDS_AXIS_ICONS_LAYER_CLASS}`)?.remove();
  applyParcoordsExploreWallAxisSpines(graphDiv, ordered);

  const layer = document.createElement('div');
  layer.className = PARCOORDS_AXIS_ICONS_LAYER_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  mount.appendChild(layer);

  const mountRect = mount.getBoundingClientRect();
  const iconSize = compact ? 140 : 140;
  const gapAboveTitle = 8;

  dimensionAxes.forEach((axisEl, index) => {
    const key = ordered[index];
    const meta = parcoordsAxisIconForColumn(key);
    if (!meta) return;
    const textEl = axisEl.querySelector('text.axis-title');
    if (!textEl) return;
    const titleRect = textEl.getBoundingClientRect();
    if (titleRect.width < 2 || titleRect.height < 2) return;

    const centerX = titleRect.left + titleRect.width / 2 - mountRect.left;
    const iconTop = titleRect.top - mountRect.top - iconSize - gapAboveTitle;

    const wrap = document.createElement('div');
    wrap.className = 'dataVis-parcoords-axis-icon';
    if (/\.(png|jpe?g|webp)(\?|$)/i.test(meta.src || '')) {
      wrap.classList.add('dataVis-parcoords-axis-icon--photo');
    }
    const img = document.createElement('img');
    img.src = meta.src;
    img.alt = '';
    img.title = meta.alt || '';
    img.draggable = false;
    img.width = iconSize;
    img.height = iconSize;
    wrap.appendChild(img);

    wrap.style.left = `${centerX}px`;
    wrap.style.top = `${iconTop}px`;
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
