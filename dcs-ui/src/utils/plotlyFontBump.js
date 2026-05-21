/** Plotly layouts/traces nest font blobs under keys like font, tickfont, textfont … */

const FONT_SIZE_KEYS = new Set([
  'font',
  'tickfont',
  'textfont',
  'titlefont',
  'labelfont',
  'insidetextfont',
  'outsidetextfont',
]);

function walk(node, delta) {
  if (node == null) return node;
  if (typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((x) => walk(x, delta));
  const out = { ...node };
  for (const [k, v] of Object.entries(out)) {
    if (
      FONT_SIZE_KEYS.has(k) &&
      v &&
      typeof v === 'object' &&
      typeof v.size === 'number' &&
      Number.isFinite(v.size)
    ) {
      out[k] = { ...v, size: Math.max(6, Math.round(v.size + delta)) };
    } else if (v !== null && typeof v === 'object') {
      out[k] = walk(v, delta);
    }
  }
  return out;
}

/** Deep-clone-ish bump (+delta px on each Plotly font.size). Delta 0 leaves reference stable. */
export function bumpPlotlyFonts(root, delta) {
  if (!delta || root == null) return root;
  return walk(root, delta);
}
