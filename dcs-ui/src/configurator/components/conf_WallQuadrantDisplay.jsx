import React from 'react';
import WallBezelShell, { useWallBezelSplit } from './conf_WallBezelShell';
import ConfKpiStrip from './conf_KpiStrip';
import ConfCapacityBars from './conf_CapacityBars';
import ConfMetricsPanel from './conf_MetricsPanel';
import ConfArchitectureCanvas from './conf_ArchitectureCanvas';
import ConfDesignTargets from './conf_DesignTargets';
import { formatGWh, formatMWExact, formatPercent } from '../utils/conf_formatters';

const BEZEL_STORAGE_KEY = 'dcs-conf-wall-bezel-split';

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
  const { split, setSplit, resetSplit } = useWallBezelSplit(BEZEL_STORAGE_KEY);

  if (isGenerating) {
    return (
      <WallBezelShell split={split} setSplit={setSplit} resetSplit={resetSplit}>
        <WallOverlayState>
          <div className="conf-loading-spinner conf-loading-spinner--wall" aria-hidden="true" />
          <p>{statusMessage || 'Generating architecture on Maingear…'}</p>
        </WallOverlayState>
      </WallBezelShell>
    );
  }

  if (result?.ok && result.wallPresentation === 'martin_coming_soon') {
    return (
      <WallBezelShell split={split} setSplit={setSplit} resetSplit={resetSplit}>
        <WallOverlayState className="conf-wall-overlay-state--martin">
          <p className="conf-wall-martin-soon__eyebrow">Martin Waco 1 GW · DOE study</p>
          <h2>{result.title || 'Coming soon'}</h2>
          <p>{result.message || 'The footer CONFIGURE path will use Martin simulation data.'}</p>
          <p className="conf-wall-overlay-state__bezel-hint">
            Use the top-left <strong>Configure</strong> control on the touch table for the classic wall output.
          </p>
        </WallOverlayState>
      </WallBezelShell>
    );
  }

  if (!result?.ok) {
    return (
      <WallBezelShell split={split} setSplit={setSplit} resetSplit={resetSplit}>
        <WallOverlayState className="conf-wall-overlay-state--idle">
          <h2>Ready — waiting for Ideum</h2>
          <p>
            Open <strong>Data Center Configurator</strong> on the touch table, set requirements, and press{' '}
            <strong>CONFIGURE</strong> (footer) or <strong>Configure</strong> (top-left, classic).
          </p>
          <p className="conf-wall-overlay-state__status">
            Status:{' '}
            {wallSessionStatus === 'generating' ? 'Computing…' : 'Waiting for first configuration'}
          </p>
          <p className="conf-wall-overlay-state__bezel-hint">
            Drag the dark bezel lines to align with your 2×2 physical screens.
          </p>
        </WallOverlayState>
      </WallBezelShell>
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
    <WallBezelShell split={split} setSplit={setSplit} resetSplit={resetSplit}>
      <WallQuadrant
        title={architectureTitle}
        className="conf-wall-quadrant--architecture"
      >
        <ConfArchitectureCanvas
          supplyMix={result.supplyMix}
          capacityFactors={result.capacityFactors}
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
        <ConfCapacityBars
          mix={result.supplyMix}
          capacityFactors={result.capacityFactors}
          variant="wall"
        />
      </WallQuadrant>

      <WallQuadrant
        title="Economics & Environment — LCOE, carbon & renewables"
        className="conf-wall-quadrant--economics"
      >
        <ConfMetricsPanel result={result} />
        <WallDetailsTable mix={result.supplyMix} />
      </WallQuadrant>
    </WallBezelShell>
  );
}
