export interface SimNode {
  p: number;
  q: number;
  v: number;
  i?: number;
  theta?: number;
}

export interface SimRow {
  t: number;
  freq: number;
  rocof: number;
  gep: SimNode;
  rs: SimNode;
  bess: SimNode;
}

/** Fallback telemetry when no CSV / use-case is loaded. */
function makeRow(t: number, p: number, q: number, v: number, f = 50): SimRow {
  return {
    t,
    freq: f,
    rocof: 0,
    gep: { p, q, v, i: 0, theta: 0 },
    rs: { p: p * 0.85, q: q * 0.7, v: v * 0.99, i: 0, theta: 0 },
    bess: { p: p * 0.1, q: q * 0.05, v: v * 0.98, i: 0, theta: 0 },
  };
}

export const simulation: SimRow[] = Array.from({ length: 200 }, (_, i) => {
  const t = i * 0.5;
  const wave = Math.sin(i / 18) * 8;
  return makeRow(t, 120 + wave, 15 + wave * 0.3, 72 + wave * 0.1, 49.98 + Math.sin(i / 40) * 0.04);
});
