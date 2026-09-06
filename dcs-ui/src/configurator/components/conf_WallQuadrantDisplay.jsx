import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConfKpiStrip from './conf_KpiStrip';
import ConfSupplyMixChart from './conf_SupplyMixChart';
import ConfCapacityBars from './conf_CapacityBars';
import ConfMetricsPanel from './conf_MetricsPanel';
import ConfArchitectureCanvas from './conf_ArchitectureCanvas';
import ConfDesignTargets from './conf_DesignTargets';
import { formatGWh, formatMWExact, formatPercent } from '../utils/conf_formatters';

const BEZEL_STORAGE_KEY = 'dcs-conf-wall-bezel-split';
const BEZEL_MIN = 15;
const BEZEL_MAX = 85;
const DEFAULT_SPLIT = { x: 50, y: 50 };

function clampSplit(value) {
  return Math.min(BEZEL_MAX, Math.max(BEZEL_MIN, value));
}

function readStoredSplit() {
  try {
    const raw = localStorage.getItem(BEZEL_STORAGE_KEY);
    if (!raw) return DEFAULT_SPLIT;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: clampSplit(parsed.x), y: clampSplit(parsed.y) };
    }
  } catch (_) {
    /* ignore */
  }
  return DEFAULT_SPLIT;
}

function useWallBezelSplit() {
  const [split, setSplit] = useState(readStoredSplit);

  useEffect(() => {
    try {
      localStorage.setItem(BEZEL_STORAGE_KEY, JSON.stringify(split));
    } catch (_) {
      /* ignore */
    }
  }, [split]);

  const resetSplit = useCallback(() => setSplit(DEFAULT_SPLIT), []);

  return { split, setSplit, resetSplit };
}

function WallDisplayShell({ split, setSplit, resetSplit, children }) {
  const shellRef = useRef(null);
  const dragRef = useRef(null);

  const gridStyle = {
    gridTemplateColumns: `${split.x}% ${100 - split.x}%`,
    gridTemplateRows: `${split.y}% ${100 - split.y}%`,
  };

  const updateSplitFromPointer = useCallback((clientX, clientY, axis) => {
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit((prev) => {
      const next = { ...prev };
      if (axis === 'x' || axis === 'both') {
        next.x = clampSplit(((clientX - rect.left) / rect.width) * 100);
      }
      if (axis === 'y' || axis === 'both') {
        next.y = clampSplit(((clientY - rect.top) / rect.height) * 100);
      }
      return next;
    });
  }, [setSplit]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    document.body.classList.remove(
      'conf-wall-bezel-dragging',
      'conf-wall-bezel-dragging-x',
      'conf-wall-bezel-dragging-y',
      'conf-wall-bezel-dragging-both',
    );
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      updateSplitFromPointer(e.clientX, e.clientY, drag.axis);
    };
    const onUp = () => endDrag();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [endDrag, updateSplitFromPointer]);

  const startDrag = (axis) => (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { axis };
    document.body.classList.add('conf-wall-bezel-dragging', `conf-wall-bezel-dragging-${axis}`);
    updateSplitFromPointer(e.clientX, e.clientY, axis);
  };

  const handleDividerDoubleClick = (axis) => (e) => {
    e.preventDefault();
    if (axis === 'x') {
      setSplit((prev) => ({ ...prev, x: DEFAULT_SPLIT.x }));
    } else if (axis === 'y') {
      setSplit((prev) => ({ ...prev, y: DEFAULT_SPLIT.y }));
    } else {
      resetSplit();
    }
  };

  return (
    <div className="conf-wall-display-shell" ref={shellRef}>
      <div className="conf-wall-display" style={gridStyle} data-screen-region="results">
        {children}
      </div>

      <div
        className="conf-wall-bezel-divider conf-wall-bezel-divider--vertical"
        style={{ left: `${split.x}%` }}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(split.x)}
        aria-valuemin={BEZEL_MIN}
        aria-valuemax={BEZEL_MAX}
        aria-label="Drag left or right to align vertical screen bezel"
        title="Drag to align with vertical bezel · double-click to reset"
        onPointerDown={startDrag('x')}
        onDoubleClick={handleDividerDoubleClick('x')}
      />
      <div
        className="conf-wall-bezel-divider conf-wall-bezel-divider--horizontal"
        style={{ top: `${split.y}%` }}
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={Math.round(split.y)}
        aria-valuemin={BEZEL_MIN}
        aria-valuemax={BEZEL_MAX}
        aria-label="Drag up or down to align horizontal screen bezel"
        title="Drag to align with horizontal bezel · double-click to reset"
        onPointerDown={startDrag('y')}
        onDoubleClick={handleDividerDoubleClick('y')}
      />
      <button
        type="button"
        className="conf-wall-bezel-joint"
        style={{ left: `${split.x}%`, top: `${split.y}%` }}
        aria-label="Drag to move both bezels · double-click to reset both"
        title="Drag to move both bezels · double-click to reset both"
        onPointerDown={startDrag('both')}
        onDoubleClick={handleDividerDoubleClick('both')}
      />
    </div>
  );
}

