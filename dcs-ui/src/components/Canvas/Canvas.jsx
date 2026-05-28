import React, { useState, useRef, useEffect, useCallback, forwardRef, useMemo } from 'react';
import ChartContextMenu from '../ChartContextMenu/ChartContextMenu';
import MultiComponentContextMenu from '../MultiComponentContextMenu/MultiComponentContextMenu';
import MultiConnectionContextMenu from '../MultiConnectionContextMenu/MultiConnectionContextMenu';
import MultiComponentChartDialog from '../MultiComponentChartDialog/MultiComponentChartDialog';
import KeyboardShortcuts from './KeyboardShortcuts';
import CanvasBlock from './CanvasBlock';
import GasTurbine3DOverlays from './Schematics/GasTurbine3DOverlays';
import { getComponentVisualConfig } from '../../data/componentVisuals';
import { resolveConnectionRenderParams } from '../../utils/connectionLineStyle';
import { NO_PRESENCE_FORCED_IDS } from '../../utils/variableDrivenPresence';
import {
  clientToCanvasPoint,
  computeMarqueeSelection,
  normalizeCanvasRect,
} from '../../utils/canvasDesignClipboard';
import { markSelectionInteractionStart } from '../../utils/perfDebug';
import {
  getTieHiddenMemberIdSet,
  tieEffectiveDimensions,
  buildTieCollapseHorizontalShiftMap,
  getTieCollapsedStubSegments,
  isTieBreakerNetwork,
  isTieNetworkCollapsed,
  hasTieStubLinks,
} from '../../utils/tieBreakerNetwork';
import { useCanvasFontPxDelta } from '../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../utils/svgFontDelta';
import { getCanvasLabelFlags } from '../../utils/canvasLabelPolicy';
import { fittedLineAttrs } from './shapes/canvasSvgLabelHelpers';
import { getCanvasBlockTypeScale } from './shapes/canvasBlockUtils';
import './Canvas.css';

function sanitizeSvgGradientId(connId) {
  return String(connId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

const TIE_COLLAPSED_STUB_CONN = {
  style: {
    useAuto: false,
    color: '#7a8790',
    thickness: 4,
    animation: 'none',
  },
};
const tieCollapsedStubRenderResolved = resolveConnectionRenderParams(
  TIE_COLLAPSED_STUB_CONN,
  'breaker-hv-boxed',
  'tie-breaker-network',
  false,
);

/** macOS treats Control+primary-click as a context menu (same as right-click). */
function isMacLikePlatform() {
  if (typeof navigator === 'undefined') return false;
  const p = navigator.platform || '';
  const ua = typeof navigator.userAgent === 'string' ? navigator.userAgent : '';
  return /Mac|iPhone|iPod|iPad/i.test(p) || /Mac OS X/.test(ua);
}

function clampConn(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Manhattan routes on bounding boxes: lines start/end on face toward the other component,
 * never from geometric center inside the symbol.
 * ax,ay → bx,by are logical attachment anchors (after bus-aware adjustments).
 */
function orthogonalEdgeConnection(
  fromComp,
  toComp,
  fromW,
  fromH,
  toW,
  toH,
  ax,
  ay,
  bx,
  by,
  eps = 1,
) {
  const B0 = {
    x: fromComp.position.x,
    y: fromComp.position.y,
    w: fromW,
    h: fromH,
  };
  const B1 = {
    x: toComp.position.x,
    y: toComp.position.y,
    w: toW,
    h: toH,
  };

  const dx = bx - ax;
  const dy = by - ay;

  if (Math.abs(dx) < eps && Math.abs(dy) < eps) {
    return {
      segments: [[ax, ay, bx, by]],
      gradientLine: { x1: ax, y1: ay, x2: bx, y2: by },
    };
  }

  if (Math.abs(dx) < eps) {
    const y0 = dy > 0 ? B0.y + B0.h : B0.y;
    const y1 = dy > 0 ? B1.y : B1.y + B1.h;
    const xCol = clampConn(ax, B0.x + 0.5, B0.x + B0.w - 0.5);
    const seg = [xCol, y0, xCol, y1];
    return {
      segments: [seg],
      gradientLine: { x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3] },
    };
  }

  if (Math.abs(dy) < eps) {
    const yTrunk = clampConn(ay, B0.y + 0.5, B0.y + B0.h - 0.5);
    const x0 = dx > 0 ? B0.x + B0.w : B0.x;
    const x1 = dx > 0 ? B1.x : B1.x + B1.w;
    const seg = [x0, yTrunk, x1, yTrunk];
    return {
      segments: [seg],
      gradientLine: { x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3] },
    };
  }

  const horizFirst = Math.abs(dx) >= Math.abs(dy);

  if (horizFirst) {
    const yTrunk = clampConn(ay, B0.y + 0.5, B0.y + B0.h - 0.5);
    const xOut = dx > 0 ? B0.x + B0.w : B0.x;
    const xCol = clampConn(bx, B1.x + 0.5, B1.x + B1.w - 0.5);

    if (Math.abs(by - yTrunk) < eps) {
      const xIn = dx > 0 ? B1.x : B1.x + B1.w;
      const seg = [xOut, yTrunk, xIn, yTrunk];
      return {
        segments: [seg],
        gradientLine: { x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3] },
      };
    }

    const yEnd = by > yTrunk ? B1.y : B1.y + B1.h;
    return {
      segments: [
        [xOut, yTrunk, xCol, yTrunk],
        [xCol, yTrunk, xCol, yEnd],
      ],
      gradientLine: null,
    };
  }

  const xTrunk = clampConn(ax, B0.x + 0.5, B0.x + B0.w - 0.5);
  const yOut = dy > 0 ? B0.y + B0.h : B0.y;
  const yCol = clampConn(by, B1.y + 0.5, B1.y + B1.h - 0.5);

  if (Math.abs(bx - xTrunk) < eps) {
    const yIn = dy > 0 ? B1.y : B1.y + B1.h;
    const seg = [xTrunk, yOut, xTrunk, yIn];
    return {
      segments: [seg],
      gradientLine: { x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3] },
    };
  }

  const xEnd = bx >= xTrunk ? B1.x : B1.x + B1.w;
  return {
    segments: [
      [xTrunk, yOut, xTrunk, yCol],
      [xTrunk, yCol, xEnd, yCol],
    ],
    gradientLine: null,
  };
}

/** Width/height used for grid snapping — must match build_fullblock_conf.snap_component_to_grid. */
function getLayoutDimensionsForSnap(comp, canvasBlockTypeScale = {}) {
  const base = getComponentVisualConfig(comp.type);
  const s = getCanvasBlockTypeScale(canvasBlockTypeScale, comp.type);
  const bw = (comp.visualOverrides?.width ?? base.width) * s;
  const bh = (comp.visualOverrides?.height ?? base.height) * s;
  return tieEffectiveDimensions(comp, bw, bh);
}

function bboxFromSegments(segments, halfStroke, pad) {
  let sx0 = Infinity;
  let sx1 = -Infinity;
  let sy0 = Infinity;
  let sy1 = -Infinity;
  for (const [xa, ya, xb, yb] of segments) {
    sx0 = Math.min(sx0, xa, xb);
    sx1 = Math.max(sx1, xa, xb);
    sy0 = Math.min(sy0, ya, yb);
    sy1 = Math.max(sy1, ya, yb);
  }
  return {
    frameX: sx0 - halfStroke - pad,
    frameY: sy0 - halfStroke - pad,
    frameW: sx1 - sx0 + 2 * halfStroke + 2 * pad,
    frameH: sy1 - sy0 + 2 * halfStroke + 2 * pad,
  };
}

