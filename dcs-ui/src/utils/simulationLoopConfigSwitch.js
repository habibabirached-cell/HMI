/**
 * In-place ensemble preset switch during simulate-loop playback.
 * Keeps chart cards on screen, remaps data bindings, and preserves drawn history.
 */

import { ENSEMBLE_COLUMN_SEP } from './simulationLazyApi';
import {
  buildLoopPlaybackSamples,
  getChartLoopBounds,
} from './simulationLoopPlayback';

export function getBareColumnName(col) {
  if (col == null) return '';
  const s = String(col);
  const idx = s.indexOf(ENSEMBLE_COLUMN_SEP);
  return (idx >= 0 ? s.slice(idx + ENSEMBLE_COLUMN_SEP.length) : s).trim();
}

export function getChartBareYColumns(chart) {
  if (chart?.yColumns?.length) {
    return chart.yColumns.map(getBareColumnName).filter(Boolean);
  }
  if (chart?.yColumn) return [getBareColumnName(chart.yColumn)];
  if (chart?.components?.length) {
    return chart.components
      .map((c) => getBareColumnName(c.columnName || c.column))
      .filter(Boolean);
  }
  return [];
}

function getDefBareYColumns(def) {
  if (def?.y_columns?.length) {
    return def.y_columns.map((c) => String(c).trim()).filter(Boolean);
  }
  if (def?.y_column) return [String(def.y_column).trim()];
  if (def?.components?.length) {
    return def.components
      .map((c) => String(c.columnName || c.column || '').trim())
      .filter(Boolean);
  }
  return [];
}

function bareYKey(cols) {
  return [...cols].sort().join('|');
}

/** Match open chart to a preset chart def by bare Y names; tie-break by slot index. */
export function findMatchingPresetChartDef(openChart, presetCharts, slotIndex) {
  const openKey = bareYKey(getChartBareYColumns(openChart));
  if (!openKey) return null;
  const candidates = (presetCharts || []).filter((def) => bareYKey(getDefBareYColumns(def)) === openKey);
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  const slotDef = presetCharts?.[slotIndex];
  if (slotDef && candidates.includes(slotDef)) return slotDef;
  return candidates[0];
}

function axisRangeFromDef(chartDef) {
  const a = chartDef?.axis_range;
  if (a == null || typeof a !== 'object') return undefined;
  const xL = a.x_locked ?? false;
  const yL = a.y_locked ?? false;
  return {
    xLocked: xL,
    yLocked: yL,
    ...(a.x_threshold != null && Number.isFinite(Number(a.x_threshold))
      ? { xThreshold: Number(a.x_threshold) }
      : {}),
    ...(a.danger_y_threshold != null && Number.isFinite(Number(a.danger_y_threshold))
      ? { dangerYThreshold: Number(a.danger_y_threshold) }
      : {}),
    ...(a.simulation_start_at != null && Number.isFinite(Number(a.simulation_start_at))
      ? { simulationStartAt: Number(a.simulation_start_at) }
      : {}),
    ...(a.simulation_end_at != null && Number.isFinite(Number(a.simulation_end_at))
      ? { simulationEndAt: Number(a.simulation_end_at) }
      : {}),
    ...(a.t_loop != null && Number.isFinite(Number(a.t_loop)) && Number(a.t_loop) > 0
      ? { tLoop: Number(a.t_loop) }
      : {}),
    ...(a.x_reference != null && Number.isFinite(Number(a.x_reference))
      ? { xReference: Number(a.x_reference) }
      : {}),
    ...(a.frequency_goodness_bands != null
      ? { frequencyGoodnessBands: !!a.frequency_goodness_bands }
      : {}),
    ...(xL
      ? {
          ...(a.x_min != null && { xMin: a.x_min }),
          ...(a.x_max != null && { xMax: a.x_max }),
        }
      : {}),
    ...(yL
      ? {
          ...(a.y_min != null && { yMin: a.y_min }),
          ...(a.y_max != null && { yMax: a.y_max }),
        }
      : {}),
    ...(a.stacked_y_ranges != null && typeof a.stacked_y_ranges === 'object'
      ? {
          stackedYRanges: Object.fromEntries(
            Object.entries(a.stacked_y_ranges).map(([key, row]) => {
              const yLocked = row?.y_locked ?? false;
              return [
                key,
                {
                  yLocked,
                  ...(yLocked
                    ? {
                        ...(row?.y_min != null && { yMin: row.y_min }),
                        ...(row?.y_max != null && { yMax: row.y_max }),
                      }
                    : {}),
                },
              ];
            }),
          ),
        }
      : {}),
  };
}

