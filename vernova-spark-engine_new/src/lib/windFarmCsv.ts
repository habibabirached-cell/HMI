/** Wind-farm LineTrip CSV rows for dual-column PCC plots (slides 16–19). */

export type WindFarmRow = {
  t: number;
  p: number;
  q: number;
  va: number;
  vb: number;
  vc: number;
  vrms: number;
};

function findCol(head: string[], pred: (h: string) => boolean): number {
  return head.findIndex((h) => pred(h.trim().toLowerCase()));
}

/** Parse SMIB_WF_LineTrip_GFMe / No_GFMe client CSVs. */
export function parseWindFarmCsv(text: string): WindFarmRow[] {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const head = lines[0].split(",").map((h) => h.trim());
  const tIdx = findCol(head, (h) => h === "domain" || h === "t" || h.startsWith("t "));
  const pIdx = findCol(
    head,
    (h) =>
      (h.includes("p_pcc") ||
        h === "pwf" ||
        h.startsWith("pwf") ||
        h.includes("p_1a") ||
        h.includes("p_int") ||
        h === "p") &&
      !h.includes("i_pcc")
  );
  const qIdx = findCol(head, (h) => h === "qwf" || h.startsWith("qwf"));
  const vaIdx = findCol(head, (h) => h.includes("v_pcc:1") || h.includes("v_pcc_a") || h === "va");
  const vbIdx = findCol(head, (h) => h.includes("v_pcc:2") || h.includes("v_pcc_b") || h === "vb");
  const vcIdx = findCol(head, (h) => h.includes("v_pcc:3") || h.includes("v_pcc_c") || h === "vc");
  const vrmsIdx = findCol(head, (h) => h.startsWith("vpoirms") || h.includes("vpoirms"));

  if (tIdx < 0 || (pIdx < 0 && vaIdx < 0)) return [];

  const out: WindFarmRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    if (c.length < 3) continue;
    const t = Number(c[tIdx]);
    if (!Number.isFinite(t)) continue;

    let va = vaIdx >= 0 ? Number(c[vaIdx]) || 0 : 0;
    let vb = vbIdx >= 0 ? Number(c[vbIdx]) || 0 : 0;
    let vc = vcIdx >= 0 ? Number(c[vcIdx]) || 0 : 0;

    out.push({
      t,
      p: pIdx >= 0 ? Number(c[pIdx]) || 0 : 0,
      q: qIdx >= 0 ? Number(c[qIdx]) || 0 : 0,
      va,
      vb,
      vc,
      vrms: vrmsIdx >= 0 ? Number(c[vrmsIdx]) || 0 : 0,
    });
  }
  return out;
}

export async function fetchWindFarmCsv(path: string): Promise<WindFarmRow[]> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return parseWindFarmCsv(await res.text());
}

export const WIND_CSV = {
  /** CB ON / With GFM e-STATCOM */
  withGfme: "/sample-data/SMIB_WF_LineTrip_GFMe.csv",
  /** CB OFF / Without GFM e-STATCOM */
  noGfme: "/sample-data/SMIB_WF_LineTrip_No_GFMe.csv",
} as const;
