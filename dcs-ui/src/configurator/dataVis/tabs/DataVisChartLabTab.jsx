import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
/** Same bundle react-plotly.js uses — dist-min relayout is a no-op on these graphs. */
import Plotly from 'plotly.js/dist/plotly';
import { postDataVisScatter } from '../api/conf_dataVisApi';
import DataVisColumnSelect from '../components/DataVisColumnSelect';
import DataVisPlot from '../components/DataVisPlot';
import {
  numericColumnsFromStats,
  scatterAxisRangeForColumn,
  statsByColumn,
} from '../utils/dataVisFilters';
import { formatDataVisCell } from '../utils/dataVisTableColumns';
import { DATAVIS_COLORSCALE_COLD_BLUE_HOT_AMBER } from '../utils/dataVisColorScale';
import { rowIdsFromScatterSelect } from '../utils/dataVisScatterSelect';

export const SCATTER_INTERACTION_FILTER = 'filter';
export const SCATTER_INTERACTION_EXPLORE = 'explore';

const COLOR_DIM = 'rgba(170, 178, 188, 0.35)';
const COLOR_HIGHLIGHT = '#00695c';

/** Plotly graph div from react-plotly (has .emit); plain DOM nodes break relayout. */
function isPlotlyGraphDiv(gd) {
  return Boolean(gd && typeof gd.emit === 'function');
}
const COMPACT_AXIS_TITLE_FONT = {
  size: 22,
  color: '#1f2933',
  family: 'system-ui, sans-serif',
  weight: 700,
};

function scatterColorBounds(payload, colorColumn, columnStatMap) {
  const label = payload?.color_label || colorColumn;
  const stat = label ? columnStatMap[label] : null;
  const fromData = (payload?.color || []).filter((v) => v != null && Number.isFinite(Number(v)));
  const cmin =
    stat?.min != null
      ? Number(stat.min)
      : fromData.length
        ? Math.min(...fromData.map(Number))
        : 0;
  const cmax =
    stat?.max != null
      ? Number(stat.max)
      : fromData.length
        ? Math.max(...fromData.map(Number))
        : 1;
  return { cmin, cmax: cmax > cmin ? cmax : cmin + 1 };
}

function scatterHoverLines(index, payload, detailColumns) {
  const cols = detailColumns?.length ? detailColumns : null;
  if (!cols) {
    return `Row ${payload.row_ids?.[index] ?? index + 1}<br>${payload.x_label}: ${formatDataVisCell(payload.x?.[index], payload.x_label)}<br>${payload.y_label}: ${formatDataVisCell(payload.y?.[index], payload.y_label)}`;
  }
  const details = payload.details || {};
  return cols
    .map((col) => {
      const vals = details[col];
      let v;
      if (vals && index < vals.length) {
        v = vals[index];
      } else if (col === payload.x_label) {
        v = payload.x?.[index];
      } else if (col === payload.y_label) {
        v = payload.y?.[index];
      } else if (col === 'dataVis_row_id') {
        v = payload.row_ids?.[index];
      } else {
        return null;
      }
      const label = col === 'dataVis_row_id' ? 'Row' : col;
      return `${label}: ${formatDataVisCell(v, col)}`;
    })
    .filter(Boolean)
    .join('<br>');
}

const SCATTER_COLORBAR_LCOE_TITLE_FONT = {
  size: 22,
  color: '#1f2933',
  family: 'system-ui, sans-serif',
  weight: 400,
  style: 'italic',
};

function scatterColorbarTitle(colorLabel) {
  return /lcoe/i.test(String(colorLabel || '')) ? 'LCOE' : '';
}

function scatterColorbarConfig(compact, colorLabel) {
  const titleText = scatterColorbarTitle(colorLabel);
  const title = titleText
    ? {
        text: titleText,
        side: 'bottom',
        font: compact
          ? { ...SCATTER_COLORBAR_LCOE_TITLE_FONT }
          : { size: 14, weight: 400, style: 'italic', color: '#1f2933' },
      }
    : { text: '' };
  return compact
    ? {
        title,
        tickfont: { size: 22, color: '#1f2933' },
        len: 1,
        lenmode: 'fraction',
        y: 0.5,
        yanchor: 'middle',
        thickness: 16,
        outlinewidth: 0,
        x: 1.04,
        xpad: 12,
      }
    : {
        title,
        len: 0.95,
        y: 0.5,
        yanchor: 'middle',
      };
}