/** Update data binding fields from a preset chart def; preserve chart card id and layout. */
export function patchChartFromPresetDef(openChart, chartDef, primaryMemberId) {
  if (!chartDef || !openChart) return openChart;
  const csvName = chartDef.ensemble_sim_id
    ? `${chartDef.ensemble_sim_id}.data.csv`
    : `${primaryMemberId}.data.csv`;
  const isNd = chartDef.chart_type === 'nd' && chartDef.y_columns?.length;
  const isPie = chartDef.chart_type === 'pie' && chartDef.y_columns?.length;
  const isStackedNd = chartDef.chart_type === 'stacked-nd' && chartDef.y_columns?.length;

  const patch = {
    csvName,
    ...(chartDef.ensemble_sim_id && !chartDef.ensemble_cross_member
      ? { ensembleSimId: chartDef.ensemble_sim_id }
      : {}),
    ...(chartDef.ensemble_cross_member ? { ensembleCrossMember: true } : { ensembleCrossMember: undefined }),
  };

  if (chartDef.type === 'multi') {
    patch.timeColumn = chartDef.x_column;
    patch.components = chartDef.components || openChart.components;
  } else {
    patch.xColumn = chartDef.x_column ?? openChart.xColumn;
    if (isNd || isPie || isStackedNd) {
      patch.yColumns = chartDef.y_columns;
      if (isStackedNd) {
        patch.splitBy = chartDef.split_by || openChart.splitBy || 'phase';
        if (chartDef.split_by === 'manual' && chartDef.manual_group_breaks?.length) {
          patch.manualGroupBreaks = chartDef.manual_group_breaks;
        }
      }
    } else if (chartDef.y_column) {
      patch.yColumn = chartDef.y_column;
    }
  }

  const axisRange = axisRangeFromDef(chartDef);
  if (axisRange) {
    patch.axisRange = axisRange;
  }

  return { ...openChart, ...patch };
}

/** Freeze samples drawn up to tArrived before rebinding to a new preset member. */
export function snapshotLoopChartHistory(
  chart,
  indexed,
  timeCol,
  tArrived,
  prevState,
  dataBounds,
) {
  const bounds = getChartLoopBounds(chart, dataBounds);
  const displayOrigin = prevState?.displayOrigin ?? null;
  const lastSwitch = prevState?.lastSwitchTime ?? null;

  const samples = buildLoopPlaybackSamples({
    indexed,
    timeCol,
    displayTime: tArrived,
    bounds,
    simulationLoopMode: true,
    displayOrigin,
  });

  const prevFrozen = prevState?.frozenSamples ?? [];
  const segmentStart = lastSwitch ?? -Infinity;
  const newSegment = samples.filter(
    (s) => s.displayX > segmentStart + 1e-9 && s.displayX <= tArrived + 1e-9,
  );

  return {
    frozenSamples: [...prevFrozen, ...newSegment],
    lastSwitchTime: tArrived,
    displayOrigin: tArrived,
    halted: false,
  };
}

/**
 * Plan an in-loop preset switch: snapshot history, remap bindings, mark unmatched charts halted.
 */
export function buildLoopConfigSwitchPlan({
  openCharts,
  presetCharts,
  primaryMemberId,
  tArrived,
  resolveIndexed,
  resolveBounds,
  prevPlaybackState = {},
}) {
  const playbackState = {};
  const updatedCharts = [];
  const sampleStepPatch = {};

  for (let index = 0; index < openCharts.length; index++) {
    const chart = openCharts[index];
    const slotIndex = chart.presetSlotIndex ?? index;
    const prev = prevPlaybackState[chart.id];
    const timeCol = chart.xColumn || chart.timeColumn;
    const indexed = resolveIndexed(chart);
    const dataBounds = resolveBounds(chart);

    const snap = snapshotLoopChartHistory(
      chart,
      indexed,
      timeCol,
      tArrived,
      prev,
      dataBounds,
    );

    const matchDef = findMatchingPresetChartDef(chart, presetCharts, slotIndex);
    if (!matchDef) {
      playbackState[chart.id] = { ...snap, halted: true };
      updatedCharts.push(chart);
      continue;
    }

    playbackState[chart.id] = snap;
    updatedCharts.push(patchChartFromPresetDef(chart, matchDef, primaryMemberId));
    if (matchDef.sample_step != null) {
      sampleStepPatch[chart.id] = matchDef.sample_step;
    }
  }

  return { updatedCharts, playbackState, sampleStepPatch };
}
