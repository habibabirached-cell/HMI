/** Vertical track mapping for corridor range rails. */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export const LOAD_COMPLIANCE_SNAPS = [
  97,
  98,
  99,
  99.9,
  99.99,
  99.999,
  99.9999,
  100,
];

export function snapToLoadCompliance(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 99.99;
  const clamped = clamp(n, LOAD_COMPLIANCE_SNAPS[0], LOAD_COMPLIANCE_SNAPS[LOAD_COMPLIANCE_SNAPS.length - 1]);
  let best = LOAD_COMPLIANCE_SNAPS[0];
  let bestDist = Infinity;
  LOAD_COMPLIANCE_SNAPS.forEach((snap) => {
    const d = Math.abs(clamped - snap);
    if (d < bestDist) {
      bestDist = d;
      best = snap;
    }
  });
  return best;
}

function snapValueFromRatio(ratio, snaps) {
  const n = snaps.length;
  if (n <= 1) return snaps[0];
  const r = clamp(ratio, 0, 1);
  const idx = Math.round(r * (n - 1));
  return snaps[clamp(idx, 0, n - 1)];
}

function snapRatioFromValue(value, snaps) {
  const n = snaps.length;
  if (n <= 1) return 0;
  const snapped = snapToLoadCompliance(value);
  const idx = snaps.findIndex((s) => Math.abs(s - snapped) < 1e-6);
  const safeIdx = idx >= 0 ? idx : 0;
  return safeIdx / (n - 1);
}

export function linearValueFromRatio(ratio, min, max) {
  return min + clamp(ratio, 0, 1) * (max - min);
}

export function linearRatioFromValue(value, min, max) {
  const span = max - min || 1;
  return clamp((value - min) / span, 0, 1);
}

export function loadComplianceValueFromRatio(ratio) {
  return snapValueFromRatio(ratio, LOAD_COMPLIANCE_SNAPS);
}

export function loadComplianceRatioFromValue(value) {
  return snapRatioFromValue(value, LOAD_COMPLIANCE_SNAPS);
}

export function corridorScaleFns(scaleMode) {
  if (scaleMode === 'load-compliance-snaps') {
    return {
      valueFromRatio: (ratio) => loadComplianceValueFromRatio(ratio),
      ratioFromValue: (value) => loadComplianceRatioFromValue(value),
    };
  }
  return {
    valueFromRatio: linearValueFromRatio,
    ratioFromValue: linearRatioFromValue,
  };
}
