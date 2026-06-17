import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js-dist-min';
import { API_BASE_URL } from '../../apiConfig';
import {
  CHART_PANEL_MIN_HEIGHT,
  CHART_PANEL_MIN_SIDE_WIDTH,
  getChartPanelMaxHeightPx,
  getChartPanelMaxSideWidthPx,
  clampChartPanelOpacity,
  CHART_PANEL_OPACITY_DEFAULT,
} from '../../utils/chartPanelLimits';
import './ChartPanel.css';
import {
  buildCross2dTraces,
  buildCrossMultiLineTraces,
  buildCrossNdTraces,
  buildCrossPieTraces,
  buildCrossStackedNdTraces,
  crossMemberDataReady,
  layoutDataForEnsembleCrossChart,
} from '../../utils/ensembleCrossMemberChart';
import { cellFloat } from '../../utils/csvRowAccess';
import {
  buildScatterMarkerStyle,
  buildTraceLineStyle,
  compactVariableStylesForSave,
  getChartVariableKeys,
  chartHasMultiTraceLegend,
  getChartXThreshold,
  rowPassesXThreshold,
  sampleIndexedRowsForVariable,
  seedVariableStylesForEditor,
} from '../../utils/chartVariableStyles';
import { ENSEMBLE_COLUMN_SEP } from '../../utils/simulationLazyApi';
import { bumpPlotlyFonts } from '../../utils/plotlyFontBump';
import {
  applyDangerYThresholdLayout,
  chartExceedsDangerYThreshold,
  chartSupportsDangerYThreshold,
  getChartDangerYThreshold,
} from '../../utils/chartDangerYThreshold';
import { useUiFontPxDelta } from '../../contexts/FontScaleContext';
import {
  remapStacksPerDrawerRow,
  buildDisplayUnitsFromStacks,
  getChartUiDrawer,
  drawerShortLabel,
  CHART_DRAWER_KEYS,
} from '../../utils/chartPanelDrawerBuckets';
import { flyChartToDrawer } from '../../utils/chartDrawerFlyTransition';
import { isTimeBasedChart } from '../../utils/publishPlaybackTimeRange';
import {
  QUAD_BOTTOM_ROW_SHARE_DEFAULT,
  QUAD_BOTTOM_ROW_SHARE_MAX,
  QUAD_BOTTOM_ROW_SHARE_MIN,
  QUAD_BOTTOM_ROW_SHARE_STEP,
  clampQuadBottomRowShare,
  quadGridRowStyleFromShare,
} from '../../utils/chartPanelQuadGrid';

// Store native selection listeners per chart so we can clean up on unmount
const selectionListenersByChart = new Map();

const DEFAULT_LEGEND_POSITION = { x: 0.99, y: 0.99, xanchor: 'right', yanchor: 'top' };
const LEGEND_NUDGE_STEP = 0.02;
const LEGEND_NUDGE_STEP_SHIFT = 0.08;

function resolveLegendPosition(chart, legendLayoutRef) {
  const fromRef = legendLayoutRef?.current?.[chart?.id];
  if (fromRef && Number.isFinite(Number(fromRef.x)) && Number.isFinite(Number(fromRef.y))) {
    return {
      x: Number(fromRef.x),
      y: Number(fromRef.y),
      xanchor: fromRef.xanchor ?? 'right',
      yanchor: fromRef.yanchor ?? 'top',
    };
  }
  const saved = chart?.legendPosition;
  if (saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) {
    return {
      x: Number(saved.x),
      y: Number(saved.y),
      xanchor: saved.xanchor ?? 'right',
      yanchor: saved.yanchor ?? 'top',
    };
  }
  return { ...DEFAULT_LEGEND_POSITION };
}

function applyLegendPositionToPlot(gd, pos) {
  if (!gd || !pos) return;
  try {
    Plotly.relayout(gd, {
      'legend.x': pos.x,
      'legend.y': pos.y,
      'legend.xanchor': pos.xanchor,
      'legend.yanchor': pos.yanchor,
    });
  } catch {
    /* layout prop from React still applies on next render */
  }
}

function syncLegendMoveOutline(gd, armed) {
  const legend = gd?.querySelector?.('.infolayer .legend');
  if (!legend) return;
  legend.classList.toggle('chart-legend--move-armed', !!armed);
  legend.setAttribute(
    'title',
    armed
      ? 'Arrow keys move this legend · Esc when done · Click series to show/hide'
      : 'Click a series to show/hide',
  );
}

/**
 * Chart Panel Component
 * 
 * Resizable bottom panel (like Chrome DevTools) that displays multiple charts side-by-side.
 * Uses Plotly.js for professional, scientific-grade visualizations.
 * 
 * Props:
 * - charts: Array of chart objects to display
 * - onClose: Function to close the entire panel
 * - onRemoveChart: Function to remove a specific chart
 * - height: Current panel height in pixels
 * - onHeightChange: Function to update panel height
 * - panelOpacity: Tray backdrop opacity (0.15–1)
 * - onPanelOpacityChange: (opacity) => void
 * - chartCardWidth / onChartCardWidthChange: tray chart column width (px), persisted from App
 * - onPerChartCardWidthChange(chartId, widthPx | null): this chart only; null = follow top bar (e.g. double-click resize edge)
 * - layoutMode: 'bottom' (default) | 'sideRight' (vertical strip on the right) | 'top'
 * - headerBottomPx: top offset below app header (fixed positioning)
 * - sidePanelWidth / onSidePanelWidthChange: width when layoutMode is sideRight
 * - dualChartDrawers: workspace conf1/conf2/conf4 → two labeled strips (chart1 / chart2)
 * - dualChartDrawersStacked: conf4 → chart2 under chart1 (default: side-by-side columns)
 * - quadChartDrawers: conf3 → four equal quadrants (chart1–chart4) in a 2×2 grid
 * - onMoveChartDrawer(chartId, 'chart1' | 'chart2' | 'chart3' | 'chart4'): move chart between drawers
 */
