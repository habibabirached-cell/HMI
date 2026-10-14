import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { postDataVisParallel } from '../api/conf_dataVisApi';
import DataVisColumnChipMenu from '../components/DataVisColumnChipMenu';
import DataVisPlot from '../components/DataVisPlot';
import { DATAVIS_COLORSCALE_COLD_BLUE_HOT_AMBER } from '../utils/dataVisColorScale';
import {
  numericColumnsFromStats,
  parallelAxisRangeFromStats,
  statsByColumn,
} from '../utils/dataVisFilters';
import {
  removeBestLcoeOverlay,
  syncBestLcoeOverlay,
} from '../utils/dataVisParcoordsBestLcoeOverlay';
import { constraintsFromParcoordsFigure } from '../utils/dataVisParcoordsFilter';
import {
  dataVisParallelAxisLabel,
  dataVisParallelAxisLabelMenu,
} from '../utils/dataVisColumnDisplayLabel';
import {
  applyParcoordsColorbarTickLabels,
  applyParcoordsColorbarTitleLayout,
  applyParcoordsHorizontalAxisLabels,
  applyParcoordsIntegerUnitTicks,
  colorbarTickvalsEndingZeroOrFive,
  DATAVIS_PARCOORDS_LCOE_COLORBAR_TITLE,
  formatColorbarTickZeroOrFive,
  parallelDimensionLayout,
  removeParcoordsColorbarTitleOverlay,
} from '../utils/dataVisParcoordsAxisLayout';

