import CIGRE_DATA from '@/data/cigreTimeDomainData.json';
import type { ResponseMetrics } from './databankMetrics';

export type CigreEventKey = 'phase_jump' | 'rocof' | 'fault' | 'voltage_step';

export type CigreMetricEntry = {
  signal: string;
  responseTimeMs: number;
  riseTimeMs: number;
  peakKa: number;
};

export const CIGRE_TIME_DOMAIN_TABLE = CIGRE_DATA as Record<
  string,
  Record<CigreEventKey, CigreMetricEntry>
>;

/**
 * Returns pre-defined CIGRE pages 3-4 ResponseMetrics for CFG1..CFG11.
 * If cfg is not CFG1..CFG11 or event not in table, returns null.
 */
export function getCigreResponseMetrics(
  cfgId: string,
  event: 'phase_jump' | 'voltage_step' | 'rocof' | 'fault',
): ResponseMetrics | null {
  const cfgKey = (cfgId.match(/^CFG\d+/i)?.[0] ?? cfgId).toUpperCase();
  const cfgEntries = CIGRE_TIME_DOMAIN_TABLE[cfgKey];
  if (!cfgEntries) return null;

  const entry = cfgEntries[event];
  if (!entry) return null;

  return {
    responseTimeMs: entry.responseTimeMs,
    riseTimeMs: entry.riseTimeMs,
    peakOvershootPu: entry.peakKa,
    peakTimeMs: entry.riseTimeMs,
    settlingTimeMs: null,
  };
}
