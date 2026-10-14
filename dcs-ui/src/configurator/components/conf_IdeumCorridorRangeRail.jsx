import React, { useCallback, useMemo, useRef } from 'react';
import {
  corridorScaleFns,
  LOAD_COMPLIANCE_SNAPS,
  snapToLoadCompliance,
} from '../utils/conf_corridorRangeScale';

const DEFAULT_MIN_BAND_SPAN = 5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyStep(raw, step) {
  if (step == null || step <= 0) return raw;
  return Math.round(raw / step) * step;
}

function ratioFromClientY(clientY, rect, topBleedPx = 0) {
  const top = rect.top - topBleedPx;
  const height = rect.bottom - top;
  if (height <= 0) return 0;
  return clamp(1 - (clientY - top) / height, 0, 1);
}

function pointerTopBleed(scaleMode) {
  return scaleMode === 'load-compliance-snaps' ? 28 : 0;
}

function valueFromRatio(ratio, min, max, step, scaleFns, scaleMode) {
  const r = clamp(ratio, 0, 1);
  const raw = scaleFns.valueFromRatio(r, min, max);
  if (scaleMode === 'load-compliance-snaps') {
    if (r >= 1 - 1e-9) return max;
    return clamp(raw, min, max);
  }
  if (r >= 1 - 1e-9 && max != null) return max;
  return clamp(applyStep(raw, step), min, max);
}

function ratioFromValue(value, min, max, scaleFns) {
  return scaleFns.ratioFromValue(value, min, max);
}

function normalizeBand(lower, upper, min, max, step, minBandSpan) {
  let lo = clamp(applyStep(lower, step), min, max);
  let hi = clamp(applyStep(upper, step), min, max);
  if (hi < lo) [lo, hi] = [hi, lo];
  const spanMin = minBandSpan ?? DEFAULT_MIN_BAND_SPAN;
  if (spanMin > 0 && hi - lo < spanMin) {
    if (hi + spanMin <= max) hi = lo + spanMin;
    else lo = Math.max(min, hi - spanMin);
  }
  return { lower: lo, upper: hi };
}

function defaultFormatPercentInt(value) {
  return `${Math.round(value)}%`;
}

/**
 * Vertical CFE band — continuous 0–100% track with lower & upper draggable limits.
 */