function formatWallGwLoad(loadMW) {
  const gw = Number(loadMW) / 1000;
  if (!Number.isFinite(gw) || gw <= 0) return null;
  return `${gw.toFixed(2)} GW`;
}

function WallQuadrant({ title, children, className = '' }) {
  return (
    <section className={`conf-wall-quadrant ${className}`.trim()} aria-label={title}>
      <header className="conf-wall-quadrant__header">
        <h2 className="conf-wall-quadrant__title">{title}</h2>
      </header>
      <div className="conf-wall-quadrant__body">{children}</div>
    </section>
  );
}

function WallDetailsTable({ mix }) {
  if (!mix?.length) return null;
  return (
    <div className="conf-wall-details-table-wrap">
      <table className="conf-table conf-wall-details-table">
        <thead>
          <tr>
            <th>Technology</th>
            <th>Capacity</th>
            <th>Energy share</th>
            <th>Annual generation</th>
          </tr>
        </thead>
        <tbody>
          {mix.map((row) => (
            <tr key={row.id}>
              <td>{row.fullLabel || row.label}</td>
              <td>
                {formatMWExact(row.installedMW)}
                {row.batteryMWh ? ` / ${Math.round(row.batteryMWh).toLocaleString()} MWh` : ''}
              </td>
              <td>{formatPercent(row.capacitySharePercent ?? row.energySharePercent, 2)}</td>
              <td>{formatGWh(row.energyContributionGWh)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WallOverlayState({ children, className = '' }) {
  return (
    <div className={`conf-wall-overlay-state ${className}`.trim()} style={{ gridColumn: '1 / -1', gridRow: '1 / -1' }}>
      {children}
    </div>
  );
}

export default function ConfWallQuadrantDisplay({
  result,
  inputs,
  isGenerating,
  statusMessage,
  wallSessionStatus = 'idle',
}) {
  const { split, setSplit, resetSplit } = useWallBezelSplit();

  if (isGenerating) {
    return (
      <WallDisplayShell split={split} setSplit={setSplit} resetSplit={resetSplit}>
        <WallOverlayState>
          <div className="conf-loading-spinner conf-loading-spinner--wall" aria-hidden="true" />
          <p>{statusMessage || 'Generating architecture on Maingear…'}</p>
        </WallOverlayState>
      </WallDisplayShell>
    );
  }

  if (!result?.ok) {
    return (
      <WallDisplayShell split={split} setSplit={setSplit} resetSplit={resetSplit}>
        <WallOverlayState className="conf-wall-overlay-state--idle">
          <h2>Ready — waiting for Ideum</h2>
          <p>
            Open <strong>DC Configurator Ideum</strong> on the touch table, set requirements, and press{' '}
            <strong>CONFIGURE</strong>.
          </p>
          <p className="conf-wall-overlay-state__status">
            Status:{' '}
            {wallSessionStatus === 'generating' ? 'Computing…' : 'Waiting for first configuration'}
          </p>
          <p className="conf-wall-overlay-state__bezel-hint">
            Drag the dark bezel lines to align with your 2×2 physical screens.
          </p>
        </WallOverlayState>
      </WallDisplayShell>
    );
  }

  const locationLabel = result.location
    ? `${result.location.city || ''}, ${result.location.state || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
    : '';
  const gwLoad = formatWallGwLoad(inputs?.loadMW);
  const architectureTitle = gwLoad
    ? `Recommended Architecture for ${gwLoad} data center`
    : 'Recommended Architecture';
  const kpiTitle = [gwLoad ? `Key Performance Indicators — ${gwLoad}` : 'Key Performance Indicators', locationLabel]
    .filter(Boolean)
    .join(' · ');

  return (
    <WallDisplayShell split={split} setSplit={setSplit} resetSplit={resetSplit}>
      <WallQuadrant
        title={architectureTitle}
        className="conf-wall-quadrant--architecture"
      >
        <ConfArchitectureCanvas
          supplyMix={result.supplyMix}
          loadMW={inputs.loadMW}
          gridConnectionMode={result.gridConnectionMode || inputs.gridConnectionMode}
          variant="wall"
        />
      </WallQuadrant>

      <WallQuadrant
        title={kpiTitle}
        className="conf-wall-quadrant--kpis"
      >
        <ConfKpiStrip result={result} />
        <ConfDesignTargets result={result} inputs={inputs} />
      </WallQuadrant>

      <WallQuadrant
        title="Optimal Supply Mix — capacity allocation by technology"
        className="conf-wall-quadrant--supply"
      >
        <ConfSupplyMixChart mix={result.supplyMix} />
        <ConfCapacityBars mix={result.supplyMix} capacityFactors={result.capacityFactors} />
      </WallQuadrant>

      <WallQuadrant
        title="Economics & Environment — LCOE, carbon & renewables"
        className="conf-wall-quadrant--economics"
      >
        <ConfMetricsPanel result={result} />
        <WallDetailsTable mix={result.supplyMix} />
      </WallQuadrant>
    </WallDisplayShell>
  );
}
