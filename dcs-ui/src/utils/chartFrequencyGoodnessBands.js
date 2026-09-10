/** Nominal grid frequency (Hz). */
export const FREQ_NOMINAL_HZ = 60;

/** Green band: nominal ± this value (Hz). */
export const FREQ_GREEN_HALF_WIDTH_HZ = 0.5;

/** Amber band and red limits: nominal ± this value (Hz). */
export const FREQ_STABILITY_LIMIT_HZ = 1.5;

/** Red limit lines (Hz). */
export const FREQ_RED_LOW_HZ = FREQ_NOMINAL_HZ - FREQ_STABILITY_LIMIT_HZ;
export const FREQ_RED_HIGH_HZ = FREQ_NOMINAL_HZ + FREQ_STABILITY_LIMIT_HZ;

export const FREQ_GREEN_LO = FREQ_NOMINAL_HZ - FREQ_GREEN_HALF_WIDTH_HZ;
export const FREQ_GREEN_HI = FREQ_NOMINAL_HZ + FREQ_GREEN_HALF_WIDTH_HZ;
export const FREQ_ORANGE_HI_HI = FREQ_RED_HIGH_HZ;

const GREEN_LO = FREQ_GREEN_LO;
const GREEN_HI = FREQ_GREEN_HI;
const ORANGE_LO_LO = FREQ_RED_LOW_HZ;
const ORANGE_LO_HI = GREEN_LO;
const ORANGE_HI_LO = GREEN_HI;
const ORANGE_HI_HI = FREQ_ORANGE_HI_HI;

const GREEN_FILL = 'rgba(76, 175, 80, 0.22)';
const ORANGE_FILL = 'rgba(255, 152, 0, 0.22)';
const RED_LINE = '#f44336';

export function isFrequencyColumnKey(key) {
  if (!key || typeof key !== 'string') return false;
  return /freq/i.test(key) && /\(Hz\)/i.test(key);
}

/** Plotly y-axis refs present on this layout (stacked subplots → y, y2, …). */
function plotlyYRefsFromLayout(layout) {
  const refs = new Set(['y']);
  for (const key of Object.keys(layout || {})) {
    if (key === 'yaxis') refs.add('y');
    else if (/^yaxis\d+$/.test(key)) {
      const n = key.slice('yaxis'.length);
      refs.add(n ? `y${n}` : 'y');
    }
  }
  return [...refs];
}

/** Stacked-nD: yref per subplot index (0 → y, 1 → y2, …). */
function stackedNdYRef(index) {
  return index === 0 ? 'y' : `y${index + 1}`;
}

function stackedNdGroups(chart) {
  const yColumns = chart?.yColumns;
  if (!yColumns?.length) return [];
  const splitBy = chart.splitBy || 'phase';
  if (splitBy === 'column') {
    return yColumns.map((col) => ({ cols: [col] }));
  }
  return [{ cols: yColumns }];
}

function frequencyYRefsForChart(chart, layout) {
  if (chart?.chartType === 'stacked-nd' && chart.yColumns?.length) {
    return stackedNdGroups(chart)
      .map((group, index) =>
        group.cols?.some(isFrequencyColumnKey) ? stackedNdYRef(index) : null,
      )
      .filter(Boolean);
  }
  if (!chartIsFrequencyGoodnessChart(chart)) return [];
  return plotlyYRefsFromLayout(layout);
}

export function chartIsFrequencyGoodnessChart(chart) {
  if (!chart) return false;
  if (chart.axisRange?.frequencyGoodnessBands === false) return false;
  if (chart.axisRange?.frequencyGoodnessBands === true) return true;
  if (/^frequency$/i.test(String(chart.title || '').trim())) return true;
  const yKeys = [...(chart.yColumns || []), chart.yColumn].filter(Boolean);
  return yKeys.some(isFrequencyColumnKey);
}

function bandRect(yref, y0, y1, fillcolor) {
  return {
    type: 'rect',
    xref: 'paper',
    yref,
    x0: 0,
    x1: 1,
    y0,
    y1,
    fillcolor,
    line: { width: 0 },
    layer: 'below',
  };
}

