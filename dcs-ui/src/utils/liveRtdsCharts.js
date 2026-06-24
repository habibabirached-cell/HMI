/** Max points retained per live RTDS channel (rolling window). */
export const LIVE_RTDS_MAX_POINTS = 3000;

export const LIVE_RTDS_PRESET = 'LiveRtds';
export const LIVE_RTDS_COLOR = '#2e7d32';

export function appendLiveRtdsPoint(series, t, v) {
  if (!Number.isFinite(v)) return series;
  const next = [...(series || []), { t, v }];
  if (next.length <= LIVE_RTDS_MAX_POINTS) return next;
  return next.slice(-LIVE_RTDS_MAX_POINTS);
}

/** Two Plotly charts: W (speed) in chart1, Tm (torque) in chart2 — conf4 layout. */
export function buildLiveRtdsOpenCharts() {
  const ts = Date.now();
  return [
    {
      id: `live-rtds-w-${ts}`,
      chartType: '2d',
      title: 'Speed',
      xLabel: 'Time (seconds)',
      yLabel: 'Speed, rd/second',
      liveRtdsChannel: 'W',
      uiDrawer: 'chart1',
      axisRange: { xLocked: false, yLocked: false },
    },
    {
      id: `live-rtds-tm-${ts}`,
      chartType: '2d',
      title: 'Torque',
      xLabel: 'Time (seconds)',
      yLabel: 'Torque, pu',
      liveRtdsChannel: 'Tm',
      uiDrawer: 'chart2',
      axisRange: { xLocked: false, yLocked: false },
    },
  ];
}

export function emptyLiveRtdsSeries() {
  return { active: false, W: [], Tm: [], Te: [] };
}
