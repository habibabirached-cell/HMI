import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  buildCapexWheelOptions,
  formatCapexDisplay,
  nearestCapexWheelOption,
} from '../utils/conf_technologyCapex';

const WHEEL_ITEM_PX = 52;
const WHEEL_VIEW_ROWS = 3;
const WHEEL_VIEW_PX = WHEEL_ITEM_PX * WHEEL_VIEW_ROWS;
const WHEEL_PAD_PX = WHEEL_ITEM_PX * Math.floor(WHEEL_VIEW_ROWS / 2);

function CapexWheelPicker({ options, value, onChange, idSuffix }) {
  const listRef = useRef(null);
  const scrollEndTimer = useRef(null);
  const programmatic = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const indexForValue = useCallback((val) => {
    const n = nearestCapexWheelOption(val, options);
    const idx = options.indexOf(n);
    return idx >= 0 ? idx : 0;
  }, [options]);

  const scrollToIndex = useCallback((idx, behavior = 'auto') => {
    const el = listRef.current;
    if (!el || idx < 0 || idx >= options.length) return;
    programmatic.current = true;
    el.scrollTo({ top: idx * WHEEL_ITEM_PX, behavior });
    window.setTimeout(() => {
      programmatic.current = false;
    }, behavior === 'smooth' ? 320 : 0);
  }, [options.length]);

  useEffect(() => {
    scrollToIndex(indexForValue(value), 'auto');
  }, [value, indexForValue, scrollToIndex]);

  const commitIndex = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(options.length - 1, idx));
    const next = options[clamped];
    if (next !== valueRef.current) {
      onChange(next);
    }
    scrollToIndex(clamped, 'smooth');
  }, [onChange, options, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (programmatic.current || !listRef.current) return;
    if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / WHEEL_ITEM_PX);
      commitIndex(idx);
    }, 90);
  }, [commitIndex]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    const onScrollEnd = () => {
      if (programmatic.current) return;
      const idx = Math.round(el.scrollTop / WHEEL_ITEM_PX);
      commitIndex(idx);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    el.addEventListener('scrollend', onScrollEnd);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener('scrollend', onScrollEnd);
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
    };
  }, [commitIndex, handleScroll]);

  const selectedIdx = indexForValue(value);

  return (
    <div
      className="conf-ideum-capex-wheel"
      aria-hidden={options.length === 0}
    >
      <div
        className="conf-ideum-capex-wheel__window"
        style={{ height: WHEEL_VIEW_PX }}
      >
        <div className="conf-ideum-capex-wheel__fade conf-ideum-capex-wheel__fade--top" />
        <div className="conf-ideum-capex-wheel__fade conf-ideum-capex-wheel__fade--bottom" />
        <div className="conf-ideum-capex-wheel__rail" aria-hidden="true" />
        <ul
          ref={listRef}
          className="conf-ideum-capex-wheel__list"
          id={`${idSuffix}-wheel`}
          role="listbox"
          aria-label="Scroll to select value"
          aria-activedescendant={`${idSuffix}-opt-${selectedIdx}`}
        >
          <li className="conf-ideum-capex-wheel__pad" style={{ height: WHEEL_PAD_PX }} aria-hidden />
          {options.map((opt, idx) => (
            <li
              key={opt}
              id={`${idSuffix}-opt-${idx}`}
              role="option"
              aria-selected={idx === selectedIdx}
              className={`conf-ideum-capex-wheel__item${idx === selectedIdx ? ' conf-ideum-capex-wheel__item--selected' : ''}`}
              style={{ height: WHEEL_ITEM_PX }}
              onClick={() => commitIndex(idx)}
            >
              {formatCapexDisplay(opt)}
            </li>
          ))}
          <li className="conf-ideum-capex-wheel__pad" style={{ height: WHEEL_PAD_PX }} aria-hidden />
        </ul>
      </div>
    </div>
  );
}

export default function ConfCapexValueField({
  id,
  label,
  unit,
  value,
  wheelPreset,
  onCommit,
}) {
  const [draft, setDraft] = useState(formatCapexDisplay(value));
  const [focused, setFocused] = useState(false);

  const options = useMemo(
    () => buildCapexWheelOptions(wheelPreset),
    [wheelPreset],
  );

  useEffect(() => {
    if (!focused) {
      setDraft(formatCapexDisplay(value));
    }
  }, [value, focused]);

  const commitNumber = useCallback((raw) => {
    const cleaned = String(raw).replace(/,/g, '').trim();
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) {
      onCommit(value);
      return;
    }
    const snapped = nearestCapexWheelOption(n, options);
    onCommit(snapped);
  }, [onCommit, options, value]);

  const commit = useCallback(() => {
    commitNumber(draft);
    setFocused(false);
  }, [commitNumber, draft]);

  return (
    <div className="conf-ideum-capex-field">
      <label
        className={`conf-ideum-capex-field__label${label === 'Installed CAPEX' ? ' conf-ideum-capex-field__label--installed' : ''}`}
        htmlFor={id}
      >
        {label}
      </label>
      <div className="conf-ideum-capex-field__stack">
        <div className="conf-ideum-capex-field__row">
          <span className="conf-ideum-capex-field__unit" aria-hidden="true">$</span>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            className="conf-ideum-capex-field__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
          />
          {unit ? <span className="conf-ideum-capex-field__suffix">{unit}</span> : null}
        </div>
        {options.length > 0 ? (
          <CapexWheelPicker
            idSuffix={id}
            options={options}
            value={value}
            onChange={onCommit}
          />
        ) : null}
      </div>
    </div>
  );
}
