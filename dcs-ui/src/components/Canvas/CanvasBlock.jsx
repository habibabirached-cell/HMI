import React from 'react';
import ComponentEmbeddedSparklines from './ComponentEmbeddedSparklines';
import ComponentConnectionReadout from './ComponentConnectionReadout';
import { getComponentVisualConfig } from '../../data/componentVisuals';
import {
  tieEffectiveDimensions,
  isTieStripMode,
  isTieBreakerNetwork,
} from '../../utils/tieBreakerNetwork';
import {
  gasTurbineBankEffectiveDimensions,
  isGasTurbineBankStripMode,
  isGasTurbineBank,
} from '../../utils/gasTurbineBank';
import { useCanvasFontPxDelta, useCollapsedComponentFontPxDelta } from '../../contexts/FontScaleContext';
import { adjSvgFontPx } from '../../utils/svgFontDelta';
import { strokeForStatus, getScaledCanvasBlockDimensions } from './shapes/canvasBlockUtils';
import { isCollapseAggregateSurfaceComponent, isAuxLoadsCollapseAggregateSurface } from '../../utils/collapseAggregate';
import CanvasComponentBody from './shapes/CanvasComponentBody';

const STRETCHABLE_VERTICAL = ['bus-hv-vertical'];
const STRETCHABLE_HORIZONTAL = ['bus-hv'];
/** Buses use explicit resize handles; type-scale controls would fight saved raw dimensions. */
const TYPE_SCALE_EXCLUDED = new Set([...STRETCHABLE_VERTICAL, ...STRETCHABLE_HORIZONTAL]);

const BLOCK_TYPE_NUDGE = 1.02;

/**
 * One schematic block on the canvas: body, labels, status, chart shortcuts, resize handles.
 * Memoized so a200+ block diagram does not reconcile every block when only selection changes.
 */
