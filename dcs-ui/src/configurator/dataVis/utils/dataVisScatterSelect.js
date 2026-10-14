/** Resolve row ids from Plotly scatter/scattergl box or point selection. */

function readBoxRange(event) {
  if (event?.range?.x?.length >= 2 && event?.range?.y?.length >= 2) {
    return {
      x0: Math.min(event.range.x[0], event.range.x[1]),
      x1: Math.max(event.range.x[0], event.range.x[1]),
      y0: Math.min(event.range.y[0], event.range.y[1]),
      y1: Math.max(event.range.y[0], event.range.y[1]),
    };
  }
  const sel = event?.selections?.[0];
  if (sel && sel.x0 != null && sel.x1 != null && sel.y0 != null && sel.y1 != null) {
    return {
      x0: Math.min(sel.x0, sel.x1),
      x1: Math.max(sel.x0, sel.x1),
      y0: Math.min(sel.y0, sel.y1),
      y1: Math.max(sel.y0, sel.y1),
    };
  }
  const x0 = event?.['selections[0].x0'];
  const x1 = event?.['selections[0].x1'];
  const y0 = event?.['selections[0].y0'];
  const y1 = event?.['selections[0].y1'];
  if (x0 != null && x1 != null && y0 != null && y1 != null) {
    return {
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      y0: Math.min(y0, y1),
      y1: Math.max(y0, y1),
    };
  }
  return null;
}

function restrictToEligible(ids, eligibleRowIds) {
  if (!eligibleRowIds) return ids;
  if (eligibleRowIds.size === 0) return [];
  return ids.filter((id) => eligibleRowIds.has(id));
}

function idsFromPoints(event, payload, eligibleRowIds) {
  const rowIds = payload?.row_ids;
  if (!rowIds?.length) return [];

  const fromCustom = event?.points
    ?.map((p) => p.customdata)
    .filter((id) => id != null && Number.isFinite(Number(id)));
  if (fromCustom?.length) {
    return restrictToEligible([...new Set(fromCustom.map(Number))], eligibleRowIds);
  }

  const out = [];
  for (const p of event?.points || []) {
    const idx = p.pointIndex ?? p.pointNumber;
    if (Number.isInteger(idx) && idx >= 0 && idx < rowIds.length) {
      const id = rowIds[idx];
      if (id != null) out.push(Number(id));
    }
  }
  return restrictToEligible([...new Set(out)], eligibleRowIds);
}

function idsFromBoxRange(box, payload, eligibleRowIds) {
  const xs = payload?.x;
  const ys = payload?.y;
  const rowIds = payload?.row_ids;
  if (!box || !xs?.length || !ys?.length || !rowIds?.length) return [];
  const out = [];
  for (let i = 0; i < xs.length; i += 1) {
    const px = Number(xs[i]);
    const py = Number(ys[i]);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    if (px >= box.x0 && px <= box.x1 && py >= box.y0 && py <= box.y1) {
      const id = rowIds[i];
      if (id != null) out.push(Number(id));
    }
  }
  return restrictToEligible([...new Set(out)], eligibleRowIds);
}

export function readBoxRangeFromGraphDiv(graphDiv) {
  const selections = graphDiv?._fullLayout?.selections;
  if (!selections?.length) return null;
  const sel = selections[0];
  if (sel?.x0 == null || sel?.x1 == null || sel?.y0 == null || sel?.y1 == null) return null;
  return {
    x0: Math.min(sel.x0, sel.x1),
    x1: Math.max(sel.x0, sel.x1),
    y0: Math.min(sel.y0, sel.y1),
    y1: Math.max(sel.y0, sel.y1),
  };
}

/**
 * @param {Set<number>|null} eligibleRowIds when set, only ids in the current view filter (highlight) count
 */
export function rowIdsFromScatterSelect(event, payload, graphDiv = null, eligibleRowIds = null) {
  if (!payload) return [];
  const fromPoints = idsFromPoints(event, payload, eligibleRowIds);
  if (fromPoints.length) return fromPoints;
  let box = readBoxRange(event);
  if (!box && graphDiv) box = readBoxRangeFromGraphDiv(graphDiv);
  return idsFromBoxRange(box, payload, eligibleRowIds);
}
