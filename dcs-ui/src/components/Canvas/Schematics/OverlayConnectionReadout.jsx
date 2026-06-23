import { useMemo } from 'react';
import { buildConnectionReadoutLines } from '../../../utils/connectionReadoutSampling';
import {
  ConnectionReadoutHtml,
  CONNECTION_READOUT_HEIGHT,
  CONNECTION_READOUT_WIDTH,
  getConnectionReadoutSide,
} from '../ComponentConnectionReadout';
import '../ComponentConnectionReadout.css';

/** HTML sparkle readout beside a full-block 3D overlay slot (canvas-local pixels). */
export default function OverlayConnectionReadout({
  slot,
  simulationData = [],
  ensembleMemberSimulationData = null,
  ensembleColumnGroups = [],
  simulationColumns = [],
  simulationTime = 0,
  className = 'gas-turbine-3d-connection-readout',
}) {
  const connectionReadout = slot.connectionReadout;
  const lines = useMemo(
    () =>
      buildConnectionReadoutLines(connectionReadout, {
        simulationData,
        ensembleMemberSimulationData,
        ensembleColumnGroups,
        singleSimColumns: simulationColumns,
        simulationTime,
      }),
    [
      connectionReadout,
      simulationData,
      ensembleMemberSimulationData,
      ensembleColumnGroups,
      simulationColumns,
      simulationTime,
    ],
  );

  if (!connectionReadout || !lines) return null;

  const side = getConnectionReadoutSide(connectionReadout);
  const swatchColor = connectionReadout.swatchColor || '#cddc39';
  const readoutTop = slot.top + Math.max(0, slot.height / 2 - CONNECTION_READOUT_HEIGHT / 2);
  const readoutLeft =
    side === 'left'
      ? slot.left - CONNECTION_READOUT_WIDTH - 8
      : slot.left + slot.width + 8;

  return (
    <div
      className={className}
      style={{
        left: readoutLeft,
        top: readoutTop,
        width: CONNECTION_READOUT_WIDTH,
        height: CONNECTION_READOUT_HEIGHT,
      }}
    >
      <ConnectionReadoutHtml lines={lines} swatchColor={swatchColor} />
    </div>
  );
}
