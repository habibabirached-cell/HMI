import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  buildCapexWheelOptions,
  formatCapexDisplay,
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
  locked = false,
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

  const stepSize = options.length >= 2 ? options[1] - options[0] : 0;
  const rangeMin = options.length ? options[0] : 0;
  const rangeMax = options.length ? options[options.length - 1] : 0;

  const stepTo = useCallback((dir) => {
    if (!options.length || stepSize <= 0) return;
    const current = Number(value);
    const base = Number.isFinite(current) ? current : rangeMin;
    const next = Math.min(rangeMax, Math.max(rangeMin, Math.round((base + dir * stepSize) * 1000) / 1000));
    if (next === base) return;
    onCommit(next);
  }, [onCommit, options.length, rangeMax, rangeMin, stepSize, value]);

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

  const currentValue = Number(value);
  const atMin = !options.length || !Number.isFinite(currentValue) || currentValue <= rangeMin;
  const atMax = !options.length || !Number.isFinite(currentValue) || currentValue >= rangeMax;

  const press = (dir, blocked) => (e) => {
    if (locked || e.button !== 0 || blocked) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startHold(dir);
  };

  return (
    <div className="conf-ideum-capex-field">
      <div
        className={`conf-ideum-capex-stepper${isGas ? ' conf-ideum-capex-stepper--gas' : ''}${locked ? ' conf-ideum-capex-stepper--locked' : ''}`}
        role="group"
        aria-labelledby={`${id}-label`}
        aria-disabled={locked || undefined}
        title={locked ? 'Not used on the Wisconsin 1 GW study' : undefined}
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
          disabled={locked || atMin}
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
          disabled={locked || atMax}
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
