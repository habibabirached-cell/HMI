import { useEffect, useId, useMemo, useRef, useState } from "react";
import ReactEChartsModule from "echarts-for-react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchWindFarmCsv,
  WIND_CSV,
  type WindFarmRow,
} from "@/lib/windFarmCsv";
import {
  ScrRegulatorSelector,
  FaultRegulatorSelector,
  LoadRegulatorSelector,
} from "./RegulatorSelectors";
import { AnimatedWindmill, WFMS_TURBINE_SLOTS } from "./AnimatedWindmill";

const ReactECharts =
  (ReactEChartsModule as unknown as { default?: React.ComponentType<any> }).default ??
  (ReactEChartsModule as React.ComponentType<any>);

export interface WindCsvRow {
  t: number;
  scl: number;
  p: number;
  q: number;
  va: number;
  vb: number;
  vc: number;
  vRms: number;
}

export interface TelemetryPoint {
  simTime: number;
  p: number;
  q: number;
  va: number;
  vb: number;
  vc: number;
}

export interface EventMarker {
  simTime: number;
  label: string;
  color: string;
}

const csvCache = new Map<string, WindCsvRow[]>();

export async function loadWindCsv(url: string, preferPwf = false): Promise<WindCsvRow[]> {
  const cacheKey = `${url}_${preferPwf}`;
  if (csvCache.has(cacheKey)) {
    return csvCache.get(cacheKey)!;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const fallbackUrl = preferPwf || url.includes("GFMe") || url.includes("WithGFMe")
        ? "/data/SMIB_WF_LineTrip_GFMe.csv"
        : "/data/SMIB_WF_LineTrip_No_GFMe.csv";
      if (url !== fallbackUrl) {
        return loadWindCsv(fallbackUrl, preferPwf);
      }
      throw new Error(`File or folder not found (HTTP ${res.status}: ${res.statusText})`);
    }
    const text = await res.text();
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      const fallbackUrl = preferPwf || url.includes("GFMe") || url.includes("WithGFMe")
        ? "/data/SMIB_WF_LineTrip_GFMe.csv"
        : "/data/SMIB_WF_LineTrip_No_GFMe.csv";
      if (url !== fallbackUrl) {
        return loadWindCsv(fallbackUrl, preferPwf);
      }
    }
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const head = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const findCol = (candidates: string[]) => {
      return head.findIndex((h) => candidates.some((c) => h === c || h.startsWith(c)));
    };

    const isLineTripOrPreferPwf =
      preferPwf ||
      url.includes("LineTrip") ||
      url.includes("20_1.6") ||
      url.includes("20_to_1.6");

    const tIdx = findCol(["t main", "t", "domain"]);
    const pIdx = isLineTripOrPreferPwf
      ? findCol(["pwf main", "pwf", "pwf_1x main", "pwf--gep active power", "p_pcc main", "p_pcc", "p_pcc_l:1 main", "p_1a main", "p_int main", "p"])
      : findCol(["p_pcc main", "p_pcc", "p_pcc_l:1 main", "pwf main", "pwf", "p_1a main", "p_int main", "p"]);
    const qIdx = findCol(["q_pcc main", "qwf main", "qwf", "q_1a main", "q"]);
    const vaIdx = findCol(["v_pcc:1 main", "v_pcc:1", "v_pcc_a", "va", "vwf(pu):1 main"]);
    const vbIdx = findCol(["v_pcc:2 main", "v_pcc:2", "v_pcc_b", "vb", "vwf(pu):2 main"]);
    const vcIdx = findCol(["v_pcc:3 main", "v_pcc:3", "v_pcc_c", "vc", "vwf(pu):3 main"]);
    const vrmsIdx = findCol(["vpoirms(pu) main", "vrms_pcc main", "vpoirms", "vrms"]);

    const rawHeaders = {
      t: tIdx >= 0 ? head[tIdx] : "t main",
      p: pIdx >= 0 ? head[pIdx] : (isLineTripOrPreferPwf ? "pwf main" : "p_pcc main"),
      q: qIdx >= 0 ? head[qIdx] : "q_pcc main",
      va: vaIdx >= 0 ? head[vaIdx] : "v_pcc:1 main",
      vb: vbIdx >= 0 ? head[vbIdx] : "v_pcc:2 main",
      vc: vcIdx >= 0 ? head[vcIdx] : "v_pcc:3 main",
      vRms: vrmsIdx >= 0 ? head[vrmsIdx] : "vpoirms main",
    };

    const parsed: WindCsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => parseFloat(c.trim()));
      if (cols.length < 3) continue;

      const t = tIdx >= 0 && !isNaN(cols[tIdx]) ? cols[tIdx] : cols[0];
      if (isNaN(t)) continue;

      let va = vaIdx >= 0 && !isNaN(cols[vaIdx]) ? cols[vaIdx] : (cols[4] || 0);
      let vb = vbIdx >= 0 && !isNaN(cols[vbIdx]) ? cols[vbIdx] : (cols[5] || 0);
      let vc = vcIdx >= 0 && !isNaN(cols[vcIdx]) ? cols[vcIdx] : (cols[6] || 0);

      let p = pIdx >= 0 && !isNaN(cols[pIdx]) ? cols[pIdx] : (cols[2] || 0);
      let q = qIdx >= 0 && !isNaN(cols[qIdx]) ? cols[qIdx] : (cols[3] || 0);

      parsed.push({
        t,
        scl: 20,
        p,
        q,
        va,
        vb,
        vc,
        vRms: vrmsIdx >= 0 && !isNaN(cols[vrmsIdx]) ? cols[vrmsIdx] : 0,
      });
    }
    (parsed as any).headers = rawHeaders;
    csvCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error(`Error in loadWindCsv for ${url}:`, err);
    return [];
  }
}

export const WIND_SOLUTION_SPECS: Record<
  string,
  Array<{ name: string; rating: string; type: string }>
> = {
  CFG8: [
    { name: "GFM e-STATCOM", rating: "300 MVA", type: "STATCOM" },
  ],
  CFG11: [
    { name: "Synchronous Condenser", rating: "65 MVA x 2 (RS12)", type: "SynCon" },
    { name: "GFM BESS", rating: "70 MVA (3.47 MVA x 20 Inverters)", type: "BESS" },
  ],
};

