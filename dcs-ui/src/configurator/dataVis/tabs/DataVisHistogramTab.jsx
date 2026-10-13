import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import { postDataVisHistogram } from '../api/conf_dataVisApi';
import DataVisBinStepper from '../components/DataVisBinStepper';
import DataVisColumnChipMenu from '../components/DataVisColumnChipMenu';
import {
  buildHistogramBaselineFilters,
  numericColumnsFromStats,
  statsByColumn,
} from '../utils/dataVisFilters';
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

export function HistogramSlot({
  slotLabel,
  column,
  onSelectColumn,
  numericCols,
  ranges = {},
  parcoordsRanges = null,
  columnStats,
  filters,
  binCount,
  onBinCountChange,
  compact = false,
  brushFilter = false,
  band,
  onBandChange,
}) {
  const [plotKey, setPlotKey] = useState(0);
  const hadBandRef = useRef(false);
  const lastBandCommitRef = useRef('');
  const graphDivRef = useRef(null);
  const selectHandlerRef = useRef(null);
  const axisDomainRef = useRef(null);
  const onBandChangeRef = useRef(onBandChange);
  onBandChangeRef.current = onBandChange;
  const statMap = useMemo(() => statsByColumn(columnStats), [columnStats]);
  const st = statMap[column];
  const hasBand = brushFilter && band?.min != null && band?.max != null;
  const bandMin = hasBand ? Math.min(band.min, band.max) : null;
  const bandMax = hasBand ? Math.max(band.min, band.max) : null;

  const baselineFilters = useMemo(() => {
    if (brushFilter) {
      // Quad filter histograms: gray = full dataset on fixed axis; green = current view selection.
      return [];
    }
    return buildHistogramBaselineFilters(ranges, column);
  }, [brushFilter, column, ranges]);
  const selectionFilters = filters ?? [];
  const baselineKey = JSON.stringify(baselineFilters);
  const selectionKey = JSON.stringify(selectionFilters);
  const showOverlayLayer = baselineKey !== selectionKey;

  const [values, setValues] = useState(null);
  const [overlayValues, setOverlayValues] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!brushFilter) return;
    if (hadBandRef.current && !hasBand) {
      setPlotKey((k) => k + 1);
      lastBandCommitRef.current = '';
    }
    hadBandRef.current = hasBand;
  }, [brushFilter, hasBand]);

  useEffect(() => {
    if (!column) return undefined;
    let cancelled = false;
    setValues(null);
    setError(null);
    postDataVisHistogram({ filters: baselineFilters, column })
      .then((res) => {
        if (!cancelled) setValues(res.values || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [baselineFilters, baselineKey, column]);

  useEffect(() => {
    if (!column || !showOverlayLayer) {
      setOverlayValues(null);
      return undefined;
    }
    let cancelled = false;
    postDataVisHistogram({ filters: selectionFilters, column })
      .then((res) => {
        if (!cancelled) setOverlayValues(res.values || []);
      })
      .catch(() => {
        if (!cancelled) setOverlayValues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [column, selectionFilters, selectionKey, showOverlayLayer]);

  const axisDomain = useMemo(() => {
    const lo = Number(st?.min);
    const hi = Number(st?.max);
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) {
      return { min: lo, max: hi };
    }
    return null;
  }, [st]);
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
    if (!values) return { base: null, selected: null };
    if (!showOverlayLayer || !overlayValues) {
      return binNumericOverlay(values, [], binCount, axisDomain);
    }
    return binNumericOverlay(values, overlayValues, binCount, axisDomain);
  }, [axisDomain, binCount, overlayValues, showOverlayLayer, values]);

  const xTicks = useMemo(() => {
    const lo = axisDomain?.min ?? bins?.xMin;
    const hi = axisDomain?.max ?? bins?.xMax;
    if (lo == null || hi == null) return [];
    return computeNiceTicks(lo, hi, compact ? 11 : 8);
  }, [axisDomain, bins, compact]);

  const xAxisSpan = useMemo(() => {
    const lo = axisDomain?.min ?? bins?.xMin;
    const hi = axisDomain?.max ?? bins?.xMax;
    if (lo == null || hi == null) return null;
    const span = Math.max(hi - lo, 1e-9);
    return { lo, hi, pad: span * 0.04 };
  }, [axisDomain, bins]);

  const yMax = useMemo(() => {
    if (!bins?.y?.length) return 1;
    return Math.max(...bins.y, 1);
  }, [bins]);

  const plotData = useMemo(() => {
    if (!bins?.x?.length) return [];
    const widths = bins.x.map(() => bins.barWidth);
    const grayColors = bins.x.map(() => COLOR_BAR);
    const grayLines = bins.x.map(() => COLOR_BAR_LINE);
    const traces = [
      {
        type: 'bar',
        x: bins.x,
        y: bins.y,
        width: widths,
        marker: { color: grayColors, line: { color: grayLines, width: 0.5 } },
        hovertemplate: 'Count=%{y}<extra></extra>',
      },
    ];
    if (showOverlayLayer && selectedBins?.x?.length) {
      const greenY = bins.x.map((_, i) => Math.min(selectedBins.y[i] ?? 0, bins.y[i] ?? 0));
      const greenColors = bins.x.map((center, i) => {
        if (greenY[i] <= 0) return 'rgba(0,0,0,0)';
        if (!hasBand) return COLOR_BAR_SELECTED;
        return barOverlapsBand(center, bins.barWidth, bandMin, bandMax)
          ? COLOR_BAR_SELECTED
          : 'rgba(0, 105, 92, 0.45)';
      });
      traces.push({
        type: 'bar',
        x: bins.x,
        y: greenY,
        width: widths,
        marker: {
          color: greenColors,
          line: { color: COLOR_BAR_LINE_SELECTED, width: 0.5 },
        },
        hovertemplate: 'Selected=%{y}<extra></extra>',
        opacity: 0.88,
      });
    } else if (hasBand) {
      traces[0].marker.color = bins.x.map((center) =>
        barOverlapsBand(center, bins.barWidth, bandMin, bandMax)
          ? COLOR_BAR_SELECTED
          : COLOR_BAR,
      );
      traces[0].marker.line.color = bins.x.map((center) =>
        barOverlapsBand(center, bins.barWidth, bandMin, bandMax)
          ? COLOR_BAR_LINE_SELECTED
          : COLOR_BAR_LINE,
      );
    }
    if (brushFilter && traces.length > 1) {
      return [traces[1], traces[0]];
    }
    return traces;
  }, [bandMax, bandMin, bins, brushFilter, hasBand, selectedBins, showOverlayLayer]);

  const chartHeight = compact
    ? Math.max(160, Math.round(window.innerHeight * 0.18))
    : Math.max(280, Math.round(window.innerHeight * 0.28));

  const filteredCount = showOverlayLayer
    ? overlayValues?.length ?? 0
    : values?.length ?? 0;

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
      if (!brushFilter) return;
      graphDivRef.current = graphDiv;
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
    [brushFilter, commitBrush],
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
    graphDivRef.current = null;
  }, []);

  const clearBand = () => {
    lastBandCommitRef.current = '';
    onBandChange?.({ min: null, max: null });
  };

  const layoutUirevision = brushFilter ? `hist-brush-${column}-${binCount}` : undefined;

  return (
    <section
      className={`dataVis-histogramSlot${hasBand ? ' dataVis-histogramSlot--filtered' : ''}`}
      aria-label={slotLabel}
    >
      <div className="dataVis-histogramSlot__head">
        <h3 className="dataVis-sectionTitle">{slotLabel}</h3>
        {onBinCountChange ? (
          <DataVisBinStepper
            compact
            binCount={binCount}
            onChange={onBinCountChange}
            className="dataVis-histogramSlot__bins"
          />
        ) : null}
        <DataVisColumnChipMenu
          columns={numericCols}
          mode="single"
          selectedSingle={column}
          maxSelected={1}
          buttonText="Choose column"
          showMaxInButton={false}
          menuHint="Pick one numeric variable for this histogram."
          onSelect={onSelectColumn}
        />
        {brushFilter && hasBand ? (
          <button type="button" className="dataVis-histogramSlot__clear" onClick={clearBand}>
            Clear
          </button>
        ) : null}
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {!values && !error && column && <p className="dataVis-muted">Loading histogram…</p>}
      {values && plotData.length > 0 && xAxisSpan && (
        <div className="dataVis-chartBlock dataVis-chartBlock--histogram">
          <Plot
            key={brushFilter ? plotKey : undefined}
            data={plotData}
            layout={{
              uirevision: layoutUirevision,
              title: {
                text: brushFilter && hasBand
                  ? `${column} · ${filteredCount} rows · filter active`
                  : `${column} · ${filteredCount} rows in view`,
                font: { size: compact ? 12 : 15 },
              },
              height: chartHeight,
              margin: compact ? { l: 44, r: 12, t: 36, b: compact ? 52 : 72 } : undefined,
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: '#f8fafc',
              font: { color: '#1f2933', size: compact ? 11 : 14 },
              bargap: 0,
              barmode: 'overlay',
              dragmode: brushFilter ? 'select' : false,
              selectdirection: brushFilter ? 'h' : undefined,
              xaxis: {
                title: { text: column, font: { size: compact ? 11 : 14 } },
                fixedrange: true,
                range: [xAxisSpan.lo - xAxisSpan.pad, xAxisSpan.hi + xAxisSpan.pad],
                tickmode: xTicks.length ? 'array' : 'auto',
                tickvals: xTicks.length ? xTicks : undefined,
                tickformat: tickFormatForSpan(xAxisSpan.lo, xAxisSpan.hi),
                tickfont: { size: compact ? 10 : 12 },
                showgrid: true,
                gridcolor: 'rgba(31, 41, 51, 0.1)',
              },
              yaxis: {
                title: { text: 'Count', font: { size: compact ? 11 : 14 } },
                fixedrange: true,
                range: [0, yMax * 1.08],
              },
            }}
            style={{ width: '100%', height: chartHeight }}
            config={{
              displayModeBar: false,
              responsive: !brushFilter,
              scrollZoom: false,
              doubleClick: false,
            }}
            useResizeHandler={!brushFilter}
            onInitialized={brushFilter ? handlePlotInitialized : undefined}
            onPurge={brushFilter ? handlePlotPurge : undefined}
            onSelected={
              brushFilter
                ? (e) => {
                    const next = readBrushFromPlotlySelectEvent(e);
                    if (next) commitBrush(next);
                  }
                : undefined
            }
            onRelayout={
              brushFilter
                ? (e) => {
                    if (!e) return;
                    const hasSel =
                      (e.selections && e.selections.length > 0) || e['selections[0].x0'] != null;
                    if (hasSel) applyBrush(e, null);
                  }
                : undefined
            }
          />
        </div>
      )}
    </section>
  );
}

export default function DataVisHistogramTab({
  filters,
  ranges = {},
  columnStats,
  parcoordsRanges = null,
  binCount,
  onBinCountChange,
  compact = false,
}) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const [columnA, setColumnA] = useState('Project LCOE ($/MWh)');
  const [columnB, setColumnB] = useState('Solar AC Nameplate (MWac)');

  useEffect(() => {
    if (!numericCols.length) return;
    setColumnA((prev) => (numericCols.includes(prev) ? prev : numericCols[0]));
    setColumnB((prev) => {
      if (numericCols.includes(prev)) return prev;
      return numericCols[1] || numericCols[0];
    });
  }, [numericCols]);

  return (
    <div className={`dataVis-tabPanel dataVis-tabPanel--histogram${compact ? ' dataVis-tabPanel--compact' : ''}`}>
      <div className={compact ? 'dataVis-histogramGrid dataVis-histogramGrid--compact' : 'dataVis-histogramGrid'}>
        <HistogramSlot
          slotLabel={compact ? 'Hist 1' : 'Histogram 1'}
          column={columnA}
          onSelectColumn={setColumnA}
          numericCols={numericCols}
          ranges={ranges}
          parcoordsRanges={parcoordsRanges}
          columnStats={columnStats}
          filters={filters}
          binCount={binCount}
          onBinCountChange={onBinCountChange}
          compact={compact}
        />
        {!compact && (
          <HistogramSlot
            slotLabel="Histogram 2"
            column={columnB}
            onSelectColumn={setColumnB}
            numericCols={numericCols}
            ranges={ranges}
            parcoordsRanges={parcoordsRanges}
            columnStats={columnStats}
            filters={filters}
            binCount={binCount}
            onBinCountChange={onBinCountChange}
            compact={compact}
          />
        )}
      </div>
    </div>
  );
}
