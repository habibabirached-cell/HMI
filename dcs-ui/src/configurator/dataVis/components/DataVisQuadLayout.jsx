import React from 'react';
import WallBezelShell, { useWallBezelSplit } from '../../components/conf_WallBezelShell';
import DataVisParallelTab from '../tabs/DataVisParallelTab';
import DataVisTableTab from '../tabs/DataVisTableTab';
import DataVisQuadHistogramGrid from './DataVisQuadHistogramGrid';
import DataVisQuadScatterGrid from './DataVisQuadScatterGrid';

const DATAVIS_QUAD_SPLIT_KEY = 'dcs-dataVis-quad-split';

function DataVisQuadPane({ title, hint, actions, children }) {
  return (
    <section className="dataVis-quadSlot" aria-label={title}>
      <header className="dataVis-quadSlot__head">
        <span className="dataVis-quadSlot__title">{title}</span>
        {hint ? <span className="dataVis-quadSlot__hint">{hint}</span> : null}
        {actions ? <div className="dataVis-quadSlot__actions">{actions}</div> : null}
      </header>
      <div className="dataVis-quadSlot__body">{children}</div>
    </section>
  );
}

export default function DataVisQuadLayout({
  filters,
  chartFilters,
  ranges,
  onRangesChange,
  onClearAll,
  parcoordsRanges,
  meta,
  onSelectRowIds,
  onParcoordsRangesChange,
  onParallelDimensionsChange,
  parallelDimensions = null,
  parcoordsActive = false,
  scatterActive = false,
  plotContextFilters,
  highlightRowIds,
  onScatterRowIdsChange,
  filteredCount,
  totalCount,
  binCount,
  onBinCountChange,
}) {
  const { split, setSplit, resetSplit } = useWallBezelSplit(DATAVIS_QUAD_SPLIT_KEY);

  const hasHistRanges = Object.values(ranges || {}).some(
    (b) => b && (b.min != null || b.max != null),
  );

  return (
    <WallBezelShell
      split={split}
      setSplit={setSplit}
      resetSplit={resetSplit}
      shellClassName="dataVis-quadShell"
    >
      <DataVisQuadPane title="2D plots" hint="Drag to select points">
        <DataVisQuadScatterGrid
          plotContextFilters={plotContextFilters}
          highlightRowIds={highlightRowIds}
          onScatterRowIdsChange={onScatterRowIdsChange}
          columnStats={meta.column_stats}
          defaults={meta.defaults}
        />
      </DataVisQuadPane>

      <DataVisQuadPane
        title="Parallel coordinates"
        hint="Drag axes to filter (multiple axes) · double-click axis to reset"
        actions={
          <button type="button" className="dataVis-quadSlot__clear" onClick={onClearAll}>
            Clear all filters
          </button>
        }
      >
        <DataVisParallelTab
          chartFilters={chartFilters}
          filters={filters}
          defaults={meta.defaults}
          columnStats={meta.column_stats}
          compact
          onParcoordsRangesChange={onParcoordsRangesChange}
          onDimensionsChange={onParallelDimensionsChange}
          parcoordsActive={parcoordsActive}
          parcoordsRanges={parcoordsRanges}
          highlightRowIds={highlightRowIds}
          onClearAll={onClearAll}
        />
      </DataVisQuadPane>

      <DataVisQuadPane
        title="Filters"
        hint="Drag a histogram to filter the page"
        actions={
          <>
            <span className="dataVis-quadSlot__count">
              {filteredCount != null ? `${filteredCount} / ${totalCount} rows` : ''}
              {parcoordsActive ? ' · parallel on' : ''}
              {hasHistRanges ? ' · histogram on' : ''}
              {scatterActive ? ' · 2D select on' : ''}
            </span>
            <button type="button" className="dataVis-quadSlot__clear" onClick={onClearAll}>
              Clear all
            </button>
          </>
        }
      >
        <DataVisQuadHistogramGrid
          gridId="filters"
          filters={filters}
          columnStats={meta.column_stats}
          parcoordsRanges={parcoordsRanges}
          binCount={binCount}
          onBinCountChange={onBinCountChange}
          brushFilter
          ranges={ranges}
          onRangesChange={onRangesChange}
        />
      </DataVisQuadPane>

      <DataVisQuadPane title="Table">
        <DataVisTableTab
          filters={filters}
          columnStats={meta.column_stats}
          defaults={meta.defaults}
          parallelDimensions={parallelDimensions}
          onSelectRowIds={onSelectRowIds}
          compact
        />
      </DataVisQuadPane>
    </WallBezelShell>
  );
}
