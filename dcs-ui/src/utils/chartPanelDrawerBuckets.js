/** chart1 = anything not explicitly uiDrawer 'chart2' */

export function isChartUiDrawer2(c) {
  return c?.uiDrawer === 'chart2';
}

/**
 * @param {Array} fullCharts — openCharts
 * @param {Array<Array<number>>} stacks — indices into fullCharts
 * @param {boolean} drawer2 — true = chart2 bucket, false = chart1
 * @returns {{ subset: Array, stacks: Array<Array<number>> }} stacks index into subset
 */
export function remapStacksPerDrawerRow(fullCharts, stacks, drawer2) {
  const subset = fullCharts.filter((c) =>
    drawer2 ? isChartUiDrawer2(c) : !isChartUiDrawer2(c),
  );
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
export function sanitizeStacksForDrawers(openChartsArr, stacks) {
  const drawerBucket = (i) =>
    openChartsArr[i] && isChartUiDrawer2(openChartsArr[i]) ? 'chart2' : 'chart1';
  return (stacks || []).filter((stack) => {
    if (!stack.length) return false;
    const d0 = drawerBucket(stack[0]);
    return stack.every((fi) => drawerBucket(fi) === d0);
  });
}
