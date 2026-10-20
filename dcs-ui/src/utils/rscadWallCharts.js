/**
 * Live RSCAD plots for the p2r_chil wall.
 * Configuration #3: 2×2 drawer on the right two screens.
 * Time is a sample counter (0.1 s), not Simtime.
 */

import { appendLiveRtdsPoint } from './liveRtdsCharts';

export const RSCAD_SAMPLE_DT_S = 0.1;
export const RSCAD_CHARTS_OPEN_COMMAND = 'rscadChartsOpen';
export const RSCAD_METER_SAMPLE_COMMAND = 'rscadMeterSample';

const LOAD_COLOR = '#005E60';
const GENERATOR_COLOR = '#E0A045';
const FREQUENCY_COLOR = '#2E9B6A';
const VOLTAGE_GEN_COLOR = '#3D9BDC';

export function isRscadWallChart(chart) {
  return Array.isArray(chart?.rscadTraces) && chart.rscadTraces.length > 0;
}

export function rscadWallSampleFromMeters(meters, index) {
  if (!meters || typeof meters !== 'object') return null;
  if (meters.status || meters.error || meters.command) return null;
  const num = (...keys) => {
    for (const key of keys) {
      if (meters[key] == null || meters[key] === '') continue;
      const value = Number(meters[key]);
      if (Number.isFinite(value)) return value;
    }
    return null;
  };
  const loadDemand = num('P_UPS_LOAD');
  const generator = num('PMAC1', 'PMAC');
  const speed = num('W1', 'W');
  const voltageLoad = num('LoadSideV_rms_pu');
  const voltageGen = num('VGB1', 'VGB');
  if (
    loadDemand == null
    && generator == null
    && speed == null
    && voltageLoad == null
    && voltageGen == null
  ) {
    return null;
  }
  return {
    t: index * RSCAD_SAMPLE_DT_S,
    loadDemand,
    generator,
    frequency: speed == null ? null : speed / (2 * Math.PI),
    voltageLoad,
    voltageGen,
  };
}

function wallChart({ id, title, yLabel, yMin, yMax, drawer, traces }) {
  return {
    id,
    chartType: '2d',
    title,
    xLabel: 'Time (seconds)',
    yLabel,
    rscadTraces: traces,
    uiDrawer: drawer,
    axisRange: { xLocked: false, yLocked: true, yMin, yMax },
  };
}

/** chart1 top-left of the right drawer, then chart2, chart3, chart4. */
export function buildRscadWallOpenCharts() {
  const stamp = Date.now();
  return [
    wallChart({
      id: `rscad-load-${stamp}`,
      title: 'Data center load',
      yLabel: 'Load demand (megawatts)',
      yMin: 50,
      yMax: 150,
      drawer: 'chart1',
      traces: [{ channel: 'loadDemand', name: 'Load demand', color: LOAD_COLOR }],
    }),
    wallChart({
      id: `rscad-generator-${stamp}`,
      title: 'LM2500 #1',
      yLabel: 'Power (megawatt)',
      yMin: 0,
      yMax: 30,
      drawer: 'chart2',
      traces: [{ channel: 'generator', name: 'LM2500 #1', color: GENERATOR_COLOR }],
    }),
    wallChart({
      id: `rscad-frequency-${stamp}`,
      title: 'Grid frequency',
      yLabel: 'Frequency (hertz)',
      yMin: 55,
      yMax: 65,
      drawer: 'chart3',
      traces: [{ channel: 'frequency', name: 'Frequency', color: FREQUENCY_COLOR }],
    }),
    wallChart({
      id: `rscad-voltage-${stamp}`,
      title: 'Voltage',
      yLabel: 'Normalized Voltage',
      yMin: 0.9,
      yMax: 1.1,
      drawer: 'chart4',
      traces: [
        { channel: 'voltageGen', name: 'At the generators', color: VOLTAGE_GEN_COLOR },
      ],
    }),
  ];
}

export function emptyRscadWallSeries() {
  return {
    active: true,
    loadDemand: [],
    generator: [],
    frequency: [],
    voltageLoad: [],
    voltageGen: [],
  };
}

export function appendRscadWallSample(series, sample) {
  const base = series?.loadDemand ? { ...series, active: true } : emptyRscadWallSeries();
  const t = Number(sample?.t);
  if (!Number.isFinite(t)) return base;
  return {
    ...base,
    active: true,
    loadDemand: appendLiveRtdsPoint(base.loadDemand, t, Number(sample.loadDemand)),
    generator: appendLiveRtdsPoint(base.generator, t, Number(sample.generator)),
    frequency: appendLiveRtdsPoint(base.frequency, t, Number(sample.frequency)),
    voltageLoad: appendLiveRtdsPoint(base.voltageLoad, t, Number(sample.voltageLoad)),
    voltageGen: appendLiveRtdsPoint(base.voltageGen, t, Number(sample.voltageGen)),
  };
}

export function rscadWallChartHasPoints(chart, series) {
  if (!isRscadWallChart(chart) || !series?.active) return false;
  return chart.rscadTraces.some((trace) => (series[trace.channel]?.length ?? 0) > 0);
}
