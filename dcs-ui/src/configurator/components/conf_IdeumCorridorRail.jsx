import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function corridorPresetSizeClass(text) {
  const digits = String(text).replace(/[^\d.]/g, '').length;
  if (digits <= 2) return 'conf-ideum-corridor-btn--size-xl';
  if (digits <= 3) return 'conf-ideum-corridor-btn--size-lg';
  if (digits <= 4) return 'conf-ideum-corridor-btn--size-md';
  if (digits <= 5) return 'conf-ideum-corridor-btn--size-sm';
  return 'conf-ideum-corridor-btn--size-xs';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyStep(raw, step) {
  if (step == null || step <= 0) return raw;
  const stepped = Math.round(raw / step) * step;
  if (step < 0.01) return Math.round(stepped * 10000) / 10000;
  return stepped;
}

/** Map pointer ratio (0=bottom, 1=top) → value using equal-height preset segments. */
function valueFromSegmentRatio(ratio, min, presetsBottomUp, step) {
  const n = presetsBottomUp.length;
  if (n === 0) return applyStep(min, step);

  const r = clamp(ratio, 0, 1);
  const segmentFloat = r * n;
  const segIndex = Math.min(n - 1, Math.max(0, Math.floor(segmentFloat)));
  const segT = segmentFloat - segIndex;
  const lower = segIndex === 0 ? min : presetsBottomUp[segIndex - 1].value;
  const upper = presetsBottomUp[segIndex].value;
  const raw = segT >= 1 ? upper : lower + segT * (upper - lower);
  const stepped = applyStep(raw, step);
  const ceiling = presetsBottomUp[n - 1].value;
  return clamp(stepped, min, ceiling);
}

/** Inverse: value → pointer ratio along equal-height segments. */
function ratioFromSegmentValue(value, min, presetsBottomUp) {
  const n = presetsBottomUp.length;
  if (n === 0) return 0;

  for (let i = 0; i < n; i += 1) {
    const lower = i === 0 ? min : presetsBottomUp[i - 1].value;
    const upper = presetsBottomUp[i].value;
    if (value <= upper && value >= lower) {
      const segT = upper === lower ? 0 : clamp((value - lower) / (upper - lower), 0, 1);
      return clamp((i + segT) / n, 0, 1);
    }
  }
  if (value >= presetsBottomUp[n - 1].value) return 1;
  return 0;
}

/** Knob ratio at the top edge of a preset box (bottomIndex = 0 is lowest preset). */
function ratioForPresetTop(bottomIndex, count) {
  return clamp((bottomIndex + 1) / count - 0.012, 0, 1);
}

function findActivePreset(value, presetsBottomUp, isPresetActive) {
  return presetsBottomUp.find((preset) => isPresetActive(preset.value)) ?? null;
}

function ratioFromClientY(clientY, rect) {
  if (rect.height <= 0) return 0;
  return clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
}

/** Fill height (0–100) for a preset box as value rises from the box below. */
function presetFillPercent(value, presetValue, lowerBound) {
  if (value >= presetValue) return 100;
  if (value <= lowerBound) return 0;
  if (presetValue <= lowerBound) return 0;
  return clamp(((value - lowerBound) / (presetValue - lowerBound)) * 100, 0, 100);
}

/**
 * Ideum corridor rail — diagonal title, arrow + live value, bottom-up presets with water fill.
 * Pointer Y maps 1:1 to arrow position; value uses equal-height segments (non-linear presets).
 */
export default function IdeumCorridorRail({
  side,
  label,
  min,
  max,
  step = null,
  value,
  onChange,
  presets,
  formatDisplay,
  isPresetActive,
  ariaLabel,
}) {
  const bodyRef = useRef(null);
  const draggingRef = useRef(false);
  const presetSnapRef = useRef(false);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [knobRatio, setKnobRatio] = useState(() => ratioFromSegmentValue(value, min, presets));

  const presetsTopDown = useMemo(() => [...presets].reverse(), [presets]);
  const presetsBottomUp = presets;

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    const sync = () => setBodyHeight(el.clientHeight);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!isDragging && !presetSnapRef.current) {
      setKnobRatio(ratioFromSegmentValue(value, min, presetsBottomUp));
    }
    presetSnapRef.current = false;
  }, [value, min, presetsBottomUp, isDragging]);

  const activePreset = findActivePreset(value, presetsBottomUp, isPresetActive);
  const displayValue = activePreset
    ? (activePreset.label ?? formatDisplay(activePreset.value))
    : formatDisplay(value);

  const applyPointerY = useCallback((clientY) => {
    const el = bodyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nextRatio = ratioFromClientY(clientY, rect);
    const nextValue = clamp(
      valueFromSegmentRatio(nextRatio, min, presetsBottomUp, step),
      min,
      max,
    );
    setKnobRatio(nextRatio);
    onChange(nextValue);
  }, [min, max, presetsBottomUp, step, onChange]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPointerY(e.clientY);
  }, [applyPointerY]);

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    applyPointerY(e.clientY);
  }, [applyPointerY]);

  const handlePointerUp = useCallback((e) => {
    draggingRef.current = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handlePresetSelect = useCallback((presetValue, bottomIndex) => {
    draggingRef.current = false;
    presetSnapRef.current = true;
    const nextRatio = ratioForPresetTop(bottomIndex, presetsBottomUp.length);
    setKnobRatio(nextRatio);
    onChange(presetValue);
  }, [onChange, presetsBottomUp.length]);

  const handleKeyDown = useCallback((e) => {
    const n = presetsBottomUp.length || 1;
    const stepRatio = 1 / (n * 4);
    let nextRatio = knobRatio;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextRatio = clamp(knobRatio + stepRatio, 0, 1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextRatio = clamp(knobRatio - stepRatio, 0, 1);
    } else {
      return;
    }
    setKnobRatio(nextRatio);
    onChange(clamp(valueFromSegmentRatio(nextRatio, min, presetsBottomUp, step), min, max));
  }, [knobRatio, min, max, presetsBottomUp, step, onChange]);

  const arrowBottomPx = bodyHeight > 0
    ? knobRatio * bodyHeight
    : null;

  const arrowStyle = arrowBottomPx != null
    ? { bottom: `${clamp(0, bodyHeight, arrowBottomPx)}px` }
    : { bottom: `${knobRatio * 100}%` };

  return (
    <div className={`conf-ideum-corridor-rail conf-ideum-corridor-rail--${side}`}>
      <div className="conf-ideum-corridor-label-wrap" aria-hidden="true">
        <span className="conf-ideum-corridor-label conf-ideum-corridor-label--diagonal conf-ideum-title-3d">{label}</span>
      </div>

      <div
        ref={bodyRef}
        className={`conf-ideum-corridor-body conf-ideum-corridor-body--${side}`}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <div className={`conf-ideum-corridor-track-col conf-ideum-corridor-track-col--${side}`}>
          <div className="conf-ideum-corridor-track-line" aria-hidden="true" />
          <div
            className={`conf-ideum-corridor-arrow conf-ideum-corridor-arrow--${side}`}
            style={arrowStyle}
            aria-hidden="true"
          >
            <span className="conf-ideum-corridor-arrow__value">{displayValue}</span>
            <span className="conf-ideum-corridor-arrow__head" />
          </div>
        </div>

        <div className="conf-ideum-corridor-stack conf-ideum-corridor-stack--bottom-up">
          {presetsTopDown.map((preset, topIndex) => {
            const bottomIndex = presetsTopDown.length - 1 - topIndex;
            const lowerBound = bottomIndex === 0
              ? min
              : presetsBottomUp[bottomIndex - 1].value;
            const fillPct = presetFillPercent(value, preset.value, lowerBound);
            const active = isPresetActive(preset.value);
            const labelText = preset.label ?? `${preset.value}%`;

            return (
              <button
                key={preset.value}
                type="button"
                className={`conf-ideum-corridor-btn ${corridorPresetSizeClass(labelText)}${active ? ' conf-ideum-corridor-btn--active' : ''}${fillPct > 0 ? ' conf-ideum-corridor-btn--filling' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePresetSelect(preset.value, bottomIndex);
                }}
              >
                <span
                  className="conf-ideum-corridor-btn__fill"
                  style={{ height: `${fillPct}%` }}
                  aria-hidden="true"
                />
                <span className="conf-ideum-corridor-btn__value">{labelText}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
