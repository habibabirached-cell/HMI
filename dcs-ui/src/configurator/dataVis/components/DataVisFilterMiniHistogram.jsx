import React, { useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import { postDataVisHistogram } from '../api/conf_dataVisApi';
import { binNumericValues } from '../utils/dataVisHistogramBins';

const MINI_HEIGHT = 96;
const COLOR_BAR = 'rgba(95, 107, 122, 0.72)';
const COLOR_BAR_SELECTED = 'rgba(0, 105, 92, 0.82)';
const COLOR_BAR_LINE = 'rgba(31, 41, 51, 0.25)';
const COLOR_BAR_LINE_SELECTED = 'rgba(0, 77, 64, 0.55)';

function barOverlapsBand(center, barWidth, bandMin, bandMax) {
  const half = barWidth / 2;
  const lo = center - half;
  const hi = center + half;
  return hi >= bandMin && lo <= bandMax;
}

function readBrushRange(eventData, selectedPoints) {
  if (eventData) {
    const sel = eventData.selections?.[0];
    if (sel && sel.x0 != null && sel.x1 != null) {
      return { min: Math.min(sel.x0, sel.x1), max: Math.max(sel.x0, sel.x1) };
    }
    const x0 = eventData['selections[0].x0'];
    const x1 = eventData['selections[0].x1'];
    if (x0 != null && x1 != null) {
      return { min: Math.min(x0, x1), max: Math.max(x0, x1) };
    }
  }
  if (selectedPoints?.length) {
    const xs = selectedPoints.map((p) => p.x).filter((v) => Number.isFinite(v));
    if (xs.length) {
      return { min: Math.min(...xs), max: Math.max(...xs) };
    }
  }
  return null;
}

export default function DataVisFilterMiniHistogram({
  column,
  axisMin,
  axisMax,
  filtersKey,
  filters,
  band,
  onBandChange,
}) {
  const [values, setValues] = useState(null);
  const [error, setError] = useState(null);
  const [plotKey, setPlotKey] = useState(0);
  const hadBandRef = useRef(false);

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

  const axisDomain = useMemo(() => {
    const lo = Number(axisMin);
    const hi = Number(axisMax);
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) {
      return { min: lo, max: hi };
    }
    return null;
  }, [axisMin, axisMax]);

  const bins = useMemo(
    () => binNumericValues(values, undefined, axisDomain),
    [axisDomain, values],
  );
  const hasBand = band?.min != null && band?.max != null;

  useEffect(() => {
    if (hadBandRef.current && !hasBand) {
      setPlotKey((k) => k + 1);
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
    const colors = bins.x.map((center) => {
      if (!hasBand) return COLOR_BAR;
      return barOverlapsBand(center, bins.barWidth, bandMin, bandMax)
        ? COLOR_BAR_SELECTED
        : COLOR_BAR;
    });
    const lineColors = bins.x.map((center) => {
      if (!hasBand) return COLOR_BAR_LINE;
      return barOverlapsBand(center, bins.barWidth, bandMin, bandMax)
        ? COLOR_BAR_LINE_SELECTED
        : COLOR_BAR_LINE;
    });
    return [
      {
        type: 'bar',
        x: bins.x,
        y: bins.y,
        width: widths,
        marker: {
          color: colors,
          line: { color: lineColors, width: 0.5 },
        },
        hoverinfo: 'skip',
      },
    ];
  }, [bandMax, bandMin, bins, hasBand]);

  const layout = useMemo(
    () => ({
      height: MINI_HEIGHT,
      width: undefined,
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: '#fff',
      margin: { l: 28, r: 4, t: 2, b: 4 },
      font: { size: 10, color: '#5f6b7a' },
      bargap: 0,
      dragmode: 'select',
      selectdirection: 'h',
      xaxis: {
        fixedrange: true,
        range: bins ? [bins.xMin - xPad, bins.xMax + xPad] : undefined,
        showticklabels: false,
        showgrid: false,
        zeroline: false,
      },
      yaxis: {
        fixedrange: true,
        showticklabels: false,
        showgrid: false,
        zeroline: false,
      },
    }),
    [bins, xPad],
  );

  const applyBrush = (eventData, points) => {
    const next = readBrushRange(eventData, points);
    if (!next) return;
    onBandChange(next);
  };

  const clearBand = () => onBandChange({ min: null, max: null });

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
              layout={{ ...layout, selections: [] }}
              style={{ width: '100%', height: MINI_HEIGHT }}
              config={{
                displayModeBar: false,
                responsive: false,
                scrollZoom: false,
                doubleClick: false,
              }}
              onSelected={(e) => applyBrush(null, e?.points)}
              onRelayout={(e) => {
                if (!e) return;
                if (e['xaxis.autorange'] || e['xaxis.range[0]']) return;
                const hasSel =
                  (e.selections && e.selections.length > 0) || e['selections[0].x0'] != null;
                if (!hasSel) return;
                applyBrush(e, null);
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
