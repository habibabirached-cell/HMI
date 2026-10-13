import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import { postDataVisHistogram } from '../api/conf_dataVisApi';
import {
  normalizeHistogramBand,
  readBrushFromPlotlySelectEvent,
  readHistogramBrushRange,
} from '../utils/dataVisHistogramBrush';
import {
  binNumericOverlay,
  computeNiceTicks,
  tickFormatForSpan,
} from '../utils/dataVisHistogramBins';
import DataVisBinStepper from './DataVisBinStepper';

const MINI_HEIGHT = 112;
const COLOR_BAR = 'rgba(95, 107, 122, 0.55)';
const COLOR_BAR_SELECTED = 'rgba(0, 105, 92, 0.88)';
const COLOR_BAR_LINE = 'rgba(31, 41, 51, 0.2)';
const COLOR_BAR_LINE_SELECTED = 'rgba(0, 77, 64, 0.55)';

function barOverlapsBand(center, barWidth, bandMin, bandMax) {
  const half = barWidth / 2;
  const lo = center - half;
  const hi = center + half;
  return hi >= bandMin && lo <= bandMax;
}

export default function DataVisFilterMiniHistogram({
  column,
  axisMin,
  axisMax,
  filtersKey,
  filters,
  overlayFiltersKey,
  overlayFilters,
  band,
  onBandChange,
  binCount,
  onBinCountChange,
}) {
  const [values, setValues] = useState(null);
  const [overlayValues, setOverlayValues] = useState(null);
  const [error, setError] = useState(null);
  const [plotKey, setPlotKey] = useState(0);
  const hadBandRef = useRef(false);
  const lastBandCommitRef = useRef('');
  const selectHandlerRef = useRef(null);
  const axisDomainRef = useRef(null);
  const onBandChangeRef = useRef(onBandChange);
  onBandChangeRef.current = onBandChange;

  const showOverlayLayer = overlayFiltersKey !== filtersKey;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    postDataVisHistogram({ filters, column })
      .then((res) => {
        if (!cancelled) setValues(res.values || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filtersKey, column]);

  useEffect(() => {
    if (!showOverlayLayer) {
      setOverlayValues(null);
      return undefined;
    }
    let cancelled = false;
    postDataVisHistogram({ filters: overlayFilters, column })
      .then((res) => {
        if (!cancelled) setOverlayValues(res.values || []);
      })
      .catch(() => {
        if (!cancelled) setOverlayValues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [column, overlayFilters, overlayFiltersKey, showOverlayLayer]);

  const axisDomain = useMemo(() => {
    const lo = Number(axisMin);
    const hi = Number(axisMax);
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) {
      return { min: lo, max: hi };
    }
    return null;
  }, [axisMin, axisMax]);
  axisDomainRef.current = axisDomain;

  const commitBrush = useCallback((rawBand) => {
    if (!onBandChangeRef.current || !rawBand) return;
    const normalized = normalizeHistogramBand(rawBand, axisDomainRef.current);
    if (normalized.min == null && normalized.max == null) return;
    const key = JSON.stringify(normalized);
    if (key === lastBandCommitRef.current) return;
    lastBandCommitRef.current = key;
    onBandChangeRef.current(normalized);
  }, []);

  const { base: bins, selected: selectedBins } = useMemo(() => {
    if (!showOverlayLayer || !overlayValues) {
      return {
        base: binNumericOverlay(values, [], binCount, axisDomain).base,
        selected: null,
      };
    }
    return binNumericOverlay(values, overlayValues, binCount, axisDomain);
  }, [axisDomain, binCount, overlayValues, showOverlayLayer, values]);

  const xTicks = useMemo(() => {
    const lo = axisDomain?.min ?? bins?.xMin;
    const hi = axisDomain?.max ?? bins?.xMax;
    if (lo == null || hi == null) return [];
    return computeNiceTicks(lo, hi, 7);
  }, [axisDomain, bins]);
  const hasBand = band?.min != null && band?.max != null;

  useEffect(() => {
    if (hadBandRef.current && !hasBand) {
      setPlotKey((k) => k + 1);
      lastBandCommitRef.current = '';
    }
    hadBandRef.current = hasBand;
  }, [hasBand]);
  const bandMin = hasBand ? Math.min(band.min, band.max) : null;
  const bandMax = hasBand ? Math.max(band.min, band.max) : null;

  const xPad = useMemo(() => {
    if (!bins || bins.xMin == null || bins.xMax == null) return 0;
    const span = Math.max(bins.xMax - bins.xMin, 1e-9);
    return span * 0.04;
  }, [bins]);

  const plotData = useMemo(() => {
    if (!bins?.x?.length) return [];
    const widths = bins.x.map(() => bins.barWidth);

    const grayColors = bins.x.map(() => COLOR_BAR);
    const grayLines = bins.x.map(() => COLOR_BAR_LINE);

    const traces = [
      {
        type: 'bar',
        name: 'All',
        x: bins.x,
        y: bins.y,
        width: widths,
        marker: {
          color: grayColors,
          line: { color: grayLines, width: 0.5 },
        },
        hoverinfo: 'skip',
      },
    ];

    if (showOverlayLayer && selectedBins?.x?.length) {
      const greenY = bins.x.map((_, i) =>
        Math.min(selectedBins.y[i] ?? 0, bins.y[i] ?? 0),
      );
      const greenColors = bins.x.map((center, i) => {
        if (greenY[i] <= 0) return 'rgba(0,0,0,0)';
        if (!hasBand) return COLOR_BAR_SELECTED;
        return barOverlapsBand(center, bins.barWidth, bandMin, bandMax)
          ? COLOR_BAR_SELECTED
          : 'rgba(0, 105, 92, 0.45)';
      });
      traces.push({
        type: 'bar',
        name: 'Selected',
        x: bins.x,
        y: greenY,
        width: widths,
        marker: {
          color: greenColors,
          line: { color: COLOR_BAR_LINE_SELECTED, width: 0.5 },
        },
        hoverinfo: 'skip',
        opacity: 0.85,
      });
    } else if (hasBand) {
      const colors = bins.x.map((center) =>
        barOverlapsBand(center, bins.barWidth, bandMin, bandMax)
          ? COLOR_BAR_SELECTED
          : COLOR_BAR,
      );
      traces[0].marker.color = colors;
      traces[0].marker.line.color = bins.x.map((center) =>
        barOverlapsBand(center, bins.barWidth, bandMin, bandMax)
          ? COLOR_BAR_LINE_SELECTED
          : COLOR_BAR_LINE,
      );
    }

    if (traces.length > 1) {
      return [traces[1], traces[0]];
    }
    return traces;
  }, [bandMax, bandMin, bins, hasBand, selectedBins, showOverlayLayer]);

  const layout = useMemo(
    () => ({
      uirevision: `filter-mini-${column}-${binCount}`,
      height: MINI_HEIGHT,
      width: undefined,
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: '#fff',
      margin: { l: 32, r: 6, t: 2, b: 26 },
      font: { size: 10, color: '#5f6b7a' },
      bargap: 0,
      barmode: 'overlay',
      dragmode: 'select',
      selectdirection: 'h',
      showlegend: false,
      xaxis: {
        fixedrange: true,
        range: bins ? [bins.xMin - xPad, bins.xMax + xPad] : undefined,
        tickmode: xTicks.length ? 'array' : 'auto',
        tickvals: xTicks.length ? xTicks : undefined,
        tickformat: bins ? tickFormatForSpan(bins.xMin, bins.xMax) : '.2f',
        tickfont: { size: 9, color: '#5f6b7a' },
        showticklabels: true,
        showgrid: true,
        gridcolor: 'rgba(31, 41, 51, 0.08)',
        gridwidth: 1,
        zeroline: false,
      },
      yaxis: {
        fixedrange: true,
        showticklabels: false,
        showgrid: false,
        zeroline: false,
      },
    }),
    [binCount, bins, column, xPad, xTicks],
  );

  useEffect(() => {
    setPlotKey((k) => k + 1);
  }, [binCount]);

  const applyBrush = useCallback(
    (eventData, points) => {
      const next =
        readHistogramBrushRange(eventData, points) ||
        readBrushFromPlotlySelectEvent({ range: eventData?.range, points });
      if (next) commitBrush(next);
    },
    [commitBrush],
  );

  const handlePlotInitialized = useCallback(
    (_figure, graphDiv) => {
      if (selectHandlerRef.current) {
        try {
          graphDiv.removeListener('plotly_selected', selectHandlerRef.current);
        } catch {
          /* ignore */
        }
      }
      const handler = (event) => {
        const next = readBrushFromPlotlySelectEvent(event);
        if (next) commitBrush(next);
      };
      selectHandlerRef.current = handler;
      graphDiv.on('plotly_selected', handler);
    },
    [commitBrush],
  );

  const handlePlotPurge = useCallback((_figure, graphDiv) => {
    if (graphDiv && selectHandlerRef.current) {
      try {
        graphDiv.removeListener('plotly_selected', selectHandlerRef.current);
      } catch {
        /* ignore */
      }
    }
    selectHandlerRef.current = null;
  }, []);

  const clearBand = () => {
    lastBandCommitRef.current = '';
    onBandChange({ min: null, max: null });
  };

  const spanLabel = useMemo(() => {
    if (axisDomain) {
      return `${formatNum(axisDomain.min)} – ${formatNum(axisDomain.max)}`;
    }
    if (bins?.xMin != null && bins?.xMax != null) {
      return `${formatNum(bins.xMin)} – ${formatNum(bins.xMax)}`;
    }
    return '';
  }, [axisDomain, bins]);

  return (
    <div className={`dataVis-filterMini${hasBand ? ' dataVis-filterMini--active' : ''}`}>
      <div className="dataVis-filterMini__head">
        <span className="dataVis-filterMini__label" title={column}>
          {column}
        </span>
        {onBinCountChange ? (
          <DataVisBinStepper
            compact
            binCount={binCount}
            onChange={onBinCountChange}
            className="dataVis-filterMini__bins"
          />
        ) : null}
        {hasBand ? (
          <button type="button" className="dataVis-filterMini__clear" onClick={clearBand}>
            Clear
          </button>
        ) : null}
      </div>
      {error ? <p className="dataVis-error dataVis-filterMini__error">{error}</p> : null}
      {!values && !error ? <div className="dataVis-filterMini__placeholder" aria-hidden /> : null}
      {values && (
        <div className="dataVis-filterMini__plot">
          {plotData.length ? (
            <Plot
              key={plotKey}
              data={plotData}
              layout={layout}
              style={{ width: '100%', height: MINI_HEIGHT }}
              config={{
                displayModeBar: false,
                responsive: false,
                scrollZoom: false,
                doubleClick: false,
              }}
              onInitialized={handlePlotInitialized}
              onPurge={handlePlotPurge}
              onSelected={(e) => {
                const next = readBrushFromPlotlySelectEvent(e);
                if (next) commitBrush(next);
              }}
              onRelayout={(e) => {
                if (!e) return;
                const hasSel =
                  (e.selections && e.selections.length > 0) || e['selections[0].x0'] != null;
                if (hasSel) applyBrush(e, null);
              }}
            />
          ) : (
            <div className="dataVis-filterMini__placeholder" aria-hidden />
          )}
        </div>
      )}
      {hasBand ? (
        <p className="dataVis-filterMini__range">
          {formatNum(band.min)} – {formatNum(band.max)}
        </p>
      ) : (
        <p className="dataVis-filterMini__hint">
          {spanLabel ? `${spanLabel} · ` : ''}
          Drag to filter
        </p>
      )}
    </div>
  );
}

function formatNum(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (Math.abs(v) >= 10) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
