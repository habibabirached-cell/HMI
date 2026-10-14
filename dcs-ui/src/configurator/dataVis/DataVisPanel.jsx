import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchDataVisMeta,
  postDataVisColumnStats,
  postDataVisOverview,
  postDataVisRowIds,
} from './api/conf_dataVisApi';
import DataVisFilterBar from './components/DataVisFilterBar';
import DataVisQuadLayout from './components/DataVisQuadLayout';
import './dataVisPanel.css';
import DataVisChartLabTab from './tabs/DataVisChartLabTab';
import DataVisCompareTab from './tabs/DataVisCompareTab';
import DataVisDictionaryTab from './tabs/DataVisDictionaryTab';
import DataVisDoeTab from './tabs/DataVisDoeTab';
import DataVisHeatmapTab from './tabs/DataVisHeatmapTab';
import DataVisHistogramTab from './tabs/DataVisHistogramTab';
import DataVisOverviewTab from './tabs/DataVisOverviewTab';
import DataVisParallelTab from './tabs/DataVisParallelTab';
import DataVisQualityTab from './tabs/DataVisQualityTab';
import DataVisTableTab from './tabs/DataVisTableTab';
import DataVisExploreWallQuadLayout from './components/DataVisExploreWallQuadLayout';
import DataVisQualityToggle from './components/DataVisQualityToggle';
import { generateMartinConfiguratorResult } from '../utils/conf_configuratorApi';
import { UI_MODES } from '../../configuratorData/conf_constants';
import {
  buildDataVisFilters,
  buildRangeFilters,
  buildSessionUniverseFilters,
  DATA_QUALITY_CLEAN,
  hasActiveViewFilters,
} from './utils/dataVisFilters';
import { connectClusterWebSocket, fetchMachineRole } from '../../utils/clusterPeer';
import {
  applyDataVisDatasetMode,
  persistDataQualityMode,
  readPersistedDataQualityMode,
  subscribeDataQualityMode,
  uiModeFromApiMode,
} from './utils/dataVisQualityMode';
import {
  resolveInitialTableColumns,
  tableDisplayColumns,
} from './utils/dataVisTableColumns';
import {
  clampFilterBinCount,
  FILTER_BINS_STORAGE_KEY,
  readStoredFilterBinCount,
} from './utils/dataVisHistogramBins';
import {
  exploreSyncPayloadFromMessage,
  persistConfiguratorInputsForDataVis,
  persistConfiguratorRangesForDataVis,
  readPersistedConfiguratorInputs,
  readPersistedConfiguratorRanges,
  shouldSyncConfiguratorToDataVis,
  subscribeConfiguratorExploreSync,
} from './utils/dataVisConfiguratorSync';
import { fetchConfiguratorExploreSyncLatest } from '../utils/conf_configuratorCluster';
import { parallelDimensionsForExploreWall } from './utils/dataVisParallelDefaults';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'doe', label: 'DOE Explorer' },
  { id: 'dictionary', label: 'Dictionary' },
  { id: 'chart', label: 'Chart Lab' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'parallel', label: 'Parallel' },
  { id: 'histogram', label: 'Histogram' },
  { id: 'table', label: 'Table' },
  { id: 'compare', label: 'Compare' },
  { id: 'quality', label: 'Quality' },
];

const LAYOUT_STORAGE_KEY = 'dcs-dataVis-layout-mode';

function readLayoutMode() {
  try {
    const v = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (v === 'quad' || v === 'single') return v;
  } catch (_) {
    /* ignore */
  }
  return 'single';
}

