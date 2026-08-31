import React from 'react';
import { getTechnologyColor } from '../utils/conf_technologyColors';
import { formatMWExact } from '../utils/conf_formatters';
import { GRID_CONNECTION_MODES } from '../../configuratorData/conf_constants';
import { isStorageTechnology } from '../../configuratorData/conf_technologies';

/**
 * Conceptual single-line diagram (SVG) — dynamically reflects optimizer output.
 * Designed for large-screen / multi-display layouts (data-screen-region="sld").
 */
export default function ConfSldDiagram({ supplyMix, loadMW, gridConnectionMode }) {
  const generation = (supplyMix || []).filter((r) => !isStorageTechnology(r.id));
  const storage = (supplyMix || []).filter((r) => isStorageTechnology(r.id));
  const isGrid = gridConnectionMode !== GRID_CONNECTION_MODES.ISLANDED;

  const genCount = generation.length;
  const genStartX = isGrid ? 120 : 40;
  const genSpacing = genCount > 0 ? Math.min(100, 280 / genCount) : 0;

  return (
    <section className="conf-sld" data-screen-region="sld">
      <h3>Recommended Architecture</h3>
      <p className="conf-sld__note">
        Optimizer-calculated conceptual single-line diagram — not a detailed engineering drawing.
      </p>
      <svg
        className="conf-sld__svg"
        viewBox="0 0 920 220"
        role="img"
        aria-label="Conceptual power architecture diagram"
      >
        <defs>
          <marker id="conf-sld-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#64748b" />
          </marker>
        </defs>

        {isGrid && (
          <g className="conf-sld__grid">
            <rect x="16" y="72" width="88" height="76" rx="8" fill="#f0f9ff" stroke="#005E60" strokeWidth="2" />
            <text x="60" y="98" textAnchor="middle" className="conf-sld__label">Utility Grid</text>
            <text x="60" y="118" textAnchor="middle" className="conf-sld__cap">Import / backup</text>
            <line x1="104" y1="110" x2="160" y2="110" stroke="#64748b" strokeWidth="2" markerEnd="url(#conf-sld-arrow)" />
          </g>
        )}

        {generation.map((asset, i) => {
          const x = genStartX + i * genSpacing;
          const color = getTechnologyColor(asset.id);
          return (
            <g key={asset.id} transform={`translate(${x}, 56)`}>
              <rect width="88" height="72" rx="8" fill="#fff" stroke={color} strokeWidth="2.5" />
              <text x="44" y="28" textAnchor="middle" className="conf-sld__label">{asset.label}</text>
              <text x="44" y="48" textAnchor="middle" className="conf-sld__cap">{formatMWExact(asset.installedMW)}</text>
              <text x="44" y="64" textAnchor="middle" className="conf-sld__pct">{asset.energySharePercent?.toFixed(0)}% energy</text>
            </g>
          );
        })}

        {storage.map((asset) => {
          const color = getTechnologyColor(asset.id);
          const x = genStartX + genCount * genSpacing * 0.5;
          return (
            <g key={asset.id} transform={`translate(${x}, 148)`}>
              <rect width="88" height="56" rx="8" fill="#f5f3ff" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
              <text x="44" y="22" textAnchor="middle" className="conf-sld__label">{asset.label}</text>
              <text x="44" y="40" textAnchor="middle" className="conf-sld__cap">
                {formatMWExact(asset.installedMW)}
                {asset.batteryMWh ? ` / ${Math.round(asset.batteryMWh)} MWh` : ''}
              </text>
            </g>
          );
        })}

        <rect x="400" y="88" width="100" height="44" rx="6" fill="#eef6f6" stroke="#005E60" strokeWidth="2" />
        <text x="450" y="108" textAnchor="middle" className="conf-sld__label">AC Bus</text>
        <text x="450" y="124" textAnchor="middle" className="conf-sld__cap">Collector</text>

        <line x1={genStartX + Math.max(0, genCount - 1) * genSpacing + 88} y1="92" x2="400" y2="110" stroke="#64748b" strokeWidth="2" markerEnd="url(#conf-sld-arrow)" />
        {storage.length > 0 && (
          <line x1="450" y1="132" x2="450" y2="148" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
        )}

        <line x1="500" y1="110" x2="680" y2="110" stroke="#64748b" strokeWidth="2.5" markerEnd="url(#conf-sld-arrow)" />

        <rect x="680" y="64" width="120" height="92" rx="10" fill="#005E60" fillOpacity="0.08" stroke="#005E60" strokeWidth="2.5" />
        <text x="740" y="96" textAnchor="middle" className="conf-sld__label conf-sld__label--load">Data Center</text>
        <text x="740" y="118" textAnchor="middle" className="conf-sld__cap conf-sld__cap--load">{formatMWExact(loadMW)} peak</text>
        <text x="740" y="138" textAnchor="middle" className="conf-sld__pct">Critical load</text>
      </svg>
    </section>
  );
}