export function HoverTooltipCard({
  title,
  subtitle = "Specifications",
  items,
  positionClass = "bottom-full left-1/2 -translate-x-1/2 mb-2",
  arrowClass,
  forceOpen = false,
  onClose,
}: {
  title: string;
  subtitle?: string;
  items: Array<{ label: string; value: string; type?: string }>;
  positionClass?: string;
  arrowClass?: string;
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const isTopPosition = positionClass.includes("top-full");
  const defaultArrow = isTopPosition
    ? "-top-1.5 left-1/2 -translate-x-1/2 border-l border-t"
    : "-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b";

  return (
    <div
      className={cn(
        "absolute z-[70] transition-all duration-200 bg-black/95 border border-[#C8FF08]/50 rounded-xl p-3 shadow-[0_0_24px_rgba(200,255,8,0.45)] backdrop-blur-md w-[280px] sm:w-[300px] font-sans",
        forceOpen
          ? "opacity-100 visible pointer-events-auto ring-1 ring-[#C8FF08]/40"
          : "pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto",
        positionClass
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={cn("absolute w-3 h-3 rotate-45 border-[#C8FF08]/40 bg-black/95", arrowClass || defaultArrow)} />
      <div className="flex items-center justify-between gap-2 border-b border-[#C8FF08]/20 pb-1.5 font-sans text-sm font-bold uppercase tracking-wider text-[#C8FF08]">
        <span className="leading-tight truncate">{title}</span>
        {forceOpen && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-white/10"
            title="Close details"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5 font-sans text-xs pt-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10">
            <span className="text-xs font-bold text-[#C8FF08] flex items-start justify-between gap-2">
              <span className="leading-snug break-words">{item.label}</span>
              {item.type && (
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider shrink-0 pt-0.5 font-sans">{item.type}</span>
              )}
            </span>
            <span className="text-xs text-white/90 font-semibold leading-tight font-sans">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EChartPlotBox({
  title,
  points,
  eventMarkers = [],
  series,
  colors,
  yLabel = "",
  yMin,
  yMax,
  csvFileName,
  csvUrl,
  colNames,
  smooth = false,
  isPaused,
  onTogglePause,
  statusNode,
  badge,
  className,
}: {
  title: string;
  points: TelemetryPoint[];
  eventMarkers?: EventMarker[];
  series: { key: keyof TelemetryPoint; label: string }[];
  colors: string[];
  yLabel?: string;
  yMin?: number;
  yMax?: number;
  csvFileName?: string;
  csvUrl?: string;
  colNames?: string;
  smooth?: boolean;
  isPaused?: boolean;
  onTogglePause?: (paused: boolean) => void;
  statusNode?: React.ReactNode;
  badge?: string;
  className?: string;
}) {
  const chartRef = useRef<any>(null);
  const isResettingZoomRef = useRef(false);

  // Throttle updates to ECharts component (max once every 120ms)
  const [throttledPoints, setThrottledPoints] = useState(points);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const now = performance.now();
    if (now - lastUpdateRef.current >= 120) {
      setThrottledPoints(points);
      lastUpdateRef.current = now;
    } else {
      const delay = 120 - (now - lastUpdateRef.current);
      const handler = setTimeout(() => {
        setThrottledPoints(points);
        lastUpdateRef.current = performance.now();
      }, delay);
      return () => clearTimeout(handler);
    }
  }, [points]);

  const triggerPause = () => {
    if (isResettingZoomRef.current) return;
    if (onTogglePause) {
      onTogglePause(true);
    }
  };

  const defaultColMap: Record<string, string> = {
    p: "p_pcc main",
    q: "q_pcc main",
    va: "v_pcc:1 main",
    vb: "v_pcc:2 main",
    vc: "v_pcc:3 main",
  };
  const detectedHeaders = (points as any)?.headers;
  const computedColName =
    colNames ||
    series
      .map((s) => (detectedHeaders && detectedHeaders[s.key]) || (s.label.toLowerCase().includes("pwf") ? "pwf main" : defaultColMap[s.key]) || s.label)
      .join(", ");

  const seriesData = useMemo(() => {
    return series.map((s, idx) => ({
      name: s.label,
      type: "line",
      showSymbol: false,
      smooth: false,
      data: throttledPoints.map((pt) => [pt.simTime, pt[s.key]]),
      animation: false,
      lineStyle: {
        color: colors[idx] || colors[0] || "#C8FF08",
        width: 1.2,
        shadowBlur: 0,
        shadowColor: "transparent",
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      },
      markLine: undefined,
    }));
  }, [throttledPoints, eventMarkers, series, colors]);

  const maxSimTime = throttledPoints[throttledPoints.length - 1]?.simTime ?? 0;

  const option = useMemo(() => {
    const minX = 0;
    const maxX = Math.max(10, maxSimTime);
    const isVoltage =
      yLabel.toLowerCase().includes("v") ||
      title.toLowerCase().includes("voltage") ||
      series.some((s) => s.key === "va" || s.key === "vb" || s.key === "vc");

    return {
      backgroundColor: "transparent",
      animation: false,
      grid: {
        left: 36,
        right: 14,
        top: 10,
        bottom: 22,
        containLabel: false,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(5, 22, 25, 0.95)",
        borderColor: colors[0] || "#C8FF08",
        borderWidth: 1,
        textStyle: {
          color: "#ffffff",
          fontSize: 10.5,
          fontFamily: "'GE Inter', 'Inter', sans-serif",
        },
        axisPointer: {
          type: "cross",
          lineStyle: {
            color: "rgba(200, 255, 8, 0.4)",
            type: "dashed",
          },
          crossStyle: {
            color: "rgba(200, 255, 8, 0.4)",
          },
        },
      },
      xAxis: {
        type: "value",
        min: minX,
        max: maxX,
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(255, 255, 255, 0.12)",
            type: "dashed",
          },
        },
        axisLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.25)",
          },
        },
        axisLabel: {
          color: "#96BDBD",
          fontSize: 9.5,
          fontFamily: "'GE Inter', 'Inter', sans-serif",
          formatter: (v: number) => `${v.toFixed(1)}s`,
        },
      },
      yAxis: {
        type: "value",
        min: yMin !== undefined
          ? yMin
          : isVoltage
            ? -410
            : (value: { min: number; max: number }) => {
                return value.min >= 0
                  ? 0
                  : Math.floor(value.min * 1.15 * 1000) / 1000;
              },
        max: yMax !== undefined
          ? yMax
          : isVoltage
            ? 410
            : (value: { min: number; max: number }) => {
                return value.max >= 0
                  ? Math.ceil(value.max * 1.15 * 1000) / 1000
                  : Math.ceil(value.max * 0.85 * 1000) / 1000;
              },
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(255, 255, 255, 0.12)",
            type: "solid",
          },
        },
        axisLine: { show: false },
        axisLabel: {
          color: "#FFFFFF",
          fontSize: 9.5,
          fontFamily: "'GE Inter', 'Inter', sans-serif",
          formatter: (val: number) => (Math.abs(val) >= 10 ? val.toFixed(0) : val.toFixed(2)),
        },
      },
      series: seriesData,
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          preventDefaultMouseMove: false,
        },
        {
          type: "slider",
          xAxisIndex: 0,
          show: true,
          showDataShadow: false,
          bottom: 2,
          height: 14,
          borderColor: "rgba(200,255,8,0.35)",
          fillerColor: "rgba(200,255,8,0.2)",
          handleStyle: { color: "#C8FF08" },
          textStyle: { color: "#96BDBD", fontSize: 9, fontFamily: "'GE Inter', 'Inter', sans-serif" },
          moveHandleStyle: { color: "#C8FF08" },
        },
      ],
    };
  }, [seriesData, colors, yLabel, maxSimTime, yMin, yMax]);

  const handleResetZoom = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    isResettingZoomRef.current = true;
    if (onTogglePause) {
      onTogglePause(false);
    }
    if (chartRef.current) {
      const instance = chartRef.current.getEchartsInstance();
      if (instance) {
        instance.dispatchAction({
          type: "dataZoom",
          start: 0,
          end: 100,
        });
      }
    }
    setTimeout(() => {
      isResettingZoomRef.current = false;
    }, 100);
  };

  return (
    <div className={cn("scada-accordion rounded-xl border border-[#005E60]/60 bg-[#004745] shadow-sm overflow-hidden flex flex-col flex-1 min-h-[140px] h-full font-sans", className)}>
      <div className="bg-[#005E60] border-b border-[#458A8A]/35 px-3 py-1.5 min-h-[34px] flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-wrap">
          <span className="tracking-wider text-xs sm:text-sm font-sans font-bold uppercase text-white shrink-0">{title}</span>
          {badge && (
            <span className="inline-flex items-center rounded-md bg-black/25 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#C8FF08] border border-[#C8FF08]/30 shrink-0 leading-tight">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {statusNode}
          {isPaused && (
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-md animate-pulse shrink-0 leading-tight">
              PAUSED
            </span>
          )}
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 sm:p-1.5 rounded-md bg-black/25 hover:bg-black/40 text-white hover:text-[#C8FF08] border border-white/20 hover:border-[#C8FF08]/50 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Reset Zoom"
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 h-full relative">
        {!throttledPoints.length ? (
          <div className="h-full grid place-items-center text-xs text-white/60 font-sans tracking-wide">
            Waiting...
          </div>
        ) : (
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge={false}
            lazyUpdate={true}
            onEvents={{
              dataZoom: () => {
                triggerPause();
              },
              dblclick: handleResetZoom,
            }}
          />
        )}
      </div>
    </div>
  );
}

export type WindEventKind = "none" | "scr" | "fault" | "load";
/** Status pills — Asha 15 Aug email §4 (0.4 pu load Fault sequence). */
export type SystemStatus =
  | "Normal"
  | "Weak Grid Detected"
  | "Fault Detected"
  | "Unstable"
  | "Anchoring"
  | "Stable";

type SeriesKey = "p" | "q" | "va" | "vb" | "vc";

const WFMS_W = 414.31;
const WFMS_H = 193.81;
/** Zigzag T-junction on WFMS1 — horizontal bus meets vertical drop */
const WFMS_JUNCTION = { x: 330.69, y: 116.33 };
/** Breaker left edge — stub length pushes CB right, clear of "Transformer" label */
const WFMS_CB_X = 363;
/** Four animated stub dashes: junction → breaker (small gaps between) */
const WFMS_STUB_LINES: [number, number][] = [
  [WFMS_JUNCTION.x, 336.5],
  [337.8, 343.5],
  [344.8, 350.5],
  [351.8, WFMS_CB_X],
];

export function PlotBox({
  title,
  rows,
  series,
  colors,
  playIndex,
}: {
  title: string;
  rows: WindFarmRow[];
  series: { key: SeriesKey; label: string }[];
  colors: string[];
  playIndex: number;
}) {
  const defaultColMap: Record<string, string> = {
    p: "p_pcc main",
    q: "q_pcc main",
    va: "v_pcc:1 main",
    vb: "v_pcc:2 main",
    vc: "v_pcc:3 main",
  };
  const colNameStr = series.map((s) => defaultColMap[s.key] || s.label).join(", ");

  const slice = useMemo(() => {
    if (!rows.length) return [] as WindFarmRow[];
    const end = Math.max(1, Math.min(rows.length, playIndex + 1));
    const window = 450;
    const start = Math.max(0, end - window);
    return rows.slice(start, end);
  }, [rows, playIndex]);

  const margin = { left: 40, right: 8, top: 8, bottom: 20 };
  const W = 520;
  const H = 110;
  const chartW = W - margin.left - margin.right;
  const chartH = H - margin.top - margin.bottom;

  const t0 = slice[0]?.t ?? 0;
  const t1 = slice[slice.length - 1]?.t ?? 1;
  const spanT = Math.max(t1 - t0, 1e-6);

  const isVoltage =
    title.toLowerCase().includes("voltage") ||
    series.some((s) => s.key === "va" || s.key === "vb" || s.key === "vc");

  let minY = Infinity;
  let maxY = -Infinity;
  if (isVoltage) {
    minY = -300;
    maxY = 300;
  } else {
    for (const r of slice) {
      for (const s of series) {
        const v = r[s.key];
        if (Number.isFinite(v)) {
          minY = Math.min(minY, v);
          maxY = Math.max(maxY, v);
        }
      }
    }
    if (!Number.isFinite(minY) || !Number.isFinite(maxY) || Math.abs(maxY - minY) < 1e-6) {
      minY = -1;
      maxY = 1;
    }
    const pad = (maxY - minY) * 0.12 || 0.1;
    minY -= pad;
    maxY += pad;
  }

  const xOf = (t: number) => margin.left + ((t - t0) / spanT) * chartW;
  const yOf = (v: number) => margin.top + (1 - (v - minY) / (maxY - minY)) * chartH;

  const paths = series.map((s) => {
    if (!slice.length) return "";
    let d = "";
    for (let i = 0; i < slice.length; i++) {
      const x = xOf(slice[i].t).toFixed(1);
      const y = yOf(slice[i][s.key]).toFixed(1);
      d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    }
    return d;
  });

  return (
    <div className="flex flex-col flex-1 min-h-[96px] border border-white/70 bg-black/25 overflow-hidden">
      <div className="px-2.5 pt-1 pb-0.5 text-[10px] sm:text-[11px] font-medium text-white flex items-center justify-between gap-1 flex-wrap">
        <span>{title}</span>
        <span
          className="text-[8px] font-mono text-lime/90 bg-lime/10 px-1.5 py-0.5 rounded border border-lime/30"
          title={`CSV Column(s): ${colNameStr}`}
        >
          Col{series.length > 1 ? "s" : ""}: {colNameStr}
        </span>
      </div>
      <div className="flex-1 min-h-[72px] px-1 pb-1">
        {!rows.length ? (
          <div className="h-full grid place-items-center text-[10px] text-white/40">Loading…</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
            {[minY, (minY + maxY) / 2, maxY].map((v, i) => (
              <g key={i}>
                <line
                  x1={margin.left}
                  y1={yOf(v)}
                  x2={margin.left + chartW}
                  y2={yOf(v)}
                  stroke="white"
                  strokeOpacity="0.15"
                />
                <text
                  x={margin.left - 4}
                  y={yOf(v) + 3}
                  fill="white"
                  opacity="0.55"
                  fontSize="8"
                  textAnchor="end"
                >
                  {Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}
                </text>
              </g>
            ))}
            {paths.map((d, i) =>
              d ? (
                <path
                  key={series[i].key}
                  d={d}
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null,
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

export function FullWidthComparisonPlotBox({
  title,
  noGfmeRows,
  withGfmeRows,
  series,
  colors,
  playIndex,
  solutionConnected,
}: {
  title: string;
  noGfmeRows: WindFarmRow[];
  withGfmeRows: WindFarmRow[];
  series: { key: SeriesKey; label: string }[];
  colors: string[];
  playIndex: number;
  solutionConnected?: boolean;
}) {
  const sliceNoGfme = useMemo(() => {
    if (!noGfmeRows.length) return [] as WindFarmRow[];
    const end = Math.max(1, Math.min(noGfmeRows.length, playIndex + 1));
    const window = 450;
    const start = Math.max(0, end - window);
    return noGfmeRows.slice(start, end);
  }, [noGfmeRows, playIndex]);

  const sliceWithGfme = useMemo(() => {
    if (!withGfmeRows.length) return [] as WindFarmRow[];
    const end = Math.max(1, Math.min(withGfmeRows.length, playIndex + 1));
    const window = 450;
    const start = Math.max(0, end - window);
    return withGfmeRows.slice(start, end);
  }, [withGfmeRows, playIndex]);

  const margin = { left: 45, right: 15, top: 12, bottom: 22 };
  const W = 1000;
  const H = 130;
  const chartW = W - margin.left - margin.right;
  const chartH = H - margin.top - margin.bottom;

  const t0 = sliceNoGfme[0]?.t ?? sliceWithGfme[0]?.t ?? 0;
  const t1 = sliceNoGfme[sliceNoGfme.length - 1]?.t ?? sliceWithGfme[sliceWithGfme.length - 1]?.t ?? 1;
  const spanT = Math.max(t1 - t0, 1e-6);

  const isVoltage =
    title.toLowerCase().includes("voltage") ||
    series.some((s) => s.key === "va" || s.key === "vb" || s.key === "vc");

  let minY = Infinity;
  let maxY = -Infinity;

  if (isVoltage) {
    minY = -300;
    maxY = 300;
  } else {
    for (const r of sliceNoGfme) {
      for (const s of series) {
        const v = r[s.key];
        if (Number.isFinite(v)) {
          minY = Math.min(minY, v);
          maxY = Math.max(maxY, v);
        }
      }
    }
    if (solutionConnected) {
      for (const r of sliceWithGfme) {
        for (const s of series) {
          const v = r[s.key];
          if (Number.isFinite(v)) {
            minY = Math.min(minY, v);
            maxY = Math.max(maxY, v);
          }
        }
      }
    }

    if (!Number.isFinite(minY) || !Number.isFinite(maxY) || Math.abs(maxY - minY) < 1e-6) {
      minY = -1;
      maxY = 1;
    }
    const pad = (maxY - minY) * 0.12 || 0.1;
    minY -= pad;
    maxY += pad;
  }

  const xOf = (t: number) => margin.left + ((t - t0) / spanT) * chartW;
  const yOf = (v: number) => margin.top + (1 - (v - minY) / (maxY - minY)) * chartH;

  const pathsNoGfme = series.map((s) => {
    if (!sliceNoGfme.length) return "";
    let d = "";
    for (let i = 0; i < sliceNoGfme.length; i++) {
      const x = xOf(sliceNoGfme[i].t).toFixed(1);
      const y = yOf(sliceNoGfme[i][s.key]).toFixed(1);
      d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    }
    return d;
  });

  const pathsWithGfme = series.map((s) => {
    if (!sliceWithGfme.length || !solutionConnected) return "";
    let d = "";
    for (let i = 0; i < sliceWithGfme.length; i++) {
      const x = xOf(sliceWithGfme[i].t).toFixed(1);
      const y = yOf(sliceWithGfme[i][s.key]).toFixed(1);
      d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    }
    return d;
  });

  return (
    <div className="flex flex-col flex-1 min-h-[110px] border border-white/40 bg-black/35 overflow-hidden rounded">
      <div className="px-3 py-1 text-[11px] font-semibold text-white bg-black/50 flex items-center justify-between border-b border-white/10">
        <span>{title}</span>
        <div className="flex items-center gap-3 text-[10px] font-sans font-bold">
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-3 h-0.5 bg-amber-300 inline-block border-t border-dashed" /> Without GFM e-STATCOM
          </span>
          {solutionConnected && (
            <span className="flex items-center gap-1.5 text-lime font-bold">
              <span className="w-3 h-0.5 bg-lime inline-block" /> With GFM e-STATCOM
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[85px] px-1 pb-1">
        {!noGfmeRows.length ? (
          <div className="h-full grid place-items-center text-[10px] text-white/40">Loading data…</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
            {[minY, (minY + maxY) / 2, maxY].map((v, i) => (
              <g key={i}>
                <line
                  x1={margin.left}
                  y1={yOf(v)}
                  x2={margin.left + chartW}
                  y2={yOf(v)}
                  stroke="white"
                  strokeOpacity="0.15"
                />
                <text
                  x={margin.left - 4}
                  y={yOf(v) + 3}
                  fill="white"
                  opacity="0.55"
                  fontSize="8.5"
                  textAnchor="end"
                >
                  {Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}
                </text>
              </g>
            ))}
            {/* Without GFMe baseline line */}
            {pathsNoGfme.map((d, i) =>
              d ? (
                <path
                  key={`no-gfme-${series[i].key}`}
                  d={d}
                  fill="none"
                  stroke={solutionConnected ? "#f59e0b" : colors[i]}
                  strokeWidth={solutionConnected ? "1.8" : "2"}
                  strokeDasharray={solutionConnected ? "4 2" : undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={solutionConnected ? 0.85 : 1}
                />
              ) : null
            )}
            {/* With GFMe solution line */}
            {pathsWithGfme.map((d, i) =>
              d ? (
                <path
                  key={`with-gfme-${series[i].key}`}
                  d={d}
                  fill="none"
                  stroke={colors[i] || "#C8FF08"}
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

/** Compact 3D SCR dial (matches Stability Speedometer look) — synced on BOTH columns. */
function ScrDial({ value, active }: { value: number; active: boolean }) {
  const uid = useId().replace(/:/g, "");
  const max = 20;
  const clamped = Math.max(0, Math.min(max, value));
  const percentage = clamped / max;
  const angle = -135 + percentage * 270;
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);

  const arcPath = (start: number, end: number, r: number) => {
    const safeEnd = Math.max(start + 0.1, end);
    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((safeEnd - 90) * Math.PI) / 180;
    const x1 = 50 + r * Math.cos(startRad);
    const y1 = 50 + r * Math.sin(startRad);
    const x2 = 50 + r * Math.cos(endRad);
    const y2 = 50 + r * Math.sin(endRad);
    const largeArc = safeEnd - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const deg = -135 + i * 27;
    const isMajor = i % 2 === 0;
    const rad = ((deg - 90) * Math.PI) / 180;
    const r1 = 42;
    const r2 = isMajor ? 33 : 37;
    ticks.push({
      key: deg,
      x1: 50 + r1 * Math.cos(rad),
      y1: 50 + r1 * Math.sin(rad),
      x2: 50 + r2 * Math.cos(rad),
      y2: 50 + r2 * Math.sin(rad),
      isMajor,
    });
  }

  // Bottom-left of the SLD canvas — clear of Grid / Transformer icons
  return (
    <div
      className={cn(
        "flex flex-col items-center pointer-events-none transition-transform",
        active && "scale-105",
      )}
      title={`SCR = ${display}`}
    >
      <div
        className={cn(
          "text-[7px] sm:text-[8px] font-bold tracking-[0.14em] uppercase mb-0.5",
          active ? "text-lime drop-shadow-[0_0_6px_rgba(200,255,8,0.5)]" : "text-white/80",
        )}
      >
        SCR
      </div>

      <div
        className={cn(
          "relative w-[52px] h-[46px] sm:w-[60px] sm:h-[52px] rounded-[0.7rem] p-[2px]",
          "bg-gradient-to-b from-white/30 via-white/8 to-black/55",
          "shadow-[0_4px_10px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.14)]",
          active && "ring-1 ring-lime/70 shadow-[0_0_12px_rgba(200,255,8,0.35)]",
        )}
      >
        <div
          className="relative w-full h-full rounded-[0.7rem] overflow-hidden
            bg-[radial-gradient(ellipse_at_50%_35%,rgba(48,78,78,0.98)_0%,rgba(6,18,18,0.99)_72%)]
            border border-white/10
            shadow-[inset_0_2px_5px_rgba(255,255,255,0.1),inset_0_-6px_14px_rgba(0,0,0,0.55)]"
        >
          <div className="pointer-events-none absolute inset-x-1.5 top-0.5 h-4 rounded-full bg-gradient-to-b from-white/18 to-transparent" />

          <svg viewBox="0 0 100 88" className="w-full h-full relative z-[1]">
            <defs>
              <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="45%" stopColor="rgba(160,180,180,0.28)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
              </linearGradient>
              <linearGradient id={`zone-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="45%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
              <radialGradient id={`hub-${uid}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#f4ffe0" />
                <stop offset="45%" stopColor="#C8FF08" />
                <stop offset="100%" stopColor="#3d4a00" />
              </radialGradient>
              <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* chrome bezel */}
            <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#rim-${uid})`} strokeWidth="3.5" />
            <circle cx="50" cy="50" r="43.5" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1" />

            {/* track well */}
            <path
              d={arcPath(-135, 135, 38)}
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* SCR zone: red (weak) → green (strong) */}
            <path
              d={arcPath(-135, 135, 38)}
              fill="none"
              stroke={`url(#zone-${uid})`}
              strokeWidth="5.5"
              strokeLinecap="round"
            />

            {/* white value arc */}
            {percentage > 0 && (
              <path
                d={arcPath(-135, angle, 38)}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                filter={`url(#glow-${uid})`}
                opacity={0.95}
              />
            )}

            {ticks.map((t) => (
              <line
                key={t.key}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.isMajor ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)"}
                strokeWidth={t.isMajor ? 1.5 : 1}
                strokeLinecap="round"
              />
            ))}

            {/* needle shadow + needle */}
            <g transform={`rotate(${angle} 50 50)`} opacity={0.35}>
              <polygon points="49,52 51,52 50,18" fill="#000" />
            </g>
            <g transform={`rotate(${angle} 50 50)`}>
              <polygon
                points="48.2,50 51.8,50 50,14"
                fill={`url(#hub-${uid})`}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="0.4"
              />
              <circle
                cx="50"
                cy="50"
                r="5.2"
                fill={`url(#hub-${uid})`}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="0.6"
              />
              <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.9)" />
            </g>

            {/* digital readout plate */}
            <rect
              x="26"
              y="61"
              width="48"
              height="16"
              rx="3.5"
              fill="rgba(0,0,0,0.65)"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.7"
            />
            <text
              x="50"
              y="72.8"
              textAnchor="middle"
              fontSize="9.5"
              fontFamily="'GE Inter', 'Inter', sans-serif"
              fontWeight="700"
              fill="#C8FF08"
            >
              {display}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

function FaultIndicator({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;
  return (
    <div
      className="absolute left-[42%] top-[28%] flex flex-col items-center animate-pulse"
      title={`Active fault: ${label}`}
    >
      <div className="text-2xl sm:text-3xl drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]">⚡</div>
      <div className="mt-0.5 rounded bg-amber-300 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold text-[#1a1a00] uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function LoadIndicator({ value, active }: { value: string; active: boolean }) {
  return (
    <div
      className={cn(
        "rounded px-1.5 py-1 text-center border transition-all pointer-events-none",
        active
          ? "bg-amber-300/95 border-amber-100 text-[#1a1a00] shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          : "bg-black/65 border-white/40 text-white",
      )}
      title={`Load = ${value}`}
    >
      <div className="text-[9px] leading-none">▼</div>
      <div className="text-[8px] sm:text-[9px] font-bold leading-tight mt-0.5">{value}</div>
    </div>
  );
}

function statusTone(status: SystemStatus) {
  switch (status) {
    case "Normal":
    case "Stable":
      return "bg-lime text-[#005E60]";
    case "Weak Grid Detected":
    case "Fault Detected":
      return "bg-amber-400 text-[#1a1a00]";
    case "Anchoring":
    case "Unstable":
      return "bg-red-500 text-white";
    default:
      return "bg-lime text-[#005E60]";
  }
}


export function ComparisonColumn({
  title,
  diagramSrc,
  diagramAlt,
  rows,
  playIndex,
  columnId = "left",
  scr,
  onScrChange,
  fault,
  faultLabel,
  onFaultChange,
  load,
  onLoadChange,
  activeEvent,
  status,
  breakerOpen,
  onToggleBreaker,
  solutionId,
  solutionSvg,
  onClearSolution,
  turbinesSpinning = true,
}: {
  title?: string;
  diagramSrc: string;
  diagramAlt: string;
  rows: WindFarmRow[];
  playIndex: number;
  columnId?: string;
  scr: number;
  onScrChange?: (v: number) => void;
  fault: "abc" | "slg" | "ll";
  faultLabel: string;
  onFaultChange?: (f: "abc" | "slg" | "ll") => void;
  load: "1 pu" | "0.8 pu" | "0.5 pu" | "0 pu";
  onLoadChange?: (l: "1 pu" | "0.8 pu" | "0.5 pu" | "0 pu") => void;
  activeEvent: WindEventKind;
  status: SystemStatus;
  breakerOpen?: boolean;
  onToggleBreaker?: () => void;
  solutionId?: "CFG8" | "CFG11" | null;
  solutionSvg?: string;
  onClearSolution?: () => void;
  /** Client WindMill rotor — on while simulation runs */
  turbinesSpinning?: boolean;
}) {
  const isRight = columnId === "right";
  const connected = isRight && Boolean(solutionSvg) && !breakerOpen;
  const solutionLabel = solutionId ?? "CFG";

  return (
    <div className="flex flex-col min-w-0 h-full gap-1.5 px-2 sm:px-3 py-2">
      {title ? (
        <div className="text-center text-[11px] sm:text-xs font-semibold text-white/90 tracking-wide">
          {title}
        </div>
      ) : null}

      <div className="relative shrink-0 flex flex-col border border-white/25 bg-[#003a3c]/35 overflow-hidden">
        {/* Header — showing current parameter values on border */}
        <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-white/20 bg-black/35 shrink-0 flex-wrap">
          <span className="text-[10px] sm:text-[11px] font-semibold text-white/85 tracking-wide truncate">
            Single-Line Network Diagram
          </span>

          {/* Current Parameter Value Badges on Network Border */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-bold border transition-all",
                activeEvent === "scr"
                  ? "bg-lime/25 text-lime border-lime/60 ring-1 ring-lime/50 shadow-[0_0_8px_rgba(200,255,8,0.35)]"
                  : "bg-black/50 text-lime/90 border-lime/30"
              )}
              title="Current Grid SCR"
            >
              SCR: {scr.toFixed(1)}
            </span>

            <span
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-bold border transition-all",
                activeEvent === "fault"
                  ? "bg-amber-400/25 text-amber-300 border-amber-400/60 ring-1 ring-amber-300/50 shadow-[0_0_8px_rgba(251,191,36,0.35)]"
                  : "bg-black/50 text-amber-300/90 border-amber-400/30"
              )}
              title="Current Fault Type"
            >
              ⚡ {faultLabel}
            </span>

            <span
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-bold border transition-all",
                activeEvent === "load"
                  ? "bg-cyan-400/25 text-[#8ec4dc] border-cyan-400/60 ring-1 ring-cyan-300/50 shadow-[0_0_8px_rgba(142,196,220,0.35)]"
                  : "bg-black/50 text-[#8ec4dc]/90 border-cyan-400/30"
              )}
              title="Current Load Level"
            >
              Load: {load}
            </span>

            {isRight && (
              <span
                className={cn(
                  "inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider shrink-0 ml-1",
                  connected
                    ? "bg-lime/20 text-lime border-lime/40"
                    : solutionSvg
                      ? "bg-lime/10 text-lime/90 border-lime/30"
                      : "bg-white/5 text-white/55 border-white/20",
                )}
              >
                {connected
                  ? `${solutionLabel} Connected`
                  : solutionSvg
                    ? `${solutionLabel} Ready`
                    : "IBR Network"}
              </span>
            )}
          </div>
        </div>

        {/*
          Aspect-locked WFMS1 canvas on both sides so overlay lines match diagram coords.
          Right: centered in flex area (+ slim spacer for CFG card).
        */}
        <div
          className={cn(
            "relative flex-1 min-h-[220px] sm:min-h-[280px] lg:min-h-[340px] xl:min-h-[400px] overflow-hidden py-1",
            isRight ? "flex items-stretch" : "flex items-center justify-center",
          )}
        >
          <div
            className={cn(
              "relative h-full min-w-0",
              isRight
                ? "flex-1 flex items-center justify-center"
                : "w-full flex items-center justify-center",
            )}
          >
            <div
              className="relative w-full max-w-full max-h-full"
              style={{ aspectRatio: `${WFMS_W} / ${WFMS_H}` }}
            >
              <img
                src={diagramSrc}
                alt={diagramAlt}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
              />

              {/*
                Client WindMill on each WFMS1 turbine icon only.
                Height ends at the bus (≤29%) — never covers "Wind farm" label or Transformer.
              */}
              {WFMS_TURBINE_SLOTS.map((slot, i) => (
                <div
                  key={`wf-mill-${i}`}
                  className="absolute z-[8] w-[4.2%] -translate-x-[53.213%] -translate-y-[61.76%] pointer-events-none"
                  style={{ left: slot.left, top: slot.top }}
                >
                  <AnimatedWindmill spinning={turbinesSpinning} className="w-full" />
                </div>
              ))}

              {/* Compact 3D SCR Regulator directly under Grid symbol */}
              <div className="absolute left-[3%] top-[50%] z-[25]">
                <ScrRegulatorSelector
                  value={scr}
                  active={activeEvent === "scr"}
                  compact
                  onChange={(v) => {
                    if (onScrChange) onScrChange(v);
                  }}
                />
              </div>

              {/* Compact 3D Fault Regulator near Ground Resistor symbol */}
              <div className="absolute left-[74%] top-[55%] z-[25]">
                <FaultRegulatorSelector
                  value={fault}
                  active={activeEvent === "fault"}
                  compact
                  onChange={(f) => {
                    if (onFaultChange) onFaultChange(f);
                  }}
                />
              </div>

              {/* Compact 3D Load Regulator near lower load branch */}
              <div className="absolute left-[42%] top-[55%] z-[25]">
                <LoadRegulatorSelector
                  value={load}
                  active={activeEvent === "load"}
                  compact
                  onChange={(l) => {
                    if (onLoadChange) onLoadChange(l);
                  }}
                />
              </div>

              {/* Event region washes — stronger SLD highlight (28 Jul / 30 Jul) */}
              {activeEvent === "scr" && (
                <div
                  className="absolute left-[1%] top-[8%] z-[7] h-[42%] w-[18%] rounded-lg pointer-events-none
                    bg-lime/10 ring-1 ring-lime/45 shadow-[0_0_18px_rgba(200,255,8,0.25)] animate-pulse"
                  aria-hidden
                />
              )}
              {activeEvent === "fault" && (
                <div
                  className="absolute left-[36%] top-[18%] z-[7] h-[28%] w-[16%] rounded-lg pointer-events-none
                    bg-amber-400/15 ring-1 ring-amber-300/50 shadow-[0_0_18px_rgba(251,191,36,0.3)] animate-pulse"
                  aria-hidden
                />
              )}
              {activeEvent === "load" && (
                <div
                  className="absolute left-[38%] top-[48%] z-[7] h-[30%] w-[18%] rounded-lg pointer-events-none
                    bg-cyan-400/12 ring-1 ring-cyan-300/45 shadow-[0_0_18px_rgba(142,196,220,0.28)] animate-pulse"
                  aria-hidden
                />
              )}

              {/* Animated bus: T-junction → 4 stub segments → CB → CFG */}
              {isRight && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-[15]"
                  viewBox={`0 0 ${WFMS_W} ${WFMS_H}`}
                  preserveAspectRatio="none"
                >
                  {WFMS_STUB_LINES.map(([x1, x2], i) => (
                    <line
                      key={i}
                      x1={x1}
                      y1={WFMS_JUNCTION.y}
                      x2={x2}
                      y2={WFMS_JUNCTION.y}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="4 3"
                      className="animate-electric-flow"
                      style={{ opacity: connected ? 1 : solutionSvg ? 0.95 : 0.9 }}
                    />
                  ))}
                  {/* CB → CFG */}
                  <line
                    x1={WFMS_CB_X + 8}
                    y1={WFMS_JUNCTION.y}
                    x2={solutionSvg ? 382 : 376}
                    y2={WFMS_JUNCTION.y}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="4 3"
                    className={connected || Boolean(solutionSvg) ? "animate-electric-flow" : undefined}
                    style={{ opacity: solutionSvg ? 1 : 0.75 }}
                  />
                </svg>
              )}

              {/* Grid Hover Area */}
              <div className="absolute left-[0%] top-[15%] w-[10%] h-[35%] z-50 group cursor-pointer">
                <HoverTooltipCard
                  title="Grid Specifications"
                  positionClass="top-0 left-full ml-3 z-[100]"
                  arrowClass="-left-1.5 top-5 border-l border-b"
                  items={[
                    { label: "Nominal Voltage", value: "400kV", type: "Grid" },
                    { label: "System Frequency", value: "50Hz", type: "AC System" },
                  ]}
                />
              </div>

              {/* Wind Farm Hover Area (positioned over the 3 wind turbines & Wind farm label) */}
              <div className="absolute left-[58%] top-[0%] w-[18%] h-[32%] z-50 group cursor-pointer">
                <HoverTooltipCard
                  title="Wind Farm Specifications"
                  positionClass="top-full left-1/2 -translate-x-1/2 mt-2 z-[100]"
                  items={[
                    { label: "Plant Capacity", value: "100MW", type: "Power" },
                    { label: "Technology", value: "Grid following", type: "GFL" },
                  ]}
                />
              </div>

              {/* CB + CFG — on bus Y, aligned to line end at WFMS_CB_X */}
              {isRight && (
                <div
                  className="absolute z-20 flex items-center"
                  style={{
                    left: `${(WFMS_CB_X / WFMS_W) * 100}%`,
                    top: `${(WFMS_JUNCTION.y / WFMS_H) * 100}%`,
                    transform: "translate(0, -50%)",
                  }}
                >
                  <div
                    className="shrink-0 flex items-center justify-center bg-[#1e4a4a] rounded-md p-0.5 border border-white/40 shadow-sm pointer-events-none select-none"
                    title="Circuit Breaker (Closed)"
                  >
                    <img
                      src="/svgs/Display/Breakerclosed.svg"
                      className="w-7 h-7 sm:w-8 sm:h-8 object-contain rotate-90"
                      alt="Circuit Breaker Closed"
                    />
                  </div>

                  {solutionSvg ? (
                    <div className="relative group cursor-pointer">
                      {breakerOpen && onClearSolution && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearSolution();
                          }}
                          className="absolute -top-2 -right-2 z-30 w-5 h-5 rounded bg-black/90 border border-red-400/50 text-red-400 text-[10px] font-bold leading-none hover:bg-red-500/20"
                          title="Remove solution"
                          aria-label="Remove solution"
                        >
                          ×
                        </button>
                      )}
                      <HoverTooltipCard
                        title={`${solutionId ?? "CFG8"} Component Specifications`}
                        positionClass="bottom-full left-1/2 -translate-x-1/2 mb-2"
                        items={(WIND_SOLUTION_SPECS[solutionId ?? "CFG8"] || WIND_SOLUTION_SPECS["CFG8"]).map(
                          (spec) => ({
                            label: spec.name,
                            value: spec.rating,
                            type: spec.type,
                          })
                        )}
                      />
                    </div>
                  ) : (
                    <div className="shrink-0 w-[68px] sm:w-[80px] rounded border border-dashed border-lime/40 bg-black/30 px-1 py-2 text-center text-[8px] text-lime/80 leading-snug">
                      Click CFG8/11
                      <br />
                      above
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Small right spacer so CFG stays inside the diagram box */}
          {isRight && onToggleBreaker && (
            <div className="shrink-0 w-[80px] sm:w-[100px] h-full pointer-events-none" aria-hidden />
          )}
        </div>
      </div>

      <PlotBox
        title="P_WF (MW)"
        rows={rows}
        series={[{ key: "p", label: "P" }]}
        colors={["#C8FF08"]}
        playIndex={playIndex}
      />
      <PlotBox
        title="Reactive power at Wind farm PCC"
        rows={rows}
        series={[{ key: "q", label: "Q" }]}
        colors={["#5eead4"]}
        playIndex={playIndex}
      />
      <PlotBox
        title="Three phase Voltages at PCC"
        rows={rows}
        series={[
          { key: "va", label: "Va (R)" },
          { key: "vb", label: "Vb (Y)" },
          { key: "vc", label: "Vc (B)" },
        ]}
        colors={["#ef4444", "#facc15", "#38bdf8"]}
        playIndex={playIndex}
      />

      <div className="flex items-center gap-2 pt-0.5 pb-0.5">
        <span className="text-[11px] sm:text-xs text-white">System status :</span>
        <span
          className={cn(
            "inline-flex items-center rounded-md px-3 py-0.5 text-[11px] sm:text-xs font-bold",
            statusTone(status),
          )}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

export function useWindFarmPlayback(running: boolean) {
  const [noGfme, setNoGfme] = useState<WindFarmRow[]>([]);
  const [withGfme, setWithGfme] = useState<WindFarmRow[]>([]);
  const [playIndex, setPlayIndex] = useState(0);
  const playRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchWindFarmCsv(WIND_CSV.noGfme), fetchWindFarmCsv(WIND_CSV.withGfme)])
      .then(([a, b]) => {
        if (cancelled) return;
        setNoGfme(a);
        setWithGfme(b);
        playRef.current = 0;
        setPlayIndex(0);
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const maxLen = Math.max(noGfme.length, withGfme.length);
    if (maxLen < 2) return;
    // Manager: slow down vs previous (was +5 / 45ms)
    const id = window.setInterval(() => {
      playRef.current = Math.min(maxLen - 1, playRef.current + 2);
      setPlayIndex(playRef.current);
      if (playRef.current >= maxLen - 1) playRef.current = Math.floor(maxLen * 0.15);
    }, 90);
    return () => window.clearInterval(id);
  }, [running, noGfme.length, withGfme.length]);

  const reset = () => {
    playRef.current = 0;
    setPlayIndex(0);
  };

  /** Steady-state: start near beginning of CSV. */
  const seekSteady = () => {
    playRef.current = 0;
    setPlayIndex(0);
  };

  /** Event window (LineTrip sample disturbance ~22s). */
  const seekEvent = (atSec = 22.0) => {
    const rows = withGfme.length ? withGfme : noGfme;
    const idx = rows.findIndex((r) => r.t >= atSec);
    if (idx >= 0) {
      playRef.current = idx;
      setPlayIndex(idx);
    }
  };

  return {
    noGfme,
    withGfme,
    playIndex,
    reset,
    seekSteady,
    seekEvent,
  };
}

export function WindFarmCharts() {
  return null;
}
