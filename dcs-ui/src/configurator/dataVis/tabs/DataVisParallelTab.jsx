import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { postDataVisParallel } from '../api/conf_dataVisApi';
import DataVisColumnChipMenu from '../components/DataVisColumnChipMenu';
import DataVisPlot from '../components/DataVisPlot';
import { numericColumnsFromStats } from '../utils/dataVisFilters';
import { constraintsFromParcoordsFigure } from '../utils/dataVisParcoordsFilter';

const MAX_PARALLEL_DIMS = 8;

function constraintrangeFromBand(band) {
  if (!band || (band.min == null && band.max == null)) return undefined;
  const lo = band.min ?? band.max;
  const hi = band.max ?? band.min;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;
  return [[Math.min(lo, hi), Math.max(lo, hi)]];
}

export default function DataVisParallelTab({
  chartFilters,
  filters,
  defaults,
  columnStats,
  compact = false,
  onParcoordsRangesChange,
  parcoordsActive = false,
  parcoordsRanges = null,
  highlightRowIds = null,
  onClearAll,
}) {
  const queryFilters = chartFilters ?? filters;
  const queryFiltersKey = JSON.stringify(queryFilters);
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const defaultDims = defaults?.parallel_dimensions || numericCols.slice(0, 6);
  const [dimensions, setDimensions] = useState(defaultDims);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const payloadRef = useRef(null);
  const constraintsRef = useRef({});
  const graphDivRef = useRef(null);
  const syncHandlerRef = useRef(null);
  const chartWrapRef = useRef(null);
  const [quadPlotSize, setQuadPlotSize] = useState(() => ({
    width: 520,
    height: Math.max(240, Math.round(window.innerHeight * 0.38)),
  }));
  payloadRef.current = payload;

  useEffect(() => {
    if (!compact) return undefined;
    const el = chartWrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const width = Math.max(200, Math.floor(el.clientWidth));
      const height = Math.max(180, Math.floor(el.clientHeight * 0.92));
      setQuadPlotSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact, payload]);

  const uirevision = useMemo(
    () => `dataVis-pc-${dimensions.join('\u0001')}`,
    [dimensions],
  );

  useEffect(() => {
    if (!dimensions?.length) return;
    let cancelled = false;
    postDataVisParallel({
      filters: queryFilters,
      dimensions,
      color: 'Project LCOE ($/MWh)',
      max_rows: 5000,
    })
      .then((res) => {
        if (!cancelled) setPayload(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [queryFilters, queryFiltersKey, dimensions]);

  useEffect(() => {
    constraintsRef.current = {};
    onParcoordsRangesChange?.({});
  }, [dimensions, onParcoordsRangesChange]);

  useEffect(() => {
    constraintsRef.current = { ...(parcoordsRanges || {}) };
  }, [parcoordsRanges]);

  const publishConstraints = useCallback(
    (merged) => {
      if (!onParcoordsRangesChange) return;
      onParcoordsRangesChange(merged || {});
    },
    [onParcoordsRangesChange],
  );

  const syncConstraintsFromGraph = useCallback(() => {
    const gd = graphDivRef.current;
    if (!gd?.data) return;
    const merged = constraintsFromParcoordsFigure({ data: gd.data, layout: gd.layout });
    const prevKey = JSON.stringify(constraintsRef.current);
    const nextKey = JSON.stringify(merged);
    if (prevKey === nextKey) return;
    constraintsRef.current = merged;
    publishConstraints(merged);
  }, [publishConstraints]);

  const handleInitialized = useCallback(
    (_figure, graphDiv) => {
      graphDivRef.current = graphDiv;
      if (syncHandlerRef.current && graphDivRef.current?.removeListener) {
        try {
          graphDivRef.current.removeListener('plotly_restyle', syncHandlerRef.current);
          graphDivRef.current.removeListener('plotly_relayout', syncHandlerRef.current);
        } catch {
          /* ignore */
        }
      }
      const handler = () => {
        syncConstraintsFromGraph();
      };
      syncHandlerRef.current = handler;
      graphDiv.on('plotly_restyle', handler);
      graphDiv.on('plotly_relayout', handler);
    },
    [syncConstraintsFromGraph],
  );

  const handlePurge = useCallback((_figure, graphDiv) => {
    if (graphDiv && syncHandlerRef.current) {
      try {
        graphDiv.removeListener('plotly_restyle', syncHandlerRef.current);
        graphDiv.removeListener('plotly_relayout', syncHandlerRef.current);
      } catch {
        /* ignore */
      }
    }
    syncHandlerRef.current = null;
    graphDivRef.current = null;
  }, []);

  const highlightSet = useMemo(() => {
    if (!highlightRowIds?.length) return null;
    return new Set(highlightRowIds);
  }, [highlightRowIds]);

  const showParcoordsScale = Boolean(payload?.color) && !highlightSet;

  const plotData = useMemo(() => {
    if (!payload) return [];
    const dims = payload.dimensions || [];
    const rowIds = payload.row_ids || [];
    const baseColors = payload.color || rowIds.map(() => 0);
    const lineColors = rowIds.map((id, i) => {
      if (!highlightSet || highlightSet.has(id)) return baseColors[i];
      return 'rgba(186, 193, 202, 0.14)';
    });
    const line = {
      type: 'parcoords',
      uirevision,
      ...(compact
        ? {
            domain: {
              x: showParcoordsScale ? [0.02, 0.96] : [0.02, 1],
              y: [0.16, 0.88],
            },
            labelfont: { size: 10, color: '#1f2933' },
            rangefont: { size: 9, color: '#5f6b7a' },
          }
        : {}),
      line: {
        color: lineColors,
        colorscale: 'Viridis',
        showscale: showParcoordsScale,
        colorbar: compact
          ? {
              thickness: 10,
              len: 0.72,
              outlinewidth: 0,
              tickfont: { size: 9 },
            }
          : undefined,
        cmin: payload.color ? Math.min(...payload.color.filter((v) => v != null)) : undefined,
        cmax: payload.color ? Math.max(...payload.color.filter((v) => v != null)) : undefined,
      },
      dimensions: dims.map((key) => {
        const band =
          constraintsRef.current?.[key] ?? parcoordsRanges?.[key] ?? null;
        const constraintrange = constraintrangeFromBand(band);
        return {
          label: key,
          values: payload.values[key],
          labelangle: -45,
          ...(constraintrange ? { constraintrange } : {}),
          ...(compact ? { tickfont: { size: 9 } } : {}),
        };
      }),
    };
    return [line];
  }, [compact, highlightSet, parcoordsRanges, payload, showParcoordsScale, uirevision]);

  const toggleDim = (col) => {
    setDimensions((prev) => {
      if (prev.includes(col)) return prev.filter((c) => c !== col);
      if (prev.length >= MAX_PARALLEL_DIMS) return prev;
      return [...prev, col];
    });
  };

  return (
    <div
      className={`dataVis-tabPanel${compact ? ' dataVis-tabPanel--compact dataVis-tabPanel--parcoordsQuad' : ''}`}
    >
      <div className="dataVis-tabPanel__toolbar">
        <DataVisColumnChipMenu
          columns={numericCols}
          mode="multi"
          selectedMulti={dimensions}
          maxSelected={MAX_PARALLEL_DIMS}
          buttonText="Choose dimensions"
          menuHint={`Green = axis in parallel plot. Toggle up to ${MAX_PARALLEL_DIMS} numeric dimensions.`}
          onToggle={toggleDim}
        />
        {!compact ? (
          <span className="dataVis-muted dataVis-parcoordsHint">
            Drag on any axis to filter — use several axes at once. Double-click an axis to reset
            that axis only{parcoordsActive ? ' · parallel filter active' : ''}.
          </span>
        ) : parcoordsActive ? (
          <span className="dataVis-muted dataVis-parcoordsHint">Parallel filter active</span>
        ) : null}
        {onClearAll && !compact ? (
          <button type="button" className="dataVis-quadSlot__clear" onClick={onClearAll}>
            Clear all filters
          </button>
        ) : null}
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {!payload && !error && <p className="dataVis-muted">Loading parallel coords…</p>}
      {payload && (
        <div ref={chartWrapRef} className="dataVis-chartBlock dataVis-chartBlock--parcoords">
          <DataVisPlot
            data={plotData}
            layout={{
              uirevision,
              title: compact ? undefined : { text: 'Parallel coordinates', font: { size: 16 } },
              autosize: !compact,
              width: compact ? quadPlotSize.width : undefined,
              height: compact
                ? quadPlotSize.height
                : Math.max(440, Math.round(window.innerHeight * 0.55)),
              margin: compact
                ? {
                    l: 72,
                    r: showParcoordsScale ? 40 : 16,
                    t: 52,
                    b: 56,
                    pad: 4,
                  }
                : { l: 80, r: 28, t: 48, b: 100 },
            }}
            style={
              compact
                ? {
                    minHeight: 0,
                    width: quadPlotSize.width,
                    height: quadPlotSize.height,
                    maxWidth: '100%',
                  }
                : undefined
            }
            config={
              compact
                ? { displayModeBar: false, responsive: false, displaylogo: false }
                : undefined
            }
            useResizeHandler={!compact}
            onInitialized={handleInitialized}
            onPurge={handlePurge}
            onRestyle={() => {
              requestAnimationFrame(() => syncConstraintsFromGraph());
            }}
          />
        </div>
      )}
    </div>
  );
}