const ChartPanel = ({ 
  charts, 
  chartStacks = [],
  onStackCharts,
  onUnstackCharts,
  onClose, 
  onRemoveChart,
  onUpdateChart,
  height, 
  onHeightChange,
  panelOpacity = CHART_PANEL_OPACITY_DEFAULT,
  onPanelOpacityChange,
  chartCardWidth = 500,
  onChartCardWidthChange,
  onPerChartCardWidthChange,
  simulationTime, 
  simulationRunning, 
  selectedComponentId,
  simulationData,
  /** Per-member row tables when simulationMetadata.isEnsemble; charts use chart.ensembleSimId to pick one. */
  ensembleMemberSimulationData = null,
  /** Lazy ensemble: fetch subset columns for this chart’s member via App (avoids full GET …/simulations). */
  onEnsureEnsembleChartColumns,
  simulationMetadata,
  eventMarkers,
  globalSampleStep = 1,
  perChartSampleStep = {},
  onGlobalSampleStepChange,
  onPerChartSampleStepChange,
  currentConfigName,
  /** Prefer this for /api/designs/... paths when set (e.g. archive/leaf). */
  designCatalogPath = null,
  selectedRowIndices = null,
  onSelectionChange,
  onFocus,
  isFocused: _isFocused,
  /** Labels of saved UI presets in this scenario's .sim.json (Step 2: named snapshots). */
  namedSimulationConfigs = [],
  /** Which preset matches what is on screen after an explicit activate; cleared when the user edits charts. */
  activeNamedSimulationConfig = null,
  /** Last preset clicked; used for faded “draft” outline when the live draft no longer matches that snapshot. */
  lastNamedPresetForUi = null,
  onActivateNamedSimulationConfig,
  /** Copy a shareable URL that opens this design + scenario + this named preset on another machine. */
  onCopyNamedPresetLink,
  /** Hide this preset row from the CHARTS bar (does not delete from disk). */
  onHideChartPanelNamedConfig,
  /** Paged scenario data: not all file rows are in memory yet. */
  onRequestMoreRows,
  /** Insets (px) so the fixed panel does not cover the left component library or right control rail. */
  insetLeft = 0,
  insetRight = 0,
  layoutMode = 'bottom',
  headerBottomPx = 64,
  sidePanelWidth = 420,
  onSidePanelWidthChange,
  dualChartDrawers = false,
  dualChartDrawersStacked = false,
  quadChartDrawers = false,
  onMoveChartDrawer,
  playbackTimeRange = null,
}) => {
  const fontPxDelta = useUiFontPxDelta();
  const panelRootRef = useRef(null);
  const [flyingChartId, setFlyingChartId] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ y: 0, height: 0 });
  /** Minimize to a thin bar; charts tray stays above the canvas (z-index) either way. */
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('dcsChartPanelCollapsed') === '1';
    } catch {
      return false;
    }
  });
  const toggleChartCollapse = () => {
    setIsCollapsed((c) => {
      const n = !c;
      try {
        window.localStorage.setItem('dcsChartPanelCollapsed', n ? '1' : '0');
      } catch {
        /* ignore */
      }
      return n;
    });
  };
  const [quadBottomRowShare, setQuadBottomRowShare] = useState(() => {
    try {
      const n = Number(window.localStorage?.getItem('dcsQuadBottomRowShare'));
      if (Number.isFinite(n)) {
        return clampQuadBottomRowShare(n);
      }
    } catch {
      /* ignore */
    }
    return QUAD_BOTTOM_ROW_SHARE_DEFAULT;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('dcsQuadBottomRowShare', String(quadBottomRowShare));
    } catch {
      /* ignore */
    }
  }, [quadBottomRowShare]);
  const quadGridRowStyle = useMemo(() => {
    if (!quadChartDrawers) return undefined;
    return quadGridRowStyleFromShare(quadBottomRowShare);
  }, [quadChartDrawers, quadBottomRowShare]);
  const CHART_COLLAPSED_MIN_PX = 60;
  /** Side-dock collapsed: rail-style vertical hinge only (matches Controls rail ~30px). */
  const CHART_SIDE_COLLAPSED_PX = 30;
  /** Bottom-dock collapsed: thin horizontal hinge only (no chart toolbar). */
  const CHART_BOTTOM_RAIL_COLLAPSED_H_PX = 22;
  /** Inline label editor: { chartId, title, xLabel, yLabel } | null */
  const [editingLabels, setEditingLabels] = useState(null);
  /** Per-chart last known Plotly axis ranges, for pre-populating the axis range editor. */
  const plotlyRangesRef = useRef({});
  const plotlyGdByChartRef = useRef({});
  const chartsRef = useRef(charts);
  /** Immediate legend coords for layout + relayout before parent state flushes. */
  const legendLayoutRef = useRef({});
  chartsRef.current = charts;
  const [editingAxisRange, setEditingAxisRange] = useState(null);
  const [legendMoveChartId, setLegendMoveChartId] = useState(null);
  // { chartId, xMin, xMax, yMin, yMax, xLocked, yLocked }

  const legendMoveChartIdRef = useRef(null);
  legendMoveChartIdRef.current = legendMoveChartId;

  const openAxisRangeEditor = (chart, e) => {
    e.stopPropagation();
    const live = plotlyRangesRef.current[chart.id];
    const saved = chart.axisRange;
    const fmt = (v) => (v != null && !Number.isNaN(Number(v)) ? String(v) : '');
    setEditingAxisRange({
      chartId: chart.id,
      xMin: fmt(live?.xMin ?? saved?.xMin),
      xMax: fmt(live?.xMax ?? saved?.xMax),
      yMin: fmt(live?.yMin ?? saved?.yMin),
      yMax: fmt(live?.yMax ?? saved?.yMax),
      xLocked: saved?.xLocked ?? false,
      yLocked: saved?.yLocked ?? false,
      xThreshold: fmt(saved?.xThreshold),
      dangerYThreshold: fmt(saved?.dangerYThreshold),
    });
  };

  const commitAxisRangeEdit = () => {
    if (!editingAxisRange) return;
    const { chartId, xMin, xMax, yMin, yMax, xLocked, yLocked, xThreshold, dangerYThreshold } =
      editingAxisRange;
    const p = (v) => (v === '' || v == null ? undefined : Number(v));
    const xThr = p(xThreshold);
    const yDanger = p(dangerYThreshold);
    // Only persist min/max for a locked axis; Plotly "Home" uses saved range on locked
    // axes and autorange on unlocked axes, so we must not store unused box values.
    const axisRange = {
      xLocked,
      yLocked,
      ...(xThr != null && !Number.isNaN(xThr) ? { xThreshold: xThr } : {}),
      ...(yDanger != null && !Number.isNaN(yDanger) ? { dangerYThreshold: yDanger } : {}),
      ...(xLocked ? { xMin: p(xMin), xMax: p(xMax) } : {}),
      ...(yLocked ? { yMin: p(yMin), yMax: p(yMax) } : {}),
    };
    const hasRange =
      (xLocked && (axisRange.xMin != null || axisRange.xMax != null)) ||
      (yLocked && (axisRange.yMin != null || axisRange.yMax != null));
    const hasLock = xLocked || yLocked;
    const hasXThreshold = axisRange.xThreshold != null;
    const hasDangerY = axisRange.dangerYThreshold != null;
    onUpdateChart?.(chartId, {
      axisRange: hasRange || hasLock || hasXThreshold || hasDangerY ? axisRange : null,
    });
    setEditingAxisRange(null);
  };

  const clearAxisRange = (chartId) => {
    onUpdateChart?.(chartId, { axisRange: null });
    setEditingAxisRange(null);
  };

  const handlePlotlyRelayout = (chart, relayoutData) => {
    if (!relayoutData) return;
    if (relayoutData['xaxis.range[0]'] != null || relayoutData['yaxis.range[0]'] != null) {
      plotlyRangesRef.current[chart.id] = {
        xMin: relayoutData['xaxis.range[0]'],
        xMax: relayoutData['xaxis.range[1]'],
        yMin: relayoutData['yaxis.range[0]'],
        yMax: relayoutData['yaxis.range[1]'],
      };
    }
  };

  const commitLegendPosition = useCallback((chartId, pos) => {
    if (!pos || !Number.isFinite(Number(pos.x)) || !Number.isFinite(Number(pos.y))) return;
    const normalized = {
      x: Math.max(-0.05, Math.min(1.05, Number(pos.x))),
      y: Math.max(-0.05, Math.min(1.05, Number(pos.y))),
      xanchor: pos.xanchor ?? 'right',
      yanchor: pos.yanchor ?? 'top',
    };
    legendLayoutRef.current[chartId] = normalized;
    const gd = plotlyGdByChartRef.current[chartId];
    if (gd) applyLegendPositionToPlot(gd, normalized);
    onUpdateChart?.(chartId, { legendPosition: normalized });
  }, [onUpdateChart]);

  const nudgeLegendPosition = useCallback((chartId, dx, dy) => {
    const chart = chartsRef.current.find((c) => c.id === chartId);
    if (!chart) return;
    const current = resolveLegendPosition(chart, legendLayoutRef);
    commitLegendPosition(chartId, {
      ...current,
      x: current.x + dx,
      y: current.y + dy,
    });
  }, [commitLegendPosition]);

  useEffect(() => {
    if (!legendMoveChartId) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLegendMoveChartId(null);
        return;
      }
      const step = e.shiftKey ? LEGEND_NUDGE_STEP_SHIFT : LEGEND_NUDGE_STEP;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = step;
      else if (e.key === 'ArrowDown') dy = -step;
      else return;
      e.preventDefault();
      nudgeLegendPosition(legendMoveChartId, dx, dy);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [legendMoveChartId, nudgeLegendPosition]);

  useEffect(() => {
    charts.forEach((chart) => {
      if (!chartHasMultiTraceLegend(chart)) return;
      const gd = plotlyGdByChartRef.current[chart.id];
      if (gd) syncLegendMoveOutline(gd, chart.id === legendMoveChartId);
    });
  }, [legendMoveChartId, charts]);

  const renderLegendMoveButton = (chart) => {
    if (!onUpdateChart || !chartHasMultiTraceLegend(chart)) return null;
    const armed = legendMoveChartId === chart.id;
    return (
      <button
        type="button"
        className={`chart-label-edit-btn chart-legend-move-btn${armed ? ' chart-legend-move-btn--active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setLegendMoveChartId((prev) => (prev === chart.id ? null : chart.id));
        }}
        title={
          armed
            ? 'Legend move mode: arrow keys to nudge · Shift+arrow for larger steps · Esc when done'
            : 'Move legend with arrow keys'
        }
      >
        ⌖
      </button>
    );
  };

  const renderLegendMoveHint = (chart) => {
    if (legendMoveChartId !== chart.id) return null;
    return (
      <div className="chart-legend-move-hint" aria-live="polite">
        ↑↓←→ move legend · Shift+arrow larger step · Esc when done
      </div>
    );
  };

  const attachPlotlyChartListeners = (chart, gd) => {
    plotlyGdByChartRef.current[chart.id] = gd;
    if (chartHasMultiTraceLegend(chart)) {
      syncLegendMoveOutline(gd, legendMoveChartIdRef.current === chart.id);
    }
    const supportsSelection =
      chart.chartType === '2d' ||
      chart.chartType === 'nd' ||
      chart.chartType === 'stacked-nd' ||
      (chart.isMultiComponent && chart.chartType === 'multi-line-chart');
    if (supportsSelection && onSelectionChange) attachSelectionListeners(chart.id, gd);
  };

  const renderAxisRangeForm = (chart) => {
    const xL = editingAxisRange.xLocked;
    const yL = editingAxisRange.yLocked;
    return (
      <div className="chart-axis-range-editor" onClick={(e) => e.stopPropagation()}>
        <div className="chart-axis-range-editor-title">
          Axis Ranges
          <span className="chart-axis-range-editor-hint">
            {' '}
            (empty = auto-fit · locked: Home uses min/max; unlocked: data auto-fit)
          </span>
        </div>

        {/* X axis row */}
        <div className="chart-axis-range-axis-row">
          <button
            className={`chart-axis-lock-btn${xL ? ' chart-axis-lock-btn--locked' : ''}`}
            onClick={() => setEditingAxisRange((p) => ({ ...p, xLocked: !p.xLocked }))}
            title={xL ? 'X axis locked — click to unlock' : 'Click to lock X axis (prevents zoom/pan on X)'}
          >
            {xL ? '🔒' : '🔓'} X
          </button>
          <label className="chart-axis-range-editor-row">
            <span>min</span>
            <input
              className="chart-axis-range-editor-input"
              type="number"
              value={editingAxisRange.xMin}
              onChange={(e) => setEditingAxisRange((p) => ({ ...p, xMin: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAxisRangeEdit(); if (e.key === 'Escape') setEditingAxisRange(null); }}
              placeholder="auto"
            />
          </label>
          <label className="chart-axis-range-editor-row">
            <span>max</span>
            <input
              className="chart-axis-range-editor-input"
              type="number"
              value={editingAxisRange.xMax}
              onChange={(e) => setEditingAxisRange((p) => ({ ...p, xMax: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAxisRangeEdit(); if (e.key === 'Escape') setEditingAxisRange(null); }}
              placeholder="auto"
            />
          </label>
        </div>

        {/* Y axis row */}
        <div className="chart-axis-range-axis-row">
          <button
            className={`chart-axis-lock-btn${yL ? ' chart-axis-lock-btn--locked' : ''}`}
            onClick={() => setEditingAxisRange((p) => ({ ...p, yLocked: !p.yLocked }))}
            title={yL ? 'Y axis locked — click to unlock' : 'Click to lock Y axis (prevents zoom/pan on Y)'}
          >
            {yL ? '🔒' : '🔓'} Y
          </button>
          <label className="chart-axis-range-editor-row">
            <span>min</span>
            <input
              className="chart-axis-range-editor-input"
              type="number"
              value={editingAxisRange.yMin}
              onChange={(e) => setEditingAxisRange((p) => ({ ...p, yMin: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAxisRangeEdit(); if (e.key === 'Escape') setEditingAxisRange(null); }}
              placeholder="auto"
              autoFocus
            />
          </label>
          <label className="chart-axis-range-editor-row">
            <span>max</span>
            <input
              className="chart-axis-range-editor-input"
              type="number"
              value={editingAxisRange.yMax}
              onChange={(e) => setEditingAxisRange((p) => ({ ...p, yMax: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAxisRangeEdit(); if (e.key === 'Escape') setEditingAxisRange(null); }}
              placeholder="auto"
            />
          </label>
        </div>

        <div className="chart-axis-range-threshold-row">
          <label className="chart-axis-range-threshold-label">
            <span>Show data above xThreshold</span>
            <input
              className="chart-axis-range-editor-input chart-axis-range-threshold-input"
              type="number"
              value={editingAxisRange.xThreshold}
              onChange={(e) => setEditingAxisRange((p) => ({ ...p, xThreshold: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAxisRangeEdit(); if (e.key === 'Escape') setEditingAxisRange(null); }}
              placeholder="none"
            />
          </label>
          <span className="chart-axis-range-threshold-hint">
            Points at or below this X value are hidden
          </span>
        </div>

        <div className="chart-axis-range-threshold-row">
          <label className="chart-axis-range-threshold-label">
            <span>Danger yThreshold</span>
            <input
              className="chart-axis-range-editor-input chart-axis-range-threshold-input"
              type="number"
              value={editingAxisRange.dangerYThreshold}
              onChange={(e) =>
                setEditingAxisRange((p) => ({ ...p, dangerYThreshold: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAxisRangeEdit();
                if (e.key === 'Escape') setEditingAxisRange(null);
              }}
              placeholder="none"
            />
          </label>
          <span className="chart-axis-range-threshold-hint">
            Amber line at Y = y0; amber alert when a non-rigid trace reaches Y ≥ y0 during playback
          </span>
        </div>

        <div className="chart-axis-range-editor-actions">
          <button className="chart-label-editor-btn chart-label-editor-btn--save" onClick={commitAxisRangeEdit}>Apply</button>
          {(chart.axisRange) && (
            <button className="chart-label-editor-btn chart-axis-range-clear-btn" onClick={() => clearAxisRange(chart.id)}>Clear all</button>
          )}
          <button className="chart-label-editor-btn" onClick={() => setEditingAxisRange(null)}>Cancel</button>
        </div>
      </div>
    );
  };

  const openLabelEditor = (chart, e) => {
    e.stopPropagation();
    const yKeys = getChartVariableKeys(chart);
    setEditingLabels({
      chartId: chart.id,
      yKeys,
      title: chart.title || chart.componentName || '',
      xLabel: chart.xLabel ?? chart.xColumn ?? '',
      yLabel: chart.yLabel ?? (chart.chartType === 'nd' ? 'Value' : (chart.yColumn ?? '')),
      legendLabels: yKeys.length
        ? Object.fromEntries(yKeys.map((k) => [k, chart.legendLabels?.[k] ?? '']))
        : null,
      legendTitle: chart.legendTitle ?? '',
      variableStyles: yKeys.length ? seedVariableStylesForEditor(chart, yKeys) : null,
      selectedVarKeys: [],
    });
  };

  const commitLabelEdit = () => {
    if (!editingLabels) return;
    const yKeys = editingLabels.yKeys || [];
    const chart = charts.find((c) => c.id === editingLabels.chartId);
    const legendLabels = editingLabels.legendLabels
      ? Object.fromEntries(
          Object.entries(editingLabels.legendLabels).filter(([, v]) => v.trim())
        )
      : undefined;
    const variableStyles = compactVariableStylesForSave(editingLabels.variableStyles, yKeys);
    const patch = {
      title: editingLabels.title,
      xLabel: editingLabels.xLabel || undefined,
      yLabel: editingLabels.yLabel || undefined,
      ...(legendLabels && Object.keys(legendLabels).length ? { legendLabels } : { legendLabels: undefined }),
      ...(chartHasMultiTraceLegend(chart)
        ? editingLabels.legendTitle?.trim()
          ? { legendTitle: editingLabels.legendTitle.trim() }
          : { legendTitle: undefined }
        : {}),
      ...(variableStyles ? { variableStyles } : { variableStyles: undefined }),
    };
    if (chart?.yColumns?.length || (chart?.chartType === 'nd' || chart?.chartType === 'pie' || chart?.chartType === 'stacked-nd')) {
      patch.yColumns = yKeys;
    } else if (chart?.yColumn != null) {
      patch.yColumn = yKeys[0];
    }
    if (chart?.isMultiComponent && chart.components) {
      patch.components = yKeys.map((k) => {
        const existing = chart.components.find((c) => c.columnName === k);
        return existing || { name: k.split(' \u2014 ').pop(), columnName: k };
      });
    }
    onUpdateChart?.(editingLabels.chartId, patch);
    setEditingLabels(null);
  };

  const removeVariableFromEditor = (colKey) => {
    setEditingLabels((p) => {
      const yKeys = (p.yKeys || []).filter((k) => k !== colKey);
      if (!yKeys.length) {
        return p;
      }
      const nextStyles = { ...p.variableStyles };
      delete nextStyles[colKey];
      const nextLegend = p.legendLabels ? { ...p.legendLabels } : null;
      if (nextLegend) delete nextLegend[colKey];
      return {
        ...p,
        yKeys,
        variableStyles: nextStyles,
        ...(nextLegend ? { legendLabels: nextLegend } : {}),
        selectedVarKeys: (p.selectedVarKeys || []).filter((k) => k !== colKey),
      };
    });
  };

  const cloneVariableColorFrom = (targetKey, sourceKey) => {
    if (!sourceKey || targetKey === sourceKey) return;
    setEditingLabels((p) => {
      const src = p.variableStyles?.[sourceKey];
      if (!src) return p;
      return {
        ...p,
        variableStyles: {
          ...p.variableStyles,
          [targetKey]: {
            ...p.variableStyles[targetKey],
            color: src.color,
            intensity: src.intensity,
          },
        },
      };
    });
  };

  const toggleVariableSelection = (colKey, extendRange = false) => {
    setEditingLabels((p) => {
      const keys = Object.keys(p.variableStyles || {});
      const prev = p.selectedVarKeys || [];
      if (extendRange && prev.length > 0) {
        const anchor = prev[prev.length - 1];
        const i0 = keys.indexOf(anchor);
        const i1 = keys.indexOf(colKey);
        if (i0 >= 0 && i1 >= 0) {
          const lo = Math.min(i0, i1);
          const hi = Math.max(i0, i1);
          const range = keys.slice(lo, hi + 1);
          const merged = new Set([...prev, ...range]);
          return { ...p, selectedVarKeys: [...merged] };
        }
      }
      const next = prev.includes(colKey)
        ? prev.filter((k) => k !== colKey)
        : [...prev, colKey];
      return { ...p, selectedVarKeys: next };
    });
  };

  const applyColorToSelectedVariables = (color, intensity = null) => {
    setEditingLabels((p) => {
      const targets = p.selectedVarKeys?.length
        ? p.selectedVarKeys
        : [];
      if (!targets.length) return p;
      const nextStyles = { ...p.variableStyles };
      for (const k of targets) {
        if (!nextStyles[k]) continue;
        nextStyles[k] = {
          ...nextStyles[k],
          color,
          ...(intensity != null ? { intensity } : {}),
        };
      }
      return { ...p, variableStyles: nextStyles };
    });
  };

  const selectAllVariables = (select) => {
    setEditingLabels((p) => ({
      ...p,
      selectedVarKeys: select ? Object.keys(p.variableStyles || {}) : [],
    }));
  };

  const renderLabelEditorForm = () => (
    <div className="chart-label-editor" onClick={(e) => e.stopPropagation()}>
      <label className="chart-label-editor-row">
        <span>Title</span>
        <input
          className="chart-label-editor-input"
          value={editingLabels.title}
          onChange={(e) => setEditingLabels((p) => ({ ...p, title: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') commitLabelEdit(); if (e.key === 'Escape') setEditingLabels(null); }}
          autoFocus
        />
      </label>
      <label className="chart-label-editor-row">
        <span>X label</span>
        <input
          className="chart-label-editor-input"
          value={editingLabels.xLabel}
          onChange={(e) => setEditingLabels((p) => ({ ...p, xLabel: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') commitLabelEdit(); if (e.key === 'Escape') setEditingLabels(null); }}
          placeholder="default (column name)"
        />
      </label>
      <label className="chart-label-editor-row">
        <span>Y label</span>
        <input
          className="chart-label-editor-input"
          value={editingLabels.yLabel}
          onChange={(e) => setEditingLabels((p) => ({ ...p, yLabel: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') commitLabelEdit(); if (e.key === 'Escape') setEditingLabels(null); }}
          placeholder="default (column name)"
        />
      </label>
      {(() => {
        const chart = charts.find((c) => c.id === editingLabels.chartId);
        if (!chartHasMultiTraceLegend(chart)) return null;
        return (
          <label className="chart-label-editor-row">
            <span>Legend title</span>
            <input
              className="chart-label-editor-input"
              value={editingLabels.legendTitle ?? ''}
              onChange={(e) => setEditingLabels((p) => ({ ...p, legendTitle: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLabelEdit();
                if (e.key === 'Escape') setEditingLabels(null);
              }}
              placeholder="optional heading above legend"
            />
          </label>
        );
      })()}
      {editingLabels.variableStyles && (
        <>
          <div className="chart-label-editor-section-head">
            <div className="chart-label-editor-section-title">Variables</div>
            <div className="chart-var-select-actions">
              <button type="button" className="chart-var-select-link" onClick={() => selectAllVariables(true)}>
                All
              </button>
              <button type="button" className="chart-var-select-link" onClick={() => selectAllVariables(false)}>
                None
              </button>
            </div>
          </div>
          {(editingLabels.selectedVarKeys?.length ?? 0) > 0 && (
            <div className="chart-var-bulk-bar">
              <span className="chart-var-bulk-count">
                {editingLabels.selectedVarKeys.length} selected — assign color:
              </span>
              <label className="chart-var-style-color-wrap" title="Apply color to all selected variables">
                <input
                  type="color"
                  className="chart-var-style-color chart-var-bulk-color"
                  defaultValue="#005E60"
                  onChange={(e) => applyColorToSelectedVariables(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="chart-var-select-link"
                onClick={() => setEditingLabels((p) => ({ ...p, selectedVarKeys: [] }))}
              >
                Clear selection
              </button>
            </div>
          )}
          <div className="chart-var-style-list">
          {Object.keys(editingLabels.variableStyles).map((colKey) => {
            const shortKey = colKey.split(' \u2014 ').pop();
            const style = editingLabels.variableStyles[colKey];
            const otherKeys = Object.keys(editingLabels.variableStyles).filter((k) => k !== colKey);
            const isSelected = editingLabels.selectedVarKeys?.includes(colKey);
            return (
              <div
                key={colKey}
                className={`chart-var-style-block${isSelected ? ' chart-var-style-block--selected' : ''}`}
                title={colKey}
                onClick={(e) => {
                  if (e.target.closest('input, select, button, label')) return;
                  toggleVariableSelection(colKey, e.shiftKey);
                }}
              >
                <div className="chart-var-style-head">
                  <label
                    className="chart-var-select-wrap"
                    title="Select for bulk color"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleVariableSelection(colKey, e.shiftKey);
                      }}
                    />
                  </label>
                  <span className="chart-label-editor-legend-key">{shortKey}</span>
                  {editingLabels.legendLabels && (
                    <input
                      className="chart-label-editor-input chart-var-style-label-input"
                      value={editingLabels.legendLabels[colKey] ?? ''}
                      onChange={(e) => setEditingLabels((p) => ({
                        ...p,
                        legendLabels: { ...p.legendLabels, [colKey]: e.target.value },
                      }))}
                      placeholder={shortKey}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <button
                    type="button"
                    className="chart-var-remove-btn"
                    title="Remove this variable from the chart"
                    aria-label={`Remove ${shortKey}`}
                    disabled={(editingLabels.yKeys?.length ?? 0) <= 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeVariableFromEditor(colKey);
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="chart-var-style-controls">
                  <label className="chart-var-style-color-wrap" title="Line color">
                    <input
                      type="color"
                      className="chart-var-style-color"
                      value={style.color}
                      onChange={(e) => {
                        const color = e.target.value;
                        setEditingLabels((p) => {
                          const multi =
                            p.selectedVarKeys?.includes(colKey) &&
                            (p.selectedVarKeys?.length ?? 0) > 1;
                          if (multi) {
                            const nextStyles = { ...p.variableStyles };
                            for (const k of p.selectedVarKeys) {
                              if (nextStyles[k]) {
                                nextStyles[k] = { ...nextStyles[k], color };
                              }
                            }
                            return { ...p, variableStyles: nextStyles };
                          }
                          return {
                            ...p,
                            variableStyles: {
                              ...p.variableStyles,
                              [colKey]: { ...p.variableStyles[colKey], color },
                            },
                          };
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                  <label className="chart-var-style-intensity" title="Color intensity">
                    <span>Int</span>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={Math.round((style.intensity ?? 1) * 100)}
                      onChange={(e) => setEditingLabels((p) => ({
                        ...p,
                        variableStyles: {
                          ...p.variableStyles,
                          [colKey]: {
                            ...p.variableStyles[colKey],
                            intensity: Number(e.target.value) / 100,
                          },
                        },
                      }))}
                    />
                  </label>
                  {otherKeys.length > 0 && (
                    <label className="chart-var-style-clone" title="Copy another variable's color">
                      <span>Clone</span>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const src = e.target.value;
                          if (src) cloneVariableColorFrom(colKey, src);
                          e.target.value = '';
                        }}
                      >
                        <option value="">from…</option>
                        {otherKeys.map((k) => (
                          <option key={k} value={k}>{k.split(' \u2014 ').pop()}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="chart-var-style-rigid" title="Rigid: draw full trace at Simulate; unchecked = progressive">
                    <input
                      type="checkbox"
                      checked={!!style.rigid}
                      onChange={(e) => setEditingLabels((p) => ({
                        ...p,
                        variableStyles: {
                          ...p.variableStyles,
                          [colKey]: { ...p.variableStyles[colKey], rigid: e.target.checked },
                        },
                      }))}
                    />
                    <span>Rigid</span>
                  </label>
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}
      <div className="chart-label-editor-actions">
        <button className="chart-label-editor-btn chart-label-editor-btn--save" onClick={commitLabelEdit}>Save</button>
        <button className="chart-label-editor-btn" onClick={() => setEditingLabels(null)}>Cancel</button>
      </div>
    </div>
  );
  /** Always above canvas / side panel stacking (10–1100); below modals (10k+). */
  const CHART_PANEL_Z_STACK = 5000;

  // Remember viewport size so card limits stay correct after resize.
  const [viewportInnerWidth, setViewportInnerWidth] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1200),
  );
  const [viewportInnerHeight, setViewportInnerHeight] = useState(
    () => (typeof window !== 'undefined' ? window.innerHeight : 800),
  );
  useEffect(() => {
    const onResize = () => {
      setViewportInnerWidth(window.innerWidth);
      setViewportInnerHeight(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isVerticalChartLayout = layoutMode === 'sideRight';

  // Bottom/top tray: card width. Side-right strip (conf 2): card height (width is fixed by the dock).
  const chartCardMaxWidthPx = Math.max(
    320,
    viewportInnerWidth - insetLeft - insetRight - 32,
  );
  const chartCardMaxLengthPx = Math.max(
    320,
    viewportInnerHeight - headerBottomPx - 48,
  );
  const chartSizeStateMin = 200;
  const chartSizeStateMax = isVerticalChartLayout
    ? Math.max(chartSizeStateMin, chartCardMaxLengthPx - 50)
    : Math.max(chartSizeStateMin, chartCardMaxWidthPx - 150);

  useEffect(() => {
    if (!onChartCardWidthChange) return;
    const clamped = Math.min(chartCardWidth, chartSizeStateMax);
    if (clamped !== chartCardWidth) onChartCardWidthChange(clamped);
  }, [chartSizeStateMax, chartCardWidth, onChartCardWidthChange]);

  /** Card width (horizontal tray) or height (vertical side strip) for one chart — own override or top-bar default. */
  const effectiveCardSizePx = (chart) => {
    const own = chart.chartCardWidth;
    const raw =
      own != null && Number.isFinite(Number(own)) ? Number(own) : chartCardWidth;
    const clamped = Math.min(4000, Math.max(200, Math.round(raw)));
    return Math.min(chartSizeStateMax, Math.max(chartSizeStateMin, clamped));
  };

  const cardSizeCssVars = (chart) => {
    const size = effectiveCardSizePx(chart);
    if (isVerticalChartLayout) {
      return {
        '--chart-height': `${size}px`,
        '--chart-min-height': `${Math.max(200, size - 50)}px`,
      };
    }
    return {
      '--chart-min-width': `${Math.max(200, size - 150)}px`,
      '--chart-max-width': `${Math.min(chartCardMaxWidthPx, size + 150)}px`,
    };
  };

  /** While you drag the right edge of one chart box: remember where the mouse started and how wide that box was. */
  const chartResizeDragRef = useRef(null);
  useEffect(() => {
    const onMove = (e) => {
      const t = chartResizeDragRef.current;
      if (!t) return;
      const delta = t.vertical ? e.clientY - t.startY : e.clientX - t.startX;
      const next = Math.min(
        chartSizeStateMax,
        Math.max(chartSizeStateMin, Math.round(t.startSize + delta)),
      );
      if (next !== t.lastApplied) {
        t.lastApplied = next;
        onPerChartCardWidthChange?.(t.chartId, next);
      }
    };
    const endDrag = () => {
      chartResizeDragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [chartSizeStateMin, chartSizeStateMax, onPerChartCardWidthChange]);

  const chartResizeEdge = (chart) => (
    <div
      className={`chart-panel-chart-resize-edge${
        isVerticalChartLayout ? ' chart-panel-chart-resize-edge--vertical' : ''
      }`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startSize = effectiveCardSizePx(chart);
        chartResizeDragRef.current = {
          chartId: chart.id,
          startX: e.clientX,
          startY: e.clientY,
          startSize,
          lastApplied: startSize,
          vertical: isVerticalChartLayout,
        };
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPerChartCardWidthChange?.(chart.id, null);
      }}
      title={
        isVerticalChartLayout
          ? 'Drag bottom edge to resize height · Double-click = use top-bar default length'
          : 'Drag right edge to resize · Double-click = use top-bar default width'
      }
    />
  );

  const [chartData, setChartData] = useState({}); // Store fetched CSV data by chart id
  const [loadingCharts, setLoadingCharts] = useState({}); // Track loading state per chart
  const [selectedChartIds, setSelectedChartIds] = useState(new Set()); // For stack/unstack

  const SAMPLE_OPTIONS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
  const getSampleStep = (chartId) => perChartSampleStep[chartId] ?? globalSampleStep ?? 1;

  /**
   * Get data for a chart: prefer simulationData (from design dir) when available
   */
  const getChartData = (chart) => {
    if (chart.ensembleCrossMember) {
      return null;
    }
    if (
      chart.ensembleSimId &&
      ensembleMemberSimulationData?.[chart.ensembleSimId]?.length
    ) {
      const rows = ensembleMemberSimulationData[chart.ensembleSimId];
      return rows;
    }
    if (simulationData && simulationData.length > 0) {
      return simulationData;
    }
    return chartData[chart.id];
  };

  const chartDataReadyToPlot = (chart) => {
    if (chart.ensembleCrossMember) {
      return crossMemberDataReady(chart, ensembleMemberSimulationData);
    }
    if (simulationData?.length) return getChartData(chart)?.length > 0;
    const d = getChartData(chart);
    return d && d.length > 0;
  };

  const dataForPlotlyLayout = (chart) => {
    if (chart.ensembleCrossMember && ensembleMemberSimulationData) {
      return layoutDataForEnsembleCrossChart(chart, ensembleMemberSimulationData);
    }
    return getChartData(chart);
  };

  /**
   * Fetch CSV data for all charts when they change
   * Skip fetch when simulationData is provided (design dir flow)
   */
  useEffect(() => {
    charts.forEach((chart) => {
      if (simulationMetadata?.isEnsemble && chart.ensembleCrossMember) {
        if (!crossMemberDataReady(chart, ensembleMemberSimulationData)) {
          void onEnsureEnsembleChartColumns?.(chart);
        }
        return;
      }
      if (simulationData && simulationData.length > 0) {
        return;
      }
      if (
        chart.ensembleSimId &&
        simulationMetadata?.isEnsemble &&
        !ensembleMemberSimulationData?.[chart.ensembleSimId]?.length
      ) {
        void onEnsureEnsembleChartColumns?.(chart);
        return;
      }
      if (
        chart.ensembleSimId &&
        ensembleMemberSimulationData?.[chart.ensembleSimId]?.length
      ) {
        return;
      }
      if (!chartData[chart.id]) {
        fetchChartData(chart);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charts, simulationData, ensembleMemberSimulationData, simulationMetadata?.isEnsemble, onEnsureEnsembleChartColumns]);

  // Clean up selection listeners when charts are removed
  useEffect(() => {
    const chartIds = new Set(charts.map(c => c.id));
    selectionListenersByChart.forEach((entry, chartId) => {
      if (!chartIds.has(chartId) && entry?.handler && entry.gd) {
        try {
          entry.gd.removeListener('plotly_selected', entry.handler);
          entry.gd.removeListener('plotly_selecting', entry.handler);
        } catch (e) { /* ignore */ }
        selectionListenersByChart.delete(chartId);
      }
    });
  }, [charts]);

  /**
   * Fetch CSV data for a specific chart
   * Uses design-dir endpoint when currentConfigName exists, else falls back to legacy /api/csv/
   */
  const fetchChartData = async (chart) => {
    setLoadingCharts(prev => ({ ...prev, [chart.id]: true }));

    try {
      let dataRows = null;
      const designPathSegment = designCatalogPath || currentConfigName;
      if (designPathSegment && chart.csvName && chart.csvName.endsWith('.data.csv')) {
        const simName = chart.csvName.replace('.data.csv', '');
        const response = await fetch(
          `${API_BASE_URL}/api/designs/${encodeURIComponent(designPathSegment)}/simulations/${encodeURIComponent(simName)}`
        );
        if (response.ok) {
          const result = await response.json();
          dataRows = result.data || [];
        }
      }
      if (!dataRows && chart.csvName) {
        const response = await fetch(`${API_BASE_URL}/api/csv/${chart.csvName}`);
        if (!response.ok) throw new Error('Failed to fetch CSV data');
        const data = await response.json();
        dataRows = data.data;
      }
      if (!dataRows) throw new Error('No data available');

      setChartData(prev => ({
        ...prev,
        [chart.id]: dataRows
      }));
      
      const chartDesc = chart.isMultiComponent 
        ? `Multi-component chart (${chart.components.length} components)` 
        : `${chart.componentName} - ${chart.chartType}`;
      console.log(`✅ Loaded data for chart: ${chartDesc}`);
    } catch (error) {
      console.error(`❌ Error loading chart data:`, error);
      setChartData(prev => ({
        ...prev,
        [chart.id]: null // Mark as error
      }));
    } finally {
      setLoadingCharts(prev => ({ ...prev, [chart.id]: false }));
    }
  };

  const CHART_COLORS = ['#005E60', '#FF6B35', '#4ECDC4', '#F7B731', '#5F27CD', '#00D2FF', '#C23616', '#0FB9B1'];
  const SELECTION_HIGHLIGHT_COLOR = '#FFD700'; // Bright gold – high contrast on dark background
  const SELECTION_MARKER_SIZE = 10;

  /**
   * Y-axis label for multi-component charts: use actual column names from CSV/Excel.
   * Plain text for bar charts; HTML with legend-like colors for multi-line.
   */
  const getMultiBarYAxisLabel = (chart) => {
    if (!chart.components || chart.components.length === 0) return 'Value';
    const columns = [...new Set(chart.components.map(c => c.columnName))];
    return columns.join(' / ');
  };

  /**
   * Y-axis label with legend colors: each column name in its trace color (P_load=teal, P_gen=orange)
   */
  const getMultiBarYAxisLabelHTML = (chart) => {
    if (!chart.components || chart.components.length === 0) return 'Value';
    return chart.components.map((c, i) =>
      `<span style="color:${CHART_COLORS[i % CHART_COLORS.length]}">${c.columnName}</span>`
    ).join(' / ');
  };

  /**
   * Compute fixed Y-axis range for multi-bar chart (so bars animate, not the scale)
   */
  const getMultiBarYRange = (chart, data) => {
    if (!data || data.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    chart.components.forEach(comp => {
      data.forEach(row => {
        const v = parseFloat(row[comp.columnName]);
        if (!isNaN(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      });
    });
    if (min === Infinity || max === -Infinity) return null;
    const padding = (max - min) * 0.1 || 1;
    return [min - padding, max + padding];
  };

  /**
   * Generate multi-line 2D chart – one trace per component, X = time, Y = column value
   * Adds customdata (row indices) for cross-chart selection; opacity highlights selected points
   */
  const generateMultiComponentLineChart = (chart, data) => {
    const indexed = data.map((row, i) => ({ row, i }));
    const step = getSampleStep(chart.id);
    const hasSelection = selectedRowIndices && selectedRowIndices.size > 0;
    const selectedSet = selectedRowIndices instanceof Set ? selectedRowIndices : new Set(selectedRowIndices || []);

    return chart.components.map((comp, index) => {
      const colKey = comp.columnName;
      const { sampledData, sampledRowIndices } = sampleIndexedRowsForVariable({
        indexed,
        chart,
        colKey,
        index,
        xColumn: chart.timeColumn,
        simulationRunning,
        simulationTime,
        sampleStep: step,
      });
      const style = buildTraceLineStyle(chart, colKey, index);
      return {
        x: sampledData.map((row) => parseFloat(row[chart.timeColumn]) || 0),
        y: sampledData.map((row) => parseFloat(row[comp.columnName]) || 0),
        customdata: sampledRowIndices,
        type: 'scatter',
        mode: 'lines+markers',
        name: comp.name,
        line: style.line,
        marker: buildScatterMarkerStyle({
          lineColor: style.color,
          intensity: style.intensity,
          sampledRowIndices,
          selectedSet,
          hasSelection,
        }),
      };
    });
  };

  /**
   * Group Y columns by split type (phase, load, column)
   */
  const groupColumnsBySplit = (yColumns, splitBy, manualGroupBreaks) => {
    if (!yColumns?.length) return [];
    if (splitBy === 'manual') {
      if (!manualGroupBreaks?.length) return [{ key: 'Group 1', cols: yColumns }];
      const groups = [];
      let start = 0;
      for (const b of manualGroupBreaks) {
        const slice = yColumns.slice(start, b - 1);
        if (slice.length) groups.push({ key: `Group ${groups.length + 1}`, cols: slice });
        start = b - 1;
      }
      if (start < yColumns.length) {
        groups.push({ key: `Group ${groups.length + 1}`, cols: yColumns.slice(start) });
      }
      return groups.filter(g => g.cols.length > 0);
    }
    if (splitBy === 'column') {
      return yColumns.map(col => ({ key: col, cols: [col] }));
    }
    if (splitBy === 'phase') {
      const groups = {};
      yColumns.forEach(col => {
        const m = col.match(/[._-]([aAbBcC])[._-]|[._-]([aAbBcC])[\d.]|([aAbBcC])[._-]/i);
        const letter = m ? (m[1] || m[2] || m[3]).toUpperCase() : 'Other';
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(col);
      });
      const order = ['A', 'B', 'C'];
      const keys = [...order.filter(k => groups[k]?.length), ...(groups.Other?.length ? ['Other'] : [])];
      return keys.map(k => ({ key: `Phase ${k}`, cols: groups[k] }));
    }
    if (splitBy === 'load') {
      const groups = {};
      yColumns.forEach(col => {
        const m = col.match(/_(\d+)\b|\.(\d+)\b|load[_-]?(\d+)/i);
        const num = m ? (m[1] || m[2] || m[3]) : 'Other';
        if (!groups[num]) groups[num] = [];
        groups[num].push(col);
      });
      const sorted = Object.entries(groups).sort((a, b) => {
        if (a[0] === 'Other') return 1;
        if (b[0] === 'Other') return -1;
        return Number(a[0]) - Number(b[0]);
      });
      return sorted.map(([k, cols]) => ({ key: `Load ${k}`, cols: cols }));
    }
    return [{ key: 'All', cols: yColumns }];
  };

  /**
   * Generate stacked nD chart data – grouped subplots, one trace per Y column
   */
  const generateStackedNdChartData = (chart, data) => {
    const groups = groupColumnsBySplit(chart.yColumns, chart.splitBy || 'phase', chart.manualGroupBreaks);
    if (groups.length === 0) return [];

    const indexed = data.map((row, i) => ({ row, i }));
    const step = getSampleStep(chart.id);
    const hasSelection = selectedRowIndices && selectedRowIndices.size > 0;
    const selectedSet = selectedRowIndices instanceof Set ? selectedRowIndices : new Set(selectedRowIndices || []);

    const traces = [];
    groups.forEach((grp, rowIdx) => {
      const yAxis = rowIdx === 0 ? 'y' : `y${rowIdx + 1}`;
      grp.cols.forEach((yCol, colIdx) => {
        const globalIndex = chart.yColumns.indexOf(yCol);
        const styleIndex = globalIndex >= 0 ? globalIndex : colIdx;
        const { sampledData, sampledRowIndices } = sampleIndexedRowsForVariable({
          indexed,
          chart,
          colKey: yCol,
          index: styleIndex,
          xColumn: chart.xColumn,
          simulationRunning,
          simulationTime,
          sampleStep: step,
        });
        const style = buildTraceLineStyle(chart, yCol, styleIndex);
        const xValues = sampledData.map((row) => parseFloat(row[chart.xColumn]) || 0);
        const yValues = sampledData.map((row) => parseFloat(row[yCol]) || 0);
        traces.push({
          x: xValues,
          y: yValues,
          customdata: sampledRowIndices,
          type: 'scatter',
          mode: 'lines+markers',
          name: chart.legendLabels?.[yCol] ?? yCol,
          xaxis: 'x',
          yaxis: yAxis,
          line: style.line,
          marker: buildScatterMarkerStyle({
            lineColor: style.color,
            intensity: style.intensity,
            sampledRowIndices,
            selectedSet,
            hasSelection,
          }),
        });
      });
    });
    return traces;
  };

  /**
   * Generate nD chart data – one trace per Y column, shared X axis
   */
  const generateNdChartData = (chart, data) => {
    const indexed = data.map((row, i) => ({ row, i }));
    const step = getSampleStep(chart.id);
    const hasSelection = selectedRowIndices && selectedRowIndices.size > 0;
    const selectedSet = selectedRowIndices instanceof Set ? selectedRowIndices : new Set(selectedRowIndices || []);

    return chart.yColumns.map((yCol, index) => {
      const { sampledData, sampledRowIndices } = sampleIndexedRowsForVariable({
        indexed,
        chart,
        colKey: yCol,
        index,
        xColumn: chart.xColumn,
        simulationRunning,
        simulationTime,
        sampleStep: step,
      });
      const style = buildTraceLineStyle(chart, yCol, index);
      const xValues = sampledData.map((row) => parseFloat(row[chart.xColumn]) || 0);
      const yValues = sampledData.map((row) => parseFloat(row[yCol]) || 0);
      return {
        x: xValues,
        y: yValues,
        customdata: sampledRowIndices,
        type: 'scatter',
        mode: 'lines+markers',
        name: chart.legendLabels?.[yCol] ?? yCol,
        line: style.line,
        marker: buildScatterMarkerStyle({
          lineColor: style.color,
          intensity: style.intensity,
          sampledRowIndices,
          selectedSet,
          hasSelection,
        }),
      };
    });
  };

  /**
   * Generate multi-component bar chart data
   * Creates one bar trace per component, all sharing the same X-axis (time)
   */
  const generateMultiComponentBarChart = (chart, data) => {
    // Color palette for different components
    const colors = [
      '#005E60', // GE Vernova teal
      '#FF6B35', // Orange
      '#4ECDC4', // Turquoise
      '#F7B731', // Yellow
      '#5F27CD', // Purple
      '#00D2FF', // Cyan
      '#C23616', // Red
      '#0FB9B1'  // Green
    ];

    // Filter data based on simulation time
    let filteredData = data;
    if (simulationRunning && simulationTime !== undefined) {
      filteredData = data.filter(row => {
        const timeValue = parseFloat(row[chart.timeColumn]);
        return !isNaN(timeValue) && timeValue <= simulationTime;
      });
    }

    // Get the last data point for current time (for bar chart)
    const currentData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
    
    if (!currentData) return [];

    // Helper function to detect units from column name
    const detectUnits = (columnName) => {
      if (columnName.includes('_mw') || columnName.includes('power_mw')) return 'MW';
      if (columnName.includes('_kw') || columnName.includes('power_kw')) return 'kW';
      if (columnName.includes('_kv') || columnName.includes('voltage_kv')) return 'kV';
      if (columnName.includes('_v') || columnName.includes('voltage_v')) return 'V';
      if (columnName.includes('_a') || columnName.includes('current_a')) return 'A';
      if (columnName.includes('percent') || columnName.includes('_pct')) return '%';
      if (columnName.includes('temp') || columnName.includes('temperature')) return '°C';
      if (columnName.includes('_hz') || columnName.includes('freq')) return 'Hz';
      return ''; // No unit
    };

    // Create a bar trace for each component
    return chart.components.map((comp, index) => {
      const value = parseFloat(currentData[comp.columnName]) || 0;
      const units = detectUnits(comp.columnName);
      const displayValue = units ? `${value.toFixed(2)} ${units}` : value.toFixed(2);
      
      return {
        x: [comp.name], // Component name on X-axis
        y: [value], // Current value on Y-axis
        type: 'bar',
        name: comp.name,
        marker: {
          color: colors[index % colors.length],
          line: {
            color: '#000',
            width: 1
          },
          // Add gradient effect
          pattern: {
            shape: '',
            solidity: 0.5
          }
        },
        text: [displayValue],
        textposition: 'outside',
        textfont: {
          color: '#e0e0e0',
          size: 14,
          weight: 600
        },
        hovertemplate: 
          `<b>%{x}</b><br>` +
          `<b>Value:</b> ${displayValue}<br>` +
          `<b>Column:</b> ${comp.columnName}<br>` +
          `<b>Time:</b> ${currentData[chart.timeColumn]}<br>` +
          `<extra></extra>`,
        hoverlabel: {
          bgcolor: colors[index % colors.length],
          bordercolor: '#fff',
          font: {
            family: 'Arial, sans-serif',
            size: 13,
            color: '#fff'
          }
        }
      };
    });
  };

  const slicePieColumnLabel = (col) => {
    const s = String(col);
    const idx = s.indexOf(ENSEMBLE_COLUMN_SEP);
    return idx >= 0 ? s.slice(idx + ENSEMBLE_COLUMN_SEP.length).trim() : s;
  };

  /** Pie: each slice magnitude is the variable at the current row; Plotly shows share = v_i / Σv. First row when idle; current row follows simulation time via the hidden time column (not shown in the builder). */
  const generatePiePlaybackTraces = (chart, data) => {
    if (!data?.length || !chart.yColumns?.length) return [];
    const xCol = chart.xColumn;
    const yCols = chart.yColumns;
    const xThreshold = getChartXThreshold(chart);
    let rowIndex = 0;
    let bestTime = -Infinity;
    if (simulationRunning && simulationTime !== undefined) {
      for (let i = 0; i < data.length; i++) {
        const xv = cellFloat(data[i], xCol);
        if (Number.isNaN(xv)) continue;
        if (xThreshold != null && xv <= xThreshold) continue;
        if (xv <= simulationTime && xv >= bestTime) {
          bestTime = xv;
          rowIndex = i;
        }
      }
      if (bestTime === -Infinity) return [];
    } else if (xThreshold != null && xCol) {
      let found = false;
      for (let i = 0; i < data.length; i++) {
        const xv = cellFloat(data[i], xCol);
        if (!Number.isNaN(xv) && xv > xThreshold) {
          rowIndex = i;
          found = true;
          break;
        }
      }
      if (!found) return [];
    }
    const row = data[rowIndex];
    const labels = yCols.map((c) => slicePieColumnLabel(c));
    let values = yCols.map((c) => {
      const v = cellFloat(row, c);
      return Number.isFinite(v) ? Math.max(0, v) : 0;
    });
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum <= 0) values = values.map(() => 1 / Math.max(1, values.length));
    return [
      {
        type: 'pie',
        labels,
        values,
        marker: {
          colors: yCols.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        },
        textinfo: 'label+percent',
        hovertemplate: '<b>%{label}</b><br>%{percent}<br>value %{value}<extra></extra>',
        textfont: { color: '#fff', size: 12 },
      },
    ];
  };

  /**
   * Generate Plotly configuration for professional scientific charts
   * Filters data based on simulation time if simulation is running
   */
  const generatePlotlyData = (chart, data) => {
    if (chart.ensembleCrossMember && simulationMetadata?.isEnsemble && ensembleMemberSimulationData) {
      const sampleStep = getSampleStep(chart.id);
      const base = {
        chart,
        memberData: ensembleMemberSimulationData,
        sampleStep,
        simulationRunning,
        simulationTime,
        selectedRowIndices,
      };
      if (chart.isMultiComponent && chart.chartType === 'multi-line-chart') {
        return buildCrossMultiLineTraces(base);
      }
      if (chart.chartType === 'nd' && chart.yColumns?.length) {
        return buildCrossNdTraces(base);
      }
      if (chart.chartType === 'stacked-nd' && chart.yColumns?.length) {
        return buildCrossStackedNdTraces({ ...base, groupFn: groupColumnsBySplit });
      }
      if (chart.chartType === 'pie' && chart.yColumns?.length) {
        return buildCrossPieTraces({
          chart,
          memberData: ensembleMemberSimulationData,
          simulationRunning,
          simulationTime,
        });
      }
      if (chart.chartType === '2d') {
        return buildCross2dTraces({ ...base, lineColor: '#005E60' });
      }
      if (chart.chartType === 'bar') {
        const t = buildCross2dTraces({ ...base, lineColor: '#4caf50' });
        if (!t?.[0]) return [];
        return [
          {
            type: 'bar',
            x: t[0].x?.slice(0, 50) || [],
            y: t[0].y?.slice(0, 50) || [],
            name: chart.componentName,
            customdata: t[0].customdata,
            marker: {
              color: '#4caf50',
              line: { color: '#000', width: 1 },
            },
          },
        ];
      }
    }

    if (!data || data.length === 0) return [];

    // Handle multi-component bar charts
    if (chart.isMultiComponent && chart.chartType === 'multi-bar-chart') {
      return generateMultiComponentBarChart(chart, data);
    }
    // Handle multi-line 2D charts
    if (chart.isMultiComponent && chart.chartType === 'multi-line-chart') {
      return generateMultiComponentLineChart(chart, data);
    }
    // Pie: one row; slice sizes = Y columns (same row); shares = v_i / sum; row from time column vs simulationTime when running
    if (chart.chartType === 'pie' && chart.yColumns?.length) {
      return generatePiePlaybackTraces(chart, data);
    }
    // Handle nD charts (X + multiple Y columns)
    if (chart.chartType === 'nd' && chart.yColumns?.length) {
      return generateNdChartData(chart, data);
    }
    // Handle stacked nD (subplots by phase/load/column)
    if (chart.chartType === 'stacked-nd' && chart.yColumns?.length) {
      return generateStackedNdChartData(chart, data);
    }

    // Filter data (keep row indices for cross-chart selection)
    const indexed = data.map((row, i) => ({ row, i }));
    const step = getSampleStep(chart.id);
    const hasSelection = selectedRowIndices && selectedRowIndices.size > 0;
    const selectedSet = selectedRowIndices instanceof Set ? selectedRowIndices : new Set(selectedRowIndices || []);

    let filtered = indexed;
    const xThr = getChartXThreshold(chart);
    if (xThr != null && chart.xColumn) {
      filtered = filtered.filter(({ row }) => rowPassesXThreshold(row, chart.xColumn, xThr));
    }
    if (simulationRunning && simulationTime !== undefined) {
      filtered = filtered.filter(({ row }) => {
        const xValue = cellFloat(row, chart.xColumn);
        return !Number.isNaN(xValue) && xValue <= simulationTime;
      });
    }
    const sampled = step > 1 ? filtered.filter((_, i) => i % step === 0) : filtered;
    const sampledData = sampled.map(({ row }) => row);
    const sampledRowIndicesLegacy = sampled.map(({ i }) => i);
    const xValues = sampledData.map((row) => cellFloat(row, chart.xColumn));
    const yValues = sampledData.map((row) => cellFloat(row, chart.yColumn));

    switch (chart.chartType) {
      case '2d': {
        const colKey = chart.yColumn;
        const { sampledData, sampledRowIndices } = sampleIndexedRowsForVariable({
          indexed,
          chart,
          colKey,
          index: 0,
          xColumn: chart.xColumn,
          simulationRunning,
          simulationTime,
          sampleStep: step,
        });
        const style = buildTraceLineStyle(chart, colKey, 0);
        const xValues = sampledData.map((row) => cellFloat(row, chart.xColumn));
        const yValues = sampledData.map((row) => cellFloat(row, chart.yColumn));
        return [{
          x: xValues,
          y: yValues,
          customdata: sampledRowIndices,
          type: 'scatter',
          mode: 'lines+markers',
          name: chart.componentName,
          line: style.line,
          marker: buildScatterMarkerStyle({
            lineColor: style.color,
            intensity: style.intensity,
            sampledRowIndices,
            selectedSet,
            hasSelection,
          }),
        }];
      }

      case 'histogram':
        return [{
          x: yValues,
          type: 'histogram',
          name: chart.componentName,
          marker: {
            color: '#ff9800',
            line: {
              color: '#000',
              width: 1
            }
          },
          nbinsx: 30
        }];

      case 'bar':
        return [{
          x: xValues.slice(0, 50), // Limit for readability
          y: yValues.slice(0, 50),
          type: 'bar',
          name: chart.componentName,
          marker: {
            color: '#4caf50',
            line: {
              color: '#000',
              width: 1
            }
          }
        }];

      case 'box':
        return [{
          y: yValues,
          type: 'box',
          name: chart.componentName,
          marker: {
            color: '#9c27b0'
          },
          line: {
            color: '#9c27b0',
            width: 2
          }
        }];

      default:
        return [{
          x: xValues,
          y: yValues,
          type: 'scatter',
          mode: 'lines',
          name: chart.componentName
        }];
    }
  };

  /**
   * Generate event marker shapes for Plotly charts
   * Creates colored background regions based on CSV event columns
   */
  const generateEventMarkerShapes = () => {
    if (!simulationData || simulationData.length === 0 || !eventMarkers) {
      return [];
    }

    const o = clampChartPanelOpacity(panelOpacity);
    const scaleEventFill = (c) => {
      const color = c || 'rgba(255, 0, 0, 0.15)';
      const m = String(color).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
      if (m) {
        const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
        return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a * o})`;
      }
      return color;
    };

    const shapes = [];
    
    // Process each event marker definition
    Object.keys(eventMarkers).forEach(eventColumn => {
      const markerConfig = eventMarkers[eventColumn];
      let inEvent = false;
      let eventStartTime = null;
      
      // Scan through simulation data to find event regions
      // Note: CSV values are often strings ("1"/"0") from DictReader, not numbers
      simulationData.forEach((row, index) => {
        const val = row[eventColumn];
        const isActive = val === 1 || val === true || val === '1' ||
          (typeof val === 'string' && val.toLowerCase() === 'true');
        const timeValue = Number(row.time_sec) || 0;
        
        if (isActive && !inEvent) {
          // Event starts
          inEvent = true;
          eventStartTime = timeValue;
        } else if (!isActive && inEvent) {
          // Event ends - create shape
          shapes.push({
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: eventStartTime,
            x1: timeValue,
            y0: 0,
            y1: 1,
            fillcolor: scaleEventFill(markerConfig.color),
            line: { width: 0 },
            layer: 'below'
          });
          
          // Optional: Add vertical line at event start
          if (markerConfig.line_color) {
            shapes.push({
              type: 'line',
              xref: 'x',
              yref: 'paper',
              x0: eventStartTime,
              x1: eventStartTime,
              y0: 0,
              y1: 1,
              line: {
                color: markerConfig.line_color,
                width: 2,
                dash: 'dash'
              },
              layer: 'below'
            });
          }
          
          inEvent = false;
          eventStartTime = null;
        }
        
        // Handle event that extends to end of data
        if (inEvent && index === simulationData.length - 1) {
          shapes.push({
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: eventStartTime,
            x1: timeValue,
            y0: 0,
            y1: 1,
            fillcolor: scaleEventFill(markerConfig.color),
            line: { width: 0 },
            layer: 'below'
          });
        }
      });
    });
    
    return shapes;
  };

  /**
   * Token for Plotly’s layout.uirevision: hold it steady while only pane opacity or card width change so zoom/pan survive cosmetic relayouts.
   * We tie it to data identity and sample stride, but not simulationTime, so scrubbing during play does not reset the axes every tick.
   */
  const getPlotlyUiRevision = (chart, data) => {
    const step = getSampleStep(chart.id);
    const sid = simulationMetadata?.id ?? '';
    const csv = chart.csvName ?? '';
    // Locked time axes must not bump uirevision as rows stream in during playback.
    const n =
      chart.axisRange?.xLocked && isTimeBasedChart(chart)
        ? 'xlocked'
        : (data?.length ?? 0);
    return `${chart.id}|${sid}|${csv}|${n}|${step}`;
  };

  /**
   * Plotly’s modebar “Home” (reset) restores the layout we pass on each update.
   * For each axis: if locked and min/max are saved, embed `range` so Home snaps to
   * them; if unlocked, use `autorange: true` so Home and the default view follow data.
   */
  const resolveAxisProps = (chart, ar) => {
    if (!ar) {
      return {
        xRangeProps: { autorange: true },
        yRangeProps: { autorange: true },
        xLockProps: {},
        yLockProps: {},
      };
    }
    const xLocked = ar.xLocked ?? false;
    const yLocked = ar.yLocked ?? false;
    let xMin = ar.xMin;
    let xMax = ar.xMax;
    if (xLocked && isTimeBasedChart(chart) && playbackTimeRange) {
      if (xMin == null && Number.isFinite(Number(playbackTimeRange.t1))) {
        xMin = Number(playbackTimeRange.t1);
      }
      if (xMax == null && Number.isFinite(Number(playbackTimeRange.t2))) {
        xMax = Number(playbackTimeRange.t2);
      }
    }
    const xHas = xMin != null || xMax != null;
    const yHas = ar.yMin != null || ar.yMax != null;

    const xRangeProps =
      xLocked && xHas
        ? { range: [xMin ?? null, xMax ?? null], autorange: false, rangemode: 'normal' }
        : { autorange: true };
    const yRangeProps =
      yLocked && yHas
        ? { range: [ar.yMin ?? null, ar.yMax ?? null], autorange: false }
        : { autorange: true };

    return {
      xRangeProps,
      yRangeProps,
      xLockProps: xLocked ? { fixedrange: true } : {},
      yLockProps: yLocked ? { fixedrange: true } : {},
    };
  };

  /**
   * Generate professional Plotly layout
   */
  const renderDangerYThresholdAlert = (chart) => {
    if (!simulationRunning || getChartDangerYThreshold(chart) == null) return null;
    const exceeds = chartExceedsDangerYThreshold({
      chart,
      simulationRunning,
      simulationTime,
      data: chart.ensembleCrossMember ? null : getChartData(chart),
      ensembleMemberSimulationData: chart.ensembleCrossMember
        ? ensembleMemberSimulationData
        : null,
    });
    if (!exceeds) return null;
    return (
      <div className="chart-danger-y-threshold-alert" role="status" aria-live="polite">
        EXCEEDS THRESHOLD
      </div>
    );
  };

  const generatePlotlyLayout = (chart, data) => {
    const withDangerY = (layout) =>
      chartSupportsDangerYThreshold(chart)
        ? applyDangerYThresholdLayout(layout, chart)
        : layout;

    const o = clampChartPanelOpacity(panelOpacity);
    const rgba = (r, g, b, a = o) => `rgba(${r},${g},${b},${a})`;
    const paperRgba = rgba(13, 13, 13);
    const plotRgba = rgba(26, 26, 26);
    const gridRgba = rgba(42, 42, 42);
    const lineRgba = rgba(68, 68, 68);

    /** Legend overlaid inside the plot area; reposition via Move legend + arrow keys (saved per chart). */
    const buildInPlotLegendLayout = () => {
      const saved = legendLayoutRef.current[chart.id] ?? chart.legendPosition;
      const legend = {
        orientation: 'v',
        xref: 'paper',
        yref: 'paper',
        x: saved?.x ?? 0.99,
        y: saved?.y ?? 0.99,
        xanchor: saved?.xanchor ?? 'right',
        yanchor: saved?.yanchor ?? 'top',
        font: { family: 'Arial, sans-serif', size: 11, color: '#e0e0e0' },
        bgcolor: rgba(0, 0, 0, 0.55 * o),
        bordercolor: lineRgba,
        borderwidth: 1,
        traceorder: 'normal',
      };
      const titleText = chart.legendTitle?.trim();
      if (titleText) {
        legend.title = {
          text: titleText,
          font: { family: 'Arial, sans-serif', size: 12, color: '#e0e0e0' },
        };
      }
      return legend;
    };

    const baseLayout = {
      // When this string stays the same, Plotly keeps user zoom/pan across Plotly.react updates (e.g. new colors after opacity slider).
      uirevision: getPlotlyUiRevision(chart, data),
      paper_bgcolor: paperRgba,
      plot_bgcolor: plotRgba,
      
      // Title
      title: {
        text: chart.isMultiComponent ? chart.title : (chart.title || `${chart.componentName} - ${chart.chartType.toUpperCase()}`),
        font: {
          family: 'Arial, sans-serif',
          size: 16,
          color: '#e0e0e0',
          weight: 600
        },
        x: 0.5,
        xanchor: 'center'
      },
      
      // Margins
      margin: {
        l: 60,
        r: 40,
        t: 50,
        b: 60
      },
      
      // Legend
      legend: {
        font: {
          family: 'Arial, sans-serif',
          size: 11,
          color: '#999'
        },
        bgcolor: rgba(0, 0, 0, 0.35 * o),
        bordercolor: lineRgba,
        borderwidth: 1
      },
      
      // Hover label
      hoverlabel: {
        bgcolor: plotRgba,
        bordercolor: '#005E60',
        font: {
          family: 'Courier New, monospace',
          size: 12,
          color: '#e0e0e0'
        }
      },
      
      // Auto-size to fit container
      autosize: true
    };

    // Default to zoom mode; user can switch to select via toolbar
    const supportsSelection = chart.chartType === '2d' || chart.chartType === 'nd' || chart.chartType === 'stacked-nd' || (chart.isMultiComponent && chart.chartType === 'multi-line-chart');
    if (supportsSelection) {
      baseLayout.dragmode = 'zoom';
    }

    // Stacked nD layout – subplots with shared X, alternating backgrounds, Plotly legend (like nD)
    if (chart.chartType === 'stacked-nd' && chart.yColumns?.length) {
      const groups = groupColumnsBySplit(chart.yColumns, chart.splitBy || 'phase', chart.manualGroupBreaks);
      const n = groups.length;
      if (n === 0) return { ...baseLayout, xaxis: {}, yaxis: {} };

      const rowHeight = 1 / n;
      const groupBgColors = [rgba(0, 0, 0), rgba(26, 26, 26)];
      const axisStyle = {
        gridcolor: gridRgba,
        gridwidth: 1,
        showline: true,
        linecolor: lineRgba,
        linewidth: 2,
        tickfont: { family: 'Arial, sans-serif', size: 11, color: '#999' },
        zeroline: true,
        zerolinecolor: lineRgba,
        zerolinewidth: 2
      };

      const shapes = [];
      for (let i = 0; i < n; i++) {
        const top = 1 - i * rowHeight;
        const bottom = Math.max(0, 1 - (i + 1) * rowHeight);
        shapes.push({
          type: 'rect',
          xref: 'paper',
          yref: 'paper',
          x0: 0,
          y0: bottom,
          x1: 1,
          y1: top,
          fillcolor: groupBgColors[i % 2],
          line: { width: 0 },
          layer: 'below'
        });
      }

      const { xRangeProps, xLockProps } = resolveAxisProps(chart, chart.axisRange);

      const layout = {
        ...baseLayout,
        title: { ...baseLayout.title, text: chart.title || `${chart.componentName || ''} - Stacked nD` },
        showlegend: true,
        legend: buildInPlotLegendLayout(),
        margin: { l: 50, r: 40, t: 50, b: 50 },
        shapes: [...(baseLayout.shapes || []), ...shapes],
        xaxis: {
          title: { text: chart.xLabel ?? chart.xColumn, font: { family: 'Arial, sans-serif', size: 13, color: '#999', weight: 600 } },
          domain: [0, 1],
          anchor: n === 1 ? 'y' : `y${n}`,
          ...axisStyle,
          ...xRangeProps,
          ...xLockProps,
        }
      };

      for (let i = 0; i < n; i++) {
        const top = 1 - i * rowHeight;
        const bottom = Math.max(0, 1 - (i + 1) * rowHeight);
        const yKey = i === 0 ? 'yaxis' : `yaxis${i + 1}`;
        layout[yKey] = {
          title: { text: groups[i].key, font: { family: 'Arial, sans-serif', size: 12, color: '#00d4a8', weight: 600 } },
          domain: [bottom, top],
          anchor: 'x',
          ...axisStyle
        };
      }
      return withDangerY(layout);
    }

    // Multi-line 2D chart layout – X = time, Y = values (Y-axis title in margin, legend colors)
    if (chart.isMultiComponent && chart.chartType === 'multi-line-chart') {
      const eventShapes = generateEventMarkerShapes();
      const yLabelHTML = getMultiBarYAxisLabelHTML(chart);
      const { xRangeProps, yRangeProps, xLockProps, yLockProps } = resolveAxisProps(chart, chart.axisRange);
      return withDangerY({
        ...baseLayout,
        shapes: eventShapes,
        xaxis: {
          title: {
            text: chart.timeColumn || 'Time',
            font: { family: 'Arial, sans-serif', size: 14, color: '#00d4a8', weight: 600 }
          },
          gridcolor: gridRgba,
          gridwidth: 1,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: { family: 'Arial, sans-serif', size: 11, color: '#999' },
          zeroline: true,
          zerolinecolor: lineRgba,
          zerolinewidth: 2,
          ...xRangeProps,
          ...xLockProps
        },
        yaxis: {
          title: {
            text: yLabelHTML,
            font: { family: 'Arial, sans-serif', size: 13, weight: 600 }
          },
          gridcolor: gridRgba,
          gridwidth: 1,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: { family: 'Arial, sans-serif', size: 11, color: '#999' },
          zeroline: true,
          zerolinecolor: lineRgba,
          zerolinewidth: 2,
          ...yRangeProps,
          ...yLockProps
        },
        showlegend: true,
        legend: buildInPlotLegendLayout(),
        margin: { ...baseLayout.margin, b: 60 },
      });
    }

    // Multi-component bar chart layout (fixed Y range so bars animate, not scale; Y-axis label rotated 90°)
    if (chart.isMultiComponent && chart.chartType === 'multi-bar-chart') {
      const yRange = data && getMultiBarYRange(chart, data);
      const yLabel = getMultiBarYAxisLabel(chart);
      return withDangerY({
        ...baseLayout,
        annotations: [
          {
            text: yLabel,
            xref: 'paper',
            yref: 'paper',
            x: 0.06,
            y: 0.5,
            xanchor: 'center',
            yanchor: 'middle',
            textangle: -90,
            showarrow: false,
            font: { family: 'Arial, sans-serif', size: 14, color: '#00d4a8', weight: 600 }
          }
        ],
        xaxis: {
          title: {
            text: 'Components',
            font: {
              family: 'Arial, sans-serif',
              size: 14,
              color: '#00d4a8',
              weight: 600
            }
          },
          gridcolor: gridRgba,
          gridwidth: 1,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: {
            family: 'Arial, sans-serif',
            size: 11,
            color: '#999'
          }
        },
        yaxis: {
          title: { text: '' },
          gridcolor: gridRgba,
          gridwidth: 1,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: {
            family: 'Arial, sans-serif',
            size: 11,
            color: '#999'
          },
          zeroline: true,
          zerolinecolor: lineRgba,
          zerolinewidth: 2,
          ...(yRange ? { range: yRange } : {})
        },
        barmode: 'group', // Grouped bars
        showlegend: true,
        legend: buildInPlotLegendLayout(),
        margin: { ...baseLayout.margin, b: 60 },
        // Add annotations for component count
        annotations: [{
          text: `${chart.components.length} Components`,
          showarrow: false,
          xref: 'paper',
          yref: 'paper',
          x: 1,
          xanchor: 'right',
          y: 1.05,
          yanchor: 'bottom',
          font: {
            size: 11,
            color: '#666',
            family: 'Arial, sans-serif'
          }
        }]
      });
    }

    // Chart-specific layout
    if (chart.chartType === '2d' || chart.chartType === 'nd' || chart.chartType === 'bar') {
      const eventShapes = generateEventMarkerShapes();
      const { xRangeProps, yRangeProps, xLockProps, yLockProps } = resolveAxisProps(chart, chart.axisRange);
      
      return withDangerY({
        ...baseLayout,
        ...(chartHasMultiTraceLegend(chart)
          ? { showlegend: true, legend: buildInPlotLegendLayout() }
          : {}),
        xaxis: {
          title: {
            text: chart.xLabel ?? chart.xColumn,
            font: {
              family: 'Arial, sans-serif',
              size: 13,
              color: '#999',
              weight: 600
            }
          },
          gridcolor: gridRgba,
          gridwidth: 1,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: {
            family: 'Arial, sans-serif',
            size: 11,
            color: '#999'
          },
          zeroline: true,
          zerolinecolor: lineRgba,
          zerolinewidth: 2,
          ...xRangeProps,
          ...xLockProps
        },
        yaxis: {
          title: {
            text: chart.yLabel ?? (chart.chartType === 'nd' ? 'Value' : chart.yColumn),
            font: {
              family: 'Arial, sans-serif',
              size: 13,
              color: '#999',
              weight: 600
            }
          },
          gridcolor: gridRgba,
          gridwidth: 1,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: {
            family: 'Arial, sans-serif',
            size: 11,
            color: '#999'
          },
          zeroline: true,
          zerolinecolor: lineRgba,
          zerolinewidth: 2,
          ...yRangeProps,
          ...yLockProps
        },
        shapes: eventShapes // Add event marker shapes
      });
    } else if (chart.chartType === 'histogram') {
      return {
        ...baseLayout,
        xaxis: {
          title: {
            text: chart.yColumn,
            font: {
              family: 'Arial, sans-serif',
              size: 13,
              color: '#999',
              weight: 600
            }
          },
          gridcolor: gridRgba,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: {
            family: 'Arial, sans-serif',
            size: 11,
            color: '#999'
          }
        },
        yaxis: {
          title: {
            text: 'Count',
            font: {
              family: 'Arial, sans-serif',
              size: 13,
              color: '#999',
              weight: 600
            }
          },
          gridcolor: gridRgba,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: {
            family: 'Arial, sans-serif',
            size: 11,
            color: '#999'
          }
        }
      };
    } else if (chart.chartType === 'box') {
      return withDangerY({
        ...baseLayout,
        yaxis: {
          title: {
            text: chart.yColumn,
            font: {
              family: 'Arial, sans-serif',
              size: 13,
              color: '#999',
              weight: 600
            }
          },
          gridcolor: gridRgba,
          showline: true,
          linecolor: lineRgba,
          linewidth: 2,
          tickfont: {
            family: 'Arial, sans-serif',
            size: 11,
            color: '#999'
          }
        }
      });
    }

    return withDangerY(baseLayout);
  };

  /**
   * Plotly configuration for professional controls
   */
  const plotlyConfig = useMemo(() => {
    const o = clampChartPanelOpacity(panelOpacity);
    return {
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d'],
      modeBarButtonsToAdd: [],
      responsive: true,
      displaylogo: false,
      modeBarPosition: 'top',
      scrollZoom: true,
      modeBarStyle: {
        bgcolor: `rgba(0, 0, 0, ${0.5 * o})`,
        color: '#999',
        activecolor: '#005E60',
      },
    };
  }, [panelOpacity]);

  /**
   * Plotly transition config for smooth animations (multi-bar charts)
   */
  const plotlyTransition = {
    transition: {
      duration: 500,
      easing: 'cubic-in-out'
    },
    frame: {
      duration: 500,
      redraw: false
    }
  };

  /**
   * Handle Plotly box/lasso selection – extract row indices and sync across charts.
   * Attach native plotly_selected/plotly_selecting via onInitialized (more reliable than
   * react-plotly's onSelected/onSelecting which can fail to fire).
   */
  const attachSelectionListeners = (chartId, gd) => {
    const prev = selectionListenersByChart.get(chartId);
    if (prev?.handler && prev.gd) {
      try {
        prev.gd.removeListener('plotly_selected', prev.handler);
        prev.gd.removeListener('plotly_selecting', prev.handler);
      } catch (e) { /* ignore */ }
      selectionListenersByChart.delete(chartId);
    }
    if (!onSelectionChange) return;
    const handler = (event) => {
      if (!event?.points?.length) return;
      const indices = new Set();
      event.points.forEach((p) => {
        const trace = p.data;
        const cd = trace?.customdata;
        if (!cd) return;
        const pn = p.pointNumber ?? p.pointIndex;
        if (typeof pn !== 'number') return;
        const idx = Array.isArray(cd) ? cd[pn] : cd;
        if (typeof idx === 'number') indices.add(idx);
      });
      if (indices.size > 0) onSelectionChange(indices);
    };
    gd.on('plotly_selected', handler);
    gd.on('plotly_selecting', handler);
    selectionListenersByChart.set(chartId, { gd, handler });
  };

  /**
   * Start resizing - capture values in ref so they're available immediately
   * (avoids "duck down" where stale state caused panel to jump on first move)
   * Can be triggered from the resize handle or the header bar (except buttons/inputs).
   */
  const handleResizeStart = (e) => {
    if (isCollapsed) return;
    if (e.target.closest('button, select, input, label')) return;
    e.preventDefault();
    resizeStartRef.current = { y: e.clientY, height };
    setIsResizing(true);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  /**
   * Handle resize move - uses ref values so no jump on first move
   */
  const handleResizeMove = (e) => {
    const { y, height: startHeight } = resizeStartRef.current;
    const deltaY = y - e.clientY; // Inverted because panel grows upward
    const newHeight = Math.max(
      CHART_PANEL_MIN_HEIGHT,
      Math.min(getChartPanelMaxHeightPx(), startHeight + deltaY),
    );
    onHeightChange(newHeight);
  };

  /**
   * End resizing
   */
  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMoveSide = (e) => {
    const { x, width: startWidth } = resizeStartRef.current;
    const delta = x - e.clientX;
    const newWidth = Math.max(
      CHART_PANEL_MIN_SIDE_WIDTH,
      Math.min(getChartPanelMaxSideWidthPx(), startWidth + delta),
    );
    onSidePanelWidthChange?.(newWidth);
  };

  const handleResizeEndSide = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMoveSide);
    document.removeEventListener('mouseup', handleResizeEndSide);
  };

  const handleResizeStartSide = (e) => {
    if (isCollapsed) return;
    if (e.target.closest('button, select, input, label')) return;
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, width: sidePanelWidth };
    setIsResizing(true);
    document.addEventListener('mousemove', handleResizeMoveSide);
    document.addEventListener('mouseup', handleResizeEndSide);
  };

  const handleResizeMoveTop = (e) => {
    const { y, height: startHeight } = resizeStartRef.current;
    const deltaY = e.clientY - y;
    const newHeight = Math.max(
      CHART_PANEL_MIN_HEIGHT,
      Math.min(getChartPanelMaxHeightPx(), startHeight + deltaY),
    );
    onHeightChange(newHeight);
  };

  const handleResizeEndTop = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMoveTop);
    document.removeEventListener('mouseup', handleResizeEndTop);
  };

  const handleResizeStartTop = (e) => {
    if (isCollapsed) return;
    if (e.target.closest('button, select, input, label')) return;
    e.preventDefault();
    resizeStartRef.current = { y: e.clientY, height };
    setIsResizing(true);
    document.addEventListener('mousemove', handleResizeMoveTop);
    document.addEventListener('mouseup', handleResizeEndTop);
  };

  /**
   * Handle fullscreen toggle for a chart
   */
  const handleFullscreen = (chartId) => {
    const chartElement = document.getElementById(`chart-${chartId}`);
    if (!chartElement) return;

    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (chartElement.requestFullscreen) {
        chartElement.requestFullscreen();
      } else if (chartElement.webkitRequestFullscreen) {
        chartElement.webkitRequestFullscreen(); // Safari
      } else if (chartElement.msRequestFullscreen) {
        chartElement.msRequestFullscreen(); // IE11
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen(); // Safari
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen(); // IE11
      }
    }
  };

  if (!charts || charts.length === 0) {
    return null;
  }

  /** Two labeled drawers (chart1 / chart2) or four quadrants (conf3) · same chart map per bucket. */
  const hasLabeledDrawers = dualChartDrawers || quadChartDrawers;
  const drawerRowsConfig = !hasLabeledDrawers
    ? [
        {
          drawerKey: 'all',
          drawerLabel: '',
          units: buildDisplayUnitsFromStacks(charts, chartStacks),
        },
      ]
    : quadChartDrawers
      ? CHART_DRAWER_KEYS.map((drawerKey) => {
          const row = remapStacksPerDrawerRow(charts, chartStacks, drawerKey, false);
          return {
            drawerKey,
            drawerLabel: drawerKey,
            units: buildDisplayUnitsFromStacks(row.subset, row.stacks),
          };
        })
      : (() => {
          const row1 = remapStacksPerDrawerRow(charts, chartStacks, 'chart1', true);
          const row2 = remapStacksPerDrawerRow(charts, chartStacks, 'chart2', true);
          return [
            {
              drawerKey: 'chart1',
              drawerLabel: 'chart1',
              units: buildDisplayUnitsFromStacks(row1.subset, row1.stacks),
            },
            {
              drawerKey: 'chart2',
              drawerLabel: 'chart2',
              units: buildDisplayUnitsFromStacks(row2.subset, row2.stacks),
            },
          ];
        })();

  const toggleChartSelection = (chartId) => {
    setSelectedChartIds(prev => {
      const next = new Set(prev);
      if (next.has(chartId)) next.delete(chartId);
      else next.add(chartId);
      return next;
    });
  };

  const handlePanelMouseDown = (e) => {
    if (
      onFocus &&
      !e.target.closest('button, select, input, a, [role="button"], .chart-panel-aot')
    ) {
      onFocus(e);
    }
  };

  const shellA = clampChartPanelOpacity(panelOpacity);

  const requestDrawerMove = (chart, targetDrawer, e) => {
    e.stopPropagation();
    if (!onMoveChartDrawer || flyingChartId) return;

    const fromDrawer = getChartUiDrawer(chart);
    if (fromDrawer === targetDrawer) return;

    const sourceEl = document.getElementById(`chart-${chart.id}`);
    const targetContent = panelRootRef.current?.querySelector(
      `[data-chart-drawer="${targetDrawer}"] .chart-panel-content`,
    );

    const commit = () => onMoveChartDrawer(chart.id, targetDrawer);

    if (!sourceEl || !targetContent) {
      commit();
      return;
    }

    setFlyingChartId(chart.id);
    flyChartToDrawer({
      sourceEl,
      targetDrawerContentEl: targetContent,
      chartTitle: chart.isMultiComponent
        ? chart.title
        : chart.title || chart.componentName || 'Chart',
      onComplete: () => {
        setFlyingChartId(null);
        commit();
      },
    });
  };

  const layoutClass =
    layoutMode === 'sideRight'
      ? `chart-panel--layout-side-right${
          quadChartDrawers ? ' chart-panel--layout-side-right-quad' : ''
        }`
      : layoutMode === 'top'
        ? 'chart-panel--layout-top'
        : 'chart-panel--layout-bottom';

  const drawerEmptyHint = (drawerKey) => {
    if (quadChartDrawers) {
      if (drawerKey === 'chart1') return 'No charts';
      return `Empty — click “${drawerShortLabel(drawerKey)}” on a chart in another quadrant`;
    }
    return drawerKey === 'chart2'
      ? 'Empty — click “▸ chart2” on a chart in chart1'
      : 'No charts';
  };

  const renderChartDrawerShiftButtons = (chart) => {
    if (!hasLabeledDrawers || typeof onMoveChartDrawer !== 'function') return null;
    const currentDrawer = getChartUiDrawer(chart);

    if (quadChartDrawers) {
      return (
        <div className="chart-drawer-shift-group">
          {CHART_DRAWER_KEYS.filter((target) => target !== currentDrawer).map((target) => (
            <button
              key={target}
              type="button"
              className="chart-drawer-shift-btn chart-drawer-shift-btn--quad"
              disabled={flyingChartId === chart.id}
              onClick={(e) => requestDrawerMove(chart, target, e)}
              title={`Fly chart to ${target}`}
            >
              {drawerShortLabel(target)}
            </button>
          ))}
        </div>
      );
    }

    const target = currentDrawer === 'chart2' ? 'chart1' : 'chart2';
    return (
      <button
        type="button"
        className="chart-drawer-shift-btn"
        disabled={flyingChartId === chart.id}
        onClick={(e) => requestDrawerMove(chart, target, e)}
        title={
          currentDrawer === 'chart2'
            ? 'Fly chart to chart1 drawer'
            : 'Fly chart to chart2 drawer'
        }
      >
        {currentDrawer === 'chart2' ? 'chart1 ◂' : '▸ chart2'}
      </button>
    );
  };

  const shellPositionStyle =
    layoutMode === 'sideRight'
      ? {
          top: `${headerBottomPx}px`,
          bottom: 0,
          left: 'auto',
          right: typeof insetRight === 'number' ? `${insetRight}px` : undefined,
          width: isCollapsed ? `${CHART_SIDE_COLLAPSED_PX}px` : `${sidePanelWidth}px`,
          height: 'auto',
        }
      : layoutMode === 'top'
        ? {
            top: `${headerBottomPx}px`,
            bottom: 'auto',
            left: typeof insetLeft === 'number' ? `${insetLeft}px` : undefined,
            right: typeof insetRight === 'number' ? `${insetRight}px` : undefined,
            height: isCollapsed ? 'auto' : `${height}px`,
            minHeight: isCollapsed ? CHART_COLLAPSED_MIN_PX : undefined,
          }
        : {
            left: typeof insetLeft === 'number' ? `${insetLeft}px` : undefined,
            right: typeof insetRight === 'number' ? `${insetRight}px` : undefined,
            height: isCollapsed ? 'auto' : `${height}px`,
            minHeight: isCollapsed ? CHART_BOTTOM_RAIL_COLLAPSED_H_PX : undefined,
          };

  return (
    <div
      ref={panelRootRef}
      className={`chart-panel ${layoutClass} ${isResizing ? 'resizing' : ''} chart-panel--on-top-canvas${
        isCollapsed ? ' chart-panel--collapsed' : ''
      }`}
      style={{
        ...shellPositionStyle,
        zIndex: CHART_PANEL_Z_STACK,
        '--chart-panel-shell-a': String(shellA),
        '--chart-panel-card-a': String(shellA),
        '--chart-panel-inset-left': typeof insetLeft === 'number' ? `${insetLeft}px` : '0px',
        '--chart-panel-inset-right': typeof insetRight === 'number' ? `${insetRight}px` : '0px',
      }}
      onMouseDown={handlePanelMouseDown}
    >
      {!isCollapsed && layoutMode === 'bottom' && (
        <div
          className="chart-panel-resize-handle"
          onMouseDown={handleResizeStart}
        >
          <div className="chart-panel-resize-bar"></div>
        </div>
      )}
      {!isCollapsed && layoutMode === 'top' && (
        <div
          className="chart-panel-resize-handle chart-panel-resize-handle--bottom"
          onMouseDown={handleResizeStartTop}
        >
          <div className="chart-panel-resize-bar" />
        </div>
      )}

      {isCollapsed ? (
        layoutMode === 'bottom' ? (
          <button
            type="button"
            className="chart-panel-rail-hinge chart-panel-rail-hinge--horizontal chart-panel-rail-hinge--expand"
            onClick={(e) => {
              e.stopPropagation();
              toggleChartCollapse();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Show charts"
            aria-label="Expand chart panel"
          >
            <span className="chart-panel-rail-hinge__chev" aria-hidden>
              ▲
            </span>
            <span className="chart-panel-rail-hinge__hlabel">Charts</span>
          </button>
        ) : layoutMode === 'sideRight' ? (
          <button
            type="button"
            className="chart-panel-rail-hinge chart-panel-rail-hinge--vertical chart-panel-rail-hinge--expand"
            onClick={(e) => {
              e.stopPropagation();
              toggleChartCollapse();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Show charts"
            aria-label="Expand chart panel"
          >
            <span className="chart-panel-rail-hinge__chev" aria-hidden>
              »
            </span>
            <span className="chart-panel-rail-hinge__vlabel">Charts</span>
          </button>
        ) : (
          <div
            className="chart-panel-collapsed-stack"
            onMouseDown={(e) => {
              if (e.target.closest('button:not(.chart-panel-close)')) return;
              onFocus?.(e);
            }}
          >
            <button
              type="button"
              className="chart-panel-hinge chart-panel-hinge--expand"
              onClick={(e) => {
                e.stopPropagation();
                toggleChartCollapse();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Click to show chart tray"
              aria-label="Expand chart tray"
            >
              <span className="chart-panel-hinge__glyph" aria-hidden>
                ▲
              </span>
              <span className="chart-panel-hinge__label">Click or tap to expand charts</span>
            </button>
            <div className="chart-panel-header chart-panel-header--collapsed">
              <div className="chart-panel-header-left">
                <div className="chart-panel-title">📊 Charts ({charts.length})</div>
              </div>
              <div className="chart-panel-header-right">
                <button
                  type="button"
                  className="chart-panel-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                  }}
                  title="Close chart panel"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <>
          {layoutMode === 'sideRight' && (
            <button
              type="button"
              className="chart-panel-rail-hinge chart-panel-rail-hinge--vertical"
              onClick={(e) => {
                e.stopPropagation();
                toggleChartCollapse();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Hide charts"
              aria-label="Collapse chart panel"
            >
              <span className="chart-panel-rail-hinge__chev" aria-hidden>
                «
              </span>
              <span className="chart-panel-rail-hinge__vlabel">Charts</span>
            </button>
          )}
          <div
            className={
              layoutMode === 'sideRight' ? 'chart-panel-side-inner' : 'chart-panel-expand-body'
            }
          >
            {layoutMode === 'sideRight' && (
              <div
                className="chart-panel-resize-handle chart-panel-resize-handle--left"
                onMouseDown={handleResizeStartSide}
              >
                <div className="chart-panel-resize-bar" />
              </div>
            )}
            {layoutMode === 'bottom' && (
              <button
                type="button"
                className="chart-panel-rail-hinge chart-panel-rail-hinge--horizontal"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleChartCollapse();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Hide charts"
                aria-label="Collapse chart panel"
              >
                <span className="chart-panel-rail-hinge__chev" aria-hidden>
                  ▼
                </span>
                <span className="chart-panel-rail-hinge__hlabel">Charts</span>
              </button>
            )}
            {layoutMode === 'top' && (
              <button
                type="button"
                className="chart-panel-hinge chart-panel-hinge--collapse"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleChartCollapse();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Click to minimize chart tray"
                aria-label="Minimize chart tray"
              >
                <span className="chart-panel-hinge__glyph" aria-hidden>
                  ▼
                </span>
                <span className="chart-panel-hinge__label">Click or tap to minimize</span>
              </button>
            )}
      {/* Panel Header — bottom layout: drag header to resize height; side/top use edge handles only */}
      <div
        className="chart-panel-header"
        onMouseDown={layoutMode === 'bottom' ? handleResizeStart : undefined}
      >
        <div className="chart-panel-header-left">
          <div className="chart-panel-title">
            📊 Charts ({charts.length})
            {typeof simulationMetadata?.loadedRowCount === 'number' &&
              simulationMetadata.rowCount > simulationMetadata.loadedRowCount && (
                <span
                  className="chart-panel-paging-hint"
                  title="Initial load is a small window; more rows load as the playhead moves or you expand the time range. Use Load more to fetch the next chunk."
                >
                  · Rows in memory: {simulationMetadata.loadedRowCount} / {simulationMetadata.rowCount}
                  {onRequestMoreRows && (
                    <button
                      type="button"
                      className="chart-panel-paging-load-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestMoreRows();
                      }}
                    >
                      Load more
                    </button>
                  )}
                </span>
              )}
          </div>
          {/* One button per named preset; activating rewrites root + current_configuration on disk and reloads this scenario. */}
          {namedSimulationConfigs.length > 0 && onActivateNamedSimulationConfig && (
            <div className="chart-panel-named-configs" onMouseDown={(e) => e.stopPropagation()}>
              {namedSimulationConfigs.map((presetName) => {
                const isActivePreset = activeNamedSimulationConfig === presetName;
                const isDraftHint =
                  !isActivePreset &&
                  lastNamedPresetForUi === presetName &&
                  lastNamedPresetForUi != null;
                return (
                <div key={presetName} className="chart-panel-named-config-row">
                  <button
                    type="button"
                    className={`chart-panel-named-config-btn${
                      isActivePreset ? ' chart-panel-named-config-btn-active' : ''
                    }${isDraftHint ? ' chart-panel-named-config-btn-draft' : ''}`}
                    onClick={() => onActivateNamedSimulationConfig(presetName)}
                    title={
                      isActivePreset
                        ? `Loaded snapshot “${presetName}” (matches file)`
                        : isDraftHint
                          ? `Your chart draft diverged from “${presetName}”; click to reload that preset`
                          : `Load preset “${presetName}” from this scenario’s .sim.json`
                    }
                  >
                    {presetName}
                  </button>
                  {onCopyNamedPresetLink && (
                    <button
                      type="button"
                      className="chart-panel-named-config-copy-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyNamedPresetLink(presetName);
                      }}
                      title={`Copy a link that opens this design, scenario, and preset “${presetName}” (e.g. on another computer)`}
                    >
                      Copy link
                    </button>
                  )}
                  {onHideChartPanelNamedConfig && (
                    <button
                      type="button"
                      className="chart-panel-named-config-hide"
                      aria-label={`Hide ${presetName} from charts bar`}
                      title={`Hide “${presetName}” from this bar (preset stays on disk; quick scenarios and links still work)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onHideChartPanelNamedConfig(presetName);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="chart-panel-header-right">
          <div className="chart-panel-header-actions">
            {selectedChartIds.size > 0 && onStackCharts && (
              <>
                <button
                  className="chart-panel-stack-btn"
                  onClick={() => { onStackCharts(selectedChartIds); setSelectedChartIds(new Set()); }}
                  disabled={selectedChartIds.size < 2}
                  title="Stack selected charts vertically"
                >
                  Stack
                </button>
                <button
                  className="chart-panel-unstack-btn"
                  onClick={() => { onUnstackCharts?.(selectedChartIds); setSelectedChartIds(new Set()); }}
                  title="Unstack selected charts"
                >
                  Unstack
                </button>
              </>
            )}
            {selectedRowIndices && selectedRowIndices.size > 0 && (
              <button
                className="chart-panel-clear-selection"
                onClick={() => onSelectionChange?.(null)}
                title="Clear selection"
              >
                Clear selection
              </button>
            )}
            <label className="chart-panel-sample-label">
              Sample:
              <select
                className="chart-panel-sample-select"
                value={globalSampleStep}
                onChange={(e) => onGlobalSampleStepChange?.(Number(e.target.value))}
                title="Plot every Nth data point (all charts)"
              >
                {SAMPLE_OPTIONS.map((n) => (
                  <option key={n} value={n}>1 in {n}</option>
                ))}
              </select>
            </label>
            <span className="chart-panel-size-arrow-gap" />
            <div
              className="chart-panel-opacity-wrap"
              onMouseDown={(e) => e.stopPropagation()}
              title="Tray & plot opacity — 0% fully transparent; sharp (no blur)"
            >
              <span className="chart-panel-opacity-label">Pane</span>
              <input
                type="range"
                className="chart-panel-opacity-slider"
                min={0}
                max={100}
                value={Math.round(shellA * 100)}
                onChange={(e) =>
                  onPanelOpacityChange?.(Number(e.target.value) / 100)
                }
                aria-label="Chart panel opacity"
              />
            </div>
            {/* Step chart size by 50px — width in bottom/top tray, height in conf 2 side strip. */}
            <div
              className="chart-panel-width-controls"
              title={
                isVerticalChartLayout
                  ? 'Chart height — ◀ shorter, ▶ taller (all cards in the strip)'
                  : 'Chart column width — ◀ narrower, ▶ wider (all cards in the tray)'
              }
            >
              <span className="chart-panel-width-label">
                {isVerticalChartLayout ? 'Length' : 'Width'}
              </span>
              <button
                type="button"
                className="chart-panel-size-arrow"
                onClick={() =>
                  onChartCardWidthChange?.(
                    Math.min(
                      chartSizeStateMax,
                      Math.max(chartSizeStateMin, chartCardWidth - 50),
                    ),
                  )
                }
                disabled={chartCardWidth <= chartSizeStateMin}
                aria-label={
                  isVerticalChartLayout ? 'Shorter chart windows' : 'Narrower chart windows'
                }
              >
                ◀
              </button>
              <button
                type="button"
                className="chart-panel-size-arrow"
                onClick={() =>
                  onChartCardWidthChange?.(
                    Math.min(
                      chartSizeStateMax,
                      Math.max(chartSizeStateMin, chartCardWidth + 50),
                    ),
                  )
                }
                disabled={chartCardWidth >= chartSizeStateMax}
                aria-label={
                  isVerticalChartLayout ? 'Taller chart windows' : 'Wider chart windows'
                }
              >
                ▶
              </button>
              {quadChartDrawers && (
                <>
                  <span
                    className="chart-panel-size-arrow-gap chart-panel-size-arrow-gap--tight"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className="chart-panel-size-arrow"
                    onClick={() =>
                      setQuadBottomRowShare((prev) =>
                        Math.min(
                          QUAD_BOTTOM_ROW_SHARE_MAX,
                          prev + QUAD_BOTTOM_ROW_SHARE_STEP,
                        ),
                      )
                    }
                    disabled={quadBottomRowShare >= QUAD_BOTTOM_ROW_SHARE_MAX}
                    aria-label="Taller chart3 and chart4 row"
                    title="Taller chart3 + chart4 row"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="chart-panel-size-arrow"
                    onClick={() =>
                      setQuadBottomRowShare((prev) =>
                        Math.max(
                          QUAD_BOTTOM_ROW_SHARE_MIN,
                          prev - QUAD_BOTTOM_ROW_SHARE_STEP,
                        ),
                      )
                    }
                    disabled={quadBottomRowShare <= QUAD_BOTTOM_ROW_SHARE_MIN}
                    aria-label="Shorter chart3 and chart4 row"
                    title="Shorter chart3 + chart4 row"
                  >
                    ▼
                  </button>
                </>
              )}
            </div>
          </div>
          <button className="chart-panel-close" onClick={onClose} title="Close Chart Panel">
            ×
          </button>
        </div>
      </div>

      {/* Each chart sets its own --chart-* vars (own width or top-bar default). */}
      {/* Dual mode: chart1 + chart2 side-by-side (conf 1–2) or stacked (conf 4).
          Single strip: wrapper uses display:contents so layout is unchanged vs one merged row */}
      <div
        className={
          hasLabeledDrawers
            ? `chart-panel-drawers-row${
                quadChartDrawers
                  ? ' chart-panel-drawers-row--quad-grid'
                  : dualChartDrawersStacked
                    ? ' chart-panel-drawers-row--stacked'
                    : ''
              }`
            : undefined
        }
        style={
          !hasLabeledDrawers
            ? { display: 'contents' }
            : quadGridRowStyle
        }
      >
      {drawerRowsConfig.map(({ drawerKey, drawerLabel, units: drawerUnits }) => (
        <div
          key={drawerKey}
          className={hasLabeledDrawers ? 'chart-panel-drawer-slot' : undefined}
          style={!hasLabeledDrawers ? { display: 'contents' } : undefined}
          {...(hasLabeledDrawers ? { 'data-chart-drawer': drawerKey } : {})}
        >
          {hasLabeledDrawers ? (
            <div className="chart-panel-drawer-label">{drawerLabel}</div>
          ) : null}
          <div
            className={
              hasLabeledDrawers
                ? 'chart-panel-content chart-panel-content--dual-drawer'
                : 'chart-panel-content'
            }
          >
            {hasLabeledDrawers && drawerUnits.length === 0 ? (
              <div className="chart-panel-drawer-empty-hint">
                {drawerEmptyHint(drawerKey)}
              </div>
            ) : drawerUnits.map((unit) => (
          unit.type === 'stack' ? (
            <div key={`stack-${unit.charts.map(c => c.id).join('-')}`} className="chart-panel-stack">
              {unit.charts.map((chart) => {
                const isHighlighted = selectedComponentId === chart.componentId;
                const isSelected = selectedChartIds.has(chart.id);
                return (
                  <div 
                    key={chart.id} 
                    id={`chart-${chart.id}`} 
                    className={`chart-panel-chart chart-in-stack ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                    style={cardSizeCssVars(chart)}
                  >
                    <div className="chart-panel-chart-header">
                      <input
                        type="checkbox"
                        className="chart-panel-chart-checkbox"
                        checked={isSelected}
                        onChange={() => toggleChartSelection(chart.id)}
                        onClick={(e) => e.stopPropagation()}
                        title="Select for stack/unstack"
                      />
                      <div className="chart-panel-chart-title">
                <span className="chart-panel-chart-icon">
                  {chart.isMultiComponent && (chart.chartType === 'multi-line-chart' ? '📈' : '📊')}
                  {!chart.isMultiComponent && chart.chartType === '2d' && '📈'}
                  {!chart.isMultiComponent && chart.chartType === 'nd' && '📉'}
                  {!chart.isMultiComponent && chart.chartType === 'stacked-nd' && '📊'}
                  {!chart.isMultiComponent && chart.chartType === 'histogram' && '📊'}
                  {!chart.isMultiComponent && chart.chartType === 'pie' && '🥧'}
                  {!chart.isMultiComponent && chart.chartType === 'bar' && '📊'}
                  {!chart.isMultiComponent && chart.chartType === '3d' && '🗻'}
                  {!chart.isMultiComponent && chart.chartType === 'heatmap' && '🔥'}
                  {!chart.isMultiComponent && chart.chartType === 'box' && '📦'}
                </span>
                <span className="chart-panel-chart-name">
                  {chart.isMultiComponent ? chart.title : (chart.title || chart.componentName)}
                </span>
                {onUpdateChart && (
                  <button
                    className="chart-label-edit-btn"
                    onClick={(e) => openLabelEditor(chart, e)}
                    title="Edit chart: titles, colors, rigid/progressive traces"
                  >✎</button>
                )}
                {onUpdateChart && (
                  <button
                    className={`chart-label-edit-btn chart-axis-range-btn${chart.axisRange ? ' chart-axis-range-btn--active' : ''}`}
                    onClick={(e) => openAxisRangeEditor(chart, e)}
                    title="Axis ranges: locked axis uses min/max for Home; unlocked axis auto-fits to data"
                  >⊟</button>
                )}
                {renderLegendMoveButton(chart)}
              </div>
              {editingLabels?.chartId === chart.id && renderLabelEditorForm()}
              {editingAxisRange?.chartId === chart.id && renderAxisRangeForm(chart)}
              <select
                className="chart-panel-chart-sample"
                value={getSampleStep(chart.id)}
                onChange={(e) => onPerChartSampleStepChange?.(chart.id, Number(e.target.value))}
                title="Plot every Nth point (this chart)"
              >
                {SAMPLE_OPTIONS.map((n) => (
                  <option key={n} value={n}>1 in {n}</option>
                ))}
              </select>
              {renderChartDrawerShiftButtons(chart)}
              <button 
                className="chart-panel-chart-close"
                onClick={() => onRemoveChart(chart.id)}
                title="Remove Chart"
              >
                ×
              </button>
            </div>
            <div className="chart-panel-chart-body">
              {renderLegendMoveHint(chart)}
              {/* Fullscreen Button */}
              <button
                className="chart-panel-fullscreen-btn"
                onClick={() => handleFullscreen(chart.id)}
                title="Fullscreen (F)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                </svg>
              </button>

              {/* Loading State (only when fetching CSV, not when using simulationData) */}
              {!simulationData?.length && loadingCharts[chart.id] && (
                <div className="chart-panel-chart-loading">
                  <div className="chart-panel-spinner"></div>
                  <div>Loading chart data...</div>
                </div>
              )}

              {/* Error State (fetch failed when not using simulationData) */}
              {!simulationData?.length && !loadingCharts[chart.id] && chartData[chart.id] === null && (
                <div className="chart-panel-chart-error">
                  <div className="chart-panel-error-icon">⚠️</div>
                  <div>Failed to load chart data</div>
                </div>
              )}

              {/* Render Plotly Chart */}
              {!loadingCharts[chart.id] && chartDataReadyToPlot(chart) && (() => {
                const data = getChartData(chart);
                const dataLayout = dataForPlotlyLayout(chart);
                const plotlyData = bumpPlotlyFonts(generatePlotlyData(chart, data), fontPxDelta);
                const layout = bumpPlotlyFonts(generatePlotlyLayout(chart, dataLayout), fontPxDelta);
                const supportsSelection = chart.chartType === '2d' || chart.chartType === 'nd' || chart.chartType === 'stacked-nd' || (chart.isMultiComponent && chart.chartType === 'multi-line-chart');
                return (
                  <>
                  {renderDangerYThresholdAlert(chart)}
                  <Plot
                    data={plotlyData}
                    layout={layout}
                    config={plotlyConfig}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                    onRelayout={(rd) => handlePlotlyRelayout(chart, rd)}
                    {...(chart.isMultiComponent && chart.chartType === 'multi-bar-chart' ? plotlyTransition : {})}
                    onInitialized={(fig, gd) => attachPlotlyChartListeners(chart, gd)}
                    onUpdate={(fig, gd) => {
                      plotlyGdByChartRef.current[chart.id] = gd;
                      if (chartHasMultiTraceLegend(chart)) {
                        syncLegendMoveOutline(gd, legendMoveChartIdRef.current === chart.id);
                      }
                    }}
                  />
                  </>
                );
              })()}

              {/* Empty State */}
              {!loadingCharts[chart.id] && !chartDataReadyToPlot(chart) && (
                <div className="chart-panel-chart-empty">
                  <div className="chart-panel-empty-icon">📊</div>
                  <div>No data available</div>
                </div>
              )}
            </div>
            {chartResizeEdge(chart)}
          </div>
                );
              })}
            </div>
          ) : (
            (() => {
              const chart = unit.charts[0];
              const isHighlighted = selectedComponentId === chart.componentId;
              const isSelected = selectedChartIds.has(chart.id);
              return (
                <div
                  key={chart.id}
                  id={`chart-${chart.id}`}
                  className={`chart-panel-chart ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                  style={cardSizeCssVars(chart)}
                >
                  <div className="chart-panel-chart-header">
                    <input
                      type="checkbox"
                      className="chart-panel-chart-checkbox"
                      checked={isSelected}
                      onChange={() => toggleChartSelection(chart.id)}
                      onClick={(e) => e.stopPropagation()}
                      title="Select for stack/unstack"
                    />
                    <div className="chart-panel-chart-title">
                      <span className="chart-panel-chart-icon">
                        {chart.isMultiComponent && (chart.chartType === 'multi-line-chart' ? '📈' : '📊')}
                        {!chart.isMultiComponent && chart.chartType === '2d' && '📈'}
                        {!chart.isMultiComponent && chart.chartType === 'nd' && '📉'}
                        {!chart.isMultiComponent && chart.chartType === 'histogram' && '📊'}
                        {!chart.isMultiComponent && chart.chartType === 'pie' && '🥧'}
                        {!chart.isMultiComponent && chart.chartType === 'bar' && '📊'}
                        {!chart.isMultiComponent && chart.chartType === '3d' && '🗻'}
                        {!chart.isMultiComponent && chart.chartType === 'heatmap' && '🔥'}
                        {!chart.isMultiComponent && chart.chartType === 'box' && '📦'}
                      </span>
                      <span className="chart-panel-chart-name">
                        {chart.isMultiComponent ? chart.title : (chart.title || chart.componentName)}
                      </span>
                      {onUpdateChart && (
                        <button
                          className="chart-label-edit-btn"
                          onClick={(e) => openLabelEditor(chart, e)}
                          title="Edit chart: titles, colors, rigid/progressive traces"
                        >✎</button>
                      )}
                      {onUpdateChart && (
                        <button
                          className={`chart-label-edit-btn chart-axis-range-btn${chart.axisRange ? ' chart-axis-range-btn--active' : ''}`}
                          onClick={(e) => openAxisRangeEditor(chart, e)}
                          title="Axis ranges: locked axis uses min/max for Home; unlocked axis auto-fits to data"
                        >⊟</button>
                      )}
                      {renderLegendMoveButton(chart)}
                    </div>
                    {editingLabels?.chartId === chart.id && renderLabelEditorForm()}
                    {editingAxisRange?.chartId === chart.id && renderAxisRangeForm(chart)}
                    <select
                      className="chart-panel-chart-sample"
                      value={getSampleStep(chart.id)}
                      onChange={(e) => onPerChartSampleStepChange?.(chart.id, Number(e.target.value))}
                      title="Plot every Nth point (this chart)"
                    >
                      {SAMPLE_OPTIONS.map((n) => (
                        <option key={n} value={n}>1 in {n}</option>
                      ))}
                    </select>
                    {renderChartDrawerShiftButtons(chart)}
                    <button className="chart-panel-chart-close" onClick={() => onRemoveChart(chart.id)} title="Remove Chart">×</button>
                  </div>
                  <div className="chart-panel-chart-body">
                    {renderLegendMoveHint(chart)}
                    <button className="chart-panel-fullscreen-btn" onClick={() => handleFullscreen(chart.id)} title="Fullscreen (F)">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                      </svg>
                    </button>
                    {!simulationData?.length && loadingCharts[chart.id] && (
                      <div className="chart-panel-chart-loading"><div className="chart-panel-spinner"></div><div>Loading chart data...</div></div>
                    )}
                    {!simulationData?.length && !loadingCharts[chart.id] && chartData[chart.id] === null && (
                      <div className="chart-panel-chart-error"><div className="chart-panel-error-icon">⚠️</div><div>Failed to load chart data</div></div>
                    )}
                    {!loadingCharts[chart.id] && chartDataReadyToPlot(chart) && (() => {
                      const data = getChartData(chart);
                      const dataLayout = dataForPlotlyLayout(chart);
                      const plotlyData = bumpPlotlyFonts(generatePlotlyData(chart, data), fontPxDelta);
                      const layout = bumpPlotlyFonts(generatePlotlyLayout(chart, dataLayout), fontPxDelta);
                      const supportsSelection = chart.chartType === '2d' || chart.chartType === 'nd' || chart.chartType === 'stacked-nd' || (chart.isMultiComponent && chart.chartType === 'multi-line-chart');
                      return (
                        <>
                        {renderDangerYThresholdAlert(chart)}
                        <Plot data={plotlyData} layout={layout} config={plotlyConfig} style={{ width: '100%', height: '100%' }} useResizeHandler={true}
                          onRelayout={(rd) => handlePlotlyRelayout(chart, rd)}
                          {...(chart.isMultiComponent && chart.chartType === 'multi-bar-chart' ? plotlyTransition : {})}
                          onInitialized={(fig, gd) => attachPlotlyChartListeners(chart, gd)}
                          onUpdate={(fig, gd) => {
                            plotlyGdByChartRef.current[chart.id] = gd;
                            if (chartHasMultiTraceLegend(chart)) {
                              syncLegendMoveOutline(gd, legendMoveChartIdRef.current === chart.id);
                            }
                          }}
                        />
                        </>
                      );
                    })()}
                    {!loadingCharts[chart.id] && !chartDataReadyToPlot(chart) && (
                      <div className="chart-panel-chart-empty"><div className="chart-panel-empty-icon">📊</div><div>No data available</div></div>
                    )}
                  </div>
                  {chartResizeEdge(chart)}
                </div>
              );
            })()
          )
        ))}
          </div>
        </div>
      ))}
      </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChartPanel;