const Canvas = forwardRef(({
  components,
  connections,
  selectedComponent,
  selectedConnection,
  onSelectComponent,
  onSelectConnection,
  selectedComponents,
  onMultiSelect,
  onClearMultiSelection,
  onClearConnectionMultiSelection = () => {},
  selectedConnectionIds = [],
  isComponentMultiSelected,
  onMoveComponent,
  onMoveComponents,
  onMarqueeSelect,
  onCopySelection,
  onPasteSelection,
  onDeleteSelection,
  onAddComponent,
  onAddConnection,
  onUpdateComponent,
  onAssociateChart,
  onOpenChart,
  onCreateMultiComponentChart,
  canAddCharts,
  simulationColumns = [],
  simulationCsvName = '',
  ensembleColumnGroups = [],
  onConfigureConnectionReadout,
  zoom,
  onZoomIn,
  onZoomOut,
  pan,
  onPan,
  canvasZoomMin = 0.5,
  canvasZoomMax = 10,
  onCanvasViewport,
  mode,
  viewMode,
  simulationRunning,
  simulationData = [],
  ensembleMemberSimulationData = null,
  simulationTime = 0,
  systemState,
  presenceForcedOfflineIds = NO_PRESENCE_FORCED_IDS,
  presenceForcedOfflineConnectionIds = NO_PRESENCE_FORCED_IDS,
  variableDrivenPresence = [],
  onOpenVariablePresenceDialog,
  onOpenVariablePresenceDialogConnections,
  canvasBlockTypeScale = {},
  onNudgeCanvasBlockTypeScale,
}, ref) => {
  const fontPxDelta = useCanvasFontPxDelta();
  const canvasRef = useRef(null);
  const zoomRef = useRef(zoom);
  /** Keep latest pan + zoom for native wheel/touch/gesture handlers (avoid stale closures). */
  const panForGesturesRef = useRef(pan);
  zoomRef.current = zoom;
  panForGesturesRef.current = pan;
  const twoTouchPanRef = useRef(null);
  /** Stable identities for React.memo(CanvasBlock) — latest implementation swapped in each render. */
  const handleComponentMouseDownLatestRef = useRef(null);
  const handleComponentContextMenuLatestRef = useRef(null);
  const handleComponentMouseUpLatestRef = useRef(null);
  const onOpenChartLatestRef = useRef(onOpenChart);
  const onUpdateComponentLatestRef = useRef(onUpdateComponent);
  const tieTapCandidateRef = useRef({
    componentId: null,
    startClientX: 0,
    startClientY: 0,
    movedBeyondTapThreshold: false,
  });
  const dragMoveCandidateRef = useRef({
    componentId: null,
    startClientX: 0,
    startClientY: 0,
    movedBeyondDragThreshold: false,
  });
  const groupDragRef = useRef(null);
  const [marqueeTrack, setMarqueeTrack] = useState(null);
  const [marqueeRect, setMarqueeRect] = useState(null);
  const MARQUEE_DRAG_PX = 5;

  const hiddenTieMemberIds = useMemo(
    () => getTieHiddenMemberIdSet(components),
    [components],
  );

  const visibleComponents = useMemo(
    () => components.filter((c) => !hiddenTieMemberIds.has(c.id)),
    [components, hiddenTieMemberIds],
  );

  const tieCollapseShiftById = useMemo(
    () => buildTieCollapseHorizontalShiftMap(components, getComponentVisualConfig),
    [components],
  );

  const renderComponents = useMemo(() => {
    return visibleComponents.map((c) => {
      const dx = tieCollapseShiftById.get(c.id);
      if (dx == null || dx === 0) return c;
      return {
        ...c,
        position: { ...c.position, x: c.position.x + dx },
      };
    });
  }, [visibleComponents, tieCollapseShiftById]);

  const tieCollapsedStubSegments = useMemo(() => {
    const accum = [];
    for (const c of components) {
      if (!isTieBreakerNetwork(c) || !isTieNetworkCollapsed(c)) continue;
      if (!hasTieStubLinks(c)) continue;
      const rt = renderComponents.find((x) => x.id === c.id);
      if (!rt) continue;
      accum.push(
        ...getTieCollapsedStubSegments(renderComponents, c, rt, getComponentVisualConfig),
      );
    }
    return accum;
  }, [components, renderComponents]);

  const connectionRenderList = useMemo(() => {
    return connections.map((conn) => {
      const fromComp = renderComponents.find((c) => c.id === conn.from);
      const toComp = renderComponents.find((c) => c.id === conn.to);
      if (!fromComp || !toComp) {
        // eslint-disable-next-line no-console
        console.warn('[Canvas] connection skipped (missing component)', conn.id, conn.from, conn.to);
        return null;
      }

      const fromVisual = getComponentVisualConfig(fromComp.type);
      const toVisual = getComponentVisualConfig(toComp.type);

      const fromWidth =
        (fromComp.visualOverrides?.width || fromVisual.width) *
        getCanvasBlockTypeScale(canvasBlockTypeScale, fromComp.type);
      const fromHeight =
        (fromComp.visualOverrides?.height || fromVisual.height) *
        getCanvasBlockTypeScale(canvasBlockTypeScale, fromComp.type);
      const toWidth =
        (toComp.visualOverrides?.width || toVisual.width) *
        getCanvasBlockTypeScale(canvasBlockTypeScale, toComp.type);
      const toHeight =
        (toComp.visualOverrides?.height || toVisual.height) *
        getCanvasBlockTypeScale(canvasBlockTypeScale, toComp.type);

      let fromCenterX = fromComp.position.x + fromWidth / 2;
      let fromCenterY = fromComp.position.y + fromHeight / 2;
      let toCenterX = toComp.position.x + toWidth / 2;
      let toCenterY = toComp.position.y + toHeight / 2;

      const VERTICAL_BUS_TYPES = ['bus-hv-vertical'];
      const HORIZONTAL_BUS_TYPES = ['bus-hv', 'bus-mv', 'bus-lv', 'bus-dc', 'bus-main'];
      const fromIsVerticalBus = VERTICAL_BUS_TYPES.includes(fromComp.type);
      const toIsVerticalBus = VERTICAL_BUS_TYPES.includes(toComp.type);
      const fromIsHorizontalBus = HORIZONTAL_BUS_TYPES.includes(fromComp.type);
      const toIsHorizontalBus = HORIZONTAL_BUS_TYPES.includes(toComp.type);
      if (fromIsVerticalBus) {
        const busLeft = fromComp.position.x;
        const busRight = fromComp.position.x + fromWidth;
        const busEdgeX = toCenterX < fromCenterX ? busLeft : busRight;
        fromCenterX = busEdgeX;
        fromCenterY = toCenterY;
      }
      if (toIsVerticalBus) {
        const busLeft = toComp.position.x;
        const busRight = toComp.position.x + toWidth;
        const busEdgeX = fromCenterX < toCenterX ? busRight : busLeft;
        toCenterX = busEdgeX;
        toCenterY = fromCenterY;
      }
      if (fromIsHorizontalBus) {
        const busLeft = fromComp.position.x;
        const busRight = fromComp.position.x + fromWidth;
        const busMidY = fromComp.position.y + fromHeight / 2;
        const busTop = fromComp.position.y;
        const busBottom = fromComp.position.y + fromHeight;
        fromCenterY = toCenterY < busMidY ? busTop : busBottom;
        fromCenterX = Math.min(busRight, Math.max(busLeft, toCenterX));
      }
      if (toIsHorizontalBus) {
        const busLeft = toComp.position.x;
        const busRight = toComp.position.x + toWidth;
        const busMidY = toComp.position.y + toHeight / 2;
        const busTop = toComp.position.y;
        const busBottom = toComp.position.y + toHeight;
        toCenterY = fromCenterY < busMidY ? busTop : busBottom;
        toCenterX = Math.min(busRight, Math.max(busLeft, fromCenterX));
      }

      const { segments, gradientLine } = orthogonalEdgeConnection(
        fromComp,
        toComp,
        fromWidth,
        fromHeight,
        toWidth,
        toHeight,
        fromCenterX,
        fromCenterY,
        toCenterX,
        toCenterY,
      );

      const baseFromOk =
        fromComp.status === 'normal' ||
        fromComp.status === 'online' ||
        fromComp.status === 'idle';
      const endpointForced =
        (presenceForcedOfflineIds?.has?.(fromComp.id) ?? false) ||
        (presenceForcedOfflineIds?.has?.(toComp.id) ?? false);
      const connRuleForced =
        presenceForcedOfflineConnectionIds?.has?.(conn.id) ?? false;
      const isEnergized = baseFromOk && !endpointForced && !connRuleForced;
      const resolved = resolveConnectionRenderParams(
        conn,
        fromComp.type,
        toComp.type,
        isEnergized
      );
      const gradientId = `conn-line-grad-${sanitizeSvgGradientId(conn.id)}`;

      return {
        conn,
        fromCenterX,
        fromCenterY,
        toCenterX,
        toCenterY,
        segments,
        gradientLine,
        resolved,
        gradientId,
        isEnergized
      };
    }).filter(Boolean);
  }, [connections, renderComponents, presenceForcedOfflineIds, presenceForcedOfflineConnectionIds, canvasBlockTypeScale]);

  const [draggingComponent, setDraggingComponent] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState(null);
  const [connectingTo, setConnectingTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { component, position }
  const [showMultiChartDialog, setShowMultiChartDialog] = useState(false);
  const [multiChartComponents, setMultiChartComponents] = useState([]);
  const [multiChartType, setMultiChartType] = useState('multi-bar-chart'); // 'multi-bar-chart' | 'multi-line-chart'
  const [resizingComponent, setResizingComponent] = useState(null); // { id, handle: 'top'|'bottom'|'left'|'right' }
  const resizeStateRef = useRef(null); // holds latest components, pan, zoom for document-level resize

  resizeStateRef.current = { components, pan, zoom, onUpdateComponent, resizingComponent, canvasRef };

  // ========================================================================
  // HELPER: snapCenterToGrid – snap component CENTER to grid, return top-left
  // ========================================================================
  // Snaps the center of gravity to the 50x50 grid, not the corner.
  // ========================================================================
  const gridSize = 50;
  const snapCenterToGrid = (topLeftX, topLeftY, width, height) => {
    const centerX = topLeftX + width / 2;
    const centerY = topLeftY + height / 2;
    const snappedCenterX = Math.round(centerX / gridSize) * gridSize;
    const snappedCenterY = Math.round(centerY / gridSize) * gridSize;
    return {
      x: snappedCenterX - width / 2,
      y: snappedCenterY - height / 2
    };
  };

  // Handle drop of new component from library
  const handleDrop = (e) => {
    e.preventDefault();
    const componentData = e.dataTransfer.getData('component');
    if (!componentData) return;

    const component = JSON.parse(componentData);
    const rect = canvasRef.current.getBoundingClientRect();

    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;

    const base = getComponentVisualConfig(component.type || component.id);
    const s = getCanvasBlockTypeScale(canvasBlockTypeScale, component.type || component.id);
    const width = (component.visualOverrides?.width ?? base.width) * s;
    const height = (component.visualOverrides?.height ?? base.height) * s;
    const snapped = snapCenterToGrid(rawX, rawY, width, height);

    onAddComponent(component, snapped);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // ========================================================================
  // FUNCTION: handleComponentMouseDown
  // ========================================================================
  // This handles when you click on a component on the canvas.
  // 
  // DIFFERENT BEHAVIORS BASED ON MODE:
  // • Design Mode: Can drag to move, Shift+Click to connect
  // • Simulation Mode: Can ONLY click to select (no dragging, no connecting)
  //
  // WHY: In simulation mode, we want to select components to see their
  // properties and trigger actions (like "Trip Turbine"), but we don't
  // want to allow moving them around or creating new connections.
  // ========================================================================
  const handleComponentMouseDown = (e, component) => {
    e.stopPropagation();
    
    // CRITICAL: Ignore right-click (button 2) - let contextmenu handler deal with it
    if (e.button === 2) {
      return;
    }
    
    // If context menu is open, ignore all mouse events
    if (contextMenu) {
      return;
    }

    if (e.button === 0) {
      markSelectionInteractionStart();
    }
    setMarqueeTrack(null);
    setMarqueeRect(null);

    const authoredComponent =
      components.find((c) => c.id === component.id) ?? component;

    // IN SIMULATION MODE: Only allow selection, nothing else
    if (mode === 'simulation') {
      console.log('🖱️ Clicked in simulation mode:', component.name);
      onClearConnectionMultiSelection();
      onSelectComponent(authoredComponent);
      return;  // But block dragging and connecting
    }
    
    // IN DESIGN MODE: Allow everything (drag, connect, select, multi-select)
    
    // Shift + click = Multi-select
    if (e.shiftKey) {
      e.preventDefault(); // Prevent browser text selection
      console.log('🖱️ Shift+Click - Multi-selecting:', component.name);
      onMultiSelect(component.id, true);
      return;
    }
    
    // ⌘/Ctrl + click = start or finish connection (design mode only above).
    // Finish on mousedown so we don't start a drag and lose mouseup on the target.
    if (e.ctrlKey || e.metaKey) {
      if (connecting && connecting !== component.id) {
        onAddConnection(connecting, component.id);
        setConnecting(null);
        setConnectingTo(null);
        onSelectComponent(component);
        return;
      }
      console.log('🔗 Modifier+Click - Starting connection from:', component.name);
      setConnecting(component.id);
      return;
    }

    if (connecting) {
      if (connecting !== component.id) {
        onAddConnection(connecting, component.id);
      }
      setConnecting(null);
      setConnectingTo(null);
      onSelectComponent(component);
      return;
    }

    // Regular click: if already part of a multi-selection, keep the group (drag all).
    // Otherwise select only this block and clear the group.
    const grabWholeGroup =
      selectedComponents.length > 1 && selectedComponents.includes(component.id);

    if (!grabWholeGroup) {
      onMultiSelect(component.id, false);
      groupDragRef.current = null;
    }
    onClearConnectionMultiSelection();
    if (
      component.type === 'tie-breaker-network' &&
      Array.isArray(component.properties?.tieGroup?.memberIds) &&
      component.properties.tieGroup.memberIds.length > 0 &&
      component.properties.tieGroup.collapsed !== false
    ) {
      tieTapCandidateRef.current = {
        componentId: component.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        movedBeyondTapThreshold: false,
      };
    } else {
      tieTapCandidateRef.current = {
        componentId: null,
        startClientX: 0,
        startClientY: 0,
        movedBeyondTapThreshold: false,
      };
    }
    if (grabWholeGroup && onMoveComponents) {
      const starts = {};
      for (const id of selectedComponents) {
        const c = components.find((x) => x.id === id);
        if (c) {
          starts[id] = { x: c.position.x, y: c.position.y };
        }
      }
      groupDragRef.current = { anchorId: component.id, starts };
    } else if (!grabWholeGroup) {
      groupDragRef.current = null;
    }
    setDraggingComponent(component.id);
    dragMoveCandidateRef.current = {
      componentId: component.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      movedBeyondDragThreshold: false,
    };
    const rect = canvasRef.current.getBoundingClientRect();
    // Blocks are drawn with render-only tie-collapse shift; drag must use authored JSON position.
    setDragOffset({
      x: (e.clientX - rect.left - pan.x) / zoom - authoredComponent.position.x,
      y: (e.clientY - rect.top - pan.y) / zoom - authoredComponent.position.y,
    });
    onSelectComponent(authoredComponent);
  };

  /**
   * Handle right-click on component to show chart association menu
   */
  const handleComponentContextMenu = (e, component) => {
    e.preventDefault();
    e.stopPropagation();

    // macOS: Control+click synthesizes a contextmenu for "secondary click".
    // That must not open the chart menu or clear in-progress wiring — mousedown already
    // handled ⌘/Ctrl+click as "start connection".
    if (mode === 'design' && isMacLikePlatform() && e.ctrlKey) {
      return;
    }

    // CRITICAL: Clear any dragging state when context menu opens
    setDraggingComponent(null);
    setConnecting(null);
    setConnectingTo(null);
    
    // Debug logging
    console.log('📋 Context Menu Debug:', {
      componentId: component.id,
      componentName: component.name,
      selectedComponentsLength: selectedComponents.length,
      selectedComponents: selectedComponents,
      isInSelection: isComponentMultiSelected(component.id)
    });
    
    // Check if this is a multi-selection scenario
    const isMultiSelect = selectedComponents.length > 1 && isComponentMultiSelected(component.id);
    
    console.log('🎯 isMultiSelect:', isMultiSelect);
    
    if (isMultiSelect) {
      // Multi-component context menu
      console.log('🖱️ Right-click on multi-selection:', selectedComponents.length, 'components');
      setContextMenu({
        type: 'multi-component',
        components: selectedComponents.map(id => components.find(c => c.id === id)).filter(Boolean),
        position: { x: e.clientX, y: e.clientY }
      });
    } else {
      // Single component context menu (existing behavior)
      console.log('🖱️ Right-click on component:', component.name);
      setContextMenu({
        type: 'single-component',
        component,
        position: { x: e.clientX, y: e.clientY }
      });
    }
  };

  const handleConnectionContextMenu = (e, conn) => {
    e.preventDefault();
    e.stopPropagation();
    if (!conn?.id || !connections?.length) return;
    const mergedIds =
      selectedConnectionIds.length > 0
        ? [...selectedConnectionIds]
        : selectedConnection?.id
          ? [selectedConnection.id]
          : [];
    if (!mergedIds.includes(conn.id)) return;

    const list = mergedIds
      .map((id) => connections.find((c) => c.id === id))
      .filter(Boolean);
    if (!list.length) return;

    setContextMenu({
      type: 'multi-connection',
      connections: list,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  /**
   * Handle chart type selection from context menu (single component)
   */
  const handleChartTypeSelected = (chartType) => {
    if (contextMenu && contextMenu.component) {
      console.log('📊 Selected chart type:', chartType, 'for', contextMenu.component.name);
      
      // Call parent handler to open CSV picker
      if (onAssociateChart) {
        onAssociateChart(contextMenu.component, chartType);
      }
    }
    setContextMenu(null);
  };

  /**
   * Handle chart type selection from multi-component context menu.
   * STEP 1: Gate – if not in a simulation, show instructive message and return.
   */
  const handleMultiComponentChartTypeSelected = (chartType) => {
    if (!canAddCharts) {
      alert('Run a simulation first to add or modify charts.\n\nClick a scenario button in the Simulation Controls panel.');
      setContextMenu(null);
      return;
    }
    if (contextMenu && contextMenu.components) {
      console.log('📊 Multi-component chart selected:', chartType, 'for', contextMenu.components.length, 'components');
      console.log('Selected components:', contextMenu.components.map(c => c.name).join(', '));
      
      if (chartType === 'animated-bar-chart') {
        setMultiChartType('multi-bar-chart');
        setMultiChartComponents(contextMenu.components);
        setShowMultiChartDialog(true);
      } else if (chartType === 'multi-line-plot') {
        setMultiChartType('multi-line-chart');
        setMultiChartComponents(contextMenu.components);
        setShowMultiChartDialog(true);
      } else {
        console.log('⚠️ Chart type not yet implemented:', chartType);
      }
    }
    setContextMenu(null);
  };

  /**
   * Handle multi-component chart creation from dialog
   */
  const handleCreateMultiChart = (chartConfig) => {
    console.log('✅ Multi-component chart created:', chartConfig);
    
    // TODO: In Step 9, we'll pass this to App.js to create the actual Plotly chart
    // For now, just log it
    if (onCreateMultiComponentChart) {
      onCreateMultiComponentChart(chartConfig);
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse or Alt+Left mouse for panning
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 0 && !draggingComponent && mode === 'design' && !connecting) {
      const pt = clientToCanvasPoint(canvasRef.current, pan, zoom, e.clientX, e.clientY);
      setMarqueeTrack({
        x0: pt.x,
        y0: pt.y,
        clientX: e.clientX,
        clientY: e.clientY,
        active: false,
      });
      setMarqueeRect(null);
    } else if (e.button === 0 && !draggingComponent) {
      onSelectComponent(null);
      onSelectConnection(null);
      onClearMultiSelection();
      onClearConnectionMultiSelection();
    }
  };

  const handleCanvasMouseMove = (e) => {
    // If context menu is open, block all mouse move behavior
    if (contextMenu) {
      return;
    }

    if (resizingComponent && onUpdateComponent) {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      const comp = components.find(c => c.id === resizingComponent.id);
      if (!comp) return;
      const baseConfig = getComponentVisualConfig(comp.type);
      const currentWidth = comp.visualOverrides?.width ?? baseConfig.width;
      const currentHeight = comp.visualOverrides?.height ?? baseConfig.height;
      const vo = comp.visualOverrides || {};
      if (resizingComponent.handle === 'bottom') {
        const newHeight = Math.max(60, Math.min(800, canvasY - comp.position.y));
        if (Math.abs(newHeight - currentHeight) > 1) {
          onUpdateComponent(comp.id, { visualOverrides: { ...vo, height: Math.round(newHeight) } });
        }
      } else if (resizingComponent.handle === 'top') {
        const compBottom = comp.position.y + currentHeight;
        const newHeight = Math.max(60, Math.min(800, compBottom - canvasY));
        const newY = compBottom - newHeight;
        if (Math.abs(newHeight - currentHeight) > 1) {
          onUpdateComponent(comp.id, {
            position: { ...comp.position, y: newY },
            visualOverrides: { ...vo, height: Math.round(newHeight) }
          });
        }
      } else if (resizingComponent.handle === 'right') {
        const newWidth = Math.max(80, Math.min(600, canvasX - comp.position.x));
        if (Math.abs(newWidth - currentWidth) > 1) {
          onUpdateComponent(comp.id, { visualOverrides: { ...vo, width: Math.round(newWidth) } });
        }
      } else if (resizingComponent.handle === 'left') {
        const compRight = comp.position.x + currentWidth;
        const newWidth = Math.max(80, Math.min(600, compRight - canvasX));
        const newX = compRight - newWidth;
        if (Math.abs(newWidth - currentWidth) > 1) {
          onUpdateComponent(comp.id, {
            position: { ...comp.position, x: newX },
            visualOverrides: { ...vo, width: Math.round(newWidth) }
          });
        }
      }
      return;
    }
    
    if (draggingComponent) {
      const cand = tieTapCandidateRef.current;
      if (
        cand.componentId &&
        draggingComponent === cand.componentId &&
        !cand.movedBeyondTapThreshold
      ) {
        const dx = e.clientX - cand.startClientX;
        const dy = e.clientY - cand.startClientY;
        if (dx * dx + dy * dy > 64) {
          cand.movedBeyondTapThreshold = true;
        }
      }

      const dragCand = dragMoveCandidateRef.current;
      if (
        dragCand.componentId === draggingComponent &&
        !dragCand.movedBeyondDragThreshold
      ) {
        const dx = e.clientX - dragCand.startClientX;
        const dy = e.clientY - dragCand.startClientY;
        if (dx * dx + dy * dy > 64) {
          dragCand.movedBeyondDragThreshold = true;
        } else {
          return;
        }
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
      const rawY = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;

      const comp = components.find(c => c.id === draggingComponent);
      const { width, height } = comp
        ? getLayoutDimensionsForSnap(comp, canvasBlockTypeScale)
        : { width: 100, height: 60 };
      const snapped = snapCenterToGrid(rawX, rawY, width, height);

      if (
        groupDragRef.current &&
        onMoveComponents &&
        selectedComponents.length > 1 &&
        selectedComponents.includes(draggingComponent)
      ) {
        const { starts, anchorId } = groupDragRef.current;
        const anchorStart = starts[anchorId];
        if (anchorStart) {
          const dx = snapped.x - anchorStart.x;
          const dy = snapped.y - anchorStart.y;
          const updates = selectedComponents
            .map((id) => {
              const start = starts[id];
              const c = components.find((x) => x.id === id);
              if (!start || !c) return null;
              const dim = getLayoutDimensionsForSnap(c, canvasBlockTypeScale);
              return {
                id,
                position: snapCenterToGrid(
                  start.x + dx,
                  start.y + dy,
                  dim.width,
                  dim.height,
                ),
              };
            })
            .filter(Boolean);
          onMoveComponents(updates);
        }
      } else {
        onMoveComponent(draggingComponent, snapped);
      }
    } else if (panning) {
      onPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (connecting) {
      // Update connecting line
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectingTo({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  };

  const handleCanvasMouseUp = (e) => {
    const dragId = draggingComponent;
    if (
      dragId &&
      mode === 'design' &&
      onUpdateComponent &&
      tieTapCandidateRef.current.componentId === dragId &&
      !tieTapCandidateRef.current.movedBeyondTapThreshold
    ) {
      const comp = components.find((c) => c.id === dragId);
      if (
        comp?.type === 'tie-breaker-network' &&
        comp.properties?.tieGroup?.memberIds?.length &&
        comp.properties.tieGroup.collapsed !== false
      ) {
        onUpdateComponent(comp.id, {
          properties: {
            ...comp.properties,
            tieGroup: {
              ...comp.properties.tieGroup,
              collapsed: false,
            },
          },
        });
      }
    }
    tieTapCandidateRef.current = {
      componentId: null,
      startClientX: 0,
      startClientY: 0,
      movedBeyondTapThreshold: false,
    };
    dragMoveCandidateRef.current = {
      componentId: null,
      startClientX: 0,
      startClientY: 0,
      movedBeyondDragThreshold: false,
    };
    if (draggingComponent) {
      setDraggingComponent(null);
      groupDragRef.current = null;
    }
    if (resizingComponent) {
      setResizingComponent(null);
    }
    if (panning) {
      setPanning(false);
    }
  };

  // Document-level resize: keep resize working when mouse leaves canvas
  useEffect(() => {
    if (!resizingComponent || !onUpdateComponent) return;
    const onDocMove = (e) => {
      const s = resizeStateRef.current;
      if (!s?.resizingComponent || !s.canvasRef?.current) return;
      const rect = s.canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - s.pan.x) / s.zoom;
      const canvasY = (e.clientY - rect.top - s.pan.y) / s.zoom;
      const comp = s.components.find(c => c.id === s.resizingComponent.id);
      if (!comp) return;
      const baseConfig = getComponentVisualConfig(comp.type);
      const currentWidth = comp.visualOverrides?.width ?? baseConfig.width;
      const currentHeight = comp.visualOverrides?.height ?? baseConfig.height;
      const vo = comp.visualOverrides || {};
      const handle = s.resizingComponent.handle;
      if (handle === 'bottom') {
        const newHeight = Math.max(60, Math.min(800, canvasY - comp.position.y));
        if (Math.abs(newHeight - currentHeight) > 1) {
          s.onUpdateComponent(comp.id, { visualOverrides: { ...vo, height: Math.round(newHeight) } });
        }
      } else if (handle === 'top') {
        const compBottom = comp.position.y + currentHeight;
        const newHeight = Math.max(60, Math.min(800, compBottom - canvasY));
        const newY = compBottom - newHeight;
        if (Math.abs(newHeight - currentHeight) > 1) {
          s.onUpdateComponent(comp.id, {
            position: { ...comp.position, y: newY },
            visualOverrides: { ...vo, height: Math.round(newHeight) }
          });
        }
      } else if (handle === 'right') {
        const newWidth = Math.max(80, Math.min(600, canvasX - comp.position.x));
        if (Math.abs(newWidth - currentWidth) > 1) {
          s.onUpdateComponent(comp.id, { visualOverrides: { ...vo, width: Math.round(newWidth) } });
        }
      } else if (handle === 'left') {
        const compRight = comp.position.x + currentWidth;
        const newWidth = Math.max(80, Math.min(600, compRight - canvasX));
        const newX = compRight - newWidth;
        if (Math.abs(newWidth - currentWidth) > 1) {
          s.onUpdateComponent(comp.id, {
            position: { ...comp.position, x: newX },
            visualOverrides: { ...vo, width: Math.round(newWidth) }
          });
        }
      }
    };
    const onDocUp = () => setResizingComponent(null);
    document.addEventListener('mousemove', onDocMove);
    document.addEventListener('mouseup', onDocUp);
    return () => {
      document.removeEventListener('mousemove', onDocMove);
      document.removeEventListener('mouseup', onDocUp);
    };
  }, [resizingComponent, onUpdateComponent]);

  // Two-finger trackpad pan; Ctrl/Meta+wheel pinch zoom; touch two-finger pan/pinch;
  // Safari trackpad pinch (GestureEvent). Same zoom bounds as toolbar (50%–1000%).
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const PINCH_DIST_PX = 6;

    const clampZ = (z) =>
      Math.max(canvasZoomMin, Math.min(canvasZoomMax, z));

    /**
     * Zoom toward a canvas-local point (lx, ly in px relative to SVG top-left)
     * so the diagram point under the cursor/focal stays fixed.
     */
    const zoomAtLocalPoint = (lx, ly, nextZoom) => {
      if (!onCanvasViewport) return;
      const prevZ = zoomRef.current;
      const prevP = panForGesturesRef.current;
      const nz = clampZ(nextZoom);
      const cx = (lx - prevP.x) / prevZ;
      const cy = (ly - prevP.y) / prevZ;
      onCanvasViewport(nz, { x: lx - cx * nz, y: ly - cy * nz });
    };

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= 80;
        const scale = Math.exp(-dy * 0.002);
        const rect = el.getBoundingClientRect();
        const lx = e.clientX - rect.left;
        const ly = e.clientY - rect.top;
        zoomAtLocalPoint(lx, ly, zoomRef.current * scale);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === 2) {
        dx *= 80;
        dy *= 80;
      }
      onPan((p) => ({ x: p.x - dx, y: p.y - dy }));
    };

    /** Safari (macOS / iOS): trackpad pinch uses GestureEvent, not ctrl+wheel. */
    const gestureStartZoomRef = { current: 1 };
    const onGestureStart = (e) => {
      e.preventDefault();
      gestureStartZoomRef.current = zoomRef.current;
    };
    const onGestureChange = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      const nz = clampZ(gestureStartZoomRef.current * e.scale);
      zoomAtLocalPoint(lx, ly, nz);
    };

    const onTouchStart = (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const midClientX = (t0.clientX + t1.clientX) / 2;
      const midClientY = (t0.clientY + t1.clientY) / 2;
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const p0 = panForGesturesRef.current;
      twoTouchPanRef.current = {
        phase: 'undecided',
        startMidClientX: midClientX,
        startMidClientY: midClientY,
        startDist: dist,
        startPan: { x: p0.x, y: p0.y },
      };
    };

    const onTouchMove = (e) => {
      const s = twoTouchPanRef.current;
      if (!s || e.touches.length < 2) return;
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const midClientX = (t0.clientX + t1.clientX) / 2;
      const midClientY = (t0.clientY + t1.clientY) / 2;
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const rect = el.getBoundingClientRect();
      const lx = midClientX - rect.left;
      const ly = midClientY - rect.top;

      if (s.phase === 'undecided') {
        const dDist = Math.abs(dist - s.startDist);
        if (dDist >= PINCH_DIST_PX) {
          s.phase = 'pinch';
          s.pinchAnchorZoom = zoomRef.current;
          s.pinchBaseDist = dist;
        } else {
          s.phase = 'pan';
        }
      } else if (s.phase === 'pan' && Math.abs(dist - s.startDist) >= PINCH_DIST_PX + 2) {
        s.phase = 'pinch';
        s.pinchAnchorZoom = zoomRef.current;
        s.pinchBaseDist = dist;
      }

      if (s.phase === 'pan') {
        onPan({
          x: s.startPan.x + (midClientX - s.startMidClientX),
          y: s.startPan.y + (midClientY - s.startMidClientY),
        });
        return;
      }

      const nz = clampZ(s.pinchAnchorZoom * (dist / s.pinchBaseDist));
      zoomAtLocalPoint(lx, ly, nz);
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        twoTouchPanRef.current = null;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    const hasSafariGesture = typeof window !== 'undefined' && 'GestureEvent' in window;
    if (hasSafariGesture) {
      el.addEventListener('gesturestart', onGestureStart, { passive: false });
      el.addEventListener('gesturechange', onGestureChange, { passive: false });
    }

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      if (hasSafariGesture) {
        el.removeEventListener('gesturestart', onGestureStart);
        el.removeEventListener('gesturechange', onGestureChange);
      }
    };
  }, [
    onPan,
    onCanvasViewport,
    canvasZoomMin,
    canvasZoomMax,
  ]);

  const handleComponentMouseUp = (e, component) => {
    if (connecting && connecting !== component.id) {
      // Complete connection
      onAddConnection(connecting, component.id);
      setConnecting(null);
      setConnectingTo(null);
    }
  };

  handleComponentMouseDownLatestRef.current = handleComponentMouseDown;
  handleComponentContextMenuLatestRef.current = handleComponentContextMenu;
  handleComponentMouseUpLatestRef.current = handleComponentMouseUp;
  onOpenChartLatestRef.current = onOpenChart;
  onUpdateComponentLatestRef.current = onUpdateComponent;

  const stableHandleComponentMouseDown = useCallback((e, component) => {
    handleComponentMouseDownLatestRef.current?.(e, component);
  }, []);
  const stableHandleComponentContextMenu = useCallback((e, component) => {
    handleComponentContextMenuLatestRef.current?.(e, component);
  }, []);
  const stableHandleComponentMouseUp = useCallback((e, component) => {
    handleComponentMouseUpLatestRef.current?.(e, component);
  }, []);
  const stableOnOpenChart = useCallback((component, chart) => {
    onOpenChartLatestRef.current?.(component, chart);
  }, []);
  const stableOnUpdateComponent = useCallback((componentId, updates) => {
    onUpdateComponentLatestRef.current?.(componentId, updates);
  }, []);

  const stableDesignSelectSingle = useCallback((c) => {
    onClearConnectionMultiSelection();
    onMultiSelect(c.id, false);
    const authored = components.find((x) => x.id === c.id) ?? c;
    onSelectComponent(authored);
  }, [components, onClearConnectionMultiSelection, onMultiSelect, onSelectComponent]);

  const handleCanvasClick = (e) => {
    if (connecting) {
      // Cancel connection on empty canvas click
      setConnecting(null);
      setConnectingTo(null);
    }
  };

  // Listen for add component events
  useEffect(() => {
    const handleAddComponent = (e) => {
      // This would come from the parent via event
    };
    window.addEventListener('addComponentToCanvas', handleAddComponent);
    return () => window.removeEventListener('addComponentToCanvas', handleAddComponent);
  }, []);
  
  // Enhanced keyboard shortcuts for multi-selection
  useEffect(() => {
    const isTypingTarget = (t) => {
      if (!t) return true;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (t.isContentEditable) return true;
      if (typeof t.closest === 'function' && t.closest('input, textarea, select, [contenteditable="true"]')) {
        return true;
      }
      return false;
    };

    const isBlockingOverlay = () => {
      if (contextMenu) return true;
      if (showMultiChartDialog) return true;
      if (typeof document === 'undefined') return false;
      if (document.querySelector('dialog[open]')) return true;
      if (document.querySelector('[aria-modal="true"]')) return true;
      if (document.querySelector('.connection-readout-dialog')) return true;
      return false;
    };

    const handleKeyDown = (e) => {
      if (isTypingTarget(e.target)) {
        return;
      }
      if (isBlockingOverlay()) {
        return;
      }
      
      // ESC - Clear selection and close context menu
      if (e.key === 'Escape') {
        onClearMultiSelection();
        onClearConnectionMultiSelection();
        setContextMenu(null);
        console.log('⌨️  Escape - Cleared selection');
      }
      
      // Arrow Up / Down — zoom in / out (same limits as toolbar)
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey) {
        e.preventDefault();
        if (e.key === 'ArrowUp') onZoomIn?.();
        else onZoomOut?.();
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && mode === 'design') {
        e.preventDefault();
        onCopySelection?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && mode === 'design') {
        e.preventDefault();
        onPasteSelection?.();
        return;
      }

      // Ctrl/Cmd+A - Select all components (Design mode only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && mode === 'design') {
        e.preventDefault();
        // Select all components
        components.forEach(comp => {
          onMultiSelect(comp.id, true);
        });
        console.log('⌨️  Ctrl+A - Selected all', components.length, 'components');
      }
      
      // Delete / Backspace — remove selected components and/or connections (design mode)
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        mode === 'design' &&
        (selectedComponents.length > 0 ||
          selectedConnectionIds.length > 0 ||
          selectedConnection?.id)
      ) {
        e.preventDefault();
        onDeleteSelection?.();
      }
      
      // ARROW KEYS — nudge selected components (Shift+Up/Down for vertical; Left/Right without Shift)
      if (mode === 'design' && selectedComponents.length > 0) {
        const gridSize = 50;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp' && e.shiftKey) {
          e.preventDefault();
          dy = -gridSize;
        } else if (e.key === 'ArrowDown' && e.shiftKey) {
          e.preventDefault();
          dy = gridSize;
        } else if (e.key === 'ArrowLeft' && !e.shiftKey) {
          e.preventDefault();
          dx = -gridSize;
        } else if (e.key === 'ArrowRight' && !e.shiftKey) {
          e.preventDefault();
          dx = gridSize;
        }
        if (dx !== 0 || dy !== 0) {
          selectedComponents.forEach(compId => {
            const comp = components.find(c => c.id === compId);
            if (comp) {
              const { width, height } = getLayoutDimensionsForSnap(comp, canvasBlockTypeScale);
              const snapped = snapCenterToGrid(
                comp.position.x + dx,
                comp.position.y + dy,
                width,
                height
              );
              onMoveComponent(compId, snapped);
            }
          });
          console.log('⌨️  Arrow keys - Moved', selectedComponents.length, 'components by', dx, dy);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onClearMultiSelection,
    onClearConnectionMultiSelection,
    selectedComponents,
    components,
    mode,
    onMultiSelect,
    onMoveComponent,
    onZoomIn,
    onZoomOut,
    contextMenu,
    showMultiChartDialog,
    canvasBlockTypeScale,
    onCopySelection,
    onPasteSelection,
    onDeleteSelection,
    selectedConnectionIds,
    selectedConnection,
  ]);

  useEffect(() => {
    if (!marqueeTrack || mode !== 'design') return undefined;

    const session = { ...marqueeTrack };
    const latestMarqueeRef = { current: null };

    const onMove = (e) => {
      const dist = Math.hypot(
        e.clientX - session.clientX,
        e.clientY - session.clientY,
      );
      if (!session.active && dist < MARQUEE_DRAG_PX) return;
      session.active = true;
      const pt = clientToCanvasPoint(
        canvasRef.current,
        pan,
        zoom,
        e.clientX,
        e.clientY,
      );
      const rect = normalizeCanvasRect(session.x0, session.y0, pt.x, pt.y);
      latestMarqueeRef.current = rect;
      setMarqueeRect(rect);
    };

    const onUp = (e) => {
      if (session.active && onMarqueeSelect && canvasRef.current) {
        let rect = latestMarqueeRef.current;
        if (!rect) {
          const pt = clientToCanvasPoint(
            canvasRef.current,
            pan,
            zoom,
            e.clientX,
            e.clientY,
          );
          rect = normalizeCanvasRect(session.x0, session.y0, pt.x, pt.y);
        }
        const connectionSegments = connectionRenderList
          .filter(Boolean)
          .map((row) => ({ conn: row.conn, segments: row.segments }));
        const sel = computeMarqueeSelection({
          allComponents: components,
          renderComponents,
          connections,
          marquee: rect,
          tieCollapseShiftById,
          canvasBlockTypeScale,
          connectionSegments,
        });
        onMarqueeSelect(sel);
      } else {
        onSelectComponent(null);
        onSelectConnection(null);
        onClearMultiSelection();
        onClearConnectionMultiSelection();
      }
      setMarqueeTrack(null);
      setMarqueeRect(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [
    marqueeTrack,
    mode,
    pan,
    zoom,
    components,
    renderComponents,
    connections,
    connectionRenderList,
    tieCollapseShiftById,
    canvasBlockTypeScale,
    onMarqueeSelect,
    onSelectComponent,
    onClearMultiSelection,
    onClearConnectionMultiSelection,
  ]);
  
  // Click outside handler for multi-component context menu
  useEffect(() => {
    if (!contextMenu || (contextMenu.type !== 'multi-component' && contextMenu.type !== 'multi-connection')) return;

    const handleClickOutside = (e) => {
      // If clicking outside the context menu, close it
      const menuElement = document.querySelector('.multi-component-context-menu');
      if (menuElement && !menuElement.contains(e.target)) {
        setContextMenu(null);
      }
    };
    
    // Use a small delay to avoid closing immediately on the same click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  return (
    <div className="canvas-container">
      <svg
        ref={canvasRef}
        className="canvas-svg"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onClick={handleCanvasClick}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#2a2a2a" strokeWidth="0.5"/>
            </pattern>
            {/*
              Per-connection shadow uses CSS filter on the <line> (see dropShadowCss in
              connectionLineStyle). SVG feDropShadow without feMerge drops the gradient stroke.
            */}
            {connectionRenderList
              .filter((row) => row.gradientLine)
              .map((row) => (
                <linearGradient
                  key={row.gradientId}
                  id={row.gradientId}
                  gradientUnits="userSpaceOnUse"
                  x1={row.gradientLine.x1}
                  y1={row.gradientLine.y1}
                  x2={row.gradientLine.x2}
                  y2={row.gradientLine.y2}
                >
                  {row.resolved.stops.map((s, i) => (
                    <stop
                      key={i}
                      offset={s.offset}
                      stopColor={s.color}
                      stopOpacity={s.opacity}
                    />
                  ))}
                </linearGradient>
              ))}
          </defs>
          <rect width="10000" height="10000" fill="url(#grid)" />

          {marqueeRect && marqueeRect.w > 0 && marqueeRect.h > 0 && (
            <rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.w}
              height={marqueeRect.h}
              className="canvas-marquee-rect"
              pointerEvents="none"
            />
          )}

          {/* Electrical connections: static lines, role colors (producer / consumer / neutral), no flow animation */}
          {connectionRenderList.map((row) => {
            const {
              conn,
              fromCenterX,
              fromCenterY,
              toCenterX,
              toCenterY,
              segments,
              gradientLine,
              resolved,
              gradientId,
              isEnergized,
            } = row;
            const isConnHighlighted =
              selectedConnection?.id === conn.id || selectedConnectionIds.includes(conn.id);
            const isMultiWireSel =
              selectedConnectionIds.length > 1 && selectedConnectionIds.includes(conn.id);
            const selectionStrokeCol = isMultiWireSel
              ? 'rgba(110, 185, 255, 0.9)'
              : 'rgba(0, 220, 210, 0.9)';
            const strokeW = resolved.strokeWidth;
            const flowClass =
              resolved.animation === 'forward'
                ? 'connection-line--flow-forward'
                : resolved.animation === 'reverse'
                  ? 'connection-line--flow-reverse'
                  : '';

            /** Selection frame: 10px screen padding around line bbox (incl. round caps). */
            const selectionPadPx = 10;
            const zu = Math.max(Number(zoom) || 1, 0.01);
            const pad = selectionPadPx / zu;
            const halfStroke = strokeW / 2;
            const { frameX, frameY, frameW, frameH } = bboxFromSegments(
              segments,
              halfStroke,
              pad
            );
            const frameStrokeU = Math.max(1.25 / zu, 0.5);

            const useGradientStroke = gradientLine != null;
            const endStop = resolved.stops[resolved.stops.length - 1];
            const segmentStroke = useGradientStroke
              ? `url(#${gradientId})`
              : endStop.color;
            const segmentStrokeOpacity = useGradientStroke ? undefined : endStop.opacity;

            const { squeezeText } = getCanvasLabelFlags(fontPxDelta);
            const wireLen = segments.reduce(
              (s, [ax, ay, bx, by]) => s + Math.hypot(bx - ax, by - ay),
              0,
            );
            const voltLabelMaxW = Math.max(48, wireLen * 0.92);

            return (
              <g
                key={conn.id}
                style={{
                  cursor: 'pointer',
                  ...(resolved.dropShadowCss ? { filter: resolved.dropShadowCss } : {}),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectConnection(conn, { shiftKey: e.shiftKey });
                }}
                onContextMenu={(e) => handleConnectionContextMenu(e, conn)}
              >
                {isConnHighlighted && (
                  <rect
                    x={frameX}
                    y={frameY}
                    width={frameW}
                    height={frameH}
                    fill="none"
                    stroke={selectionStrokeCol}
                    strokeWidth={frameStrokeU}
                    className="connection-line--selection-frame"
                    pointerEvents="none"
                  />
                )}
                {segments.map(([x1, y1, x2, y2], segIdx) => (
                  <line
                    key={segIdx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={segmentStroke}
                    strokeOpacity={segmentStrokeOpacity}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={resolved.animation !== 'none' ? '12 8' : undefined}
                    className={`connection-line ${flowClass}${isConnHighlighted ? ' connection-line--selected' : ''}`}
                    pointerEvents="stroke"
                  />
                ))}
                <text
                  x={(fromCenterX + toCenterX) / 2}
                  y={(fromCenterY + toCenterY) / 2 + 18}
                  fill="#b0bec5"
                  fontSize={adjSvgFontPx(11, fontPxDelta)}
                  textAnchor="middle"
                  pointerEvents="none"
                  {...fittedLineAttrs(voltLabelMaxW, squeezeText)}
                >
                  {conn.voltage > 0 ? `${conn.voltage} kV` : ''}
                </text>

                {/* Directional flow arrows — only visible during simulation */}
                {simulationRunning && row.isEnergized && resolved.flowArrows !== 'none' && (() => {
                  // Build SVG path string from segments
                  const segs = resolved.flowArrows === 'reverse'
                    ? [...segments].reverse().map(([x1, y1, x2, y2]) => [x2, y2, x1, y1])
                    : segments;
                  if (segs.length === 0) return null;
                  let pathD = `M ${segs[0][0]},${segs[0][1]}`;
                  for (const [, , px2, py2] of segs) pathD += ` L ${px2},${py2}`;
                  const totalLen = segs.reduce(
                    (s, [ax, ay, bx, by]) => s + Math.hypot(bx - ax, by - ay), 0
                  );
                  if (totalLen < 8) return null;
                  // Arrow color: always bright white-ish so it's visible over any wire
                  const arrowColor = 'rgba(255,255,255,0.92)';
                  const speed = 90; // canvas-px per second
                  const duration = Math.max(0.8, totalLen / speed);
                  const count = Math.min(5, Math.max(2, Math.floor(totalLen / 60)));
                  return Array.from({ length: count }, (_, i) => (
                    <polygon
                      key={`fa-${conn.id}-${i}`}
                      points="-5,-4 5,0 -5,4"
                      fill={arrowColor}
                      pointerEvents="none"
                      style={{
                        offsetPath: `path("${pathD}")`,
                        offsetRotate: 'auto',
                        transformBox: 'fill-box',
                        transformOrigin: 'center',
                        animation: `flowArrowPath ${duration}s linear infinite`,
                        animationDelay: `${-(i * duration / count)}s`,
                      }}
                    />
                  ));
                })()}
              </g>
            );
          })}

          {tieCollapsedStubSegments.map((seg) => {
            const rst = tieCollapsedStubRenderResolved;
            const endStop = rst.stops[rst.stops.length - 1];
            return (
              <line
                key={seg.key}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={endStop.color}
                strokeOpacity={endStop.opacity == null ? 1 : endStop.opacity}
                strokeWidth={rst.strokeWidth}
                strokeLinecap="round"
                pointerEvents="none"
                style={
                  rst.dropShadowCss ? { filter: rst.dropShadowCss } : undefined
                }
              />
            );
          })}

          {/* Temporary connection line while connecting */}
          {connecting && connectingTo && (() => {
            const fromComp = components.find(c => c.id === connecting);
            if (!fromComp) return null;

            const fromVisual = getComponentVisualConfig(fromComp.type);
            const s0 = getCanvasBlockTypeScale(canvasBlockTypeScale, fromComp.type);
            const fromWidth = (fromComp.visualOverrides?.width || fromVisual.width) * s0;
            const fromHeight = (fromComp.visualOverrides?.height || fromVisual.height) * s0;
            const fromCenterX = fromComp.position.x + fromWidth / 2;
            const fromCenterY = fromComp.position.y + fromHeight / 2;
            const mx = connectingTo.x;
            const my = connectingTo.y;
            const hoverStub = {
              position: { x: mx - 0.5, y: my - 0.5 },
              type: 'bus-knot',
            };
            const { segments: previewSegs } = orthogonalEdgeConnection(
              fromComp,
              hoverStub,
              fromWidth,
              fromHeight,
              1,
              1,
              fromCenterX,
              fromCenterY,
              mx,
              my
            );

            return (
              <g pointerEvents="none" opacity={0.85}>
                {previewSegs.map(([x1, y1, x2, y2], i) => (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#8a8a8a"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            );
          })()}

          {/* Render components */}
            {renderComponents.map((component) => (
            <CanvasBlock
              key={component.id}
              component={component}
              isSelected={selectedComponent?.id === component.id}
              isMultiSelected={isComponentMultiSelected(component.id)}
              isDragging={draggingComponent === component.id}
              mode={mode}
              simulationRunning={simulationRunning}
              presenceForcedOffline={presenceForcedOfflineIds?.has?.(component.id) ?? false}
              simulationData={simulationData}
              ensembleMemberSimulationData={ensembleMemberSimulationData}
              simulationTime={simulationTime}
              simulationColumns={simulationColumns}
              ensembleColumnGroups={ensembleColumnGroups}
              onMouseDown={stableHandleComponentMouseDown}
              onMouseUp={stableHandleComponentMouseUp}
              onContextMenu={stableHandleComponentContextMenu}
              onOpenChart={stableOnOpenChart}
              onUpdateComponent={stableOnUpdateComponent}
              onResizeStart={setResizingComponent}
              designSelectSingle={stableDesignSelectSingle}
              blockTypeScale={canvasBlockTypeScale}
              onNudgeCanvasBlockTypeScale={onNudgeCanvasBlockTypeScale}
            />
          ))}
        </g>
      </svg>

      <GasTurbine3DOverlays
        components={components}
        pan={pan}
        zoom={zoom}
        canvasRef={canvasRef}
        blockTypeScale={canvasBlockTypeScale}
      />

      {/* Canvas info overlay */}
      <div className="canvas-info">
        <div>Zoom: {(zoom * 100).toFixed(0)}%</div>
        <div>Components: {components.length}</div>
        <div>Connections: {connections.length}</div>
        {mode === 'design' && viewMode === 'designer' && (
          <div className="canvas-hint">
            💡 Drag-select · ⌘C/⌘V paste · drag any selected block to move group · Alt+Drag pan
          </div>
        )}
      </div>
      
      {/* Multi-selection counter overlay */}
      {selectedComponents.length > 0 && (
        <div className="multi-select-counter">
          <div className="multi-select-badge">
            <span className="multi-select-check">✓</span>
            <span className="multi-select-count">{selectedComponents.length} Selected</span>
          </div>
          <div className="multi-select-actions">
            <button 
              className="multi-select-btn clear-btn"
              onClick={onClearMultiSelection}
              title="Clear selection (Escape)"
            >
              Clear
            </button>
            <button 
              className="multi-select-btn chart-btn"
              onClick={(e) => {
                // This will be implemented in Step 7-8 (context menu for multi-select)
                console.log('📊 Chart button clicked for multi-selection');
              }}
              title="Create multi-component chart"
            >
              📊 Chart...
            </button>
          </div>
        </div>
      )}

      {selectedConnectionIds.length > 1 && (
        <div className="multi-select-counter">
          <div className="multi-select-badge">
            <span className="multi-select-check">✓</span>
            <span className="multi-select-count">
              {selectedConnectionIds.length} lines selected
            </span>
          </div>
          <div className="multi-select-actions">
            <button
              type="button"
              className="multi-select-btn clear-btn"
              onClick={onClearConnectionMultiSelection}
              title="Clear line selection (Escape)"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Chart Context Menu */}
      {contextMenu && contextMenu.type === 'single-component' && (
        <ChartContextMenu
          position={contextMenu.position}
          componentName={contextMenu.component.name}
          component={contextMenu.component}
          canConfigureConnectionReadout={canAddCharts}
          onConfigureConnectionReadout={() =>
            onConfigureConnectionReadout?.(contextMenu.component)
          }
          onClose={() => setContextMenu(null)}
          onSelectChartType={handleChartTypeSelected}
          onToggleInitialOpen={
            mode === 'design'
              ? () => {
                  const comp = contextMenu.component;
                  const next = comp.initialSimStatus === 'open' ? null : 'open';
                  stableOnUpdateComponent(comp.id, { initialSimStatus: next });
                }
              : undefined
          }
        />
      )}
      
      {/* Multi-Component Context Menu */}
      {contextMenu && contextMenu.type === 'multi-component' && (
        <MultiComponentContextMenu
          position={contextMenu.position}
          components={contextMenu.components}
          variableDrivenPresence={variableDrivenPresence}
          onClose={() => setContextMenu(null)}
          onSelectChartType={handleMultiComponentChartTypeSelected}
          onConfigureVariablePresence={
            simulationColumns.length > 0 && onOpenVariablePresenceDialog
              ? () => {
                  onOpenVariablePresenceDialog(contextMenu.components);
                  setContextMenu(null);
                }
              : undefined
          }
          onSetInitialSimStatus={
            mode === 'design'
              ? (status) => {
                  contextMenu.components.forEach((comp) => {
                    stableOnUpdateComponent(comp.id, { initialSimStatus: status ?? null });
                  });
                }
              : undefined
          }
        />
      )}

      {contextMenu && contextMenu.type === 'multi-connection' && (
        <MultiConnectionContextMenu
          position={contextMenu.position}
          connections={contextMenu.connections}
          variableDrivenPresence={variableDrivenPresence}
          onClose={() => setContextMenu(null)}
          onConfigureVariablePresence={
            simulationColumns.length > 0 && onOpenVariablePresenceDialogConnections
              ? () => {
                  onOpenVariablePresenceDialogConnections(contextMenu.connections);
                  setContextMenu(null);
                }
              : undefined
          }
        />
      )}

      {/* Multi-Component Chart Configuration Dialog */}
      {showMultiChartDialog && (
        <MultiComponentChartDialog
          chartType={multiChartType}
          components={multiChartComponents}
          onClose={() => setShowMultiChartDialog(false)}
          onCreateChart={handleCreateMultiChart}
          simulationColumns={simulationColumns}
          simulationCsvName={simulationCsvName}
        />
      )}
      
      {/* Keyboard Shortcuts Help */}
      {mode === 'design' && <KeyboardShortcuts />}
    </div>
  );
});

export default Canvas;
