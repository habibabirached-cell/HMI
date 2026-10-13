import React, { useEffect, useMemo, useState } from 'react';
import { fetchDataVisMeta, postDataVisOverview, postDataVisRowIds } from './api/conf_dataVisApi';
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
import {
  buildDataVisFilters,
  buildRangeFilters,
  hasActiveViewFilters,
} from './utils/dataVisFilters';
import {
  clampFilterBinCount,
  FILTER_BINS_STORAGE_KEY,
  readStoredFilterBinCount,
} from './utils/dataVisHistogramBins';

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

export default function DataVisPanel() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [layoutMode, setLayoutMode] = useState(readLayoutMode);
  const [ranges, setRanges] = useState({});
  const [filteredCount, setFilteredCount] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [parcoordsRanges, setParcoordsRanges] = useState({});
  const [scatterRowIds, setScatterRowIds] = useState(null);
  const [highlightRowIds, setHighlightRowIds] = useState(null);
  const [binCount, setBinCountState] = useState(readStoredFilterBinCount);

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
    let cancelled = false;
    fetchDataVisMeta()
      .then((res) => {
        if (!cancelled) setMeta(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rangeFilters = useMemo(() => buildRangeFilters(ranges), [ranges]);
  /** Chart data: histogram + scatter filters only (not parallel brushes — avoids refetch wiping multi-axis brushes). */
  const plotContextFilters = useMemo(
    () => buildDataVisFilters(ranges, {}, scatterRowIds),
    [ranges, scatterRowIds],
  );
  const filters = useMemo(
    () => buildDataVisFilters(ranges, parcoordsRanges, scatterRowIds),
    [ranges, parcoordsRanges, scatterRowIds],
  );

  const parcoordsActive = Object.keys(parcoordsRanges).length > 0;
  const scatterActive = scatterRowIds != null;
  const viewSelectionActive = useMemo(
    () => hasActiveViewFilters(ranges, parcoordsRanges, scatterRowIds),
    [ranges, parcoordsRanges, scatterRowIds],
  );

  const clearAllFilters = () => {
    setRanges({});
    setParcoordsRanges({});
    setScatterRowIds(null);
  };

  useEffect(() => {
    if (!meta) return undefined;
    if (!viewSelectionActive) {
      setHighlightRowIds(null);
      return undefined;
    }
    let cancelled = false;
    postDataVisRowIds(filters)
      .then((res) => {
        if (!cancelled) setHighlightRowIds(res.row_ids || []);
      })
      .catch(() => {
        if (!cancelled) setHighlightRowIds([]);
      });
    return () => {
      cancelled = true;
    };
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
      className={`conf-results-panel conf-results-panel--filled dataVis-root${layoutMode === 'quad' ? ' dataVis-root--quad' : ''}`}
      data-screen-region="data-exploration"
      aria-label="Data exploration"
    >
      <header className="dataVis-header">
        <div className="dataVis-header__row">
          <div className="dataVis-headerLine">
            <h2 className="dataVis-headerLine__title">Data Exploration</h2>
            <span className="dataVis-headerLine__sep" aria-hidden>
              ·
            </span>
            <span className="dataVis-headerLine__meta">
              {meta.scenario?.location} · {meta.row_count} scenarios · Plotly views
            </span>
          </div>
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
        </div>
        {layoutMode === 'single' && (
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

      {layoutMode !== 'quad' && (
        <DataVisFilterBar
          columnStats={meta.column_stats}
          ranges={ranges}
          onChange={setRanges}
          onClearAll={clearAllFilters}
          parcoordsActive={parcoordsActive}
          parcoordsRanges={parcoordsRanges}
          filteredCount={filteredCount ?? meta.row_count}
          totalCount={meta.row_count}
          binCount={binCount}
          onBinCountChange={setBinCount}
        />
      )}

      <main className={`dataVis-main${layoutMode === 'quad' ? ' dataVis-main--quad' : ''}`}>
        {layoutMode === 'quad' ? (
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
            parcoordsActive={parcoordsActive}
            scatterActive={scatterActive}
            plotContextFilters={plotContextFilters}
            highlightRowIds={highlightRowIds}
            onScatterRowIdsChange={setScatterRowIds}
            filteredCount={filteredCount ?? meta.row_count}
            totalCount={meta.row_count}
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
                onScatterRowIdsChange={setScatterRowIds}
                defaults={meta.defaults}
                columnStats={meta.column_stats}
              />
            )}
            {tab === 'heatmap' && (
              <DataVisHeatmapTab
                filters={filters}
                defaults={meta.defaults}
                columnStats={meta.column_stats}
              />
            )}
            {tab === 'parallel' && (
              <DataVisParallelTab
                chartFilters={plotContextFilters}
                filters={filters}
                highlightRowIds={highlightRowIds}
                defaults={meta.defaults}
                columnStats={meta.column_stats}
                onParcoordsRangesChange={setParcoordsRanges}
                parcoordsActive={parcoordsActive}
                parcoordsRanges={parcoordsRanges}
                onClearAll={clearAllFilters}
              />
            )}
            {tab === 'histogram' && (
              <DataVisHistogramTab
                filters={filters}
                ranges={ranges}
                columnStats={meta.column_stats}
                parcoordsRanges={parcoordsRanges}
                binCount={binCount}
                onBinCountChange={setBinCount}
              />
            )}
            {tab === 'table' && (
              <DataVisTableTab
                filters={filters}
                columnStats={meta.column_stats}
                onSelectRowIds={handleSelectRow}
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