export default function DataVisPanel({ showQualityToggle = true, variant = 'default' }) {
  const isExploreWall = variant === 'exploreWall';
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [layoutMode, setLayoutMode] = useState(() => (isExploreWall ? 'quad' : readLayoutMode()));
  const [wallResult, setWallResult] = useState(null);
  const [wallInputs, setWallInputs] = useState(null);
  const [wallGenerating, setWallGenerating] = useState(false);
  const [wallStatusMessage, setWallStatusMessage] = useState('');
  const wallMartinSeqRef = useRef(0);
  const [ranges, setRanges] = useState({});
  const [filteredCount, setFilteredCount] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [parcoordsRanges, setParcoordsRanges] = useState({});
  const [parallelDimensions, setParallelDimensions] = useState(null);
  const [scatterRowIds, setScatterRowIds] = useState(null);
  const [highlightRowIds, setHighlightRowIds] = useState(null);
  const highlightFetchSeqRef = useRef(0);
  /** Session-only row erasures (not persisted to workbook). */
  const [excludedRowIds, setExcludedRowIds] = useState([]);
  const [sessionColumnStats, setSessionColumnStats] = useState(null);
  const [sessionRowCount, setSessionRowCount] = useState(null);
  const [tableVisibleColumns, setTableVisibleColumns] = useState([]);
  const [tableColumnsCustomized, setTableColumnsCustomized] = useState(false);
  const [configuratorSyncActive, setConfiguratorSyncActive] = useState(false);
  const [binCount, setBinCountState] = useState(readStoredFilterBinCount);
  const [dataQualityMode, setDataQualityMode] = useState(() => readPersistedDataQualityMode());
  const [datasetModeBusy, setDatasetModeBusy] = useState(false);

  const setBinCount = (next) => {
    setBinCountState((prev) => {
      const value =
        typeof next === 'function' ? clampFilterBinCount(next(prev)) : clampFilterBinCount(next);
      try {
        localStorage.setItem(FILTER_BINS_STORAGE_KEY, String(value));
      } catch {
        /* ignore */
      }
      return value;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
    } catch (_) {
      /* ignore */
    }
  }, [layoutMode]);

  useEffect(() => {
    if (!meta?.defaults?.parallel_dimensions?.length) return;
    setParallelDimensions(
      isExploreWall
        ? parallelDimensionsForExploreWall(meta.defaults)
        : meta.defaults.parallel_dimensions,
    );
  }, [isExploreWall, meta?.defaults?.parallel_dimensions]);

  useEffect(() => {
    if (!meta || tableColumnsCustomized) return;
    setTableVisibleColumns(resolveInitialTableColumns(meta.defaults, parallelDimensions));
  }, [meta, parallelDimensions, tableColumnsCustomized]);

  const scatterHoverColumns = useMemo(
    () => tableDisplayColumns(tableVisibleColumns),
    [tableVisibleColumns],
  );

  const resetExplorationClientState = useCallback(() => {
    setRanges({});
    setParcoordsRanges({});
    setScatterRowIds(null);
    setHighlightRowIds(null);
    setExcludedRowIds([]);
    setCompareIds([]);
    setSessionColumnStats(null);
    setSessionRowCount(null);
  }, []);

  const syncAfterDatasetModeChange = useCallback(
    (uiMode) => {
      setDataQualityMode(uiMode);
      persistDataQualityMode(uiMode);
      resetExplorationClientState();
      fetchDataVisMeta()
        .then((res) => setMeta(res))
        .catch(() => {});
    },
    [resetExplorationClientState],
  );

  useEffect(() => {
    let cancelled = false;
    fetchDataVisMeta()
      .then((res) => {
        if (cancelled) return;
        setMeta(res);
        if (res?.dataset_mode) {
          const ui = uiModeFromApiMode(res.dataset_mode);
          persistDataQualityMode(ui);
          setDataQualityMode(ui);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rangeFilters = useMemo(() => buildRangeFilters(ranges), [ranges]);
  const sessionUniverseFilters = useMemo(
    () => buildSessionUniverseFilters(excludedRowIds, dataQualityMode),
    [dataQualityMode, excludedRowIds],
  );
  /** Scatter data + box select pool: histogram + parcoords (never scatter row ids — those refine via highlight). */
  const plotContextFilters = useMemo(
    () => buildDataVisFilters(ranges, parcoordsRanges, null, excludedRowIds, dataQualityMode),
    [dataQualityMode, excludedRowIds, ranges, parcoordsRanges],
  );
  const filters = useMemo(
    () => buildDataVisFilters(ranges, parcoordsRanges, scatterRowIds, excludedRowIds, dataQualityMode),
    [dataQualityMode, excludedRowIds, ranges, parcoordsRanges, scatterRowIds],
  );

  const columnStatsForViews = sessionColumnStats ?? meta?.column_stats;
  const datasetRowCount = sessionRowCount ?? meta?.row_count;

  const needsSessionColumnStats =
    dataQualityMode === DATA_QUALITY_CLEAN && excludedRowIds.length > 0;

  useEffect(() => {
    if (!meta) return undefined;
    if (!needsSessionColumnStats) {
      setSessionColumnStats(null);
      setSessionRowCount(null);
      return undefined;
    }
    let cancelled = false;
    postDataVisColumnStats(buildSessionUniverseFilters(excludedRowIds, dataQualityMode))
      .then((res) => {
        if (!cancelled) {
          setSessionColumnStats(res.column_stats);
          setSessionRowCount(res.row_count);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dataQualityMode, excludedRowIds, meta, needsSessionColumnStats]);

  useEffect(() => subscribeDataQualityMode(syncAfterDatasetModeChange), [syncAfterDatasetModeChange]);

  useEffect(
    () =>
      connectClusterWebSocket((msg) => {
        if (msg?.type !== 'datavis_dataset_mode' || !msg.mode) return;
        syncAfterDatasetModeChange(uiModeFromApiMode(msg.mode));
      }),
    [syncAfterDatasetModeChange],
  );

  const handleDataQualityModeChange = useCallback(
    async (mode) => {
      if (datasetModeBusy || mode === dataQualityMode) return;
      setDatasetModeBusy(true);
      try {
        const role = await fetchMachineRole().catch(() => null);
        const next = await applyDataVisDatasetMode(mode, role);
        syncAfterDatasetModeChange(next);
      } catch (err) {
        setError(err?.message || 'Failed to change dataset mode');
      } finally {
        setDatasetModeBusy(false);
      }
    },
    [dataQualityMode, datasetModeBusy, syncAfterDatasetModeChange],
  );

  const eraseRow = useCallback((rowId) => {
    const id = Number(rowId);
    if (!Number.isFinite(id)) return;
    setExcludedRowIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setScatterRowIds((prev) => {
      if (prev == null) return null;
      const next = prev.filter((r) => r !== id);
      return next.length ? next : null;
    });
    setCompareIds((prev) => prev.filter((r) => r !== id));
  }, []);

  const parcoordsActive = Object.keys(parcoordsRanges).length > 0;
  const scatterActive = scatterRowIds != null;
  const viewSelectionActive = useMemo(
    () => hasActiveViewFilters(ranges, parcoordsRanges, scatterRowIds),
    [ranges, parcoordsRanges, scatterRowIds],
  );

  const runMartinFromInputs = useCallback(async (inputs, uiMode) => {
    if (!inputs) return;
    const seq = ++wallMartinSeqRef.current;
    setWallGenerating(true);
    setWallStatusMessage('Updating optimized configuration…');
    try {
      const next = await generateMartinConfiguratorResult({ ...inputs, uiMode: uiMode || UI_MODES.BASIC });
      if (seq !== wallMartinSeqRef.current) return;
      setWallResult(next);
      setWallInputs(inputs);
    } finally {
      if (seq === wallMartinSeqRef.current) {
        setWallGenerating(false);
        setWallStatusMessage('');
      }
    }
  }, []);

  const applyConfiguratorExploreSync = useCallback(
    (payload) => {
      if (payload?.ranges) {
        setRanges(payload.ranges);
        setScatterRowIds(null);
        setParcoordsRanges({});
      }
      if (payload?.inputs && isExploreWall) {
        void runMartinFromInputs(payload.inputs, payload.uiMode);
      }
    },
    [isExploreWall, runMartinFromInputs],
  );

  const clearAllFilters = () => {
    if (isExploreWall) {
      setParcoordsRanges({});
      setScatterRowIds(null);
      return;
    }
    setRanges({});
    setParcoordsRanges({});
    setScatterRowIds(null);
  };

  const handleScatterRowIdsChange = useCallback((ids) => {
    const next = ids?.length ? ids : null;
    setScatterRowIds(next);
    if (next?.length) {
      setHighlightRowIds(next);
    }
  }, []);

  const applyConfiguratorSyncRanges = useCallback((syncRanges) => {
    setRanges(syncRanges || {});
    setScatterRowIds(null);
    setParcoordsRanges({});
  }, []);

  const handleExploreSyncPayload = useCallback(
    (payload) => {
      if (!payload) return;
      if (isExploreWall) {
        applyConfiguratorExploreSync(payload);
        return;
      }
      if (payload.ranges) applyConfiguratorSyncRanges(payload.ranges);
    },
    [applyConfiguratorExploreSync, applyConfiguratorSyncRanges, isExploreWall],
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribeChannel = () => {};
    const unsubscribeCluster = connectClusterWebSocket((msg) => {
      const payload = exploreSyncPayloadFromMessage(msg);
      if (!payload) return;
      if (payload.ranges) persistConfiguratorRangesForDataVis(payload.ranges);
      if (payload.inputs) persistConfiguratorInputsForDataVis(payload.inputs, payload.uiMode);
      handleExploreSyncPayload(payload);
    });

    const bootstrapLocal = () => {
      const storedRanges = readPersistedConfiguratorRanges();
      if (storedRanges) applyConfiguratorSyncRanges(storedRanges);
      if (isExploreWall) {
        const storedInputs = readPersistedConfiguratorInputs();
        if (storedInputs?.inputs) {
          void runMartinFromInputs(storedInputs.inputs, storedInputs.uiMode);
        }
      }
    };

    bootstrapLocal();
    setConfiguratorSyncActive(true);

    fetchConfiguratorExploreSyncLatest()
      .then((res) => {
        if (cancelled) return;
        const payload = exploreSyncPayloadFromMessage(res?.sync);
        if (payload) handleExploreSyncPayload(payload);
      })
      .catch(() => {});

    shouldSyncConfiguratorToDataVis().then((useBroadcast) => {
      if (cancelled || !useBroadcast) return;
      unsubscribeChannel = subscribeConfiguratorExploreSync((payload) => {
        handleExploreSyncPayload(payload);
      });
    });

    return () => {
      cancelled = true;
      unsubscribeChannel();
      unsubscribeCluster();
    };
  }, [applyConfiguratorSyncRanges, handleExploreSyncPayload, isExploreWall, runMartinFromInputs]);

  useEffect(() => {
    if (!meta) return undefined;
    if (!viewSelectionActive) {
      setHighlightRowIds(null);
      return undefined;
    }
    const seq = ++highlightFetchSeqRef.current;
    postDataVisRowIds(filters)
      .then((res) => {
        if (seq !== highlightFetchSeqRef.current) return;
        setHighlightRowIds(res.row_ids ?? []);
      })
      .catch(() => {
        if (seq !== highlightFetchSeqRef.current) return;
        /* null = no selection restriction; [] only when API confirms zero rows */
        setHighlightRowIds(null);
      });
    return undefined;
  }, [filters, meta, viewSelectionActive]);

  useEffect(() => {
    if (!meta) return undefined;
    let cancelled = false;
    postDataVisOverview(filters)
      .then((res) => {
        if (!cancelled) setFilteredCount(res.filtered_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filters, meta]);

  const handleSelectRow = (ids) => {
    setCompareIds(ids);
    setLayoutMode('single');
    setTab('compare');
  };

  if (error) {
    return (
      <div className="conf-results-panel conf-results-panel--filled dataVis-root" data-screen-region="data-exploration">
        <p className="dataVis-error">Data exploration unavailable: {error}</p>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="conf-results-panel conf-results-panel--filled dataVis-root" data-screen-region="data-exploration">
        <p className="dataVis-muted">Loading Waco 1 GW dataset…</p>
      </div>
    );
  }

  return (
    <div
      className={`conf-results-panel conf-results-panel--filled dataVis-root${layoutMode === 'quad' || isExploreWall ? ' dataVis-root--quad' : ''}${isExploreWall ? ' dataVis-root--exploreWall' : ''}`}
      data-screen-region={isExploreWall ? 'explore-data' : 'data-exploration'}
      aria-label={isExploreWall ? 'Explore Data' : 'Data exploration'}
    >
      <header className="dataVis-header">
        <div className="dataVis-header__row">
          <div className="dataVis-headerLine">
            <h2 className="dataVis-headerLine__title">{isExploreWall ? 'Explore Data' : 'Data Exploration'}</h2>
            <span className="dataVis-headerLine__sep" aria-hidden>
              ·
            </span>
            <span className="dataVis-headerLine__meta">
              {meta.scenario?.location} · {datasetRowCount ?? meta.row_count} scenarios
              {dataQualityMode === DATA_QUALITY_CLEAN ? ' · Clean (≥97% load compliance)' : ''}
              {excludedRowIds.length ? ` · ${excludedRowIds.length} erased` : ''}
              {configuratorSyncActive ? ' · Linked to configurator Inputs' : ''}
              {isExploreWall ? '' : ' · Plotly views'}
            </span>
          </div>
          <div className="dataVis-header__actions">
          {!isExploreWall && (
          <>
          {showQualityToggle && (
            <DataVisQualityToggle
              mode={dataQualityMode}
              onChange={handleDataQualityModeChange}
              disabled={datasetModeBusy}
            />
          )}
          <div className="dataVis-layoutToggle" role="group" aria-label="Layout mode">
            <button
              type="button"
              className={`dataVis-layoutToggle__btn${layoutMode === 'single' ? ' dataVis-layoutToggle__btn--active' : ''}`}
              aria-pressed={layoutMode === 'single'}
              onClick={() => setLayoutMode('single')}
            >
              Single
            </button>
            <button
              type="button"
              className={`dataVis-layoutToggle__btn${layoutMode === 'quad' ? ' dataVis-layoutToggle__btn--active' : ''}`}
              aria-pressed={layoutMode === 'quad'}
              onClick={() => setLayoutMode('quad')}
            >
              4-up
            </button>
          </div>
          </>
          )}
          </div>
        </div>
        {!isExploreWall && layoutMode === 'single' && (
          <nav className="dataVis-tabs" aria-label="Exploration sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`dataVis-tab ${tab === t.id ? 'dataVis-tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {!isExploreWall && layoutMode !== 'quad' && (
        <DataVisFilterBar
          columnStats={columnStatsForViews}
          ranges={ranges}
          onChange={setRanges}
          onClearAll={clearAllFilters}
          parcoordsActive={parcoordsActive}
          parcoordsRanges={parcoordsRanges}
          filteredCount={filteredCount ?? datasetRowCount ?? meta.row_count}
          totalCount={datasetRowCount ?? meta.row_count}
          binCount={binCount}
          onBinCountChange={setBinCount}
          excludedRowIds={excludedRowIds}
          dataQualityMode={dataQualityMode}
        />
      )}

      <main className={`dataVis-main${layoutMode === 'quad' || isExploreWall ? ' dataVis-main--quad' : ''}`}>
        {isExploreWall ? (
          <DataVisExploreWallQuadLayout
            filters={filters}
            meta={meta}
            columnStats={columnStatsForViews}
            onClearAll={clearAllFilters}
            parcoordsRanges={parcoordsRanges}
            onParcoordsRangesChange={setParcoordsRanges}
            onParallelDimensionsChange={setParallelDimensions}
            parcoordsActive={parcoordsActive}
            wallResult={wallResult}
            wallInputs={wallInputs}
            wallGenerating={wallGenerating}
            wallStatusMessage={wallStatusMessage}
          />
        ) : layoutMode === 'quad' ? (
          <DataVisQuadLayout
            filters={filters}
            chartFilters={plotContextFilters}
            ranges={ranges}
            onRangesChange={setRanges}
            onClearAll={clearAllFilters}
            parcoordsRanges={parcoordsRanges}
            meta={meta}
            onSelectRowIds={handleSelectRow}
            onParcoordsRangesChange={setParcoordsRanges}
            onParallelDimensionsChange={setParallelDimensions}
            parallelDimensions={parallelDimensions}
            parcoordsActive={parcoordsActive}
            scatterActive={scatterActive}
            plotContextFilters={plotContextFilters}
            highlightRowIds={highlightRowIds}
            onScatterRowIdsChange={handleScatterRowIdsChange}
            filteredCount={filteredCount ?? datasetRowCount ?? meta.row_count}
            totalCount={datasetRowCount ?? meta.row_count}
            columnStats={columnStatsForViews}
            onEraseRow={eraseRow}
            scatterHoverColumns={scatterHoverColumns}
            tableVisibleColumns={tableVisibleColumns}
            onTableVisibleColumnsChange={setTableVisibleColumns}
            tableColumnsCustomized={tableColumnsCustomized}
            onTableColumnsCustomizedChange={setTableColumnsCustomized}
            sessionUniverseFilters={sessionUniverseFilters}
            binCount={binCount}
            onBinCountChange={setBinCount}
          />
        ) : (
          <>
            {tab === 'overview' && (
              <DataVisOverviewTab
                filters={filters}
                scenario={meta.scenario}
                onFilteredCount={setFilteredCount}
              />
            )}
            {tab === 'doe' && <DataVisDoeTab filters={filters} />}
            {tab === 'dictionary' && <DataVisDictionaryTab columns={meta.columns} />}
            {tab === 'chart' && (
              <DataVisChartLabTab
                plotContextFilters={plotContextFilters}
                highlightRowIds={highlightRowIds}
                onScatterRowIdsChange={handleScatterRowIdsChange}
                defaults={meta.defaults}
                columnStats={columnStatsForViews}
                hoverColumns={scatterHoverColumns}
              />
            )}
            {tab === 'heatmap' && (
              <DataVisHeatmapTab
                filters={filters}
                defaults={meta.defaults}
                columnStats={columnStatsForViews}
              />
            )}
            {tab === 'parallel' && (
              <DataVisParallelTab
                filters={filters}
                defaults={meta.defaults}
                columnStats={columnStatsForViews}
                onParcoordsRangesChange={setParcoordsRanges}
                onDimensionsChange={setParallelDimensions}
                parcoordsActive={parcoordsActive}
                parcoordsRanges={parcoordsRanges}
                onClearAll={clearAllFilters}
              />
            )}
            {tab === 'histogram' && (
              <DataVisHistogramTab
                filters={filters}
                ranges={ranges}
                columnStats={columnStatsForViews}
                parcoordsRanges={parcoordsRanges}
                binCount={binCount}
                onBinCountChange={setBinCount}
                sessionUniverseFilters={sessionUniverseFilters}
              />
            )}
            {tab === 'table' && (
              <DataVisTableTab
                filters={filters}
                columnStats={columnStatsForViews}
                defaults={meta.defaults}
                parallelDimensions={parallelDimensions}
                onSelectRowIds={handleSelectRow}
                onEraseRow={eraseRow}
                visibleColumns={tableVisibleColumns}
                onVisibleColumnsChange={setTableVisibleColumns}
                columnsCustomized={tableColumnsCustomized}
                onColumnsCustomizedChange={setTableColumnsCustomized}
              />
            )}
            {tab === 'compare' && (
              <DataVisCompareTab selectedRowIds={compareIds} onSelectedRowIds={setCompareIds} />
            )}
            {tab === 'quality' && <DataVisQualityTab filters={filters} />}
          </>
        )}
      </main>
    </div>
  );
}
