import React, { useMemo } from 'react';
import WallBezelShell, { useWallBezelSplit } from '../../components/conf_WallBezelShell';
import { buildExploreWallPanes } from '../../components/ConfExploreWallPanes';
import DataVisParallelTab from '../tabs/DataVisParallelTab';
import { parallelDimensionsForExploreWall } from '../utils/dataVisParallelDefaults';

const EXPLORE_WALL_SPLIT_KEY = 'dcs-dataVis-explore-wall-split';

function ParallelPane({ actions, children }) {
  return (
    <section className="dataVis-quadSlot dataVis-quadSlot--parallel" aria-label="Parallel coordinates">
      {actions ? (
        <header className="dataVis-quadSlot__head dataVis-quadSlot__head--actionsOnly">
          <div className="dataVis-quadSlot__actions">{actions}</div>
        </header>
      ) : null}
      <div className="dataVis-quadSlot__body">{children}</div>
    </section>
  );
}

export default function DataVisExploreWallQuadLayout({
  filters,
  meta,
  columnStats,
  onClearAll,
  parcoordsRanges,
  onParcoordsRangesChange,
  onParallelDimensionsChange,
  parcoordsActive,
  wallResult,
  wallInputs,
  wallGenerating,
  wallStatusMessage,
}) {
  const stats = columnStats ?? meta.column_stats;
  const { split, setSplit, resetSplit } = useWallBezelSplit(EXPLORE_WALL_SPLIT_KEY);
  const parallelDefaults = useMemo(
    () => ({
      ...meta.defaults,
      parallel_dimensions: parallelDimensionsForExploreWall(meta.defaults),
    }),
    [meta.defaults],
  );

  return (
    <WallBezelShell
      split={split}
      setSplit={setSplit}
      resetSplit={resetSplit}
      shellClassName="dataVis-quadShell dataVis-exploreWall"
    >
      {buildExploreWallPanes({
        result: wallResult,
        inputs: wallInputs,
        isGenerating: wallGenerating,
        statusMessage: wallStatusMessage,
        onClearAll,
      })}
      <ParallelPane>
        <DataVisParallelTab
          filters={filters}
          defaults={parallelDefaults}
          columnStats={stats}
          compact
          lockDimensionsToDefaults
          highlightMartinRowId={
            wallResult?.martinDataVisRowId ?? wallResult?.martinRowIndex ?? null
          }
          onParcoordsRangesChange={onParcoordsRangesChange}
          onDimensionsChange={onParallelDimensionsChange}
          parcoordsActive={parcoordsActive}
          parcoordsRanges={parcoordsRanges}
          onClearAll={onClearAll}
        />
      </ParallelPane>
    </WallBezelShell>
  );
}
