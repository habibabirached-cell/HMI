import { HD_AERO_CB_A_ID, HD_AERO_CB_B_ID } from './hdAeroBreakerPresets';

export const HD_AERO_CB_EVENT_LABELS = {
  [HD_AERO_CB_B_ID]: 'LOAD 2 CONNECTED',
  [HD_AERO_CB_A_ID]: 'AERO ONLINE',
};

const EVENT_LINE_COLOR = '#26c6da';
const EVENT_LABEL_COLOR = '#80deea';

export function labelForHdAeroCbEvent(cbId) {
  return HD_AERO_CB_EVENT_LABELS[cbId] ?? 'CB EVENT';
}

/** Frequency + Power timeline charts in the HD_Aero demo. */
export function chartSupportsHdAeroCbEventMarkers(chart) {
  if (!chart) return false;
  const title = String(chart.title || '').trim();
  return /^frequency$/i.test(title) || /^power$/i.test(title);
}

function eventLineShape(x) {
  return {
    type: 'line',
    xref: 'x',
    yref: 'paper',
    x0: x,
    x1: x,
    y0: 0,
    y1: 1,
    line: { color: EVENT_LINE_COLOR, width: 2, dash: 'dash' },
    layer: 'above',
  };
}

function eventLabelAnnotation(x, text) {
  return {
    x,
    y: 1,
    xref: 'x',
    yref: 'paper',
    text,
    showarrow: false,
    xanchor: 'left',
    yanchor: 'bottom',
    xshift: 4,
    yshift: -2,
    font: {
      family: 'Arial, sans-serif',
      size: 10,
      color: EVENT_LABEL_COLOR,
      weight: 700,
    },
    bgcolor: 'rgba(0, 0, 0, 0.55)',
    bordercolor: EVENT_LINE_COLOR,
    borderwidth: 1,
    borderpad: 3,
  };
}

/** Vertical CB-close markers + labels on Frequency / Power charts. */
export function applyHdAeroCbEventMarkersLayout(layout, chart, events) {
  if (!layout || !chartSupportsHdAeroCbEventMarkers(chart) || !events?.length) {
    return layout;
  }

  const shapes = [];
  const annotations = [];
  for (const ev of events) {
    const t = Number(ev?.time);
    if (!Number.isFinite(t)) continue;
    const label = ev.label ?? labelForHdAeroCbEvent(ev.cbId);
    shapes.push(eventLineShape(t));
    annotations.push(eventLabelAnnotation(t, label));
  }

  return {
    ...layout,
    shapes: [...(layout.shapes || []), ...shapes],
    annotations: [...(layout.annotations || []), ...annotations],
  };
}
