import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  buildCapexWheelOptions,
  formatCapexDisplay,
  nearestCapexWheelOption,
} from '../utils/conf_technologyCapex';

function StepChevron({ direction }) {
  const up = direction === 'up';
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        d={up ? 'M5 15.5 L12 8.5 L19 15.5' : 'M5 8.5 L12 15.5 L19 8.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ConfCapexValueField({
  id,
  label,
  unit,
  value,
  wheelPreset,
  wheelOptions = null,
  formatDisplay = formatCapexDisplay,
  onCommit,
}) {
  const fmt = formatDisplay;
  const holdRef = useRef(null);
  const isGas = label === 'Gas price';

  const options = useMemo(
    () => (Array.isArray(wheelOptions) && wheelOptions.length
      ? wheelOptions
      : buildCapexWheelOptions(wheelPreset)),
    [wheelOptions, wheelPreset],
  );

  const indexForValue = useCallback((val) => {
    const n = nearestCapexWheelOption(val, options);
    const idx = options.indexOf(n);
    return idx >= 0 ? idx : 0;
  }, [options]);

  const stepTo = useCallback((dir) => {
    if (!options.length) return;
    const base = indexForValue(value);
    const nextIdx = Math.max(0, Math.min(options.length - 1, base + dir));
    if (nextIdx === base) return;
    onCommit(options[nextIdx]);
  }, [indexForValue, onCommit, options, value]);

  const stepToRef = useRef(stepTo);
  stepToRef.current = stepTo;

  const stopHold = useCallback(() => {
    const hold = holdRef.current;
    if (!hold) return;
    window.clearTimeout(hold.delay);
    if (hold.timer) window.clearInterval(hold.timer);
    holdRef.current = null;
  }, []);

  useEffect(() => stopHold, [stopHold]);

  const startHold = useCallback((dir) => {
    stepToRef.current(dir);
    stopHold();
    const delay = window.setTimeout(() => {
      const timer = window.setInterval(() => stepToRef.current(dir), 70);
      if (holdRef.current) holdRef.current.timer = timer;
    }, 380);
    holdRef.current = { delay, timer: null };
  }, [stopHold]);

  const selectedIdx = options.length ? indexForValue(value) : 0;
  const atMin = !options.length || selectedIdx <= 0;
  const atMax = !options.length || selectedIdx >= options.length - 1;

  const press = (dir, blocked) => (e) => {
    if (e.button !== 0 || blocked) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startHold(dir);
  };

  return (
    <div className="conf-ideum-capex-field">
      <div
        className={`conf-ideum-capex-stepper${isGas ? ' conf-ideum-capex-stepper--gas' : ''}`}
        role="group"
        aria-labelledby={`${id}-label`}
      >
        <div
          className={`conf-ideum-capex-field__label conf-ideum-capex-stepper__label${label === 'Installed CAPEX' ? ' conf-ideum-capex-field__label--installed' : ''}`}
          id={`${id}-label`}
        >
          {label}
        </div>
        <div className="conf-ideum-capex-stepper__value" id={id}>
          <span className="conf-ideum-capex-field__unit" aria-hidden="true">$</span>
          <span className="conf-ideum-capex-stepper__number">{fmt(value)}</span>
          {unit ? <span className="conf-ideum-capex-field__suffix">{unit}</span> : null}
        </div>
        <button
          type="button"
          className="conf-ideum-capex-stepper__btn conf-ideum-capex-stepper__btn--down"
          aria-label={`Decrease ${label}`}
          disabled={atMin}
          onPointerDown={press(-1, atMin)}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onLostPointerCapture={stopHold}
        >
          <StepChevron direction="down" />
        </button>
        <button
          type="button"
          className="conf-ideum-capex-stepper__btn conf-ideum-capex-stepper__btn--up"
          aria-label={`Increase ${label}`}
          disabled={atMax}
          onPointerDown={press(1, atMax)}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onLostPointerCapture={stopHold}
        >
          <StepChevron direction="up" />
        </button>
      </div>
    </div>
  );
}
