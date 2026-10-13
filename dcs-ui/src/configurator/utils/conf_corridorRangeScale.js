/** Vertical track mapping for corridor range rails (linear + availability “nines”). */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** ratio (0=bottom) → availability % on 99–100 axis. */
const AVAILABILITY_ANCHORS = [
  { r: 0, v: 99 },
  { r: 0.5, v: 99.99 },
  { r: 0.75, v: 99.999 },
  { r: 0.95, v: 99.9999 },
  { r: 1, v: 100 },
];

function piecewiseFromRatio(ratio, anchors) {
  const r = clamp(ratio, 0, 1);
  if (r >= anchors[anchors.length - 1].r - 1e-12) {
    return anchors[anchors.length - 1].v;
  }
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (r >= a.r && r <= b.r) {
      const t = b.r === a.r ? 1 : (r - a.r) / (b.r - a.r);
      return a.v + t * (b.v - a.v);
    }
  }
  return anchors[0].v;
}

function piecewiseToRatio(value, anchors) {
  const v = clamp(value, anchors[0].v, anchors[anchors.length - 1].v);
  if (v >= anchors[anchors.length - 1].v - 1e-9) {
    return anchors[anchors.length - 1].r;
  }
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (v >= a.v && v <= b.v) {
      const t = b.v === a.v ? 1 : (v - a.v) / (b.v - a.v);
      return a.r + t * (b.r - a.r);
    }
  }
  return 0;
}

export function linearValueFromRatio(ratio, min, max) {
  return min + clamp(ratio, 0, 1) * (max - min);
}

export function linearRatioFromValue(value, min, max) {
  const span = max - min || 1;
  return clamp((value - min) / span, 0, 1);
}

export function availabilityValueFromRatio(ratio, min, max) {
  if (min === 99 && max === 100) {
    return piecewiseFromRatio(ratio, AVAILABILITY_ANCHORS);
  }
  const r = clamp(ratio, 0, 1);
  const span = max - min;
  const k = Math.log(0.01) / Math.log(0.5);
  return max - span * (1 - r) ** k;
}

export function availabilityRatioFromValue(value, min, max) {
  if (min === 99 && max === 100) {
    return piecewiseToRatio(value, AVAILABILITY_ANCHORS);
  }
  const v = clamp(value, min, max);
  if (v >= max - 1e-9) return 1;
  const span = max - min || 1;
  const k = Math.log(0.01) / Math.log(0.5);
  const deficitNorm = (max - v) / span;
  return clamp(1 - deficitNorm ** (1 / k), 0, 1);
}

export function corridorScaleFns(scaleMode) {
  if (scaleMode === 'availability-nines') {
    return {
      valueFromRatio: availabilityValueFromRatio,
      ratioFromValue: availabilityRatioFromValue,
    };
  }
  return {
    valueFromRatio: linearValueFromRatio,
    ratioFromValue: linearRatioFromValue,
  };
}

/** Top of track (last ~5%) maps 99.9999 → 100%; snap when pointer is in that crest. */
export function availabilityApplyStep(raw, ratio, step) {
  if (ratio >= 0.985) return 100;
  if (step == null || step <= 0) return raw;
  if (ratio >= 0.95) {
    return Math.round(raw / step) * step;
  }
  return Math.round(raw / step) * step;
}