export default function IdeumCorridorRangeRail({
  side,
  label,
  labelLines = null,
  min = 0,
  max = 100,
  step = 1,
  minBandSpan = DEFAULT_MIN_BAND_SPAN,
  lowerValue,
  upperValue,
  fixedUpper = null,
  onChange,
  formatValue = defaultFormatPercentInt,
  gutterTicks = null,
  scaleMode = 'linear',
  layout = 'corridor',
  ariaLabel,
}) {
  const scaleFns = useMemo(() => corridorScaleFns(scaleMode), [scaleMode]);
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const pinnedUpper = fixedUpper != null ? clamp(fixedUpper, min, max) : null;
  const band = normalizeBand(
    lowerValue,
    pinnedUpper ?? upperValue,
    min,
    max,
    step,
    minBandSpan,
  );
  const lower = band.lower;
  const upper = pinnedUpper ?? band.upper;

  const emit = useCallback((lo, hi) => {
    const hiVal = pinnedUpper ?? hi;
    const next = normalizeBand(lo, hiVal, min, max, step, minBandSpan);
    if (next.lower !== lower || next.upper !== upper) {
      onChange(next.lower, pinnedUpper ?? next.upper);
    }
  }, [lower, upper, min, max, step, minBandSpan, onChange, pinnedUpper]);

  const applyPointer = useCallback((clientY, handle) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bleed = pointerTopBleed(scaleMode);
    const value = valueFromRatio(
      ratioFromClientY(clientY, rect, bleed),
      min,
      max,
      step,
      scaleFns,
      scaleMode,
    );
    if (handle === 'lower') emit(value, upper);
    else if (handle === 'upper') emit(lower, value);
    else if (handle === 'band') {
      if (pinnedUpper != null) {
        const span = pinnedUpper - lower;
        const upperCap = minBandSpan > 0 ? pinnedUpper - minBandSpan : pinnedUpper;
        const newLower = clamp(value - span / 2, min, upperCap);
        emit(newLower, pinnedUpper);
      } else {
        const mid = (lower + upper) / 2;
        const delta = value - mid;
        emit(lower + delta, upper + delta);
      }
    }
  }, [emit, lower, upper, min, max, step, minBandSpan, pinnedUpper, scaleFns, scaleMode]);

  const startDrag = useCallback((handle, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = handle;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPointer(e.clientY, handle);
  }, [applyPointer]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    applyPointer(e.clientY, dragRef.current);
  }, [applyPointer]);

  const endDrag = useCallback((e) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onTrackPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bleed = pointerTopBleed(scaleMode);
    const value = valueFromRatio(
      ratioFromClientY(e.clientY, rect, bleed),
      min,
      max,
      step,
      scaleFns,
      scaleMode,
    );
    const distLower = Math.abs(value - lower);
    const distUpper = Math.abs(value - upper);
    const handle = distLower <= distUpper ? 'lower' : 'upper';
    dragRef.current = handle;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPointer(e.clientY, handle);
  }, [applyPointer, lower, upper, min, max, step, scaleFns, scaleMode]);

  const lowerRatio = ratioFromValue(lower, min, max, scaleFns);
  const upperRatio = ratioFromValue(upper, min, max, scaleFns);
  const bandBottomPct = lowerRatio * 100;
  const bandHeightPct = (upperRatio - lowerRatio) * 100;

  const tickValues = gutterTicks ?? [0, 25, 50, 75, 100];
  const interiorTicks = tickValues.filter((tick) => tick !== min && tick !== max);
  const readout = `${formatValue(lower)} – ${formatValue(upper)}`;
  const snapMarkers = scaleMode === 'load-compliance-snaps' ? LOAD_COMPLIANCE_SNAPS : null;
  const activeSnap = snapMarkers ? snapToLoadCompliance(lower) : null;

  return (
    <div
      className={`conf-ideum-corridor-rail conf-ideum-corridor-rail--range conf-ideum-corridor-rail--${side}${layout === 'tech' ? ' conf-ideum-corridor-rail--tech-band' : ''}`}
    >
      <div className="conf-ideum-corridor-label-wrap" aria-hidden="true">
        {labelLines?.length ? (
          <span className="conf-ideum-corridor-label conf-ideum-corridor-label--stacked conf-ideum-title-3d">
            {labelLines.map((line) => (
              <span key={line} className="conf-ideum-corridor-label__line">{line}</span>
            ))}
          </span>
        ) : (
          <span className="conf-ideum-corridor-label conf-ideum-corridor-label--diagonal conf-ideum-title-3d">{label}</span>
        )}
      </div>

      <div className="conf-ideum-corridor-range-wrap">
        {!snapMarkers ? (
          <p className="conf-ideum-corridor-range-endpoint conf-ideum-corridor-range-endpoint--max" aria-hidden="true">
            {formatValue(max)}
          </p>
        ) : null}
        <div
          ref={trackRef}
          className={`conf-ideum-corridor-range-track conf-ideum-corridor-range-track--${side}${snapMarkers ? ' conf-ideum-corridor-range-track--snap-overlay' : ''}`}
          role="group"
          aria-label={ariaLabel}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {snapMarkers ? (
            <div className="conf-ideum-corridor-range-steps" aria-hidden="true">
              {snapMarkers.map((snap, index) => {
                if (index === 0) return null;
                const prev = snapMarkers[index - 1];
                const lo = ratioFromValue(prev, min, max, scaleFns);
                const hi = ratioFromValue(snap, min, max, scaleFns);
                const inBand = snap <= activeSnap + 1e-6;
                return (
                  <div
                    key={`zone-${snap}`}
                    className={`conf-ideum-corridor-range-step${inBand ? ' conf-ideum-corridor-range-step--in-band' : ''}`}
                    style={{
                      bottom: `${lo * 100}%`,
                      height: `${Math.max(0, (hi - lo) * 100)}%`,
                    }}
                  />
                );
              })}
            </div>
          ) : null}

          <div className="conf-ideum-corridor-range-track__gutter" aria-hidden="true">
            {snapMarkers?.map((snap) => {
              const pct = ratioFromValue(snap, min, max, scaleFns) * 100;
              const isFloor = Math.abs(snap - activeSnap) < 1e-4;
              const isBelow = snap < activeSnap - 1e-4;
              return (
                <span
                  key={`snap-${snap}`}
                  className={`conf-ideum-corridor-range-snap${isFloor ? ' conf-ideum-corridor-range-snap--floor' : ''}${isBelow ? ' conf-ideum-corridor-range-snap--passed' : ''}`}
                  style={{ bottom: `${pct}%` }}
                >
                  <span className="conf-ideum-corridor-range-snap__line" />
                  <span className="conf-ideum-corridor-range-handle__pill conf-ideum-corridor-range-handle__pill--limit conf-ideum-corridor-range-snap__pill">
                    {formatValue(snap)}
                  </span>
                  <span className="conf-ideum-corridor-range-snap__tick" />
                </span>
              );
            })}
            {interiorTicks.map((tick) => {
              const ratio = ratioFromValue(tick, min, max, scaleFns);
              const pct = ratio * 100;
              return (
                <span
                  key={tick}
                  className="conf-ideum-corridor-range-tick"
                  style={{ bottom: `${pct}%` }}
                >
                  <span className="conf-ideum-corridor-range-tick__mark" />
                </span>
              );
            })}
          </div>

          <div
            className={`conf-ideum-corridor-range-band${snapMarkers ? ' conf-ideum-corridor-range-band--over-snaps' : ''}`}
            style={{ bottom: `${bandBottomPct}%`, height: `${bandHeightPct}%` }}
            onPointerDown={(e) => startDrag('band', e)}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-hidden="true"
          />

          <button
            type="button"
            className={`conf-ideum-corridor-range-handle conf-ideum-corridor-range-handle--lower conf-ideum-corridor-range-handle--${side}`}
            style={{ bottom: `${lowerRatio * 100}%` }}
            aria-label={`Lower limit ${formatValue(lower)}`}
            onPointerDown={(e) => startDrag('lower', e)}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span className="conf-ideum-corridor-range-handle__pill conf-ideum-corridor-range-handle__pill--limit">
              {formatValue(lower)}
            </span>
          </button>

          {pinnedUpper == null ? (
            <button
              type="button"
              className={`conf-ideum-corridor-range-handle conf-ideum-corridor-range-handle--upper conf-ideum-corridor-range-handle--${side}`}
              style={{ bottom: `${upperRatio * 100}%` }}
              aria-label={`Upper limit ${formatValue(upper)}`}
              onPointerDown={(e) => startDrag('upper', e)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span className="conf-ideum-corridor-range-handle__pill conf-ideum-corridor-range-handle__pill--limit">
                {formatValue(upper)}
              </span>
            </button>
          ) : null}
        </div>

        {!snapMarkers ? (
          <p className="conf-ideum-corridor-range-endpoint conf-ideum-corridor-range-endpoint--min" aria-hidden="true">
            {formatValue(min)}
          </p>
        ) : null}
        <p className="conf-ideum-corridor-range-readout conf-ideum-corridor-range-readout--sr" aria-live="polite">
          {readout}
        </p>
      </div>
    </div>
  );
}