function CanvasBlock({
  component,
  isSelected,
  isMultiSelected,
  isDragging,
  mode,
  simulationRunning,
  simulationData = [],
  ensembleMemberSimulationData = null,
  simulationTime = 0,
  simulationColumns = [],
  ensembleColumnGroups = [],
  presenceForcedOffline = false,
  onMouseDown,
  onMouseUp,
  onContextMenu,
  onOpenChart,
  onUpdateComponent,
  onResizeStart,
  designSelectSingle,
  blockTypeScale = {},
  onNudgeCanvasBlockTypeScale,
  expandGasTurbineBankId = null,
  onExpandGasTurbineBank,
  allComponents = [],
}) {
  const fontPxDelta = useCanvasFontPxDelta();
  const collapsedFontPxDelta = useCollapsedComponentFontPxDelta();
  const labelFontPxDelta = isCollapseAggregateSurfaceComponent(component, allComponents)
    ? collapsedFontPxDelta
    : fontPxDelta;
  const collapseAggregateArt = isAuxLoadsCollapseAggregateSurface(component, allComponents);
  const tieStrip = isTieStripMode(component);
  const gasBankStrip = isGasTurbineBankStripMode(component);
  const stripMode = tieStrip || gasBankStrip;
  const visualConfig = getComponentVisualConfig(component.type);
  const { width: baseWidth, height: baseHeight } = getScaledCanvasBlockDimensions(
    component,
    visualConfig,
    blockTypeScale,
  );
  const { width, height } = isGasTurbineBank(component)
    ? gasTurbineBankEffectiveDimensions(component, baseWidth, baseHeight)
    : tieEffectiveDimensions(component, baseWidth, baseHeight);
  const rotation = component.visualOverrides?.rotation || 0;

  const centerX = width / 2;
  const centerY = height / 2;
  const presentationOffline = presenceForcedOffline;
  const { strokeColor, strokeWidthVal } = strokeForStatus(component, isSelected, presentationOffline);

  const showBlockTypeScaleUi =
    mode === 'design' &&
    isSelected &&
    !isMultiSelected &&
    onNudgeCanvasBlockTypeScale &&
    !stripMode &&
    !TYPE_SCALE_EXCLUDED.has(component.type);

  return (
    <g
      transform={`translate(${component.position.x},${component.position.y})`}
      onMouseDown={(e) => onMouseDown(e, component)}
      onMouseUp={(e) => onMouseUp(e, component)}
      onDoubleClick={(e) => {
        const tg = component.properties?.tieGroup;
        if (isTieBreakerNetwork(component) && tg?.memberIds?.length) {
          if (tg.collapsed === false || stripMode) return;
          e.stopPropagation();
          if (!onUpdateComponent) return;
          onUpdateComponent(component.id, {
            properties: {
              ...component.properties,
              tieGroup: { ...tg, collapsed: false },
            },
          });
          return;
        }
        const gg = component.properties?.gasTurbineGroup;
        if (isGasTurbineBank(component) && gg?.memberIds?.length) {
          if (gg.collapsed === false || stripMode) return;
          e.stopPropagation();
          if (!onUpdateComponent) return;
          onUpdateComponent(component.id, {
            properties: {
              ...component.properties,
              gasTurbineGroup: { ...gg, collapsed: false },
            },
          });
        }
        if (expandGasTurbineBankId && onExpandGasTurbineBank) {
          e.stopPropagation();
          onExpandGasTurbineBank(expandGasTurbineBankId);
        }
      }}
      onContextMenu={(e) => onContextMenu(e, component)}
      className={`canvas-component${isTieBreakerNetwork(component) ? ' canvas-tie-breaker-network' : ''}${isGasTurbineBank(component) ? ' canvas-gas-turbine-bank' : ''} ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ cursor: mode === 'design' ? 'move' : 'pointer' }}
    >
      <g transform={`rotate(${rotation} ${centerX} ${centerY})`}>
        {(isSelected || isMultiSelected) && (
          <rect
            x={-7}
            y={-7}
            width={width + 14}
            height={height + 14}
            rx={Math.min(12, height * 0.11)}
            ry={Math.min(12, height * 0.11)}
            fill={
              isMultiSelected
                ? 'rgba(0, 102, 255, 0.078)'
                : 'rgba(0, 94, 96, 0.086)'
            }
            stroke={
              isMultiSelected
                ? 'rgba(110, 185, 255, 0.7)'
                : 'rgba(0, 200, 188, 0.66)'
            }
            strokeWidth={1.65}
            pointerEvents="none"
          />
        )}

        {!stripMode && (
          <CanvasComponentBody
            component={component}
            visualConfig={visualConfig}
            width={width}
            height={height}
            strokeColor={strokeColor}
            strokeWidthVal={strokeWidthVal}
            presentationOffline={presenceForcedOffline}
            labelFontPxDelta={labelFontPxDelta}
            collapseAggregateArt={collapseAggregateArt}
          />
        )}

        {stripMode && (
          <g className="tiebreaker-network-strip">
            {/** Narrow strip bbox (see tieEffectiveDimensions); only collapse dots occupy it. */}
            <defs>
              <filter id={`tie-strip-dot-glow-${String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`} x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {(() => {
              const glowPad = 4;
              const cy = Math.max(9, Math.min(12, height * 0.38));
              const r = Math.max(2.2, Math.min(3.2, width * 0.1));
              const spread = Math.min(Math.max(width * 0.24, 5.5), 11);
              const mid = width / 2;
              const hitH = Math.min(height, Math.ceil(cy + r + glowPad + 2));
              const glowId = `tie-strip-dot-glow-${String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
              return (
                <>
                  <rect
                    x={0}
                    y={0}
                    width={width}
                    height={Math.min(hitH, height)}
                    fill="transparent"
                    stroke="none"
                    style={{ cursor: mode === 'design' ? 'pointer' : 'default' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (mode === 'design' && typeof designSelectSingle === 'function') {
                        designSelectSingle(component);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!onUpdateComponent) return;
                      const tg = component.properties?.tieGroup;
                      if (isTieBreakerNetwork(component) && tg?.memberIds?.length) {
                        onUpdateComponent(component.id, {
                          properties: {
                            ...component.properties,
                            tieGroup: { ...tg, collapsed: true },
                          },
                        });
                        return;
                      }
                      const gg = component.properties?.gasTurbineGroup;
                      if (isGasTurbineBank(component) && gg?.memberIds?.length) {
                        onUpdateComponent(component.id, {
                          properties: {
                            ...component.properties,
                            gasTurbineGroup: { ...gg, collapsed: true },
                          },
                        });
                      }
                    }}
                  >
                    {mode === 'design' ? (
                      <title>
                        {isGasTurbineBank(component)
                          ? 'Collapse generation aisle into 3D preview — click dots'
                          : 'Collapse into tie summary block — click dots at top'}
                      </title>
                    ) : null}
                  </rect>
                  {[mid - spread, mid, mid + spread].map((cx, idx) => (
                    <circle
                      key={`tie-strip-dot-${idx}`}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={visualConfig.color || '#2e7d7d'}
                      fillOpacity={0.5}
                      stroke={strokeColor}
                      strokeWidth={strokeWidthVal * 0.55}
                      filter={`url(#${glowId})`}
                      opacity={0.92}
                      pointerEvents="none"
                    />
                  ))}
                </>
              );
            })()}
          </g>
        )}

        {!stripMode && component.embeddedSparklines?.length > 0 &&
          (simulationData?.length > 0 ||
            (component.embeddedSparklines || []).some(
              (s) =>
                (s.ensembleSimId &&
                  ensembleMemberSimulationData?.[s.ensembleSimId]?.length) ||
                (s.ensembleCrossMember && ensembleMemberSimulationData),
            )) && (
          <ComponentEmbeddedSparklines
            embeddedSparklines={component.embeddedSparklines}
            simulationData={simulationData}
            ensembleMemberSimulationData={ensembleMemberSimulationData}
            simulationTime={simulationTime}
            simulationRunning={simulationRunning}
            width={width}
            height={height}
            bottomReservedPx={10 + (component.charts?.length || 0) * 12}
          />
        )}

        {!stripMode && simulationRunning && (
          <circle
            cx={width - 10}
            cy="10"
            r="4"
            fill={
              presentationOffline ||
              component.status === 'offline' ||
              component.status === 'tripped' ||
              component.status === 'open'
                ? '#f44336'
                : component.status === 'idle'
                  ? '#666'
                  : '#4caf50'
            }
          />
        )}

        {isMultiSelected && (
          <g>
            <circle
              cx={width - 10}
              cy="10"
              r="8"
              fill="#0066ff"
              stroke="#0099ff"
              strokeWidth="2"
            />
            <text
              x={width - 10}
              y="14"
              textAnchor="middle"
              fill="white"
              fontSize={adjSvgFontPx(12, fontPxDelta)}
              fontWeight="bold"
              pointerEvents="none"
            >
              ✓
            </text>
          </g>
        )}

        {!stripMode && component.charts && component.charts.length > 0 && (
          <g>
            {component.charts.map((chart, index) => {
              const buttonY = height - 12 - ((component.charts.length - 1 - index) * 12);
              const chartLabels = {
                '2d': '2D',
                histogram: 'Hist',
                pie: 'Pie',
                bar: 'Bar',
                '3d': '3D',
                heatmap: 'Heat',
                box: 'Box',
              };
              const label = chartLabels[chart.chartType] || chart.chartType;

              return (
                <g
                  key={chart.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenChart) {
                      onOpenChart(component, chart);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x="4"
                    y={buttonY}
                    width="28"
                    height="10"
                    fill="rgba(255, 152, 0, 0.2)"
                    stroke="#ff9800"
                    strokeWidth="1"
                    rx="2"
                    className="chart-button"
                  />
                  <text
                    x="18"
                    y={buttonY + 7}
                    textAnchor="middle"
                    fill="#ff9800"
                    fontSize={adjSvgFontPx(7, fontPxDelta)}
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {mode === 'design' && isSelected && onUpdateComponent && !stripMode && (
          <>
            {STRETCHABLE_VERTICAL.includes(component.type) && (
              <>
                <rect
                  x={centerX - 6}
                  y={0}
                  width={12}
                  height={10}
                  fill="#005E60"
                  stroke="#00d4a8"
                  strokeWidth={1}
                  rx={2}
                  style={{ cursor: 'ns-resize' }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onResizeStart({ id: component.id, handle: 'top' });
                  }}
                />
                <rect
                  x={centerX - 6}
                  y={height - 10}
                  width={12}
                  height={10}
                  fill="#005E60"
                  stroke="#00d4a8"
                  strokeWidth={1}
                  rx={2}
                  style={{ cursor: 'ns-resize' }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onResizeStart({ id: component.id, handle: 'bottom' });
                  }}
                />
              </>
            )}
            {STRETCHABLE_HORIZONTAL.includes(component.type) && (
              <>
                <rect
                  x={0}
                  y={centerY - 6}
                  width={10}
                  height={12}
                  fill="#005E60"
                  stroke="#00d4a8"
                  strokeWidth={1}
                  rx={2}
                  style={{ cursor: 'ew-resize' }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onResizeStart({ id: component.id, handle: 'left' });
                  }}
                />
                <rect
                  x={width - 10}
                  y={centerY - 6}
                  width={10}
                  height={12}
                  fill="#005E60"
                  stroke="#00d4a8"
                  strokeWidth={1}
                  rx={2}
                  style={{ cursor: 'ew-resize' }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onResizeStart({ id: component.id, handle: 'right' });
                  }}
                />
              </>
            )}
          </>
        )}

        {showBlockTypeScaleUi && (
          <g
            className="canvas-block-type-scale-ui"
            pointerEvents="all"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <g transform={`translate(${Math.max(4, width - 46)}, 4)`}>
              <title>
                Enlarge every {component.type} block (~{Math.round((BLOCK_TYPE_NUDGE - 1) * 100)}%) —
                font size unchanged
              </title>
              <rect
                x={0}
                y={0}
                width={18}
                height={16}
                rx={3}
                fill="rgba(0, 0, 0, 0.72)"
                stroke="rgba(0, 212, 168, 0.85)"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNudgeCanvasBlockTypeScale(component.type, BLOCK_TYPE_NUDGE);
                }}
              />
              <text
                x={9}
                y={12}
                textAnchor="middle"
                fill="#e8f7f4"
                fontSize={adjSvgFontPx(12, fontPxDelta)}
                fontWeight="700"
                pointerEvents="none"
              >
                +
              </text>
            </g>
            <g transform={`translate(${Math.max(4, width - 26)}, 4)`}>
              <title>
                Shrink every {component.type} block (~{Math.round((1 - 1 / BLOCK_TYPE_NUDGE) * 100)}%) —
                font size unchanged
              </title>
              <rect
                x={0}
                y={0}
                width={18}
                height={16}
                rx={3}
                fill="rgba(0, 0, 0, 0.72)"
                stroke="rgba(0, 212, 168, 0.85)"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNudgeCanvasBlockTypeScale(component.type, 1 / BLOCK_TYPE_NUDGE);
                }}
              />
              <text
                x={9}
                y={12}
                textAnchor="middle"
                fill="#e8f7f4"
                fontSize={adjSvgFontPx(12, fontPxDelta)}
                fontWeight="700"
                pointerEvents="none"
              >
                −
              </text>
            </g>
          </g>
        )}
      </g>

      {!stripMode && (
        <ComponentConnectionReadout
          connectionReadout={component.connectionReadout}
          simulationData={simulationData}
          ensembleMemberSimulationData={ensembleMemberSimulationData}
          ensembleColumnGroups={ensembleColumnGroups}
          singleSimColumns={simulationColumns}
          simulationTime={simulationTime}
          width={width}
          height={height}
        />
      )}
    </g>
  );
}

export default React.memo(CanvasBlock);
