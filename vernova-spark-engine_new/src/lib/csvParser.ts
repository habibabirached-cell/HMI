import type { SimRow } from "@/data/simulation";

const V_BASE = 75.8;
const MAX_ROWS = 3000;

function toKv(raw: number): number {
  if (!Number.isFinite(raw)) return V_BASE;
  return Math.abs(raw) <= 3 ? raw * V_BASE : raw;
}

function downsample(rows: SimRow[]): SimRow[] {
  if (rows.length <= MAX_ROWS) return rows;
  const step = Math.ceil(rows.length / MAX_ROWS);
  return rows.filter((_, i) => i % step === 0);
}

/** Parse client FLEXIQSim CSV (SMIB_Default) and LineTrip CSV formats. */
export function parseClientCsv(text: string): SimRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0].split(",").map((h) => h.trim());
  const col = (name: string) => head.findIndex((h) => h === name || h.replace(/[()]/g, "") === name.replace(/[()]/g, ""));
  const num = (cells: string[], name: string) => {
    const i = col(name);
    const v = i >= 0 ? Number(cells[i]) : NaN;
    return Number.isFinite(v) ? v : 0;
  };

  const isFlexiqsim = col("t_Main") >= 0 || col("Freq_pcc") >= 0;
  const isLineTrip =
    col("Domain") >= 0 ||
    head.some((h) => /^pwf\b/i.test(h.trim()) || h.trim().toLowerCase().startsWith("pwf"));
  const isLegacy = col("Ppos_GEP_MW") >= 0;

  const out: SimRow[] = [];

  const findFlexible = (cells: string[], prefixes: string[]) => {
    for (const p of prefixes) {
      const i = head.findIndex((h) => {
        const t = h.trim().toLowerCase();
        return t === p.toLowerCase() || t.startsWith(p.toLowerCase());
      });
      if (i >= 0) {
        const v = Number(cells[i]);
        if (Number.isFinite(v)) return v;
      }
    }
    return 0;
  };

  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    if (c.length < 2) continue;

    if (isFlexiqsim) {
      const t = num(c, "t_Main");
      out.push({
        t,
        freq: num(c, "Freq_pcc") || 50,
        rocof: 0,
        gep: {
          p: num(c, "P_pcc"),
          q: num(c, "Q_pcc"),
          v: toKv(num(c, "V_Pcc")),
          i: num(c, "I_pcc"),
          theta: num(c, "Theta_pcc"),
        },
        rs: {
          p: num(c, "P_WF"),
          q: num(c, "Q_WF"),
          v: toKv(num(c, "V_WF")),
          i: num(c, "I_WF"),
          theta: num(c, "Theta_WF"),
        },
        bess: {
          p: num(c, "P_GFMe"),
          q: num(c, "Q_GFMe"),
          v: toKv(num(c, "V_GFMe")),
          i: num(c, "I_GFMe"),
          theta: num(c, "Theta_GFMe"),
        },
      });
    } else if (isLineTrip) {
      const t = findFlexible(c, ["Domain"]);
      const p = findFlexible(c, ["PWF"]);
      const q = findFlexible(c, ["QWF"]);
      const vPu = findFlexible(c, ["VpoiRMS(pu)", "VpoiRMSpu", "VpoiRMS"]);
      const v = toKv(vPu);
      out.push({
        t,
        freq: 50,
        rocof: 0,
        gep: { p, q, v, i: 0, theta: 0 },
        rs: { p, q, v, i: 0, theta: 0 },
        bess: { p, q, v, i: 0, theta: 0 },
      });
    } else if (isLegacy) {
      out.push({
        t: num(c, "t_Main"),
        freq: num(c, "Freq_GEP") || 50,
        rocof: num(c, "ROCOF_GEP"),
        gep: {
          p: num(c, "Ppos_GEP_MW"),
          q: num(c, "Qpos_GEP_MVAR"),
          v: num(c, "V_PM_GEP"),
          i: num(c, "I_PM_GEP"),
          theta: num(c, "Theta_p_GEP"),
        },
        rs: {
          p: num(c, "Ppos_RS_MW"),
          q: num(c, "Qpos_RS_MVAR"),
          v: num(c, "V_PM_RS"),
          i: num(c, "I_PM_RS"),
          theta: num(c, "Theta_p_RS"),
        },
        bess: {
          p: num(c, "Ppos_BESS_MW"),
          q: num(c, "Qpos_BESS_MVAR"),
          v: num(c, "V_PM_BESS"),
          i: num(c, "I_PM_BESS"),
          theta: num(c, "Theta_p_BESS"),
        },
      });
    }
  }

  return out;
}

export async function fetchCsvRows(path: string): Promise<SimRow[]> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const text = await res.text();
  return parseClientCsv(text);
}

export function findEventOffset(rows: SimRow[], timeSec: number): number {
  if (!rows.length) return 0;
  const idx = rows.findIndex((r) => r.t >= timeSec);
  return idx >= 0 ? idx : 0;
}
