import { simulation, type SimRow } from "@/data/simulation";
import { parseClientCsv } from "./csvParser";

export type { SimRow } from "@/data/simulation";

// Nominal voltage base used to express phasor magnitude in per-unit.
const V_BASE = 75.8;

export interface MetricPoint {
  t: number;
  p: number; // active power MW
  q: number; // reactive power MVAR
  v: number; // voltage pu
  f: number; // frequency Hz
}

export interface MetricSeries {
  points: MetricPoint[];
  last: MetricPoint;
}

export type Side = "gep" | "rs" | "bess";

const MODEL_GAIN: Record<string, number> = { SMIB: 1, MMI: 1.25, TWOAREA: 1.55 };
const HYBRID_GAIN: Record<string, number> = { GFMe: 1, GFM: 0.92, SynCon: 1.08 };

export interface SimOptions {
  model: string;
  hybrid: string;
  cbOn: boolean;
  event: string | null;
  offset: number; // rolling window start
  windowSize: number;
  rows?: SimRow[];
  pccGain?: { p: number; q: number; v: number };
  /** When true, play CSV data as-is (no synthetic event distortion). */
  useRawData?: boolean;
}

function eventFactor(event: string | null, side: Side, i: number, n: number) {
  if (!event) return { pf: 1, vf: 1, ff: 0 };
  // disturbance ramps in over the window then partially recovers
  const phase = i / Math.max(1, n - 1);
  const dip = Math.sin(phase * Math.PI); // 0 -> 1 -> 0
  switch (event) {
    case "FAULT_3PH":
      return { pf: 1 - 0.55 * dip, vf: 1 - 0.18 * dip, ff: -0.12 * dip };
    case "LINE_TRIP":
      return { pf: side === "rs" ? 1 - 0.7 * dip : 1 - 0.3 * dip, vf: 1 - 0.09 * dip, ff: -0.08 * dip };
    case "GEN_TRIP":
      return { pf: 1 - 0.45 * dip, vf: 1 - 0.06 * dip, ff: -0.15 * dip };
    case "LOAD":
      return { pf: 1 + 0.22 * dip, vf: 1 - 0.04 * dip, ff: -0.05 * dip };
    case "PQ_CHANGE":
      return { pf: 1 + 0.12 * dip, vf: 1 + 0.03 * dip, ff: 0.03 * dip };
    default:
      return { pf: 1, vf: 1, ff: 0 };
  }
}

export function buildSeries(side: Side, opts: SimOptions): MetricSeries {
  const data = opts.rows ?? simulation;
  const n = data.length;
  const gain = (MODEL_GAIN[opts.model] ?? 1) * (HYBRID_GAIN[opts.hybrid] ?? 1);
  const cbMul = opts.cbOn ? 1 : side === "bess" ? 0.15 : 0.6;
  const pcc = opts.pccGain ?? { p: 1, q: 1, v: 1 };
  const isGrid = side === "gep";
  const points: MetricPoint[] = [];
  for (let k = 0; k < opts.windowSize; k++) {
    const idx = (opts.offset + k) % n;
    const row = data[idx];
    const node = row[side];
    const ev = opts.useRawData ? { pf: 1, vf: 1, ff: 0 } : eventFactor(opts.event, side, k, opts.windowSize);
    points.push({
      t: row.t,
      p: node.p * gain * cbMul * ev.pf * (isGrid ? pcc.p : 1),
      q: node.q * gain * ev.pf * (isGrid ? pcc.q : 1),
      v: (node.v / V_BASE) * (opts.cbOn ? 1 : 0.97) * ev.vf * (isGrid ? pcc.v : 1),
      f: row.freq + ev.ff,
    });
  }
  return { points, last: points[points.length - 1] };
}

export function rowsToCsv(rows: SimRow[]): string {
  const header =
    "t_Main,Freq_GEP,ROCOF_GEP,Ppos_GEP_MW,Qpos_GEP_MVAR,V_PM_GEP,Ppos_RS_MW,Qpos_RS_MVAR,V_PM_RS,Ppos_BESS_MW,Qpos_BESS_MVAR,V_PM_BESS";
  const lines = rows.map((r) =>
    [r.t, r.freq, r.rocof, r.gep.p, r.gep.q, r.gep.v, r.rs.p, r.rs.q, r.rs.v, r.bess.p, r.bess.q, r.bess.v].join(","),
  );
  return [header, ...lines].join("\n");
}

// Tolerant CSV importer: maps known FLEXIQSim columns when present.
export function csvToRows(text: string): SimRow[] {
  return parseClientCsv(text);
}