function limitLine(yref, y) {
  return {
    type: 'line',
    xref: 'paper',
    yref,
    x0: 0,
    x1: 1,
    y0: y,
    y1: y,
    line: { color: RED_LINE, width: 2 },
    layer: 'below',
  };
}

const LABEL_X_RIGHT = 0.99;
const LABEL_X_LEFT = 0.01;
/** Nudge band labels slightly below the top edge so they sit inside the fill. */
const BAND_LABEL_INSET_HZ = 0.035;

function zoneLabelStyle(color, bgcolor) {
  return {
    font: {
      family: 'Arial, sans-serif',
      size: 12,
      color,
      weight: 600,
    },
    bgcolor,
    bordercolor: color,
    borderwidth: 1,
    borderpad: 4,
    opacity: 0.92,
  };
}

/** Band label — extreme right, just inside the upper part of the band. */
function bandZoneAnnotation(yref, yTop, text, color, bgcolor) {
  return {
    xref: 'paper',
    yref,
    x: LABEL_X_RIGHT,
    y: yTop - BAND_LABEL_INSET_HZ,
    xanchor: 'right',
    yanchor: 'top',
    text,
    showarrow: false,
    ...zoneLabelStyle(color, bgcolor),
  };
}

/** Red-line label — extreme left, centered on the line. */
function lineZoneAnnotation(yref, y, text, color, bgcolor) {
  return {
    xref: 'paper',
    yref,
    x: LABEL_X_LEFT,
    y,
    xanchor: 'left',
    yanchor: 'middle',
    text,
    showarrow: false,
    ...zoneLabelStyle(color, bgcolor),
  };
}

function shapesForYref(yref) {
  return [
    bandRect(yref, GREEN_LO, GREEN_HI, GREEN_FILL),
    bandRect(yref, ORANGE_LO_LO, ORANGE_LO_HI, ORANGE_FILL),
    bandRect(yref, ORANGE_HI_LO, ORANGE_HI_HI, ORANGE_FILL),
    limitLine(yref, FREQ_RED_LOW_HZ),
    limitLine(yref, FREQ_RED_HIGH_HZ),
  ];
}

function annotationsForYref(yref) {
  return [
    bandZoneAnnotation(
      yref,
      GREEN_HI,
      'Nominal',
      '#b9f6ca',
      'rgba(27, 94, 32, 0.82)',
    ),
    bandZoneAnnotation(
      yref,
      ORANGE_HI_HI,
      'Disturbed within limits',
      '#ffe082',
      'rgba(230, 81, 0, 0.82)',
    ),
    lineZoneAnnotation(
      yref,
      FREQ_RED_LOW_HZ,
      'Unstable',
      '#ffcdd2',
      'rgba(183, 28, 28, 0.88)',
    ),
    lineZoneAnnotation(
      yref,
      FREQ_RED_HIGH_HZ,
      'Unstable',
      '#ffcdd2',
      'rgba(183, 28, 28, 0.88)',
    ),
  ];
}

/** Horizontal comfort bands, limit lines, and fixed zone labels on frequency Y axes. */
export function applyFrequencyGoodnessBandsLayout(layout, chart) {
  if (!layout || !chartIsFrequencyGoodnessChart(chart)) return layout;

  const yrefs = frequencyYRefsForChart(chart, layout);
  if (!yrefs.length) return layout;

  const bandShapes = yrefs.flatMap(shapesForYref);
  const bandAnnotations = yrefs.flatMap(annotationsForYref);
  return {
    ...layout,
    shapes: [...(layout.shapes || []), ...bandShapes],
    annotations: [...(layout.annotations || []), ...bandAnnotations],
  };
}

export function chartSupportsFrequencyGoodnessBands(chart) {
  if (!chart) return false;
  if (chart.chartType === 'histogram' || chart.chartType === 'heatmap' || chart.chartType === 'pie') {
    return false;
  }
  return chartIsFrequencyGoodnessChart(chart);
}
