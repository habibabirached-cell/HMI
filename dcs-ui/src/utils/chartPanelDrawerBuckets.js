/** Labeled chart drawers: chart1 (default) through chart4 (conf3 quad grid). */

export const CHART_DRAWER_KEYS = ['chart1', 'chart2', 'chart3', 'chart4'];

export function normalizeChartUiDrawer(raw) {
  const d = typeof raw === 'string' ? raw.trim() : '';
  if (d === 'chart2' || d === 'chart3' || d === 'chart4') return d;
  return 'chart1';
}

export function getChartUiDrawer(c) {
  return normalizeChartUiDrawer(c?.uiDrawer);
}

/** @deprecated use getChartUiDrawer(c) === 'chart2' */
export function isChartUiDrawer2(c) {
  return getChartUiDrawer(c) === 'chart2';
}

export function uiDrawerFieldsFromChartDef(chartDef) {
  const d = normalizeChartUiDrawer(chartDef?.ui_drawer ?? chartDef?.uiDrawer);
  return d === 'chart1' ? {} : { uiDrawer: d };
}

export function drawerShortLabel(drawerKey) {
  return String(drawerKey || 'chart1').replace('chart', 'c');
}

/**
 * Bucket for stack validation: conf1/2/4 use chart1|chart2; conf3 uses all four.
 */
export function stackDrawerBucket(chart, { quad = false } = {}) {
  const d = getChartUiDrawer(chart);
  if (quad) return d;
  return d === 'chart2' ? 'chart2' : 'chart1';
}

/**
 * @param {Array} fullCharts — openCharts
 * @param {Array<Array<number>>} stacks — indices into fullCharts
 * @param {string} drawerKey — chart1…chart4
 * @param {boolean} [dualLegacy] — conf1/2/4: chart1 bucket = not chart2
 */
export function remapStacksPerDrawerRow(fullCharts, stacks, drawerKey, dualLegacy = false) {
  let subset;
  if (dualLegacy) {
    const isDrawer2 = drawerKey === 'chart2';
    subset = fullCharts.filter((c) =>
      isDrawer2 ? getChartUiDrawer(c) === 'chart2' : getChartUiDrawer(c) !== 'chart2',
    );
  } else {
    const target = normalizeChartUiDrawer(drawerKey);
    subset = fullCharts.filter((c) => getChartUiDrawer(c) === target);
  }
  const idToSubsetIdx = {};
  subset.forEach((c, i) => {
    idToSubsetIdx[c.id] = i;
  });
  const outStacks = [];
  for (const stack of stacks || []) {
    const mapped = [];
    for (const fi of stack) {
      const ch = fullCharts[fi];
      if (!ch || idToSubsetIdx[ch.id] === undefined) {
        mapped.length = 0;
        break;
      }
      mapped.push(idToSubsetIdx[ch.id]);
    }
    if (mapped.length >= 2) outStacks.push(mapped);
  }
  return { subset, stacks: outStacks };
}

/** Stacks are indices into chartsList — same stacking rules as ChartPanel. */
export function buildDisplayUnitsFromStacks(chartsList, stacksIntoThisList) {
  const emitted = new Set();
  const units = [];
  (stacksIntoThisList || []).forEach((stack) => {
    const stackCharts = stack.map((i) => chartsList[i]).filter(Boolean);
    if (stackCharts.length >= 2) {
      const minIdx = Math.min(...stack);
      units.push({ type: 'stack', charts: stackCharts, minIndex: minIdx });
      stack.forEach((i) => emitted.add(i));
    }
  });
  chartsList.forEach((chart, i) => {
    if (!emitted.has(i)) units.push({ type: 'single', charts: [chart], minIndex: i });
  });
  units.sort((a, b) => a.minIndex - b.minIndex);
  return units;
}

/** Drop stacks that span charts in different drawers (after a move). */
export function sanitizeStacksForDrawers(openChartsArr, stacks, { quad = false } = {}) {
  const drawerBucket = (i) => stackDrawerBucket(openChartsArr[i], { quad });
  return (stacks || []).filter((stack) => {
    if (!stack.length) return false;
    const d0 = drawerBucket(stack[0]);
    return stack.every((fi) => drawerBucket(fi) === d0);
  });
}
