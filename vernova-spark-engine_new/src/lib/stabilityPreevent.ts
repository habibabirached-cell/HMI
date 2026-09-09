/**
 * Gyan pre-event / steady-state pack (Call #2 + WhatsApp + Graph pack §8.5).
 * Prefer SCL.pre from CFG folder (synced from Gyan Graph & Analytics data);
 * fallback /databank/preevent/ (CFG11 = CG11.csv).
 */

import { resolveTickSize } from './stabilityTick';

export function preeventCsvUrl(cfgName: string, mode?: string): string | null {
  const match = cfgName.toUpperCase().match(/CFGR?(\d+)/);
  const normalized = match ? `CFG${match[1]}` : cfgName.toUpperCase().trim();
  if (normalized === 'CFG12') {
    const m = mode || 'combined';
    return `/databank/CFG12/${m}/graph/SCL_450.pre.csv`;
  }
  if (normalized === 'CFG13') {
    const m = mode || 'combined';
    return `/databank/CFG13/${m}/graph/SCL_430.pre.csv`;
  }
  const m = normalized.match(/^CFG(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1 || n > 11) return null;
  // Prefer per-CFG SCL pre from Graph pack sync
  return `/databank/CFG${n}/SCL.pre.csv`;
}

/** Legacy idle path (still kept in sync from SCL preevent). */
export function preeventLegacyCsvUrl(cfgName: string): string | null {
  const match = cfgName.toUpperCase().match(/CFGR?(\d+)/);
  const normalized = match ? `CFG${match[1]}` : cfgName.toUpperCase().trim();
  const m = normalized.match(/^CFG(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1 || n > 11) return null;
  if (n === 11) return '/databank/preevent/CG11.csv';
  return `/databank/preevent/CFG${n}.csv`;
}

export type PreeventRow = {
  time: number;
  activeCurrent: number;
  reactiveCurrent: number;
};

/** Parse Gyan 3-column pre-event CSV (t Main, Iq, Ip / P_poc1, Q_poc1). */
export function parsePreeventCsvText(text: string): PreeventRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0].split(/[,;]/).map((h) => h.trim());
  const lower = head.map((h) => h.toLowerCase());
  const tIdx = lower.findIndex((l) => l === 't main' || l === 't');
  const iqIdx = lower.findIndex((l) => l.includes('iq_gep') || l.includes('q_poc1') || l === 'q');
  const ipIdx = lower.findIndex((l) => l.includes('ip_gep') || l.includes('p_poc1') || l === 'p');
  const ti = tIdx >= 0 ? tIdx : 0;
  const iqi = iqIdx >= 0 ? iqIdx : 1;
  const ipi = ipIdx >= 0 ? ipIdx : 2;
  const out: PreeventRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/);
    if (cols.length <= Math.max(ti, iqi, ipi)) continue;
    const time = parseFloat(cols[ti]);
    const iq = parseFloat(cols[iqi]);
    const ip = parseFloat(cols[ipi]);
    if (!Number.isFinite(time) || !Number.isFinite(ip) || !Number.isFinite(iq)) continue;
    out.push({ time, activeCurrent: ip, reactiveCurrent: iq });
  }
  return out;
}

/** Pack pre clips are ~1 s (Gyan Graph); use full file. Morning “~2 s” was approximate. */
export function takePreeventWindow(rows: PreeventRow[], seconds = 1): PreeventRow[] {
  if (!rows.length) return [];
  const tick = resolveTickSize(null, 'none', rows);
  const need = Math.max(2, Math.ceil(seconds / tick));
  if (rows.length <= need) return rows.slice();
  // Prefer the end of the clip (closest to event)
  return rows.slice(rows.length - need);
}

export async function fetchPreeventRows(cfgName: string, mode?: string): Promise<{
  rows: PreeventRow[];
  tickSize: number;
  url: string;
} | null> {
  const urls = [preeventCsvUrl(cfgName, mode), preeventLegacyCsvUrl(cfgName)].filter(
    (u): u is string => !!u,
  );
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      const all = parsePreeventCsvText(text);
      if (!all.length) continue;
      const rows = takePreeventWindow(all, 1);
      const tickSize = resolveTickSize(cfgName, 'fault', all);
      (rows as any).tickSize = tickSize;
      return { rows, tickSize, url };
    } catch {
      /* try next */
    }
  }
  return null;
}
