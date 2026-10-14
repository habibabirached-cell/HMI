import React from 'react';
import ConfKpiStrip from './conf_KpiStrip';
import ConfCapacityBars from './conf_CapacityBars';
import ConfMetricsPanel from './conf_MetricsPanel';
import ConfArchitectureCanvas from './conf_ArchitectureCanvas';
import ConfDesignTargets from './conf_DesignTargets';
import { formatGWh, formatMWExact, formatPercent } from '../utils/conf_formatters';

function formatWallGwLoad(loadMW) {
  const gw = Number(loadMW) / 1000;
  if (!Number.isFinite(gw) || gw <= 0) return null;
  return `${gw.toFixed(2)} GW`;
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
                {row.unitCount != null && Number(row.unitCount) > 0
                  ? ` · ${Math.round(row.unitCount)} unit${Math.round(row.unitCount) === 1 ? '' : 's'}`
                  : ''}
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

function ExplorePane({ title, className, children }) {
  return (
    <section className={`conf-wall-quadrant ${className}`.trim()} aria-label={title}>
      <header className="conf-wall-quadrant__header">
        <h2 className="conf-wall-quadrant__title">{title}</h2>
      </header>
      <div className="conf-wall-quadrant__body">{children}</div>
    </section>
  );
}

function ExploreWallLoading({ message }) {
  return (
    <div className="conf-wall-overlay-state conf-wall-overlay-state--idle dataVis-exploreWall__loading">
      <div className="conf-loading-spinner conf-loading-spinner--wall" aria-hidden="true" />
      <p>{message || 'Updating optimized configuration…'}</p>
    </div>
  );
}

/** Returns [TL, TR, BL] panes for WallBezelShell (spread as children). BR is parallel coords in layout. */
export function buildExploreWallPanes({ result, inputs, isGenerating, statusMessage }) {
  if (isGenerating) {
    return [
      <ExplorePane key="arch" title="Recommended Architecture" className="conf-wall-quadrant--architecture">
        <ExploreWallLoading message={statusMessage} />
      </ExplorePane>,
      <ExplorePane key="kpi" title="Key Performance Indicators" className="conf-wall-quadrant--kpis">
        <ExploreWallLoading />
      </ExplorePane>,
      <ExplorePane key="supply" title="Optimal Supply Mix" className="conf-wall-quadrant--supply">
        <ExploreWallLoading />
      </ExplorePane>,
    ];
  }

  if (!result?.ok) {
    return [
      <ExplorePane key="arch" title="Recommended Architecture" className="conf-wall-quadrant--architecture">
        <p className="dataVis-muted">Adjust inputs on the touch table to compute an optimized architecture.</p>
      </ExplorePane>,
      <ExplorePane key="kpi" title="Key Performance Indicators" className="conf-wall-quadrant--kpis">
        <p className="dataVis-muted">KPIs appear when a configuration is available.</p>
      </ExplorePane>,
      <ExplorePane key="supply" title="Optimal Supply Mix" className="conf-wall-quadrant--supply">
        <p className="dataVis-muted">Supply mix appears when a configuration is available.</p>
      </ExplorePane>,
    ];
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

  return [
    <ExplorePane key="arch" title={architectureTitle} className="conf-wall-quadrant--architecture">
      <ConfArchitectureCanvas
        supplyMix={result.supplyMix}
        capacityFactors={result.capacityFactors}
        loadMW={inputs?.loadMW}
        gridConnectionMode={result.gridConnectionMode || inputs?.gridConnectionMode}
        variant="wall"
      />
    </ExplorePane>,
    <ExplorePane
      key="kpi"
      title={kpiTitle}
      className="conf-wall-quadrant--kpis dataVis-exploreWall__kpisPane"
    >
      <ConfKpiStrip result={result} />
      <ConfDesignTargets result={result} inputs={inputs} />
      <div className="conf-wall-quadrant--supply dataVis-exploreWall__capacityCharts">
        <ConfCapacityBars
          mix={result.supplyMix}
          capacityFactors={result.capacityFactors}
          variant="wall"
        />
      </div>
    </ExplorePane>,
    <ExplorePane
      key="supply"
      title="Optimal Supply Mix · Economics & Environment"
      className="conf-wall-quadrant--supply dataVis-exploreWall__supplyEconomics"
    >
      <ConfMetricsPanel result={result} />
      <WallDetailsTable mix={result.supplyMix} />
    </ExplorePane>,
  ];
}
