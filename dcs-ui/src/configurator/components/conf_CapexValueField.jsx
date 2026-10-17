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

const WHEEL_VIEW_ROWS = 3;
const WHEEL_ITEM_PX_MIN = 44;
const WHEEL_ITEM_PX_MAX = 88;
const WHEEL_ITEM_PX_DEFAULT = 52;

function CapexWheelPicker({ options, value, onChange, idSuffix, formatWheelValue }) {
  const fmt = formatWheelValue || formatCapexDisplay;
  const listRef = useRef(null);
  const windowRef = useRef(null);
  const scrollEndTimer = useRef(null);
  const programmatic = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [itemPx, setItemPx] = useState(WHEEL_ITEM_PX_DEFAULT);
  const padPx = itemPx * Math.floor(WHEEL_VIEW_ROWS / 2);

  useEffect(() => {
    const el = windowRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const sync = () => {
      const h = el.clientHeight;
      if (h < WHEEL_ITEM_PX_MIN * WHEEL_VIEW_ROWS) return;
      const next = Math.round(h / WHEEL_VIEW_ROWS);
      setItemPx(Math.max(WHEEL_ITEM_PX_MIN, Math.min(WHEEL_ITEM_PX_MAX, next)));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const indexForValue = useCallback((val) => {
    const n = nearestCapexWheelOption(val, options);
    const idx = options.indexOf(n);
    return idx >= 0 ? idx : 0;
  }, [options]);

  const scrollToIndex = useCallback((idx, behavior = 'auto') => {
    const el = listRef.current;
    if (!el || idx < 0 || idx >= options.length) return;
    programmatic.current = true;
    el.scrollTo({ top: idx * itemPx, behavior });
    window.setTimeout(() => {
      programmatic.current = false;
    }, behavior === 'smooth' ? 320 : 0);
  }, [itemPx, options.length]);

  useEffect(() => {
    scrollToIndex(indexForValue(value), 'auto');
  }, [value, indexForValue, scrollToIndex, itemPx]);

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
      const idx = Math.round(el.scrollTop / itemPx);
      commitIndex(idx);
    }, 90);
  }, [commitIndex, itemPx]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    const onScrollEnd = () => {
      if (programmatic.current) return;
      const idx = Math.round(el.scrollTop / itemPx);
      commitIndex(idx);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    el.addEventListener('scrollend', onScrollEnd);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener('scrollend', onScrollEnd);
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
    };
  }, [commitIndex, handleScroll, itemPx]);

  const selectedIdx = indexForValue(value);

  return (
    <div
      className="conf-ideum-capex-wheel"
      aria-hidden={options.length === 0}
    >
      <div
        ref={windowRef}
        className="conf-ideum-capex-wheel__window"
      >
        <div className="conf-ideum-capex-wheel__fade conf-ideum-capex-wheel__fade--top" />
        <div className="conf-ideum-capex-wheel__fade conf-ideum-capex-wheel__fade--bottom" />
        <div
          className="conf-ideum-capex-wheel__rail"
          aria-hidden="true"
          style={{ height: itemPx }}
        />
        <ul
          ref={listRef}
          className="conf-ideum-capex-wheel__list"
          id={`${idSuffix}-wheel`}
          role="listbox"
          aria-label="Scroll to select value"
          aria-activedescendant={`${idSuffix}-opt-${selectedIdx}`}
        >
          <li className="conf-ideum-capex-wheel__pad" style={{ height: padPx }} aria-hidden />
          {options.map((opt, idx) => (
            <li
              key={opt}
              id={`${idSuffix}-opt-${idx}`}
              role="option"
              aria-selected={idx === selectedIdx}
              className={`conf-ideum-capex-wheel__item${idx === selectedIdx ? ' conf-ideum-capex-wheel__item--selected' : ''}`}
              style={{ height: itemPx, fontSize: `clamp(18px, ${Math.round(itemPx * 0.42)}px, 32px)` }}
              onClick={() => commitIndex(idx)}
            >
              {fmt(opt)}
            </li>
          ))}
          <li className="conf-ideum-capex-wheel__pad" style={{ height: padPx }} aria-hidden />
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
  wheelOptions = null,
  formatDisplay = formatCapexDisplay,
  onCommit,
}) {
  const fmt = formatDisplay;
  const [draft, setDraft] = useState(() => fmt(value));
  const [focused, setFocused] = useState(false);

  const options = useMemo(
    () => (Array.isArray(wheelOptions) && wheelOptions.length
      ? wheelOptions
      : buildCapexWheelOptions(wheelPreset)),
    [wheelOptions, wheelPreset],
  );

  useEffect(() => {
    if (!focused) {
      setDraft(fmt(value));
    }
  }, [value, focused, fmt]);

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
            formatWheelValue={fmt}
          />
        ) : null}
      </div>
    </div>
  );
}
