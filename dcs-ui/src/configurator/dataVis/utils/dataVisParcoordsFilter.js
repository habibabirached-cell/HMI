/** Parse Plotly parcoords axis brushes into column range maps for backend filters. */

function bandFromConstraintrange(constraintrange) {
  if (constraintrange == null) return null;
  if (!Array.isArray(constraintrange) || !constraintrange.length) return null;

  const ranges = Array.isArray(constraintrange[0]) ? constraintrange : [constraintrange];
  const first = ranges.find((r) => Array.isArray(r) && r.length >= 2);
  if (!first) return null;

  const lo = Number(first[0]);
  const hi = Number(first[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;

  return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
}

function extractBandFromEvent(eventData, index) {
  const direct = eventData[`dimensions[${index}].constraintrange`];
  const lo = eventData[`dimensions[${index}].constraintrange[0][0]`];
  const hi = eventData[`dimensions[${index}].constraintrange[0][1]`];
  if (direct === null) return null;
  if (Array.isArray(direct) && !direct.length) return null;
  if (Array.isArray(direct) && direct.length) {
    return bandFromConstraintrange(Array.isArray(direct[0]) ? direct : [direct]);
  }
  if (lo != null && hi != null) {
    return bandFromConstraintrange([lo, hi]);
  }
  return null;
}

export function dimensionMentionedInEvent(eventData, index) {
  if (!eventData) return false;
  const prefix = `dimensions[${index}].constraintrange`;
  return Object.keys(eventData).some((key) => key === prefix || key.startsWith(`${prefix}[`));
}

/** Read active axis brushes from the live Plotly figure (most reliable for parcoords). */
export function constraintsFromParcoordsFigure(figure) {
  const data = figure?.data;
  if (!Array.isArray(data)) return {};

  const trace = data.find((t) => t?.type === 'parcoords') || data[0];
  const dimensions = trace?.dimensions;
  if (!Array.isArray(dimensions)) return {};

  const constraints = {};
  dimensions.forEach((dim) => {
    const label = dim?.label;
    if (!label) return;
    const band = bandFromConstraintrange(dim.constraintrange);
    if (band) constraints[label] = band;
  });
  return constraints;
}

export function parseParcoordsRelayout(eventData, dimensionColumns) {
  const constraints = {};
  if (!eventData || !dimensionColumns?.length) return constraints;

  dimensionColumns.forEach((col, i) => {
    if (!dimensionMentionedInEvent(eventData, i)) return;
    const band = extractBandFromEvent(eventData, i);
    if (band) constraints[col] = band;
  });

  return constraints;
}

/** Merge a relayout/restyle delta into the full axis brush map (parcoords sends one axis at a time). */
export function mergeParcoordsConstraints(prev, eventData, dimensionColumns) {
  if (!eventData || !dimensionColumns?.length) return prev || {};
  const next = { ...(prev || {}) };
  let touched = false;

  dimensionColumns.forEach((col, i) => {
    if (!dimensionMentionedInEvent(eventData, i)) return;
    touched = true;
    const band = extractBandFromEvent(eventData, i);
    if (band) next[col] = band;
    else delete next[col];
  });

  return touched ? next : prev || {};
}

export function rowIdsMatchingConstraints(payload, constraintsByColumn) {
  const dims = payload?.dimensions || [];
  if (!dims.length) return [];
  const entries = Object.entries(constraintsByColumn || {});
  if (!entries.length) return null;

  const rowIds = payload.row_ids;
  const n = rowIds?.length ?? payload.values?.[dims[0]]?.length ?? 0;
  if (!n) return [];

  const matched = [];
  for (let i = 0; i < n; i += 1) {
    let ok = true;
    for (const [col, band] of entries) {
      const v = Number(payload.values?.[col]?.[i]);
      if (!Number.isFinite(v) || v < band.min || v > band.max) {
        ok = false;
        break;
      }
    }
    if (ok) matched.push(rowIds ? rowIds[i] : i);
  }
  return matched;
}
