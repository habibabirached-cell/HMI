/** Max points retained per live RTDS channel (rolling window). */
export const LIVE_RTDS_MAX_POINTS = 3000;

export const LIVE_RTDS_PRESET = 'LiveRtds';
export const LIVE_RTDS_COLOR = '#2e7d32';

/** Display-only formatter for RTDS axis labels (does not affect plotted values). */
export const LIVE_RTDS_Y_TICK_FORMAT = '.8f';

/** Left plot margin (px) for RTDS Y tick labels (e.g. 1234.5678) and axis title. */
export const LIVE_RTDS_CHART_MARGIN_LEFT = 110;

export function appendLiveRtdsPoint(series, t, v) {
  if (!Number.isFinite(v)) return series;
  const next = [...(series || []), { t, v }];
  if (next.length <= LIVE_RTDS_MAX_POINTS) return next;
  return next.slice(-LIVE_RTDS_MAX_POINTS);
}

/** Two Plotly charts: W (speed) in chart1, Te in chart2 — conf4 layout. */
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
      id: `live-rtds-te-${ts}`,
      chartType: '2d',
      title: 'Te',
      xLabel: 'Time (seconds)',
      yLabel: 'Te',
      liveRtdsChannel: 'Te',
      uiDrawer: 'chart2',
      axisRange: { xLocked: false, yLocked: false },
    },
  ];
}

export function emptyLiveRtdsSeries() {
  return { active: false, W: [], Tm: [], Te: [] };
}
