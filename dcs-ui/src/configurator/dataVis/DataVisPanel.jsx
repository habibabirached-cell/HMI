import React, { useEffect, useMemo, useState } from 'react';
import { fetchDataVisMeta, postDataVisOverview } from './api/conf_dataVisApi';
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
import { buildRangeFilters } from './utils/dataVisFilters';

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

  const filters = useMemo(() => buildRangeFilters(ranges), [ranges]);

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

      <DataVisFilterBar
        columnStats={meta.column_stats}
        ranges={ranges}
        onChange={setRanges}
        filteredCount={filteredCount ?? meta.row_count}
        totalCount={meta.row_count}
      />

      <main className={`dataVis-main${layoutMode === 'quad' ? ' dataVis-main--quad' : ''}`}>
        {layoutMode === 'quad' ? (
          <DataVisQuadLayout
            filters={filters}
            meta={meta}
            onSelectRowIds={handleSelectRow}
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
                filters={filters}
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
                filters={filters}
                defaults={meta.defaults}
                columnStats={meta.column_stats}
              />
            )}
            {tab === 'histogram' && (
              <DataVisHistogramTab filters={filters} columnStats={meta.column_stats} />
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