export function ScatterSlot({
  slotLabel,
  x,
  y,
  color,
  onXChange,
  onYChange,
  onColorChange,
  numericCols,
  plotContextFilters = [],
  highlightRowIds = null,
  onScatterRowIdsChange,
  columnStats = null,
  compact = false,
  interactionMode = SCATTER_INTERACTION_FILTER,
  zoomResetSeq = 0,
  hoverColumns = null,
}) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [plotReady, setPlotReady] = useState(0);
  /** Zoom/pan window preserved when switching Filter ↔ Explore (per plot). */
  const [visibleRanges, setVisibleRanges] = useState(null);
  const payloadRef = useRef(null);
  const graphDivRef = useRef(null);
  const chartBlockRef = useRef(null);
  const selectedHandlerRef = useRef(null);
  const relayoutHandlerRef = useRef(null);
  const doubleClickHandlerRef = useRef(null);
  payloadRef.current = payload;
  const plotContextFiltersKey = JSON.stringify(plotContextFilters);
  const hoverColumnsKey = JSON.stringify(hoverColumns || []);
  const columnStatMap = useMemo(() => statsByColumn(columnStats), [columnStats]);

  const highlightSet = useMemo(() => {
    if (highlightRowIds == null) return null;
    return new Set(highlightRowIds);
  }, [highlightRowIds]);
  const highlightSetRef = useRef(highlightSet);
  highlightSetRef.current = highlightSet;

  useEffect(() => {
    if (!x || !y) return undefined;
    let cancelled = false;
    setPayload(null);
    setError(null);
    postDataVisScatter({
      filters: plotContextFilters,
      x,
      y,
      color: color || undefined,
      max_points: compact ? 2500 : 5000,
      detail_columns: hoverColumns?.length ? hoverColumns : undefined,
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
  }, [color, compact, hoverColumns, hoverColumnsKey, plotContextFilters, plotContextFiltersKey, x, y]);

  const axisStatsKey = useMemo(() => {
    const xs = columnStatMap[x];
    const ys = columnStatMap[y];
    return `${xs?.min}|${xs?.max}|${ys?.min}|${ys?.max}`;
  }, [columnStatMap, x, y]);

  useEffect(() => {
    setVisibleRanges(null);
  }, [axisStatsKey, color, x, y]);

  const plotData = useMemo(() => {
    if (!payload) return [];
    const traceType = compact && onScatterRowIdsChange ? 'scatter' : 'scattergl';
    const rowIds = payload.row_ids || [];
    const useDim = highlightSet != null;
    const colorValues = payload.color;
    const hasColorScale = Boolean(colorValues?.length);
    const baseSize = compact ? 12 : 7;
    const highlightSize = compact ? 20 : 11;
    const dimSize = compact ? 8 : 4;
    const hovertemplate = '%{text}<extra></extra>';

    const hoverForIndices = (indices) =>
      indices.map((i) => scatterHoverLines(i, payload, hoverColumns));

    const highlightedTrace = (xs, ys, ids, colors, showscale, sourceIndices) => ({
      type: traceType,
      mode: 'markers',
      x: xs,
      y: ys,
      customdata: ids,
      text: hoverForIndices(sourceIndices),
      hovertemplate,
      marker: {
        size: useDim ? highlightSize : baseSize,
        opacity: 0.88,
        color: colors,
        colorscale: hasColorScale ? DATAVIS_COLORSCALE_COLD_BLUE_HOT_AMBER : undefined,
        ...(hasColorScale ? scatterColorBounds(payload, color, columnStatMap) : {}),
        showscale: showscale && hasColorScale,
        colorbar:
          showscale && hasColorScale
            ? scatterColorbarConfig(compact, payload.color_label || color)
            : undefined,
      },
    });

    if (useDim && hasColorScale) {
      const dimX = [];
      const dimY = [];
      const dimIds = [];
      const hiX = [];
      const hiY = [];
      const hiIds = [];
      const hiColors = [];

      const dimIdx = [];
      const hiIdx = [];
      rowIds.forEach((id, i) => {
        if (highlightSet.has(id)) {
          hiX.push(payload.x[i]);
          hiY.push(payload.y[i]);
          hiIds.push(id);
          hiColors.push(colorValues[i]);
          hiIdx.push(i);
        } else {
          dimX.push(payload.x[i]);
          dimY.push(payload.y[i]);
          dimIds.push(id);
          dimIdx.push(i);
        }
      });

      const traces = [];
      if (dimX.length) {
        traces.push({
          type: traceType,
          mode: 'markers',
          x: dimX,
          y: dimY,
          customdata: dimIds,
          text: hoverForIndices(dimIdx),
          hovertemplate,
          marker: {
            size: dimSize,
            color: COLOR_DIM,
            opacity: 0.85,
          },
        });
      }
      traces.push(highlightedTrace(hiX, hiY, hiIds, hiColors, true, hiIdx));
      return traces;
    }

    if (useDim) {
      const markerColors = rowIds.map((id) =>
        highlightSet.has(id) ? COLOR_HIGHLIGHT : COLOR_DIM,
      );
      const sizes = rowIds.map((id) =>
        highlightSet.has(id) ? highlightSize : dimSize,
      );
      const allIdx = rowIds.map((_, i) => i);
      return [
        {
          type: traceType,
          mode: 'markers',
          x: payload.x,
          y: payload.y,
          customdata: rowIds,
          text: hoverForIndices(allIdx),
          hovertemplate,
          marker: {
            size: sizes,
            opacity: 0.9,
            color: markerColors,
          },
        },
      ];
    }

    const markerColors = hasColorScale
      ? colorValues
      : rowIds.map(() => COLOR_HIGHLIGHT);

    const allIdx = rowIds.map((_, i) => i);
    return [
      highlightedTrace(
        payload.x,
        payload.y,
        rowIds,
        markerColors,
        hasColorScale,
        allIdx,
      ),
    ];
  }, [color, columnStatMap, compact, highlightSet, hoverColumns, onScatterRowIdsChange, payload]);

  const chartHeight = Math.max(420, Math.round(window.innerHeight * 0.52));

  const fieldClass = compact ? 'dataVis-field dataVis-field--compact' : 'dataVis-field';

  const applyScatterSelection = useCallback(
    (event) => {
      if (!onScatterRowIdsChange) return;
      const pl = payloadRef.current;
      if (!pl) return;
      const gd = graphDivRef.current;
      const eligible = highlightSetRef.current;
      let ids = rowIdsFromScatterSelect(event, pl, gd, eligible);
      if (!ids.length && gd) {
        ids = rowIdsFromScatterSelect(null, pl, gd, eligible);
      }
      if (!ids.length) return;
      onScatterRowIdsChange(ids);
    },
    [onScatterRowIdsChange],
  );

  const bindGraphDiv = useCallback((graphDiv) => {
    if (!graphDiv || graphDivRef.current === graphDiv) return;
    graphDivRef.current = graphDiv;
    setPlotReady((n) => n + 1);
  }, []);

  const handleInitialized = useCallback(
    (_figure, graphDiv) => {
      bindGraphDiv(graphDiv);
    },
    [bindGraphDiv],
  );

  const selectionEnabled =
    Boolean(onScatterRowIdsChange) && interactionMode === SCATTER_INTERACTION_FILTER;

  useEffect(() => {
    const graphDiv = graphDivRef.current;
    if (!graphDiv?.on || !onScatterRowIdsChange) return undefined;

    const detach = () => {
      if (!graphDiv?.removeListener) return;
      try {
        if (selectedHandlerRef.current) {
          graphDiv.removeListener('plotly_selected', selectedHandlerRef.current);
        }
        if (relayoutHandlerRef.current) {
          graphDiv.removeListener('plotly_relayout', relayoutHandlerRef.current);
        }
      } catch {
        /* ignore */
      }
      selectedHandlerRef.current = null;
      relayoutHandlerRef.current = null;
    };

    detach();

    if (!selectionEnabled) {
      return detach;
    }

    const onSelected = (eventData) => {
      applyScatterSelection(eventData);
    };
    const onRelayout = (eventData) => {
      const hasBox =
        eventData?.['selections[0].x0'] != null ||
        (Array.isArray(eventData?.selections) && eventData.selections.length > 0);
      if (!hasBox) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => applyScatterSelection(eventData));
      });
    };
    selectedHandlerRef.current = onSelected;
    relayoutHandlerRef.current = onRelayout;
    graphDiv.on('plotly_selected', onSelected);
    graphDiv.on('plotly_relayout', onRelayout);
    return detach;
  }, [applyScatterSelection, onScatterRowIdsChange, plotReady, selectionEnabled]);

  const handlePurge = useCallback((_figure, graphDiv) => {
    if (graphDiv?.removeListener) {
      try {
        if (selectedHandlerRef.current) {
          graphDiv.removeListener('plotly_selected', selectedHandlerRef.current);
        }
        if (relayoutHandlerRef.current) {
          graphDiv.removeListener('plotly_relayout', relayoutHandlerRef.current);
        }
      } catch {
        /* ignore */
      }
    }
    selectedHandlerRef.current = null;
    relayoutHandlerRef.current = null;
    doubleClickHandlerRef.current = null;
    graphDivRef.current = null;
  }, []);

  const scatterUirevision = useMemo(
    () => `scatter-${x}\u0001${y}\u0001${color}`,
    [color, x, y],
  );

  const exploreEnabled =
    Boolean(onScatterRowIdsChange) && interactionMode === SCATTER_INTERACTION_EXPLORE;

  const axisRanges = useMemo(() => {
    const xRange = scatterAxisRangeForColumn(x, columnStatMap[x]);
    const yRange = scatterAxisRangeForColumn(y, columnStatMap[y]);
    return { xRange, yRange };
  }, [columnStatMap, x, y]);

  const layoutRanges = useMemo(
    () => ({
      xRange: visibleRanges?.xRange ?? axisRanges.xRange,
      yRange: visibleRanges?.yRange ?? axisRanges.yRange,
    }),
    [axisRanges.xRange, axisRanges.yRange, visibleRanges],
  );

  const scatterLayout = useMemo(() => {
    if (!payload) return null;
    const compactTitle = (label) => ({
      text: label,
      standoff: 10,
      font: { ...COMPACT_AXIS_TITLE_FONT },
    });
    const compactHasColorbar = compact && Boolean(payload.color?.length);
    return {
      uirevision: scatterUirevision,
      autosize: true,
      title: compact
        ? undefined
        : { text: `${payload.y_label} vs ${payload.x_label}`, font: { size: 16 } },
      margin: compact
        ? {
            l: 0,
            r: 40,
            t: 30,
            b: 56,
            pad: 0,
          }
        : { l: 72, r: 28, t: 48, b: 88, pad: 8 },
      dragmode: selectionEnabled ? 'select' : exploreEnabled ? 'pan' : false,
      selectdirection: selectionEnabled ? 'any' : undefined,
      selectionrevision: selectionEnabled ? `${slotLabel}-sel` : undefined,
      xaxis: {
        title: compact ? compactTitle(payload.x_label) : payload.x_label,
        tickfont: compact ? { size: 2, color: '#1f2933' } : undefined,
        ...(layoutRanges.xRange
          ? { range: layoutRanges.xRange, autorange: false }
          : { autorange: true }),
        fixedrange: !exploreEnabled,
      },
      yaxis: {
        title: compact ? compactTitle(payload.y_label) : payload.y_label,
        tickfont: compact ? { size: 2, color: '#1f2933' } : undefined,
        ...(layoutRanges.yRange
          ? { range: layoutRanges.yRange, autorange: false }
          : { autorange: true }),
        fixedrange: !exploreEnabled,
      },
      ...(exploreEnabled
        ? {
            hoverlabel: {
              bgcolor: 'rgba(255, 255, 255, 0.96)',
              bordercolor: 'rgba(31, 41, 51, 0.35)',
              font: {
                size: compact ? 24 : 26,
                color: '#1f2933',
                family: 'system-ui, sans-serif',
              },
            },
          }
        : {}),
      height: compact ? undefined : chartHeight,
    };
  }, [
    chartHeight,
    layoutRanges.xRange,
    layoutRanges.yRange,
    color,
    compact,
    exploreEnabled,
    onScatterRowIdsChange,
    payload,
    scatterUirevision,
    selectionEnabled,
    slotLabel,
  ]);

  const scatterConfig = useMemo(
    () => ({
      displayModeBar: false,
      responsive: true,
      scrollZoom: exploreEnabled,
      doubleClick: false,
    }),
    [exploreEnabled],
  );

  const resolveGraphDiv = useCallback(() => {
    const gd = graphDivRef.current;
    return isPlotlyGraphDiv(gd) ? gd : null;
  }, []);

  const readRangesFromGraph = useCallback(() => {
    const graphDiv = resolveGraphDiv();
    const xr = graphDiv?._fullLayout?.xaxis?.range;
    const yr = graphDiv?._fullLayout?.yaxis?.range;
    if (!Array.isArray(xr) || !Array.isArray(yr) || xr.length !== 2 || yr.length !== 2) {
      return null;
    }
    return { xRange: [...xr], yRange: [...yr] };
  }, [resolveGraphDiv]);

  const applyDefaultAxisRanges = useCallback(() => {
    setVisibleRanges(null);
    const graphDiv = resolveGraphDiv();
    if (!isPlotlyGraphDiv(graphDiv)) return;
    const patch =
      axisRanges.xRange && axisRanges.yRange
        ? {
            'xaxis.autorange': false,
            'yaxis.autorange': false,
            'xaxis.range': [...axisRanges.xRange],
            'yaxis.range': [...axisRanges.yRange],
          }
        : {
            'xaxis.autorange': true,
            'yaxis.autorange': true,
          };
    try {
      Plotly.relayout(graphDiv, patch);
    } catch {
      /* ignore */
    }
  }, [axisRanges.xRange, axisRanges.yRange, resolveGraphDiv]);

  useLayoutEffect(() => {
    const current = readRangesFromGraph();
    if (current) setVisibleRanges(current);
  }, [interactionMode, readRangesFromGraph]);

  useEffect(() => {
    if (!exploreEnabled) return undefined;
    const graphDiv = resolveGraphDiv();
    if (!graphDiv?.on) return undefined;
    const syncView = () => {
      const current = readRangesFromGraph();
      if (current) setVisibleRanges(current);
    };
    graphDiv.on('plotly_relayout', syncView);
    return () => {
      try {
        graphDiv.removeListener('plotly_relayout', syncView);
      } catch {
        /* ignore */
      }
    };
  }, [exploreEnabled, plotReady, readRangesFromGraph, resolveGraphDiv]);

  useEffect(() => {
    if (!exploreEnabled || zoomResetSeq === 0) return undefined;
    let cancelled = false;
    const run = () => {
      if (!cancelled) applyDefaultAxisRanges();
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
    const timer = setTimeout(run, 64);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [applyDefaultAxisRanges, exploreEnabled, zoomResetSeq]);

  useEffect(() => {
    const graphDiv = resolveGraphDiv();
    if (!graphDiv?.on || !exploreEnabled) return undefined;

    if (doubleClickHandlerRef.current) {
      try {
        graphDiv.removeListener('plotly_doubleclick', doubleClickHandlerRef.current);
      } catch {
        /* ignore */
      }
    }
    const onDoubleClick = () => {
      applyDefaultAxisRanges();
    };
    doubleClickHandlerRef.current = onDoubleClick;
    graphDiv.on('plotly_doubleclick', onDoubleClick);

    return () => {
      try {
        graphDiv.removeListener('plotly_doubleclick', onDoubleClick);
      } catch {
        /* ignore */
      }
      if (doubleClickHandlerRef.current === onDoubleClick) {
        doubleClickHandlerRef.current = null;
      }
    };
  }, [applyDefaultAxisRanges, exploreEnabled, plotReady, resolveGraphDiv]);

  const handleUpdate = useCallback(
    (_figure, graphDiv) => {
      bindGraphDiv(graphDiv);
    },
    [bindGraphDiv],
  );

  return (
    <section className="dataVis-scatterSlot" aria-label={slotLabel}>
      <div className="dataVis-scatterSlot__head">
        <h3 className="dataVis-sectionTitle">{slotLabel}</h3>
        <div className="dataVis-scatterSlot__axes">
          <DataVisColumnSelect
            label="X"
            id={`${slotLabel}-x`}
            value={x}
            options={numericCols}
            onChange={onXChange}
            className={fieldClass}
          />
          <DataVisColumnSelect
            label="Y"
            id={`${slotLabel}-y`}
            value={y}
            options={numericCols}
            onChange={onYChange}
            className={fieldClass}
          />
          {!compact ? (
            <label className={fieldClass} htmlFor={`${slotLabel}-color`}>
              <span className="dataVis-field__label">Color</span>
              <select
                id={`${slotLabel}-color`}
                value={color || '__none__'}
                onChange={(e) => onColorChange(e.target.value === '__none__' ? '' : e.target.value)}
              >
                <option value="__none__">None</option>
                {numericCols.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={fieldClass} htmlFor={`${slotLabel}-color`}>
              <span className="dataVis-field__label">C</span>
              <select
                id={`${slotLabel}-color`}
                value={color || '__none__'}
                onChange={(e) => onColorChange(e.target.value === '__none__' ? '' : e.target.value)}
              >
                <option value="__none__">—</option>
                {numericCols.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.length > 18 ? `${opt.slice(0, 16)}…` : opt}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {!payload && !error && x && y && <p className="dataVis-muted">Loading…</p>}
      {payload && (
        <div ref={chartBlockRef} className="dataVis-chartBlock dataVis-chartBlock--scatter">
          <DataVisPlot
            className={compact ? 'dataVis-plotFill' : undefined}
            data={plotData}
            layout={scatterLayout}
            config={scatterConfig}
            style={compact ? { minHeight: 0 } : { minHeight: chartHeight }}
            useResizeHandler
            onInitialized={onScatterRowIdsChange ? handleInitialized : undefined}
            onUpdate={onScatterRowIdsChange ? handleUpdate : undefined}
            onPurge={onScatterRowIdsChange ? handlePurge : undefined}
            onSelected={selectionEnabled ? applyScatterSelection : undefined}
          />
        </div>
      )}
    </section>
  );
}

export default function DataVisChartLabTab({
  plotContextFilters = [],
  highlightRowIds = null,
  onScatterRowIdsChange,
  defaults,
  columnStats,
  hoverColumns = null,
}) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const scatterDefaults = defaults?.scatter || {};
  const [x, setX] = useState(scatterDefaults.x || numericCols[0]);
  const [y, setY] = useState(scatterDefaults.y || numericCols[1]);
  const [color, setColor] = useState(scatterDefaults.color || '');

  useEffect(() => {
    if (!numericCols.length) return;
    setX((prev) => (numericCols.includes(prev) ? prev : numericCols[0]));
    setY((prev) => {
      if (numericCols.includes(prev)) return prev;
      return numericCols[1] || numericCols[0];
    });
  }, [numericCols]);

  return (
    <div className="dataVis-tabPanel">
      <ScatterSlot
        slotLabel="Scatter"
        x={x}
        y={y}
        color={color}
        onXChange={setX}
        onYChange={setY}
        onColorChange={setColor}
        numericCols={numericCols}
        plotContextFilters={plotContextFilters}
        highlightRowIds={highlightRowIds}
        onScatterRowIdsChange={onScatterRowIdsChange}
        hoverColumns={hoverColumns}
        compact={false}
      />
    </div>
  );
}