const MAX_PARALLEL_DIMS = 8;
/** Inset parcoords from plot edges (room for axis labels + colorbar). */
const PARCOORDS_DOMAIN_Y_COMPACT = [0.14, 0.8];
const PARCOORDS_DOMAIN_Y = [0.12, 0.82];
const PARCOORDS_LABEL_FONT_HORIZONTAL_COMPACT = {
  size: 20,
  color: '#1f2933',
  family: 'system-ui, sans-serif',
  weight: 700,
};
const PARCOORDS_LABEL_FONT_COMPACT = {
  size: 20,
  color: '#1f2933',
  family: 'system-ui, sans-serif',
  weight: 700,
};
/** Min/max at axis ends (rangefont). */
const PARCOORDS_AXIS_RANGE_FONT_COMPACT = { size: 22, color: '#1f2933' };
const PARCOORDS_AXIS_RANGE_FONT = { size: 24, color: '#1f2933' };
/** Along-axis tick labels + mark size (Plotly default tickfont size is 12). */
const PARCOORDS_AXIS_TICK_FONT_COMPACT = { size: 24, color: '#1f2933' };
const PARCOORDS_AXIS_TICK_FONT = { size: 24, color: '#1f2933' };
const PARCOORDS_DOMAIN_X = [0.08, 0.92];
const PARCOORDS_DOMAIN_X_COMPACT = [0.05, 0.905];
const PARCOORDS_DOMAIN_X_NO_SCALE = [0.09, 0.94];
/** Index of the lowest LCOE among eligible rows (ties → first). */
function indexOfMinLcoeRow(lcoeValues, eligibleIndices) {
  let bestIdx = -1;
  let bestVal = Infinity;
  for (const i of eligibleIndices) {
    const v = lcoeValues[i];
    if (v == null || !Number.isFinite(Number(v))) continue;
    const n = Number(v);
    if (n < bestVal) {
      bestVal = n;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Per-row LCOE for pink overlay (same values as line color when colored by LCOE). */
function lcoeValuesForHighlight(payload, colorLabel, lcoeDim) {
  if (/LCOE/i.test(colorLabel || '') && Array.isArray(payload.color) && payload.color.length) {
    return payload.color;
  }
  if (payload.values?.[colorLabel]?.length) return payload.values[colorLabel];
  if (lcoeDim && payload.values?.[lcoeDim]?.length) return payload.values[lcoeDim];
  return payload.color || [];
}

function lcoeColorbarConfig(dataLo, dataHi, compact, domainY) {
  const yLo = domainY?.[0] ?? (compact ? 0.14 : 0.06);
  const yHi = domainY?.[1] ?? (compact ? 0.88 : 0.94);
  const domainSpan = Math.max(0.05, yHi - yLo);
  const domainMid = (yLo + yHi) / 2;
  const tickvals = colorbarTickvalsEndingZeroOrFive(dataLo, dataHi, 6);
  const tickFont = compact ? PARCOORDS_AXIS_TICK_FONT_COMPACT : PARCOORDS_AXIS_TICK_FONT;
  return {
    tickmode: 'array',
    tickvals,
    ticktext: tickvals.map(formatColorbarTickZeroOrFive),
    title: {
      text: DATAVIS_PARCOORDS_LCOE_COLORBAR_TITLE,
      side: 'right',
      font: {
        size: compact ? 20 : 22,
        family: 'system-ui, sans-serif',
      },
    },
    len: domainSpan,
    lenmode: 'fraction',
    y: domainMid,
    yanchor: 'middle',
    thickness: compact ? 22 : 24,
    thicknessmode: 'pixels',
    outlinewidth: 0,
    x: compact ? 1.0 : 1.002,
    xpad: compact ? 0 : 3,
    tickfont: {
      ...tickFont,
      family: 'system-ui, sans-serif',
    },
  };
}

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
  onClearAll,
  onDimensionsChange,
  lockDimensionsToDefaults = false,
}) {
  /** Full view filters — parallel shows only matching rows (no gray ghost lines). */
  const queryFilters = filters ?? chartFilters;
  const queryFiltersKey = JSON.stringify(queryFilters);
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const columnStatMap = useMemo(() => statsByColumn(columnStats), [columnStats]);
  const defaultDims = defaults?.parallel_dimensions || numericCols.slice(0, 6);
  const defaultDimsKey = defaultDims.join('\u0001');
  const [dimensions, setDimensions] = useState(defaultDims);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const payloadRef = useRef(null);
  const constraintsRef = useRef({});
  const graphDivRef = useRef(null);
  const syncHandlerRef = useRef(null);
  const afterPlotHandlerRef = useRef(null);
  const chartWrapRef = useRef(null);
  const overlaySpecRef = useRef(null);
  const overlayTimerRef = useRef(null);
  const [plotWrapSize, setPlotWrapSize] = useState(() => ({
    width: 520,
    height: Math.max(280, Math.round(window.innerHeight * 0.55)),
  }));
  payloadRef.current = payload;

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const width = Math.max(200, Math.floor(el.clientWidth));
      const height = Math.max(compact ? 200 : 280, Math.floor(el.clientHeight));
      setPlotWrapSize((prev) =>
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
    if (!lockDimensionsToDefaults) return;
    setDimensions(defaultDims);
  }, [defaultDims, defaultDimsKey, lockDimensionsToDefaults]);

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
    onDimensionsChange?.(dimensions);
  }, [dimensions, onDimensionsChange]);

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

  const runParcoordsChrome = useCallback(() => {
    const gd = graphDivRef.current;
    if (gd) {
      applyParcoordsHorizontalAxisLabels(gd, dimensions);
      applyParcoordsIntegerUnitTicks(gd, dimensions);
      applyParcoordsColorbarTickLabels(gd);
      applyParcoordsColorbarTitleLayout(gd, { compact });
    }
    syncBestLcoeOverlay(
      chartWrapRef.current,
      graphDivRef.current,
      overlaySpecRef.current,
    );
  }, [compact, dimensions]);

  const scheduleParcoordsChrome = useCallback(() => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      overlayTimerRef.current = null;
      runParcoordsChrome();
      requestAnimationFrame(() => runParcoordsChrome());
    }, 120);
  }, [runParcoordsChrome]);

  const handleInitialized = useCallback(
    (_figure, graphDiv) => {
      graphDivRef.current = graphDiv;
      if (graphDiv?.removeListener) {
        try {
          if (syncHandlerRef.current) {
            graphDiv.removeListener('plotly_restyle', syncHandlerRef.current);
            graphDiv.removeListener('plotly_relayout', syncHandlerRef.current);
          }
          if (afterPlotHandlerRef.current) {
            graphDiv.removeListener('plotly_afterplot', afterPlotHandlerRef.current);
          }
        } catch {
          /* ignore */
        }
      }
      const handler = () => {
        syncConstraintsFromGraph();
        scheduleParcoordsChrome();
      };
      syncHandlerRef.current = handler;
      graphDiv.on('plotly_restyle', handler);
      graphDiv.on('plotly_relayout', handler);
      afterPlotHandlerRef.current = () => scheduleParcoordsChrome();
      graphDiv.on('plotly_afterplot', afterPlotHandlerRef.current);
      scheduleParcoordsChrome();
    },
    [scheduleParcoordsChrome, syncConstraintsFromGraph],
  );

  const handlePurge = useCallback((_figure, graphDiv) => {
    if (graphDiv?.removeListener) {
      try {
        if (syncHandlerRef.current) {
          graphDiv.removeListener('plotly_restyle', syncHandlerRef.current);
          graphDiv.removeListener('plotly_relayout', syncHandlerRef.current);
        }
        if (afterPlotHandlerRef.current) {
          graphDiv.removeListener('plotly_afterplot', afterPlotHandlerRef.current);
        }
      } catch {
        /* ignore */
      }
    }
    syncHandlerRef.current = null;
    afterPlotHandlerRef.current = null;
    graphDivRef.current = null;
    removeBestLcoeOverlay(chartWrapRef.current, graphDiv);
    removeParcoordsColorbarTitleOverlay(chartWrapRef.current);
  }, []);

  const plotBundle = useMemo(() => {
    if (!payload) {
      return {
        plotData: [],
        showColorScale: false,
        highlightBest: false,
        bestLcoeValue: null,
        bestLcoeOverlay: null,
      };
    }
    const dims = payload.dimensions || [];
    const rowIds = payload.row_ids || [];
    const baseColors = payload.color || rowIds.map(() => 0);
    const eligibleIndices = rowIds.map((_, i) => i);
    const colorLabel = payload.color_label || 'Project LCOE ($/MWh)';
    const lcoeDim = dims.find((d) => /LCOE/i.test(d)) || colorLabel;
    const lcoeByRow = lcoeValuesForHighlight(payload, colorLabel, lcoeDim);
    const bestLcoeIdx =
      lcoeByRow.length > 0 ? indexOfMinLcoeRow(lcoeByRow, eligibleIndices) : -1;
    const colorStat = columnStatMap[colorLabel];
    const colorFromPayload = payload.color?.filter((v) => v != null) || [];
    const dataLo =
      colorStat?.min != null
        ? colorStat.min
        : colorFromPayload.length
          ? Math.min(...colorFromPayload)
          : 0;
    const dataHi =
      colorStat?.max != null
        ? colorStat.max
        : colorFromPayload.length
          ? Math.max(...colorFromPayload)
          : 1;
    const highlightBest = bestLcoeIdx >= 0;
    const showColorScale = Boolean(payload?.color);
    const domainX = showColorScale
      ? compact
        ? PARCOORDS_DOMAIN_X_COMPACT
        : PARCOORDS_DOMAIN_X
      : PARCOORDS_DOMAIN_X_NO_SCALE;
    const domainY = compact ? [0.14, 0.88] : [0.06, 0.94];
    const line = {
      type: 'parcoords',
      uirevision,
      domain: { x: domainX, y: domainY },
      labelangle: 0,
      labelside: 'top',
      ...(compact
        ? {
            labelfont: { ...PARCOORDS_LABEL_FONT_HORIZONTAL_COMPACT },
            tickfont: { ...PARCOORDS_AXIS_TICK_FONT_COMPACT },
            rangefont: { ...PARCOORDS_AXIS_RANGE_FONT_COMPACT },
          }
        : {
            labelfont: { ...PARCOORDS_LABEL_FONT_HORIZONTAL_COMPACT, size: 22 },
            tickfont: { ...PARCOORDS_AXIS_TICK_FONT },
            rangefont: { ...PARCOORDS_AXIS_RANGE_FONT },
          }),
      unselected: {
        line: {
          opacity: 0,
        },
      },
      line: {
        color: baseColors,
        colorscale: DATAVIS_COLORSCALE_COLD_BLUE_HOT_AMBER,
        showscale: showColorScale,
        colorbar: showColorScale
          ? lcoeColorbarConfig(dataLo, dataHi, compact, domainY)
          : undefined,
        cmin: dataLo,
        cmax: dataHi,
      },
      dimensions: dims.map((key) => {
        const band =
          constraintsRef.current?.[key] ?? parcoordsRanges?.[key] ?? null;
        const constraintrange = constraintrangeFromBand(band);
        const axisRange = parallelAxisRangeFromStats(columnStatMap[key]);
        const layout = parallelDimensionLayout(key, axisRange);
        return {
          label: dataVisParallelAxisLabel(key),
          values: payload.values[key],
          ...layout,
          ...(constraintrange ? { constraintrange } : {}),
        };
      }),
    };
    const bestLcoeValue =
      highlightBest && Number.isFinite(Number(lcoeByRow[bestLcoeIdx]))
        ? Number(lcoeByRow[bestLcoeIdx])
        : null;
    const axisRanges = {};
    dims.forEach((key) => {
      const r = parallelAxisRangeFromStats(columnStatMap[key]);
      const layout = parallelDimensionLayout(key, r);
      if (layout.range) axisRanges[key] = layout.range;
      else if (r) axisRanges[key] = r;
    });
    const bestLcoeOverlay = highlightBest
      ? {
          dimensionKeys: dims,
          valuesByDim: Object.fromEntries(
            dims.map((key) => [key, payload.values[key][bestLcoeIdx]]),
          ),
          axisRanges,
          domainX,
          domainY,
        }
      : null;
    return {
      plotData: [line],
      showColorScale,
      highlightBest,
      bestLcoeValue,
      bestLcoeOverlay,
    };
  }, [columnStatMap, compact, parcoordsRanges, payload, uirevision]);

  overlaySpecRef.current = plotBundle.bestLcoeOverlay;

  useEffect(() => {
    scheduleParcoordsChrome();
  }, [plotBundle.bestLcoeOverlay, plotBundle.plotData, scheduleParcoordsChrome, plotWrapSize]);

  /** Drop stale SVG overlays before refetch/replot (avoids a second misaligned line while filtering). */
  useEffect(() => {
    removeBestLcoeOverlay(chartWrapRef.current, graphDivRef.current);
  }, [payload, queryFiltersKey]);

  const plotData = plotBundle.plotData;
  const showColorScale = plotBundle.showColorScale;
  const bestLcoeValue = plotBundle.bestLcoeValue;

  const toggleDim = (col) => {
    setDimensions((prev) => {
      if (prev.includes(col)) return prev.filter((c) => c !== col);
      if (prev.length >= MAX_PARALLEL_DIMS) return prev;
      return [...prev, col];
    });
  };

  return (
    <div
      className={`dataVis-tabPanel${
        compact
          ? ' dataVis-tabPanel--compact dataVis-tabPanel--parcoordsQuad'
          : ' dataVis-tabPanel--parcoordsFull'
      }`}
    >
      <div className="dataVis-tabPanel__toolbar">
        <DataVisColumnChipMenu
          columns={numericCols}
          mode="multi"
          selectedMulti={dimensions}
          maxSelected={MAX_PARALLEL_DIMS}
          buttonText="Choose dimensions"
          menuHint={`Green = axis in parallel plot. Toggle up to ${MAX_PARALLEL_DIMS} numeric dimensions.`}
          formatColumnLabel={dataVisParallelAxisLabelMenu}
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
        {bestLcoeValue != null ? (
          <span className="dataVis-parcoordsBestLcoe" title="Lowest LCOE among lines in this plot">
            <span className="dataVis-parcoordsBestLcoe__swatch" aria-hidden />
            Lowest LCOE: {bestLcoeValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            $/MWh
          </span>
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
              autosize: true,
              width: plotWrapSize.width,
              height: plotWrapSize.height,
              margin: compact
                ? {
                    l: 96,
                    r: showColorScale ? 228 : 28,
                    t: 132,
                    b: 96,
                    pad: 4,
                  }
                : {
                    l: 96,
                    r: showColorScale ? 172 : 36,
                    t: 118,
                    b: 72,
                    pad: 4,
                  },
            }}
            style={{
              minHeight: 0,
              width: '100%',
              height: '100%',
              maxWidth: '100%',
            }}
            config={
              compact
                ? { displayModeBar: false, responsive: true, displaylogo: false }
                : { displayModeBar: true, responsive: true, displaylogo: false }
            }
            useResizeHandler
            onInitialized={handleInitialized}
            onPurge={handlePurge}
            onUpdate={() => scheduleParcoordsChrome()}
            onRestyle={() => {
              requestAnimationFrame(() => syncConstraintsFromGraph());
            }}
          />
        </div>
      )}
    </div>
  );
}
