import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

const W = 720;
const H = 340;
const HANDLE_H = 10;
const AXIS_HIT_W = 40;
const AXES = [
  { key: 'loadMW', label: 'Load (MW)', step: 50, format: (v) => `${Math.round(v)} MW` },
  { key: 'reliability', label: 'Availability (%)', step: 0.001, format: (v) => `${v}%` },
  { key: 'minCfe', label: 'Min CFE (%)', step: 1, format: (v) => `${Math.round(v)}%` },
  { key: 'lcoe', label: 'LCOE ($/MWh)', step: 1, format: (v) => `$${Math.round(v)}` },
];

function computeExtents(scenarios) {
  const extents = {};
  AXES.forEach((ax) => {
    const vals = scenarios.map((s) => s[ax.key]);
    extents[ax.key] = { min: Math.min(...vals), max: Math.max(...vals) };
  });
  return extents;
}

function scenarioPassesFilters(scenario, filters) {
  return AXES.every((ax) => {
    const v = scenario[ax.key];
    const { min, max } = filters[ax.key];
    return v >= min && v <= max;
  });
}

function formatAxisValue(ax, value) {
  if (ax.key === 'reliability') return `${value}%`;
  if (ax.key === 'loadMW') return `${Math.round(value)} MW`;
  if (ax.key === 'minCfe') return `${Math.round(value)}%`;
  return `$${Math.round(value)}`;
}

function snap(value, step) {
  if (!step) return value;
  return Math.round(value / step) * step;
}

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  return pt.matrixTransform(ctm.inverse());
}

