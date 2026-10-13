import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

const PRESET_LABEL_MARGIN = 5;

function fitVerticalPresetLabel(buttonEl, textEl) {
  if (!buttonEl || !textEl) return;
  const margin = PRESET_LABEL_MARGIN;
  const maxW = buttonEl.clientWidth - margin * 2;
  const maxH = buttonEl.clientHeight - margin * 2;
  if (maxW <= 4 || maxH <= 4) return;

  /* Horizontal metrics, rotated −90° → visual width = th, visual height = tw */
  let lo = 8;
  let hi = 72;
  let best = 10;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    textEl.style.fontSize = `${mid}px`;
    const tw = textEl.offsetWidth;
    const th = textEl.offsetHeight;
    if (th <= maxW && tw <= maxH) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  textEl.style.fontSize = `${Math.max(8, Math.round(best * 0.9))}px`;
}

function VerticalPresetLabel({ text, containerRef }) {
  const textRef = useRef(null);

  const fit = useCallback(() => {
    fitVerticalPresetLabel(containerRef.current, textRef.current);
  }, [containerRef, text]);

  useEffect(() => {
    let raf = 0;
    const scheduleFit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => fit());
    };
    scheduleFit();
    const btn = containerRef.current;
    if (!btn) return undefined;
    const ro = new ResizeObserver(scheduleFit);
    ro.observe(btn);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [containerRef, fit]);

  return (
    <span ref={textRef} className="conf-ideum-corridor-btn__value conf-ideum-corridor-btn__value--vertical">
      {text}
    </span>
  );
}

function CorridorPresetButton({ labelText, fillPct, active, onSelect }) {
  const btnRef = useRef(null);
  return (
    <button
      ref={btnRef}
      type="button"
      className={`conf-ideum-corridor-btn${active ? ' conf-ideum-corridor-btn--active' : ''}${fillPct > 0 ? ' conf-ideum-corridor-btn--filling' : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <span
        className="conf-ideum-corridor-btn__fill"
        style={{ height: `${fillPct}%` }}
        aria-hidden="true"
      />
      <VerticalPresetLabel text={labelText} containerRef={btnRef} />
    </button>
  );
}

/** Green from top of column down to arrow; each row fills from its top toward the knob. */
function presetFillFromKnobRatio(knobRatio, topIndex, presetCount) {
  const n = presetCount;
  if (n <= 0) return 0;
  const rowTop = 1 - topIndex / n;
  const rowBottom = 1 - (topIndex + 1) / n;
  const r = clamp(knobRatio, 0, 1);
  if (rowTop <= r + 1e-9) return 0;
  if (rowBottom >= r - 1e-9) return 100;
  return clamp(((rowTop - r) / (rowTop - rowBottom)) * 100, 0, 100);
}

/**
 * Ideum corridor rail — diagonal title, arrow + live value, presets with top-down water fill.
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
  const arrowLabel = `> ${displayValue}`;

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
        aria-valuetext={arrowLabel}
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
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <span className="conf-ideum-corridor-arrow__value">{arrowLabel}</span>
            <span className="conf-ideum-corridor-arrow__head" />
          </div>
        </div>

        <div className="conf-ideum-corridor-stack conf-ideum-corridor-stack--top-down">
          {presetsTopDown.map((preset, topIndex) => {
            const bottomIndex = presetsTopDown.length - 1 - topIndex;
            const fillPct = presetFillFromKnobRatio(
              knobRatio,
              topIndex,
              presetsTopDown.length,
            );
            const active = isPresetActive(preset.value);
            const labelText = preset.label ?? `${preset.value}%`;

            return (
              <CorridorPresetButton
                key={preset.value}
                labelText={labelText}
                fillPct={fillPct}
                active={active}
                onSelect={() => handlePresetSelect(preset.value, bottomIndex)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
