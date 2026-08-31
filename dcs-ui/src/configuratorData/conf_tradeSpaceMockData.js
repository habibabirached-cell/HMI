/**
 * Synthetic trade-space data for show-and-tell visualizations.
 * Illustrates plausible relationships: higher reliability & min CFE → higher LCOE;
 * larger load → modest economies of scale.
 */

export const MOCK_RELIABILITY = [99, 99.9, 99.99, 99.999];
export const MOCK_MIN_CFE = [0, 50, 75, 80, 100];

function mockLcoe(loadMW, reliability, minCfe) {
  const loadFactor = loadMW >= 1500 ? -4 : loadMW >= 1000 ? -2 : 0;
  const relFactor =
    reliability >= 99.999 ? 18
      : reliability >= 99.99 ? 12
        : reliability >= 99.9 ? 6
          : 0;
  const cfeFactor = minCfe * 0.35;
  const base = 58 + loadFactor;
  return Math.round(base + relFactor + cfeFactor + (loadMW / 1000) * 8);
}

export function buildHeatmapGrid(loadMW = 1000) {
  return MOCK_RELIABILITY.map((reliability) => ({
    reliability,
    cells: MOCK_MIN_CFE.map((minCfe) => ({
      minCfe,
      lcoe: mockLcoe(loadMW, reliability, minCfe),
    })),
  }));
}

export function buildParallelScenarios() {
  const loads = [350, 500, 750, 1000, 1300, 1500];
  const points = [];
  loads.forEach((loadMW) => {
    MOCK_RELIABILITY.forEach((reliability) => {
      MOCK_MIN_CFE.forEach((minCfe) => {
        points.push({
          id: `${loadMW}-${reliability}-${minCfe}`,
          label: `${loadMW} MW · ${reliability}% · ≥${minCfe}% CFE`,
          loadMW,
          reliability,
          minCfe,
          lcoe: mockLcoe(loadMW, reliability, minCfe),
        });
      });
    });
  });
  return points;
}

export const TRADE_SPACE_VIZ_OPTIONS = [
  {
    id: 'sensitivity-heatmap',
    label: '1 · Sensitivity Heatmap',
    blurb: 'Reliability × min CFE → LCOE',
  },
  {
    id: 'parallel-coordinates',
    label: '2 · Parallel Coordinates',
    blurb: 'All four dimensions at once',
  },
];

export function lcoeColor(lcoe, min = 60, max = 130) {
  const t = Math.max(0, Math.min(1, (lcoe - min) / (max - min)));
  const r = Math.round(4 + t * 180);
  const g = Math.round(120 - t * 70);
  const b = Math.round(96 - t * 40);
  return `rgb(${r},${g},${b})`;
}