export default function ConfVizParallelCoordinates({ scenarios }) {
  const svgRef = useRef(null);
  const extents = useMemo(() => computeExtents(scenarios), [scenarios]);
  const [filters, setFilters] = useState(() => computeExtents(scenarios));
  const [hoverId, setHoverId] = useState(null);
  const [drag, setDrag] = useState(null);

  const padX = 80;
  const padY = { top: 44, bottom: 40 };
  const plotH = H - padY.top - padY.bottom;
  const step = (W - padX * 2) / (AXES.length - 1);

  const axisRanges = useMemo(() => {
    const ranges = {};
    AXES.forEach((ax) => {
      const ext = extents[ax.key];
      ranges[ax.key] = { min: ext.min, max: ext.max, span: ext.max - ext.min || 1 };
    });
    return ranges;
  }, [extents]);

  const py = useCallback((key, val) => {
    const { min, max, span } = axisRanges[key];
    const t = (val - min) / span;
    return padY.top + (1 - t) * plotH;
  }, [axisRanges, plotH]);

  const valueFromY = useCallback((key, y) => {
    const ax = AXES.find((a) => a.key === key);
    const { min, span } = axisRanges[key];
    const t = 1 - (y - padY.top) / plotH;
    const raw = min + t * span;
    const ext = extents[key];
    return clamp(snap(raw, ax?.step), ext.min, ext.max);
  }, [axisRanges, extents, plotH]);

  const setFilterRange = useCallback((key, minVal, maxVal) => {
    const ax = AXES.find((a) => a.key === key);
    const ext = extents[key];
    let lo = snap(Math.min(minVal, maxVal), ax.step);
    let hi = snap(Math.max(minVal, maxVal), ax.step);
    lo = clamp(lo, ext.min, ext.max);
    hi = clamp(hi, ext.min, ext.max);
    if (lo > hi) [lo, hi] = [hi, lo];
    setFilters((prev) => ({ ...prev, [key]: { min: lo, max: hi } }));
  }, [extents]);

  const updateFilter = (key, bound, value) => {
    setFilters((prev) => {
      const ax = AXES.find((a) => a.key === key);
      const next = {
        ...prev,
        [key]: { ...prev[key], [bound]: snap(value, ax.step) },
      };
      if (next[key].min > next[key].max) {
        if (bound === 'min') next[key].max = next[key].min;
        else next[key].min = next[key].max;
      }
      return next;
    });
  };

  const filtered = useMemo(
    () => scenarios.filter((s) => scenarioPassesFilters(s, filters)),
    [scenarios, filters],
  );

  const filteredIds = useMemo(() => new Set(filtered.map((s) => s.id)), [filtered]);

  const resetFilters = () => setFilters(extents);

  const handleAxisPointerDown = (ax, e) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;

    const { y } = clientToSvg(svg, e.clientX, e.clientY);
    const { min, max } = filters[ax.key];
    const yTop = py(ax.key, max);
    const yBot = py(ax.key, min);
    const brushTop = Math.min(yTop, yBot);
    const brushBot = Math.max(yTop, yBot);

    if (y >= brushTop - HANDLE_H && y <= brushTop + HANDLE_H) {
      setDrag({ key: ax.key, mode: 'top' });
    } else if (y >= brushBot - HANDLE_H && y <= brushBot + HANDLE_H) {
      setDrag({ key: ax.key, mode: 'bottom' });
    } else if (y >= brushTop && y <= brushBot) {
      setDrag({
        key: ax.key,
        mode: 'move',
        startY: y,
        startMin: min,
        startMax: max,
      });
    } else {
      const v = valueFromY(ax.key, y);
      setFilters((prev) => ({ ...prev, [ax.key]: { min: v, max: v } }));
      setDrag({ key: ax.key, mode: 'new', startY: y });
    }
  };

  useEffect(() => {
    if (!drag) return undefined;

    const onMove = (e) => {
      const svg = svgRef.current;
      if (!svg) return;
      const { y } = clientToSvg(svg, e.clientX, e.clientY);
      const { key, mode } = drag;
      const ext = extents[key];
      const ax = AXES.find((a) => a.key === key);
      const { span } = axisRanges[key];

      if (mode === 'new') {
        const vStart = valueFromY(key, drag.startY);
        const vNow = valueFromY(key, y);
        setFilterRange(key, vStart, vNow);
        return;
      }

      if (mode === 'top') {
        const v = valueFromY(key, y);
        setFilters((prev) => ({
          ...prev,
          [key]: {
            min: prev[key].min,
            max: clamp(snap(v, ax.step), prev[key].min, ext.max),
          },
        }));
        return;
      }

      if (mode === 'bottom') {
        const v = valueFromY(key, y);
        setFilters((prev) => ({
          ...prev,
          [key]: {
            min: clamp(snap(v, ax.step), ext.min, prev[key].max),
            max: prev[key].max,
          },
        }));
        return;
      }

      if (mode === 'move') {
        const deltaVal = -((y - drag.startY) / plotH) * span;
        const range = drag.startMax - drag.startMin;
        let newMin = drag.startMin + deltaVal;
        let newMax = drag.startMax + deltaVal;
        if (newMin < ext.min) {
          newMin = ext.min;
          newMax = ext.min + range;
        }
        if (newMax > ext.max) {
          newMax = ext.max;
          newMin = ext.max - range;
        }
        setFilters((prev) => ({
          ...prev,
          [key]: {
            min: snap(newMin, ax.step),
            max: snap(newMax, ax.step),
          },
        }));
      }
    };

    const onUp = () => setDrag(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, axisRanges, extents, plotH, setFilterRange, valueFromY]);

  useEffect(() => {
    if (!drag) return undefined;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [drag]);

  const hoverScenario = hoverId ? scenarios.find((s) => s.id === hoverId) : null;
  const isDragging = Boolean(drag);

  return (
    <div className="conf-viz conf-viz--parallel">
      <div className="conf-pc-filters">
        <div className="conf-pc-filters__header">
          <span>Axis filters</span>
          <button type="button" className="conf-pc-filters__reset" onClick={resetFilters}>
            Reset all
          </button>
          <span className="conf-pc-filters__count">
            Showing {filtered.length} of {scenarios.length} scenarios
          </span>
        </div>
        <div className="conf-pc-filters__grid">
          {AXES.map((ax) => {
            const { min: extMin, max: extMax } = extents[ax.key];
            const { min, max } = filters[ax.key];
            return (
              <div key={ax.key} className="conf-pc-filter">
                <label className="conf-pc-filter__label">{ax.label}</label>
                <div className="conf-pc-filter__range">
                  <input
                    type="range"
                    min={extMin}
                    max={extMax}
                    step={ax.step}
                    value={min}
                    onChange={(e) => updateFilter(ax.key, 'min', Number(e.target.value))}
                    aria-label={`${ax.label} minimum`}
                  />
                  <input
                    type="range"
                    min={extMin}
                    max={extMax}
                    step={ax.step}
                    value={max}
                    onChange={(e) => updateFilter(ax.key, 'max', Number(e.target.value))}
                    aria-label={`${ax.label} maximum`}
                  />
                </div>
                <div className="conf-pc-filter__values">
                  <span>{formatAxisValue(ax, min)}</span>
                  <span>→</span>
                  <span>{formatAxisValue(ax, max)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`conf-viz__svg conf-viz__svg--brushable${isDragging ? ' conf-viz__svg--dragging' : ''}`}
        role="img"
        aria-label="Parallel coordinates chart with draggable axis brushes"
      >
        {scenarios.map((s) => {
          const visible = filteredIds.has(s.id);
          const active = hoverId === s.id;
          const pts = AXES.map((ax, i) => `${padX + i * step},${py(ax.key, s[ax.key])}`).join(' ');
          return (
            <polyline
              key={s.id}
              points={pts}
              fill="none"
              stroke={active ? '#005E60' : visible ? 'rgba(0,94,96,0.45)' : 'rgba(148,163,184,0.15)'}
              strokeWidth={active ? 2.5 : visible ? 1.1 : 0.6}
              pointerEvents={isDragging || !visible ? 'none' : 'stroke'}
              onMouseEnter={() => visible && setHoverId(s.id)}
              onMouseLeave={() => setHoverId(null)}
            />
          );
        })}

        {AXES.map((ax, i) => {
          const x = padX + i * step;
          const { min, max } = filters[ax.key];
          const yTop = py(ax.key, max);
          const yBot = py(ax.key, min);
          const brushTop = Math.min(yTop, yBot);
          const brushBot = Math.max(yTop, yBot);
          const brushH = Math.max(brushBot - brushTop, 2);
          const isActiveAxis = drag?.key === ax.key;

          return (
            <g key={ax.key} className="conf-pc-axis">
              <line
                x1={x}
                y1={padY.top}
                x2={x}
                y2={H - padY.bottom}
                stroke="#cbd5e1"
                strokeWidth={2}
                pointerEvents="none"
              />
              <text x={x} y={28} textAnchor="middle" className="conf-viz__tick" pointerEvents="none">
                {ax.label}
              </text>

              <rect
                className="conf-pc-axis__hit"
                x={x - AXIS_HIT_W / 2}
                y={padY.top}
                width={AXIS_HIT_W}
                height={plotH}
                fill="transparent"
                onPointerDown={(e) => handleAxisPointerDown(ax, e)}
              />

              <rect
                className="conf-pc-axis__brush"
                x={x - 16}
                y={brushTop}
                width={32}
                height={brushH}
                fill="rgba(0, 94, 96, 0.14)"
                stroke="#005E60"
                strokeWidth={1.5}
                rx={4}
                pointerEvents="none"
              />

              <rect
                className="conf-pc-axis__handle conf-pc-axis__handle--top"
                x={x - 18}
                y={brushTop - 5}
                width={36}
                height={10}
                fill={isActiveAxis ? '#004b4d' : '#005E60'}
                rx={3}
                onPointerDown={(e) => handleAxisPointerDown(ax, e)}
              />
              <rect
                className="conf-pc-axis__handle conf-pc-axis__handle--bottom"
                x={x - 18}
                y={brushBot - 5}
                width={36}
                height={10}
                fill={isActiveAxis ? '#004b4d' : '#005E60'}
                rx={3}
                onPointerDown={(e) => handleAxisPointerDown(ax, e)}
              />
            </g>
          );
        })}
      </svg>

      {hoverScenario && filteredIds.has(hoverScenario.id) && !isDragging && (
        <div className="conf-viz__tooltip">
          <strong>{hoverScenario.label}</strong>
          {' — '}
          LCOE ${hoverScenario.lcoe}/MWh
        </div>
      )}

      <p className="conf-viz__legend">
        Drag on any axis below to brush a range, grab the teal handles to resize, or drag the band to
        move it. Sliders above stay in sync.
      </p>
    </div>
  );
}
