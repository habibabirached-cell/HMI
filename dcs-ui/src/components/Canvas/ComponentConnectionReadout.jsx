import React, { useMemo } from 'react';
import { buildConnectionReadoutLines } from '../../utils/connectionReadoutSampling';
import './ComponentConnectionReadout.css';

export const CONNECTION_READOUT_WIDTH = 218;
export const CONNECTION_READOUT_HEIGHT = 54;
const FO_WIDTH = CONNECTION_READOUT_WIDTH;
const FO_HEIGHT = CONNECTION_READOUT_HEIGHT;
const READOUT_GAP = 8;

function readoutHasAnySlot(connectionReadout) {
  return (connectionReadout?.slots || []).some((s) => s && String(s.column || '').trim() !== '');
}

/** HTML readout panel (same markup as foreignObject inner content). */
export function ConnectionReadoutHtml({ lines, swatchColor = '#cddc39', className = '' }) {
  if (!lines) return null;

  return (
    <div className={`connection-readout-fo ${className}`.trim()}>
      <div className="connection-readout-inner">
        <div className="connection-readout-swatch" style={{ background: swatchColor }} />
        <div className="connection-readout-text">
          <div className="connection-readout-line1">{lines.line1}</div>
          <div className="connection-readout-divider" />
          <div className="connection-readout-line2">{lines.line2}</div>
        </div>
      </div>
    </div>
  );
}

export function getConnectionReadoutSide(connectionReadout) {
  return connectionReadout?.side === 'right' ? 'right' : 'left';
}

export function getConnectionReadoutPosition({ side, width, height, zoom = 1 }) {
  const safeZoom = Math.max(Number(zoom) || 1, 0.01);
  const gap = READOUT_GAP / safeZoom;
  const y = Math.max(0, height / 2 - FO_HEIGHT / 2);
  const x = side === 'left' ? -FO_WIDTH - gap : width + gap;
  return { x, y, width: FO_WIDTH, height: FO_HEIGHT };
}

/** Cancel parent canvas zoom so readouts stay constant screen size (matches HTML overlay layer). */
export function getConnectionReadoutCounterScaleTransform({ side, x, y, zoom }) {
  const safeZoom = Math.max(Number(zoom) || 1, 0.01);
  const inv = 1 / safeZoom;
  const anchorY = y + FO_HEIGHT / 2;
  if (side === 'left') {
    return `translate(${x + FO_WIDTH}, ${anchorY}) scale(${inv}) translate(${-FO_WIDTH}, ${-FO_HEIGHT / 2})`;
  }
  return `translate(${x}, ${anchorY}) scale(${inv}) translate(0, ${-FO_HEIGHT / 2})`;
}

/**
 * Four-value “sparkle” readout anchored to the left or right of a component (e.g. on the bus tie).
 * Uses the same playhead rules as embedded sparklines.
 */
export default function ComponentConnectionReadout({
  connectionReadout,
  simulationData = [],
  ensembleMemberSimulationData = null,
  ensembleColumnGroups = [],
  singleSimColumns = [],
  simulationTime = 0,
  width,
  height,
  zoom = 1,
}) {
  const lines = useMemo(
    () =>
      buildConnectionReadoutLines(connectionReadout, {
        simulationData,
        ensembleMemberSimulationData,
        ensembleColumnGroups,
        singleSimColumns,
        simulationTime,
      }),
    [
      connectionReadout,
      simulationData,
      ensembleMemberSimulationData,
      ensembleColumnGroups,
      singleSimColumns,
      simulationTime,
    ],
  );

  if (!readoutHasAnySlot(connectionReadout) || !lines) return null;

  const side = getConnectionReadoutSide(connectionReadout);
  const swatchColor = connectionReadout.swatchColor || '#cddc39';
  const { x, y, width: foW, height: foH } = getConnectionReadoutPosition({ side, width, height, zoom });
  const counterScale = getConnectionReadoutCounterScaleTransform({ side, x, y, zoom });

  return (
    <g transform={counterScale}>
      <foreignObject
        x={0}
        y={0}
        width={foW}
        height={foH}
        pointerEvents="none"
        className="connection-readout-foreign-object"
      >
        <ConnectionReadoutHtml lines={lines} swatchColor={swatchColor} />
      </foreignObject>
    </g>
  );
}
