/**
 * WP5 series fetch — prefer FastAPI windowed series, fall back to static cropped CSVs.
 * Never rewrites sample values; only chooses which crop/window to load.
 */
import {
  getDatabankApiSeriesUrl,
  getDatabankAnalyticsCsvUrl,
  getDatabankCsvUrl,
  phaseForActiveEvent,
  type DatabankPhase,
  type StabilityEventType,
} from './stabilityDatabank';

let apiHealthy: boolean | null = null;
let apiProbeAt = 0;
const API_PROBE_TTL_MS = 15_000;

/** Chart/UI safety — ECharts + React cannot hold full-rate Aug14 posts (100k+ rows). */
export const DATABANK_UI_MAX_POINTS = 5000;

/**
 * Chart-only path — email §10 / WhatsApp: AVOID downsampling (fidelity).
 * Crops from prepare:databank are already windowed; pass rows through unchanged.
 * (Dials still use the full crop before any future UI cap.)
 */
export function limitRowsForUi<T extends { time: number }>(
  rows: T[],
  _eventAt?: number | null,
  _maxPoints = DATABANK_UI_MAX_POINTS,
): T[] {
  return rows ?? [];
}

export async function probeDatabankApi(): Promise<boolean> {
  const now = Date.now();
  if (apiHealthy != null && now - apiProbeAt < API_PROBE_TTL_MS) return apiHealthy;
  try {
    const res = await fetch('/api/v1/health', { method: 'GET' });
    if (!res.ok) {
      apiHealthy = false;
    } else {
      // Netlify SPA fallback can return 200 HTML for unknown paths — require real JSON.
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('json')) {
        apiHealthy = false;
      } else {
        const body = (await res.json().catch(() => null)) as { ok?: unknown } | null;
        apiHealthy = body?.ok === true;
      }
    }
  } catch {
    apiHealthy = false;
  }
  apiProbeAt = now;
  return apiHealthy;
}

/**
 * Ordered candidates for CFG1–11.
 * Prefer static crops first (fast, Netlify-safe); API second when healthy
 * (local FastAPI or Netlify functions that redirect to the same crops).
 */
export function databankFetchCandidates(
  cfgName: string,
  activeEvent: 'none' | StabilityEventType,
  phase?: DatabankPhase,
): string[] {
  const match = cfgName.toUpperCase().match(/CFGR?(\d+)/);
  const normalized = match ? `CFG${match[1]}` : cfgName.toUpperCase().trim();
  if (normalized === 'CFG12' || normalized === 'CFG13') return [];
  const p = phase ?? phaseForActiveEvent(activeEvent);
  const out: string[] = [];
  const phased = getDatabankCsvUrl(normalized, activeEvent, p);
  if (phased) out.push(phased);
  if (p !== 'full') {
    const full = getDatabankCsvUrl(normalized, activeEvent, 'full');
    if (full) out.push(full);
  }
  // Gyan wide Analytics last — large files; prefer only when legacy full missing
  if (p === 'full') {
    const analytics = getDatabankAnalyticsCsvUrl(normalized, activeEvent);
    if (analytics) out.push(analytics);
  }
  const api = getDatabankApiSeriesUrl(normalized, activeEvent, p);
  if (api) out.push(api);
  return out;
}

/** Fetch first successful candidate (text). Throws if all fail. */
export async function fetchDatabankCsvText(
  cfgName: string,
  activeEvent: 'none' | StabilityEventType,
  phase?: DatabankPhase,
): Promise<{ text: string; url: string }> {
  const candidates = databankFetchCandidates(cfgName, activeEvent, phase);
  if (!candidates.length) throw new Error(`No databank URL for ${cfgName}`);

  const preferApi = await probeDatabankApi();
  const phaseResolved = phase ?? phaseForActiveEvent(activeEvent);
  const ordered = preferApi
    ? [
        ...candidates.filter(
          (u) => u.startsWith('/api/') && phaseResolved === 'pre',
        ),
        ...candidates.filter((u) => !u.startsWith('/api/')),
        ...candidates.filter((u) => u.startsWith('/api/')),
      ]
    : candidates
        .filter((u) => !u.startsWith('/api/'))
        .concat(candidates.filter((u) => u.startsWith('/api/')));

  const seen = new Set<string>();
  const unique = ordered.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));

  let lastErr: unknown;
  for (const url of unique) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`${url} → ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (!text.trim()) {
        lastErr = new Error(`${url} empty`);
        continue;
      }
      return { text, url };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
