import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
// echarts-for-react is CJS; ESM/SSR default import is { default: Component }, not the component
import ReactEChartsModule from "echarts-for-react";
import { GeLogo } from "../scada/icons";
import { Link } from "@tanstack/react-router";
import { PlantIcon, TowerIcon } from "./DiagramIcons";
import { Speedometer } from "./Speedometer";
import { StabilityCompareAnalytics } from "./StabilityCompareAnalytics";
import { AppWindowControls } from "../scada/AppWindowControls";

import {
  Activity,
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Trash2,
  Clock,
  RotateCcw,
  ArrowLeft,
  BarChart3,
  Hand,
  Wind,
  Home,
  X,
} from "lucide-react";
import {
  getEventTimeSec,
  hasDatabankEvent,
  getEventDetails,
  getCfg12EventDetails,
  getCfg13EventDetails,
  resolveDatabankCsvUrl,
  phaseForActiveEvent,
  getCfgSvgStem,
  getCfgPanelStem,
  cfg12EventAvailable,
  cfg13EventAvailable,
  CFG12_DEFAULT_SELECTION,
  CFG12_MODE_LABELS,
  CFG12_GRID_CODE_OPTIONS,
  CFG12_FAULT_VARIANTS,
  CFG12_VSTEP_VARIANTS,
  CFG12_PHJUMP_VARIANTS,
  CFG12_SPAIN_STUDIES,
  CFG13_DEFAULT_SELECTION,
  CFG13_MODE_LABELS,
  CFG13_FAULT_VARIANTS,
  CFG13_VSTEP_VARIANTS,
  CFG13_ROCOF_VARIANTS,
  CFG13_PHJUMP_VARIANTS,
  CFG13_AEMO_STUDIES,
  findCfg12Study,
  findCfg13Study,
  selectionFromCfg12Study,
  selectionFromCfg13Study,
  getPlantBaseMva,
  cfg12BreakerState,
  cfg13BreakerState,
  type StabilityEventType,
  type Cfg12Mode,
  type Cfg12GridCode,
  type Cfg12Selection,
  type Cfg12Study,
  type Cfg13Mode,
  type Cfg13Selection,
  type Cfg13Study,
} from "@/lib/stabilityDatabank";
import {
  computeInertiaMWs,
  computeScDialPu,
  computeResponseMetrics,
  formatMs,
  formatKa,
  formatMw,
  formatMvar,
  toMetricPoints,
  parseMachineBaseMva,
  SYSTEM_BASE_MVA,
  type ResponseMetrics,
} from "@/lib/databankMetrics";
import { fetchDatabankCsvText, limitRowsForUi } from "@/lib/databankFetch";
import {
  resolveTickSize,
  ticksPerUiFrame,
  IDLE_SIM_PER_FRAME_SEC,
  EVENT_SIM_PER_FRAME_SEC,
} from "@/lib/stabilityTick";
import { getYAxisRange, type YAxisRange } from "@/lib/stabilityYAxis";
import { chartXAxisMax, computeEventXMax, getInitialXSize } from "@/lib/stabilityInitialX";
import { fetchPreeventRows, type PreeventRow } from "@/lib/stabilityPreevent";
import { getCigreResponseMetrics } from "@/lib/cigreTimeDomain";
import PRECOMPUTED_METRICS_DATA from "@/data/stabilityAnalyticsMetrics.json";

const FIXED_ANALYTICS_METRICS = PRECOMPUTED_METRICS_DATA as Record<
  string,
  { scPu?: number | null; inertiaMWs?: number | null }
>;

const ReactECharts =
  (ReactEChartsModule as unknown as { default?: React.ComponentType<any> }).default ??
  (ReactEChartsModule as React.ComponentType<any>);
const CFG_OPTIONS = Array.from({ length: 11 }, (_, i) => `CFG${i + 1}`);

/**
 * Parse Databank CSV → chart + dial rows.
 *
 * Databank_Aug14 / Databank_Info_Aug14:
 *   Charts: Iq_GEP_pu Main, Ip_GEP_pu Main
 *   SCL dial: Iq_GEP_kA Main at tf+0.04 s (Asha 15 Aug)
 *   CFG12/13: Engie / AEMO poc1 — P_poc1 / Q_poc1 / Irms_poc1
 * Match by signal name (column letters differ across CFGs).
 *
 * Charts:  activeCurrent = Ip (or P_poc1), reactiveCurrent = Iq (or Q_poc1)
 * Dial SC: shortCircuitCurrent = Iq_GEP_kA (fallback Iq pu / Irms)
 * Inertia dial still needs P MW → kept as pMw.
 */
function parseStabilityCsvText(
  text: string,
  cfgName?: string,
): Array<{
  time: number;
  activeCurrent: number;
  reactiveCurrent: number;
  shortCircuitCurrent: number;
  pMw: number;
}> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const sep = headerLine.includes(";") ? ";" : headerLine.includes("\t") ? "\t" : ",";
  const head = headerLine.split(sep).map((h) => h.trim());
  const lower = head.map((h) => h.toLowerCase());

  const findCol = (pred: (l: string) => boolean) => lower.findIndex(pred);

  // CFG12 / CFG13 Engie Madrid / AEMO Dataframe columns (poc1)
  const isPoc1Power =
    cfgName === "CFG12" ||
    cfgName === "CFG13" ||
    lower.some((l) => l.includes("p_poc1") || l.includes("irms_poc1"));

  if (isPoc1Power) {
    const timeIdx = findCol((l) => l === "t" || l === "t main");
    const pIdx = findCol((l) => l === "p_poc1" || l.includes("p_poc1"));
    const qIdx = findCol((l) => l === "q_poc1" || l.includes("q_poc1"));
    const iIdx = findCol((l) => l.includes("irms_poc1"));
    const tCol = timeIdx >= 0 ? timeIdx : 0;
    const pCol = pIdx >= 0 ? pIdx : 3;
    const qCol = qIdx >= 0 ? qIdx : 4;
    const iCol = iIdx >= 0 ? iIdx : 1;
    const needed = Math.max(tCol, pCol, qCol, iCol);
    const parsed: Array<{
      time: number;
      activeCurrent: number;
      reactiveCurrent: number;
      shortCircuitCurrent: number;
      pMw: number;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep);
      if (cols.length <= needed) continue;
      const timeVal = parseFloat(cols[tCol]);
      if (isNaN(timeVal)) continue; // skip Main unit row
      const p = parseFloat(cols[pCol]);
      const q = parseFloat(cols[qCol]);
      const irms = parseFloat(cols[iCol]);
      parsed.push({
        time: timeVal,
        activeCurrent: p,
        reactiveCurrent: q,
        shortCircuitCurrent: irms,
        pMw: p,
      });
    }

    const rawHeaders = {
      time: head[tCol] || "t",
      activeCurrent: head[pCol] || "P_poc1",
      reactiveCurrent: head[qCol] || "Q_poc1",
      shortCircuitCurrent: head[iCol] || "Irms_poc1",
      pMw: head[pCol] || "P_poc1",
      scUnit: "pu",
      chartKind: "power" as const,
    };

    (parsed as any).headers = rawHeaders;
    return parsed;
  }

  // Prefer positive-sequence GEP signals; never pick *_neg_*
  const tIdx = findCol(
    (l) => l === "t main" || l === "t" || (l.includes("t main") && !l.includes("neg")),
  );

  // Ip / Iq charts stay on pu (Aug14 has both pu and kA columns)
  let ipIdx = findCol((l) => l.includes("ip_gep_pu") && !l.includes("neg"));
  if (ipIdx < 0) ipIdx = findCol((l) => l.includes("ip_gep_ka") && !l.includes("neg"));

  let iqIdx = findCol((l) => l.includes("iq_gep_pu") && !l.includes("neg"));
  if (iqIdx < 0) iqIdx = findCol((l) => l.includes("iq_gep_ka") && !l.includes("neg"));

  // Peak (email §6): Ip_GEP_kA / Iq_GEP_kA by event dominant
  const ipKaIdx = findCol((l) => l.includes("ip_gep_ka") && !l.includes("neg"));
  const iqKaIdx = findCol((l) => l.includes("iq_gep_ka") && !l.includes("neg"));

  // SCL dial: prefer Iq_GEP_kA Main (Asha / Databank_Info_Aug14)
  let scIdx = findCol((l) => l.includes("iq_gep_ka") && !l.includes("neg"));
  if (scIdx < 0) scIdx = iqIdx;

  // P MW for inertia formula only (CFG9 may lack MW — leave NaN)
  let pMwIdx = findCol((l) => l.includes("ppos_gep_mw") && !l.includes("neg"));

  // Event waveform signals for Event Details (actual CSV slice)
  const vIdx = findCol((l) => l.includes("v_pm_gep_pu") && !l.includes("neg"));
  const thetaIdx = findCol(
    (l) => (l.includes("theta_p_gep") || l.includes("theta_p_gep_deg")) && !l.includes("neg"),
  );
  const freqIdx = findCol(
    (l) =>
      l.includes("freqmeasa") ||
      l.includes("freq_pcc") ||
      (l.includes("freq") && !l.includes("neg")),
  );

  // Last-resort legacy fallbacks if Ip/Iq headers missing
  if (ipIdx < 0) {
    ipIdx = findCol(
      (l) => l.includes("ppos_gep_mw") || l.includes("active power") || l === "p" || l === "p (mw)",
    );
  }
  if (iqIdx < 0) {
    iqIdx = findCol(
      (l) =>
        l.includes("qpos_gep_mvar") ||
        l.includes("reactive power") ||
        l === "q" ||
        l === "q (mvar)" ||
        l === "scl",
    );
  }
  if (scIdx < 0) scIdx = iqIdx;

  let timeIdx = tIdx;
  if (timeIdx < 0) timeIdx = findCol((l) => l.includes("domain") || l.includes("time"));
  if (timeIdx < 0) timeIdx = head[0]?.toLowerCase() === "source_file" ? 1 : 0;
  if (ipIdx < 0) ipIdx = Math.min(1, head.length - 1);
  if (iqIdx < 0) iqIdx = Math.min(2, head.length - 1);
  if (scIdx < 0) scIdx = iqIdx;

  const parsed: Array<{
    time: number;
    activeCurrent: number;
    reactiveCurrent: number;
    shortCircuitCurrent: number;
    pMw: number;
    activeCurrentKa?: number;
    reactiveCurrentKa?: number;
    eventVoltage?: number;
    eventAngle?: number;
    eventFreq?: number;
  }> = [];
  const startIndex =
    isNaN(parseFloat(head[0])) && head[0].toLowerCase() !== "source_file"
      ? 1
      : head[0].toLowerCase() === "source_file" || isNaN(parseFloat(head[0]))
        ? 1
        : 0;

  const needed = Math.max(
    timeIdx,
    ipIdx,
    iqIdx,
    scIdx,
    ipKaIdx >= 0 ? ipKaIdx : 0,
    iqKaIdx >= 0 ? iqKaIdx : 0,
    pMwIdx >= 0 ? pMwIdx : 0,
    vIdx >= 0 ? vIdx : 0,
    thetaIdx >= 0 ? thetaIdx : 0,
    freqIdx >= 0 ? freqIdx : 0,
  );

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    if (cols.length <= needed) continue;
    const timeVal = parseFloat(cols[timeIdx]);
    if (isNaN(timeVal)) continue;
    const iq = parseFloat(cols[iqIdx]);
    const sc = parseFloat(cols[scIdx]);
    parsed.push({
      time: timeVal,
      activeCurrent: parseFloat(cols[ipIdx]),
      reactiveCurrent: iq,
      shortCircuitCurrent: sc,
      pMw: pMwIdx >= 0 ? parseFloat(cols[pMwIdx]) : NaN,
      activeCurrentKa: ipKaIdx >= 0 ? parseFloat(cols[ipKaIdx]) : NaN,
      reactiveCurrentKa: iqKaIdx >= 0 ? parseFloat(cols[iqKaIdx]) : NaN,
      eventVoltage: vIdx >= 0 ? parseFloat(cols[vIdx]) : NaN,
      eventAngle: thetaIdx >= 0 ? parseFloat(cols[thetaIdx]) : NaN,
      eventFreq: freqIdx >= 0 ? parseFloat(cols[freqIdx]) : NaN,
    });
  }

  const scHeader = head[scIdx] || "Iq_GEP_kA Main";
  const scUnit = /_ka\b/i.test(scHeader) ? "kA" : "pu";

  const ipHeader = head[ipIdx] || "Ip_GEP_pu Main";
  const iqHeader = head[iqIdx] || "Iq_GEP_pu Main";

  const rawHeaders = {
    time: head[timeIdx] || "t Main",
    activeCurrent: ipHeader,
    reactiveCurrent: iqHeader,
    shortCircuitCurrent: scHeader,
    activeCurrentKa: ipKaIdx >= 0 ? head[ipKaIdx] : "Ip_GEP_kA Main",
    reactiveCurrentKa: iqKaIdx >= 0 ? head[iqKaIdx] : "Iq_GEP_kA Main",
    pMw: pMwIdx >= 0 ? head[pMwIdx] : "Ppos_GEP_MW Main",
    eventVoltage: vIdx >= 0 ? head[vIdx] : "V_PM_GEP_pu Main",
    eventAngle: thetaIdx >= 0 ? head[thetaIdx] : "Theta_p_GEP_deg Main",
    eventFreq: freqIdx >= 0 ? head[freqIdx] : "",
    ipColIndex: ipIdx,
    iqColIndex: iqIdx,
    scColIndex: scIdx,
    scUnit,
  };

  (parsed as any).headers = rawHeaders;
  return parsed;
}

// Per-CFG top offset so each solution's left feed aligns with the bus wire at absolute y=120px.
// Formula: 120 - (pad + object-contain offY + feedY*scale) in the 290×210 (p-2 → 274×194) box.
// Recomputed for new Display SVGs in public/svgs/Display/.
const CFG_TOP_OFFSETS: Record<string, number> = {
  CFG1: 24.9, // feedY=53.50, vb=[161.76x119.16]
  CFG2: 37.3, // feedY=46.99, vb=[172.46x122.02]
  CFG3: 27.1, // feedY=54.00, vb=[178.66x123.76]
  CFG4: 27.1, // feedY=56.58, vb=[171.65x129.32]
  CFG5: 25.9, // feedY=57.34, vb=[188.04x129.68]
  CFG6: 25.0, // feedY=57.34, vb=[182.92x128.09]
  CFG7: 26.7, // feedY=57.34, vb=[187.91x130.76]
  CFG8: 55.8, // feedY=11.24, vb=[200.66x82.23]
  CFG9: 64.2, // feedY=12.54, vb=[185.45x91.74]
  CFG10: 15.5, // feedY=67.68, vb=[181.12x136.01]
  CFG11: 37.1, // feedY=46.99, vb=[172.90x121.87]
  CFG12: 36.2, // feedY=46.99, vb=[156.70x120.34]
  CFG13: 36.2, // feedY=46.99, vb=[156.70x120.34]
};
const getContainerTop = (asset: string): number => CFG_TOP_OFFSETS[asset] ?? 16.0;

// Absolute X where the dashed bus meets each CFG's left feed stub (container left 715 + pad 8 + object-contain offX).
const CFG_WIRE_END_X: Record<string, number> = {
  CFG1: 728,
  CFG2: 723,
  CFG3: 723,
  CFG4: 731,
  CFG5: 723,
  CFG6: 723,
  CFG7: 723,
  CFG8: 723,
  CFG9: 723,
  CFG10: 731,
  CFG11: 723,
  CFG12: 734,
  CFG13: 734,
};
const getWireEndX = (asset: string): number => CFG_WIRE_END_X[asset] ?? 745;

function ExpandableTileBox({
  title,
  badge,
  open,
  onToggle,
  children,
  className = "",
  headerExtra,
  draggable,
  onDragStart,
  onDragEnd,
  instant = false,
  contentOverflowVisible = false,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  instant?: boolean;
  contentOverflowVisible?: boolean;
}) {
  return (
    <div
      className={`scada-accordion rounded-xl border flex flex-col ${contentOverflowVisible ? "overflow-visible" : "overflow-hidden"} ${instant ? "" : "transition-all duration-200"} ${open
        ? "border-[#005E60]/60 bg-[#004745] shadow-sm"
        : "border-[#005E60]/40 bg-[#004745]/70 hover:border-primary/40"
        } ${className}`}
    >
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={`bg-[#005E60] border-b border-[#458A8A]/35 px-3 py-1.5 flex items-center justify-between cursor-pointer select-none shrink-0 min-h-[34px] gap-2 ${draggable ? "hover:bg-[#005E60]/90" : ""
          }`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {draggable && (
            <span title="Drag header to move panel">
              <GripVertical className="w-3.5 h-3.5 text-white/70 shrink-0 cursor-grab active:cursor-grabbing" />
            </span>
          )}
          <span
            className="text-white text-xs sm:text-sm lg:text-base font-bold uppercase tracking-wider truncate"
            title={title}
          >
            {title}
          </span>
          {badge && (
            <span className="inline-flex items-center rounded bg-black/25 px-2 py-0.5 text-xs font-semibold text-[#C8FF08] border border-[#C8FF08]/30 shrink-0 leading-none">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {headerExtra}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={open}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
            className={`grid h-6 w-6 place-items-center rounded border transition-all ${open
              ? "border-[#C8FF08]/50 bg-black/20 text-[#C8FF08] hover:bg-black/30"
              : "border-white/20 bg-black/20 text-white/80 hover:text-white"
              }`}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 ${instant ? "" : "transition-transform duration-200"} ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>
      {open && (
        <div
          className={`flex-1 flex flex-col min-h-0 ${contentOverflowVisible ? "overflow-visible" : "overflow-hidden"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
function PeakOvershootIcon({ className = "w-4 h-4 text-lime" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M 2,18 C 7,18 9,6 12,6 C 15,6 17,18 22,18" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" strokeWidth="1.5" />
    </svg>
  );
}

/** Fit Stability SLD across laptop → ~36–43″ TV without ResizeObserver thrash.
 *  Base kept high so typical laptop/Netlify windows match the “local looks correct” size
 *  (tier alone was leaving the live diagram slightly undersized in the panel). */
const STABILITY_SLD_BASE_SCALE = 0.78;
/** Event Details sits left of SLD — narrow stacked card (text above, sketch below). */
const STABILITY_SLD_EVENT_COL_W = 184;
/** Fixed card height so empty ↔ preview/active never jumps the layout. */
const STABILITY_SLD_EVENT_CARD_H = 172;
/** Left inset for f/V/ø — balance Event Details clearance vs CFG trash on the right. */
const STABILITY_SLD_EVENT_CLEAR_PX = 85;
/** Modest air under tile header / diagram — keep compact so charts can grow. */
const STABILITY_SLD_TOP_PAD = 10;
const STABILITY_SLD_BOTTOM_PAD = 10;
/** Native draw size (hit targets / absolute coords). */
const STABILITY_SLD_NATIVE_H = 300;
const STABILITY_SLD_NATIVE_W = 1100;
/** Crop empty lower canvas when sizing the panel (leave room for towers / ground glow). */
const STABILITY_SLD_CROP_H = 240;

/** CSS-pixel breakpoints → fit multiplier (stable on reload; no RO feedback loops). */
const STABILITY_SLD_TIERS: { query: string; fit: number }[] = [
  { query: "(min-width: 1920px)", fit: 1.15 }, // large / 43″-class CSS width
  { query: "(min-width: 1600px)", fit: 1.08 },
  { query: "(min-width: 1280px)", fit: 1.0 },
  { query: "(min-width: 1024px)", fit: 0.48 }, // iPad Landscape (1024px) alongside diagnostics sidebar
  { query: "(min-width: 768px)", fit: 0.65 },  // iPad Portrait (768px) stacked layout
  { query: "(min-width: 0px)", fit: 0.48 },
];

function useStabilitySldFitScale() {
  const [fit, setFit] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return 1;
    for (const tier of STABILITY_SLD_TIERS) {
      if (window.matchMedia(tier.query).matches) return tier.fit;
    }
    return 1;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mqls = STABILITY_SLD_TIERS.map((t) => window.matchMedia(t.query));

    const sync = () => {
      for (let i = 0; i < STABILITY_SLD_TIERS.length; i++) {
        if (mqls[i].matches) {
          setFit((prev) =>
            prev === STABILITY_SLD_TIERS[i].fit ? prev : STABILITY_SLD_TIERS[i].fit,
          );
          return;
        }
      }
    };

    sync();
    mqls.forEach((mql) => {
      if (mql.addEventListener) mql.addEventListener("change", sync);
      else mql.addListener(sync);
    });
    return () => {
      mqls.forEach((mql) => {
        if (mql.removeEventListener) mql.removeEventListener("change", sync);
        else mql.removeListener(sync);
      });
    };
  }, []);

  return fit;
}

/** Slide 15 metric definitions (CIGRE — Response / Rise / Peak only; Settling removed per Asha 15 Aug). */
const TIME_DOMAIN_METRIC_DEFS = {
  response:
    "Response Time: time from event to first detectable departure from pre-event baseline (onset).",
  rise: "Rise time: time to reach 90% of the first Cycle Peak.",
  peak: "Peak: first-cycle peak magnitude from Ip_GEP_kA Main (kA), not pu.",
} as const;

/** Immediate previous CFG characterisation (Arvind 8 Aug — rolling depth-1 compare). */
type CfgCompareSnapshot = {
  cfgId: string;
  inertiaMWs: number | null;
  scDialPu: number | null;
  inertiaLabel: string;
  scLabel: string;
  ip: ResponseMetrics | null;
  iq: ResponseMetrics | null;
};

function snapshotHasContent(
  s: Pick<CfgCompareSnapshot, "inertiaMWs" | "scDialPu" | "ip" | "iq">,
): boolean {
  return s.inertiaMWs != null || s.scDialPu != null || s.ip != null || s.iq != null;
}

function dialLabelForSnapshot(label: string, fallback: string): string {
  const t = label.trim();
  if (!t || t.includes("Calculating")) return fallback;
  return t;
}

/** Display id for CFG12/13 mode compare, e.g. CFG12·Combined */
function formatCfgModeLabel(cfg: "CFG12" | "CFG13", mode: Cfg12Mode | Cfg13Mode): string {
  const modeLabel =
    cfg === "CFG12" ? CFG12_MODE_LABELS[mode as Cfg12Mode] : CFG13_MODE_LABELS[mode as Cfg13Mode];
  return `${cfg}·${modeLabel}`;
}

/** Strip mode suffix so CFG_SPECS / plant-base lookup still works. */
function baseCfgIdFromSnapshotLabel(id: string): string {
  const i = id.indexOf("·");
  return i >= 0 ? id.slice(0, i) : id;
}

type SketchPoint = { x: number; y: number };

/** Build an extruded ribbon path (top face + front edge) for a pseudo-3D waveform. */
function ribbonPaths(pts: SketchPoint[], depth = 5) {
  if (pts.length < 2) return { top: "", front: "", glow: "" };
  const top = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .concat(
      [...pts].reverse().map((p) => `L${p.x + depth},${p.y - depth * 0.55}`),
      ["Z"],
    )
    .join(" ");
  const front = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const glow = front;
  return { top, front, glow };
}

/**
 * Event Details Graph — matches the disturbance event sketches (axes with arrows, dashed reference lines, durations, and waveforms).
 */
function EventDetailButtonGraph({
  event,
}: {
  event: StabilityEventType;
  instanceId?: string;
}) {
  return (
    <svg
      viewBox="0 0 150 95"
      className="w-full h-full max-h-[64px] object-contain"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {/* Sky Blue Axes (GE Brand Color: #5FB7FF) */}
      <line
        x1="32"
        y1="14"
        x2="32"
        y2="78"
        stroke="#5FB7FF"
        strokeWidth="1.5"
      />
      <polygon points="29.5,14 32,7 34.5,14" fill="#5FB7FF" />

      <line
        x1="28"
        y1="78"
        x2="138"
        y2="78"
        stroke="#5FB7FF"
        strokeWidth="1.5"
      />
      <polygon points="137,75.5 143,78 137,80.5" fill="#5FB7FF" />

      {/* X-Axis Label */}
      <text
        x="86"
        y="89"
        fill="#96BDBD"
        fontSize="7.5"
        fontWeight="600"
        textAnchor="middle"
        fontFamily="'GE Inter', 'Inter', sans-serif"
      >
        time (s)
      </text>

      {/* ROCOF / Frequency */}
      {event === "rocof" && (
        <g>
          {/* Y Axis label & values */}
          <text
            x="17"
            y="48"
            fill="#96BDBD"
            fontSize="7"
            fontWeight="600"
            textAnchor="middle"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            f (Hz)
          </text>
          <text
            x="28"
            y="27"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            50
          </text>
          <text
            x="28"
            y="64"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            49
          </text>

          {/* Horizontal dashed reference at 49 */}
          <line
            x1="32"
            y1="61"
            x2="136"
            y2="61"
            stroke="#458A8A"
            strokeWidth="0.85"
            strokeDasharray="2.5 2"
            opacity="0.75"
          />

          {/* Vertical dashed lines at start and end of ramp */}
          <line
            x1="55"
            y1="10"
            x2="55"
            y2="78"
            stroke="#458A8A"
            strokeWidth="0.85"
            strokeDasharray="2.5 2"
            opacity="0.75"
          />
          <line
            x1="95"
            y1="10"
            x2="95"
            y2="78"
            stroke="#458A8A"
            strokeWidth="0.85"
            strokeDasharray="2.5 2"
            opacity="0.75"
          />

          {/* Double-headed arrow: ← 1 s → */}
          <path
            d="M 62 15 L 57 18 L 62 21"
            fill="none"
            stroke="#5FB7FF"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="58" y1="18" x2="68" y2="18" stroke="#5FB7FF" strokeWidth="1" />
          <text
            x="75"
            y="20.5"
            fill="#FFFFFF"
            fontSize="7.5"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            1 s
          </text>
          <line x1="82" y1="18" x2="92" y2="18" stroke="#5FB7FF" strokeWidth="1" />
          <path
            d="M 88 15 L 93 18 L 88 21"
            fill="none"
            stroke="#5FB7FF"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Urgency Green Waveform (GE Brand Color: #C8FF08) */}
          <path
            d="M 32 24 L 55 24 L 95 61 L 130 61"
            fill="none"
            stroke="#C8FF08"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Voltage Step */}
      {event === "voltage_step" && (
        <g>
          {/* Y Axis label & values */}
          <text
            x="17"
            y="45"
            fill="#96BDBD"
            fontSize="7"
            fontWeight="600"
            textAnchor="middle"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            V (pu)
          </text>
          <text
            x="28"
            y="27"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            1.0
          </text>
          <text
            x="28"
            y="64"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            0.9
          </text>

          {/* Horizontal dashed reference at 0.9 */}
          <line
            x1="32"
            y1="61"
            x2="136"
            y2="61"
            stroke="#458A8A"
            strokeWidth="0.85"
            strokeDasharray="2.5 2"
            opacity="0.75"
          />

          {/* Urgency Green Waveform (GE Brand Color: #C8FF08) */}
          <path
            d="M 32 24 L 75 24 L 75 61 L 130 61"
            fill="none"
            stroke="#C8FF08"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Phase Jump */}
      {event === "phase_jump" && (
        <g>
          {/* Y Axis label & values */}
          <text
            x="16"
            y="45"
            fill="#96BDBD"
            fontSize="7"
            fontWeight="600"
            textAnchor="middle"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            ø (deg)
          </text>
          <text
            x="28"
            y="27"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            0
          </text>
          <text
            x="28"
            y="64"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            -20
          </text>

          {/* Horizontal dashed reference at -20 */}
          <line
            x1="32"
            y1="61"
            x2="136"
            y2="61"
            stroke="#458A8A"
            strokeWidth="0.85"
            strokeDasharray="2.5 2"
            opacity="0.75"
          />

          {/* Urgency Green Waveform (GE Brand Color: #C8FF08) */}
          <path
            d="M 32 24 L 75 24 L 75 61 L 130 61"
            fill="none"
            stroke="#C8FF08"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Fault (FLT / LLLG) */}
      {event === "fault" && (
        <g>
          {/* Y Axis label & values */}
          <text
            x="18"
            y="20"
            fill="#C8FF08"
            fontSize="7.5"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            FLT
          </text>
          <text
            x="28"
            y="40"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            1
          </text>
          <text
            x="28"
            y="78"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            0
          </text>

          {/* Horizontal dashed reference at 1 */}
          <line
            x1="32"
            y1="37"
            x2="136"
            y2="37"
            stroke="#458A8A"
            strokeWidth="0.85"
            strokeDasharray="2.5 2"
            opacity="0.75"
          />

          {/* Double-headed arrow: ← 0.14 s → */}
          <path
            d="M 64 24.5 L 59 27 L 64 29.5"
            fill="none"
            stroke="#5FB7FF"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="60" y1="27" x2="66" y2="27" stroke="#5FB7FF" strokeWidth="1" />
          <text
            x="78"
            y="29.5"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="'GE Inter', 'Inter', sans-serif"
          >
            0.14 s
          </text>
          <line x1="90" y1="27" x2="96" y2="27" stroke="#5FB7FF" strokeWidth="1" />
          <path
            d="M 92 24.5 L 97 27 L 92 29.5"
            fill="none"
            stroke="#5FB7FF"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Urgency Green Waveform (GE Brand Color: #C8FF08) */}
          <path
            d="M 32 78 L 58 78 L 58 37 L 98 37 L 98 78 L 130 78"
            fill="none"
            stroke="#C8FF08"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

function EventDetailVisual({
  event,
  instanceId = "panel",
}: {
  event: StabilityEventType;
  instanceId?: string;
  rows?: Array<{
    time: number;
    eventVoltage?: number;
    eventAngle?: number;
    eventFreq?: number;
  }>;
  eventAt?: number;
  headers?: { eventVoltage?: string; eventAngle?: string; eventFreq?: string };
}) {
  return <EventDetailButtonGraph event={event} instanceId={instanceId} />;
}

/** Reference step-response — slightly larger Current-only; still a bit taller with Previous to fill space. */
function TimeDomainReferenceLegend({ expanded = false }: { expanded?: boolean }) {
  return (
    <div
      className={`stability-td-ref shrink-0 flex flex-col rounded-md border border-primary/25 bg-[#051619]/90 ${expanded ? "gap-0.5 px-2 py-1" : "gap-0.5 px-1.5 py-1"
        }`}
      title="Reference step-response markers: td response, tr rise, tp peak, Mp overshoot"
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div
          className={`uppercase tracking-wider text-primary/90 font-bold leading-none ${expanded ? "text-[8px]" : "text-[7.5px]"
            }`}
        >
          Reference — step response
        </div>
        <div
          className={`flex flex-wrap justify-end gap-x-1.5 text-diagram-line/75 font-mono leading-none ${expanded ? "text-[7px]" : "text-[7px]"
            }`}
        >
          <span>td Response</span>
          <span>tr Rise</span>
          <span>tp Peak</span>
          <span>Mp</span>
        </div>
      </div>
      {/* viewBox cropped on the right so settled flat line doesn't leave empty band */}
      <svg
        viewBox="0 0 210 68"
        className={`stability-td-ref__svg w-full ${expanded ? "h-[72px] sm:h-[80px]" : "h-[66px] sm:h-[72px]"
          }`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <line x1="20" y1="52" x2="200" y2="52" stroke="#5a7a80" strokeWidth="1" />
        <line x1="20" y1="52" x2="20" y2="6" stroke="#5a7a80" strokeWidth="1" />
        <text x="3" y="32" fill="#8aa" fontSize="8">
          c(t)
        </text>
        <text x="192" y="64" fill="#8aa" fontSize="8">
          t
        </text>
        <line
          x1="20"
          y1="22"
          x2="200"
          y2="22"
          stroke="#C8FF08"
          strokeWidth="0.8"
          strokeDasharray="2.5 2"
          opacity="0.45"
        />
        <line
          x1="20"
          y1="28"
          x2="200"
          y2="28"
          stroke="#C8FF08"
          strokeWidth="0.8"
          strokeDasharray="2.5 2"
          opacity="0.45"
        />
        <line
          x1="20"
          y1="25"
          x2="200"
          y2="25"
          stroke="#4a9"
          strokeWidth="0.6"
          strokeDasharray="2 2"
          opacity="0.5"
        />
        <path
          d="M20,52 C30,52 38,40 46,28 C56,12 66,8 76,10 C90,14 98,28 108,25 C120,22 132,30 144,25 C158,20 172,25 200,25"
          fill="none"
          stroke="#d4a574"
          strokeWidth="2"
        />
        <line
          x1="46"
          y1="52"
          x2="46"
          y2="28"
          stroke="#7ec8ff"
          strokeWidth="1"
          strokeDasharray="2 1.5"
        />
        <line
          x1="60"
          y1="52"
          x2="60"
          y2="12"
          stroke="#7ec8ff"
          strokeWidth="1"
          strokeDasharray="2 1.5"
        />
        <line
          x1="76"
          y1="52"
          x2="76"
          y2="10"
          stroke="#C8FF08"
          strokeWidth="1"
          strokeDasharray="2 1.5"
        />
        <line x1="76" y1="10" x2="76" y2="25" stroke="#C8FF08" strokeWidth="1.2" />
        <polygon points="76,10 72,16 80,16" fill="#C8FF08" />
        <text x="82" y="19" fill="#C8FF08" fontSize="8" fontWeight="700">
          Mp
        </text>
        <text x="40" y="64" fill="#7ec8ff" fontSize="8">
          td
        </text>
        <text x="54" y="64" fill="#7ec8ff" fontSize="8">
          tr
        </text>
        <text x="70" y="64" fill="#C8FF08" fontSize="8">
          tp
        </text>
      </svg>
    </div>
  );
}

function TimeDomainMetricTile({
  value,
  label,
  definition,
  icon,
  variant = "current",
}: {
  value: string;
  label: string;
  definition: string;
  icon: React.ReactNode;
  /** Previous tiles are denser + muted so Active / Prev share one column cleanly. */
  variant?: "current" | "previous";
}) {
  const isPrev = variant === "previous";
  return (
    <div
      className={
        isPrev
          ? "stability-td-tile stability-td-tile--prev flex flex-col justify-center gap-0.5 rounded-md border border-diagram-line/30 bg-black/35 px-1.5 py-1.5 text-center"
          : "stability-td-tile flex flex-col justify-center gap-1 rounded-lg border border-lime/50 bg-[#051619] px-1.5 py-1.5 text-center shadow-[0_0_8px_rgba(200,255,8,0.08)]"
      }
      title={definition}
    >
      <div className="flex items-center justify-center gap-1 min-w-0">
        {!isPrev && <span className="shrink-0 [&_svg]:w-3 [&_svg]:h-3 text-lime">{icon}</span>}
        <span
          className={
            isPrev
              ? "text-[7px] sm:text-[7.5px] font-bold uppercase tracking-tight leading-none text-diagram-line/70 truncate"
              : "text-[7.5px] sm:text-[8px] font-bold uppercase tracking-tight leading-none text-diagram-line/90 truncate"
          }
        >
          {label}
        </span>
      </div>
      <div
        className={
          isPrev
            ? "w-full font-mono font-bold leading-none border-t border-diagram-line/30 pt-1 text-[10px] sm:text-[11px] text-diagram-line/90 tabular-nums"
            : "w-full font-mono font-bold leading-none border-t border-lime/50 pt-1 text-[11px] sm:text-[12px] text-lime tabular-nums"
        }
      >
        {value}
      </div>
    </div>
  );
}

/** Slim caption under a compare dial (Current / Previous CFG id). */
function DialRoleCaption({ role, cfgId }: { role: "current" | "previous"; cfgId: string }) {
  const isPrev = role === "previous";
  return (
    <div className="mt-0.5 flex flex-col items-center leading-none max-w-[110px]">
      <span
        className={`text-[5.5px] uppercase tracking-wide font-bold ${isPrev ? "text-diagram-line/50" : "text-lime/70"
          }`}
      >
        {isPrev ? "Previous" : "Current"}
      </span>
      <span
        className={`font-mono text-[8px] font-bold tabular-nums truncate max-w-full ${isPrev ? "text-diagram-line/85" : "text-lime"
          }`}
        title={cfgId}
      >
        {cfgId}
      </span>
    </div>
  );
}

/** Side-by-side Time Domain values without 16 metric cards. */
/** Time Domain Ip / Iq cards with support for Current and Previous comparison. */
function TimeDomainCompareTable({
  title,
  titleHint,
  currentCfg,
  current,
  previousCfg,
  previous,
  formatPeak = formatKa,
}: {
  title: string;
  titleHint: string;
  currentCfg: string | null;
  current: ResponseMetrics | null;
  previousCfg?: string | null;
  previous?: ResponseMetrics | null;
  /** Peak display unit — kA (CFG1–11) or MW/MVAr (CFG12/13). */
  formatPeak?: (v: number | null) => string;
}) {
  const hasPrevious = Boolean(previousCfg);

  const rows: Array<{
    key: string;
    label: string;
    def: string;
    cur: string;
    prev: string;
    icon: React.ReactNode;
  }> = [
      {
        key: "response",
        label: "Response",
        def: TIME_DOMAIN_METRIC_DEFS.response,
        cur: formatMs(current?.responseTimeMs ?? null),
        prev: formatMs(previous?.responseTimeMs ?? null),
        icon: <Clock className="w-2.5 h-2.5 text-lime/90 shrink-0" aria-hidden />,
      },
      {
        key: "rise",
        label: "Rise",
        def: TIME_DOMAIN_METRIC_DEFS.rise,
        cur: formatMs(current?.riseTimeMs ?? null),
        prev: formatMs(previous?.riseTimeMs ?? null),
        icon: <Activity className="w-2.5 h-2.5 text-lime/90 shrink-0" aria-hidden />,
      },
      {
        key: "peak",
        label: "Peak",
        def: TIME_DOMAIN_METRIC_DEFS.peak,
        cur: formatPeak(current?.peakOvershootPu ?? null),
        prev: formatPeak(previous?.peakOvershootPu ?? null),
        icon: <PeakOvershootIcon className="w-2.5 h-2.5 text-lime/90 shrink-0" />,
      },
    ];

  const gridCols = hasPrevious
    ? "grid-cols-[minmax(4.5rem,0.34fr)_minmax(0,1fr)_minmax(0,1fr)]"
    : "grid-cols-[minmax(6rem,0.4fr)_minmax(0,1fr)]";

  return (
    <div className="min-w-0 rounded-lg border border-[#458A8A]/35 bg-[#004745] overflow-hidden flex flex-col h-full min-h-0 shadow-sm">
      <div
        className="px-2.5 py-1.5 font-sans font-bold tracking-wider text-white uppercase bg-[#004745]/90 border-b border-white/10 shrink-0 leading-tight rounded-t-lg text-xs sm:text-sm flex items-center justify-between gap-1.5"
        title={titleHint}
      >
        <span className="truncate">{title}</span>
        <div className="flex items-center gap-1 shrink-0">
          {currentCfg && (
            <span
              className="text-[10px] font-mono font-bold text-[#C8FF08] bg-black/25 px-1.5 py-0.5 rounded border border-[#C8FF08]/30"
              title={`Current: ${currentCfg}`}
            >
              {currentCfg}
            </span>
          )}
          {hasPrevious && (
            <span
              className="text-[10px] font-mono font-bold text-white/70 bg-black/25 px-1.5 py-0.5 rounded border border-white/20"
              title={`Previous: ${previousCfg}`}
            >
              prev {previousCfg}
            </span>
          )}
        </div>
      </div>
      <div className={`grid items-center border-b border-white/15 shrink-0 ${gridCols} py-1 bg-black/30 text-[10px]`}>
        <div className="px-2 uppercase text-white/70 font-bold">
          Metric
        </div>
        <div className="px-1 text-center border-l border-white/15 min-w-0 overflow-hidden">
          <div className="uppercase tracking-wider text-[#C8FF08] font-bold leading-none truncate">
            {hasPrevious ? (currentCfg ?? "Current") : "Current Value"}
          </div>
        </div>
        {hasPrevious && (
          <div className="px-1 text-center border-l border-white/15 min-w-0 overflow-hidden">
            <div className="uppercase tracking-wider text-white/70 font-bold leading-none truncate">
              {previousCfg ?? "Previous"}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col overflow-hidden flex-1 min-h-0 divide-y divide-white/10">
        {rows.map((row) => (
          <div
            key={row.key}
            title={row.def}
            className={`grid items-center flex-1 min-h-[34px] py-0.5 ${gridCols} min-w-0 hover:bg-white/[0.04] transition-colors`}
          >
            <div className="px-2 font-bold uppercase text-white leading-none flex items-center gap-1.5 min-w-0 text-[10.5px]">
              {row.icon}
              <span className="truncate">{row.label}</span>
            </div>
            <div
              className="px-1 text-center font-mono font-bold text-[#C8FF08] tabular-nums border-l border-white/15 whitespace-nowrap leading-none text-xs sm:text-sm min-w-0 overflow-hidden text-ellipsis drop-shadow-[0_0_8px_rgba(200,255,8,0.3)]"
              title={row.cur}
            >
              {row.cur}
            </div>
            {hasPrevious && (
              <div
                className="px-1 text-center font-mono font-bold text-white/70 tabular-nums border-l border-white/15 whitespace-nowrap leading-none text-xs sm:text-sm min-w-0 overflow-hidden text-ellipsis"
                title={row.prev}
              >
                {row.prev}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** With previous: one naming column; Current Ip|Iq left; Previous Ip|Iq right. */
function TimeDomainMetricsTable({
  currentCfg,
  previousCfg,
  currentIp,
  currentIq,
  previousIp,
  previousIq,
  activeColLabel = "Ip",
  reactiveColLabel = "Iq",
  formatPeakActive = formatKa,
  formatPeakReactive = formatKa,
}: {
  currentCfg: string | null;
  previousCfg: string;
  currentIp: ResponseMetrics | null;
  currentIq: ResponseMetrics | null;
  previousIp: ResponseMetrics | null;
  previousIq: ResponseMetrics | null;
  activeColLabel?: string;
  reactiveColLabel?: string;
  formatPeakActive?: (v: number | null) => string;
  formatPeakReactive?: (v: number | null) => string;
}) {
  const colTemplate = "grid-cols-[minmax(5.6rem,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]";

  const rows: Array<{
    key: string;
    label: string;
    def: string;
    icon: React.ReactNode;
    curIp: string;
    curIq: string;
    prevIp: string;
    prevIq: string;
  }> = [
      {
        key: "response",
        label: "Response",
        def: TIME_DOMAIN_METRIC_DEFS.response,
        icon: <Clock className="w-3 h-3 text-[#C8FF08] shrink-0" aria-hidden />,
        curIp: formatMs(currentIp?.responseTimeMs ?? null),
        curIq: formatMs(currentIq?.responseTimeMs ?? null),
        prevIp: formatMs(previousIp?.responseTimeMs ?? null),
        prevIq: formatMs(previousIq?.responseTimeMs ?? null),
      },
      {
        key: "rise",
        label: "Rise",
        def: TIME_DOMAIN_METRIC_DEFS.rise,
        icon: <Activity className="w-3 h-3 text-[#C8FF08] shrink-0" aria-hidden />,
        curIp: formatMs(currentIp?.riseTimeMs ?? null),
        curIq: formatMs(currentIq?.riseTimeMs ?? null),
        prevIp: formatMs(previousIp?.riseTimeMs ?? null),
        prevIq: formatMs(previousIq?.riseTimeMs ?? null),
      },
      {
        key: "peak",
        label: "Peak",
        def: TIME_DOMAIN_METRIC_DEFS.peak,
        icon: <PeakOvershootIcon className="w-3 h-3 text-[#C8FF08] shrink-0" />,
        curIp: formatPeakActive(currentIp?.peakOvershootPu ?? null),
        curIq: formatPeakReactive(currentIq?.peakOvershootPu ?? null),
        prevIp: formatPeakActive(previousIp?.peakOvershootPu ?? null),
        prevIq: formatPeakReactive(previousIq?.peakOvershootPu ?? null),
      },
    ];

  const valueCell = (text: string, muted: boolean) => (
    <div
      className={`px-0.5 text-center font-mono font-bold tabular-nums border-l border-white/15 whitespace-nowrap leading-none text-[10.5px] sm:text-[11px] ${muted ? "text-white/70" : "text-[#C8FF08]"
        }`}
      title={text}
    >
      {text}
    </div>
  );

  return (
    <div className="min-w-0 rounded-lg border border-[#458A8A]/35 bg-[#004745] overflow-hidden flex flex-col h-full min-h-0">
      <div
        className={`grid ${colTemplate} items-stretch border-b border-[#458A8A]/35 shrink-0 bg-[#005E60]`}
      >
        <div className="px-1.5 py-1 text-[10px] uppercase text-white/70 font-bold self-end tracking-wider">
          Metric
        </div>
        <div className="px-1 py-0.5 text-center border-l border-white/15 col-span-2 min-w-0 overflow-hidden">
          <div className="text-[9px] uppercase tracking-wider text-[#C8FF08] font-bold leading-none">
            Current
          </div>
          <div
            className="text-[10.5px] sm:text-[11.5px] font-mono font-bold text-[#C8FF08] leading-tight mt-0.5 truncate px-0.5"
            title={currentCfg ?? undefined}
          >
            {currentCfg ?? "—"}
          </div>
        </div>
        <div className="px-1 py-0.5 text-center border-l border-white/15 col-span-2 min-w-0 overflow-hidden">
          <div className="text-[9px] uppercase tracking-wider text-white/70 font-bold leading-none">
            Previous
          </div>
          <div
            className="text-[10.5px] sm:text-[11.5px] font-mono font-bold text-white/90 leading-tight mt-0.5 truncate px-0.5"
            title={previousCfg}
          >
            {previousCfg}
          </div>
        </div>
      </div>
      <div className={`grid ${colTemplate} items-center border-b border-white/15 shrink-0 bg-black/20 text-[9.5px]`}>
        <div className="px-1.5 py-0.5" />
        <div
          className="px-1 py-0.5 text-center uppercase font-bold text-[#C8FF08] border-l border-white/15"
          title="Phase jump → Ip / P"
        >
          {activeColLabel}
        </div>
        <div
          className="px-1 py-0.5 text-center uppercase font-bold text-[#C8FF08] border-l border-white/15"
          title="Voltage step → Iq / Q"
        >
          {reactiveColLabel}
        </div>
        <div
          className="px-1 py-0.5 text-center uppercase font-bold text-white/60 border-l border-white/15"
          title="Phase jump → Ip / P"
        >
          {activeColLabel}
        </div>
        <div
          className="px-1 py-0.5 text-center uppercase font-bold text-white/60 border-l border-white/15"
          title="Voltage step → Iq / Q"
        >
          {reactiveColLabel}
        </div>
      </div>
      <div className="flex flex-col flex-1 min-h-0 divide-y divide-white/10">
        {rows.map((row) => (
          <div
            key={row.key}
            title={row.def}
            className={`grid ${colTemplate} items-center flex-1 min-h-[30px] py-0.5 hover:bg-white/[0.04] transition-colors`}
          >
            <div className="px-1.5 font-bold uppercase text-white leading-none flex items-center gap-1 min-w-0 text-[10px]">
              {row.icon}
              <span className="truncate">{row.label}</span>
            </div>
            {valueCell(row.curIp, false)}
            {valueCell(row.curIq, false)}
            {valueCell(row.prevIp, true)}
            {valueCell(row.prevIq, true)}
          </div>
        ))}
      </div>
    </div>
  );
}

const TIME_DOMAIN_OPEN_KEY = "stability.timeDomainOpen";

/** Survives Strict Mode remount so refresh restore does not flash the wrong state. */
let timeDomainOpenBoot: boolean | null = null;

/** First visit → open. After user toggles, honor saved choice across refresh. */
function readTimeDomainOpen(): boolean {
  try {
    const v = localStorage.getItem(TIME_DOMAIN_OPEN_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

function writeTimeDomainOpen(open: boolean) {
  try {
    localStorage.setItem(TIME_DOMAIN_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

export interface ChartProps {
  title: string;
  data: Array<{
    time: number;
    activeCurrent: number;
    reactiveCurrent: number;
    shortCircuitCurrent: number;
  }>;
  dataKey: "activeCurrent" | "reactiveCurrent" | "shortCircuitCurrent";
  yLabel: string;
  color?: string;
  currentEventTime: number;
  activeEvent: string;
  breakerOpen: boolean;
  parseError: string | null;
  isPaused?: boolean;
  onTogglePause?: (paused: boolean) => void;
  onFullscreen: () => void;
  onEventPlaybackDone?: () => void;
  fillContainer?: boolean;
  csvFileName?: string;
  csvUrl?: string;
  /** CSV sample Δt (s) for this CFG+event — WhatsApp W1; prefer derived from target CSV. */
  tickSize?: number;
  cfgName?: string | null;
  /** Gyan pre-event pack (~2 s loop) — WhatsApp W2. */
  preEventData?: PreeventRow[];
  /** Fixed Y from Asha PDF — WhatsApp W4 / email §15. */
  yAxisRange?: YAxisRange | null;
  /** Y-axis unit label — 'Ip (pu)' / 'Iq (pu)' CFG1–11; '(MW)' / '(MVAr)' CFG12/13. */
  yUnit?: string;
}

export function UPlotRealtimeChart({
  title,
  data,
  dataKey,
  color = "#c8ff08",
  yLabel = "",
  activeEvent = "none",
  breakerOpen = false,
  currentEventTime = 5.0,
  fillContainer = false,
  isPaused = false,
  onTogglePause,
  onEventPlaybackDone,
  csvFileName,
  csvUrl,
  tickSize: tickSizeProp,
  cfgName = null,
  preEventData = [],
  yAxisRange = null,
  yUnit = "Ip (pu)",
}: ChartProps) {
  const chartDivRef = useRef<HTMLDivElement | null>(null);
  const uplotRef = useRef<uPlot | null>(null);
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const [isUserZoomed, setIsUserZoomed] = useState<boolean>(false);
  const userZoomActiveRef = useRef<boolean>(false);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const isPanModeRef = useRef<boolean>(false);
  isPanModeRef.current = isPanMode;
  const graphTimeRef = useRef<number>(0);
  const csvReadTimeRef = useRef<number>(0);
  const csvIdxRef = useRef<number>(0);
  const accXRef = useRef<number[]>([]);
  const accYRef = useRef<number[]>([]);
  const preIdxRef = useRef(0);
  const eventXMaxRef = useRef<number | null>(null);
  const eventXPreRef = useRef<number | null>(null);
  const playbackDoneRef = useRef(false);
  const dialsRevealedRef = useRef(false);
  const armedDataSigRef = useRef<string>("");

  const prevBreakerRef = useRef<boolean>(breakerOpen);
  const prevEventRef = useRef<string>(activeEvent);
  const prevCfgRef = useRef<string | null>(cfgName);
  const dataRef = useRef(data);
  const dataKeyRef = useRef(dataKey);
  const preEventRef = useRef(preEventData);

  dataRef.current = data;
  dataKeyRef.current = dataKey;
  preEventRef.current = preEventData;

  const dataEndTime = data.length ? Number(data[data.length - 1]?.time) : null;
  const dataSig = `${data.length}:${dataEndTime ?? ""}:${(data as { tickSize?: number }).tickSize ?? ""}`;

  const lookupCsv = (csvT: number): number => {
    const d = dataRef.current;
    const dk = dataKeyRef.current;
    if (!d || d.length === 0) return 0;
    let idx = csvIdxRef.current;
    if (idx >= d.length) idx = d.length - 1;
    if (idx < 0) idx = 0;
    while (idx < d.length - 1 && Number(d[idx].time) < csvT) {
      idx++;
    }
    csvIdxRef.current = idx;
    return Number(d[idx][dk]) || 0;
  };

  const isEventSeriesReady = (d: typeof data, tEvent: number): boolean => {
    if (!d?.length) return false;
    const tLast = Number(d[d.length - 1]?.time);
    if (!Number.isFinite(tLast)) return false;
    return tLast > tEvent + 0.05;
  };

  const eventAt = currentEventTime || 5.0;

  // W4 — fixed Y from Asha PDF (shared Ip/Iq); fallback to data extent
  let domainMinY: number;
  let domainMaxY: number;
  let yInterval: number | undefined;
  if (yAxisRange) {
    domainMinY = yAxisRange.min;
    domainMaxY = yAxisRange.max;
    yInterval = yAxisRange.tickStep;
  } else {
    const allYVals: number[] = [];
    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        const v = Number((data[i] as any)[dataKey]);
        if (!isNaN(v)) allYVals.push(v);
      }
    }
    const accY = accYRef.current;
    for (let i = 0; i < accY.length; i++) {
      const v = accY[i];
      if (!isNaN(v)) allYVals.push(v);
    }
    let minY = allYVals.length > 0 ? Math.min(...allYVals) : 0;
    let maxY = allYVals.length > 0 ? Math.max(...allYVals) : 1;
    if (Math.abs(maxY - minY) < 1e-4) {
      minY -= 0.1;
      maxY += 0.1;
    }
    const padY = (maxY - minY) * 0.15 || 0.1;
    domainMinY = Number((minY - padY).toFixed(2));
    domainMaxY = Number((maxY + padY).toFixed(2));
  }

  const stColName =
    (data as any)?.headers?.[dataKey] ||
    (dataKey === "activeCurrent"
      ? "Ip_GEP_pu Main"
      : dataKey === "reactiveCurrent"
        ? "Iq_GEP_pu Main"
        : "Irms_poc1");

  const xAxisMax = chartXAxisMax({
    cfgName,
    graphTime: graphTimeRef.current,
    eventXMax: eventXMaxRef.current,
    hasPoints: accXRef.current.length > 0,
  });

  const handleResetZoom = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    userZoomActiveRef.current = false;
    setIsUserZoomed(false);
    if (uplotRef.current) {
      const curMax = chartXAxisMax({
        cfgName,
        graphTime: graphTimeRef.current,
        eventXMax: eventXMaxRef.current,
        hasPoints: accXRef.current.length > 0,
      });
      uplotRef.current.setScale("x", { min: 0, max: curMax });
      uplotRef.current.setScale("y", { min: domainMinY, max: domainMaxY });
    }
  };

  const handleZoomStep = (factor: number) => {
    if (!uplotRef.current) return;
    const u = uplotRef.current;
    const curMin = u.scales.x.min ?? 0;
    const curMax = u.scales.x.max ?? 40;
    const span = curMax - curMin;
    const newSpan = Math.max(0.05, Math.min(span * factor, 1000));
    const center = (curMin + curMax) / 2;
    const newMin = Math.max(0, center - newSpan / 2);
    const newMax = newMin + newSpan;
    userZoomActiveRef.current = true;
    setIsUserZoomed(true);
    u.setScale("x", { min: newMin, max: newMax });
  };

  const handlePanStep = (direction: -1 | 1) => {
    if (!uplotRef.current) return;
    const u = uplotRef.current;
    const curMin = u.scales.x.min ?? 0;
    const curMax = u.scales.x.max ?? 40;
    const span = curMax - curMin;
    const shift = span * 0.25 * direction;
    const newMin = Math.max(0, curMin + shift);
    const newMax = newMin + span;
    userZoomActiveRef.current = true;
    setIsUserZoomed(true);
    u.setScale("x", { min: newMin, max: newMax });
  };

  useEffect(() => {
    if (chartDivRef.current) {
      const over = chartDivRef.current.querySelector(".u-over") as HTMLElement | null;
      if (over) {
        over.style.cursor = isPanMode ? "grab" : "";
      }
    }
  }, [isPanMode]);

  // Build / update uPlot instance
  useLayoutEffect(() => {
    if (!chartDivRef.current || typeof window === "undefined") return;

    const container = chartDivRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 220;

    if (uplotRef.current) {
      uplotRef.current.destroy();
      uplotRef.current = null;
    }

    let tooltipEl: HTMLDivElement | null = null;
    let tooltipOverEl: Element | null = null; // cached to avoid per-mousemove DOM query
    let lastTooltipIdx: number | null = null; // skip rebuild when idx unchanged
    let cleanupListeners: (() => void) | null = null;

    // Pre-compute fill color string once — avoids per-repaint string parse
    const seriesFill = `${color}18`;

    const opts: uPlot.Options = {
      width,
      height,
      padding: [10, 16, 8, 12],
      cursor: {
        show: true,
        drag: { x: true, y: false, setScale: false },
        points: { show: false },
        sync: { key: "stability-sync" },
        bind: {
          click: () => () => null,
          dblclick: () => () => null,
        },
      },
      select: {
        show: true,
        over: true,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      },
      hooks: {
        init: [
          (u) => {
            tooltipEl = document.createElement("div");
            tooltipEl.className = "uplot-tooltip";
            tooltipEl.style.display = "none";
            tooltipEl.style.position = "absolute";
            tooltipEl.style.pointerEvents = "none";
            tooltipEl.style.backgroundColor = "rgba(5, 22, 25, 0.95)";
            tooltipEl.style.border = `1px solid ${color}`;
            tooltipEl.style.borderRadius = "4px";
            tooltipEl.style.padding = "4px 8px";
            tooltipEl.style.fontSize = "11px";
            tooltipEl.style.fontFamily = "'Inter', sans-serif";
            tooltipEl.style.color = "#ffffff";
            tooltipEl.style.zIndex = "100";
            tooltipEl.style.boxShadow = `0 0 12px ${color}33`;
            const over = u.root.querySelector(".u-over") as HTMLElement | null;
            if (over) {
              over.appendChild(tooltipEl);
              tooltipOverEl = over; // cache for setCursor — avoid per-mousemove querySelector
              if (isPanModeRef.current) {
                over.style.cursor = "grab";
              }

              // Wheel zoom on canvas
              const wheelHandler = (e: WheelEvent) => {
                e.preventDefault();
                const rect = over.getBoundingClientRect();
                const mouseLeft = e.clientX - rect.left;
                const mouseValX = u.posToVal(mouseLeft, "x");

                const xMin = u.scales.x.min ?? 0;
                const xMax = u.scales.x.max ?? 40;

                const factor = e.deltaY < 0 ? 0.75 : 1.35;
                const leftDist = (mouseValX - xMin) * factor;
                const rightDist = (xMax - mouseValX) * factor;

                const newMin = Math.max(0, mouseValX - leftDist);
                const newMax = mouseValX + rightDist;

                if (newMax - newMin > 0.05) {
                  userZoomActiveRef.current = true;
                  setIsUserZoomed(true);
                  u.setScale("x", { min: newMin, max: newMax });
                }
              };
              over.addEventListener("wheel", wheelHandler, { passive: false });

              // Drag Pan handlers (Pan Mode, Shift+Drag, Alt+Drag, Middle Click, Right Click)
              let isPanning = false;
              let panStartX = 0;
              let panStartMin = 0;
              let panStartMax = 0;

              const onMouseDown = (e: MouseEvent) => {
                const isPanTrigger = isPanModeRef.current || e.shiftKey || e.altKey || e.button === 1 || e.button === 2;
                if (!isPanTrigger) return;
                if (e.button === 2) {
                  e.preventDefault();
                }
                isPanning = true;
                panStartX = e.clientX;
                panStartMin = u.scales.x.min ?? 0;
                panStartMax = u.scales.x.max ?? 40;
                over.style.cursor = "grabbing";
              };

              const onMouseMove = (e: MouseEvent) => {
                if (!isPanning) return;
                e.preventDefault();
                const rect = over.getBoundingClientRect();
                const plotWidth = rect.width || 300;
                const pixelDelta = panStartX - e.clientX;
                const span = panStartMax - panStartMin;
                const valDelta = (pixelDelta / plotWidth) * span;
                const newMin = Math.max(0, panStartMin + valDelta);
                const newMax = newMin + span;

                userZoomActiveRef.current = true;
                setIsUserZoomed(true);
                u.setScale("x", { min: newMin, max: newMax });
              };

              const onMouseUp = () => {
                if (isPanning) {
                  isPanning = false;
                  over.style.cursor = isPanModeRef.current ? "grab" : "";
                }
              };

              const onContextMenu = (e: MouseEvent) => {
                if (isPanning || isPanModeRef.current) {
                  e.preventDefault();
                }
              };

              over.addEventListener("mousedown", onMouseDown);
              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
              over.addEventListener("contextmenu", onContextMenu);

              cleanupListeners = () => {
                over.removeEventListener("wheel", wheelHandler);
                over.removeEventListener("mousedown", onMouseDown);
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
                over.removeEventListener("contextmenu", onContextMenu);
              };
            }
          },
        ],
        setSelect: [
          (u) => {
            if (isPanModeRef.current) {
              u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
              return;
            }
            const dx = u.select.width;
            if (dx > 4) {
              const minVal = u.posToVal(u.select.left, "x");
              const maxVal = u.posToVal(u.select.left + u.select.width, "x");
              const xStart = Math.max(0, Math.min(minVal, maxVal));
              const xEnd = Math.max(minVal, maxVal);
              if (xEnd - xStart > 0.05) {
                userZoomActiveRef.current = true;
                setIsUserZoomed(true);
                u.setScale("x", { min: xStart, max: xEnd });
              }
            }
            u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
          },
        ],
        setCursor: [
          (u) => {
            const { idx, left, top } = u.cursor;
            if (!tooltipEl) return;
            if (idx == null || left == null || top == null || left < 0 || top < 0) {
              tooltipEl.style.display = "none";
              lastTooltipIdx = null;
              return;
            }
            const timeVal = u.data[0]?.[idx];
            const metricVal = u.data[1]?.[idx];
            if (timeVal == null || metricVal == null || Number.isNaN(metricVal)) {
              tooltipEl.style.display = "none";
              lastTooltipIdx = null;
              return;
            }
            // Only rebuild innerHTML when the data index changes — skip on pure position moves
            if (idx !== lastTooltipIdx) {
              tooltipEl.innerHTML = `<div><span style="color:#aaa">Time:</span> <b>${timeVal.toFixed(3)}s</b><br/><span style="color:#aaa">${yLabel}:</span> <b style="color:${color}">${metricVal.toFixed(4)}</b></div>`;
              lastTooltipIdx = idx;
            }
            tooltipEl.style.display = "block";
            // Use cached over reference — avoids a DOM querySelector on every mouse move
            const overW = tooltipOverEl?.clientWidth ?? 300;
            const ttW = tooltipEl.offsetWidth || 160;
            const xPos = left + 15 + ttW > overW ? left - ttW - 10 : left + 15;
            tooltipEl.style.left = `${Math.max(0, xPos)}px`;
            tooltipEl.style.top = `${Math.max(0, top - 20)}px`;
          },
        ],
      },
      scales: {
        x: {
          time: false,
          auto: false,
          // No range function — with auto:false, uPlot uses scale min/max
          // set exclusively via setScale(). Initial window set right after construction.
        },
        y: {
          auto: false,
          range: [domainMinY, domainMaxY],
        },
      },
      axes: [
        {
          scale: "x",
          label: "Time (s)",
          labelFont: "bold 10px 'GE Inter', 'Inter', sans-serif",
          labelSize: 18,
          stroke: "rgba(255, 255, 255, 0.85)",
          font: "10px 'GE Inter', 'Inter', sans-serif",
          ticks: { show: true, stroke: "rgba(255, 255, 255, 0.3)", width: 1, size: 4 },
          grid: { show: true, stroke: "rgba(255, 255, 255, 0.12)", width: 1, dash: [3, 3] },
          values: (_self, splits) => splits.map((v) => `${v.toFixed(1)}s`),
          size: 30,
          space: 50,
        },
        {
          scale: "y",
          label: yUnit,
          labelFont: "bold 10px 'GE Inter', 'Inter', sans-serif",
          labelSize: 22,
          stroke: "rgba(255, 255, 255, 0.9)",
          font: "10px 'GE Inter', 'Inter', sans-serif",
          ticks: { show: true, stroke: "rgba(255, 255, 255, 0.3)", width: 1, size: 4 },
          grid: { show: true, stroke: "rgba(255, 255, 255, 0.12)", width: 1, dash: [3, 3] },
          splits: (_self, _axisIdx, scaleMin, scaleMax) => {
            if (yInterval && yInterval > 0) {
              const arr: number[] = [];
              const start = Math.ceil((scaleMin - 1e-9) / yInterval) * yInterval;
              for (let v = start; v <= scaleMax + 1e-7; v += yInterval) {
                arr.push(Number(v.toFixed(4)));
              }
              if (arr.length >= 2) return arr;
            }
            const count = 5;
            const span = scaleMax - scaleMin;
            const step = span / count;
            const arr: number[] = [];
            for (let i = 0; i <= count; i++) {
              arr.push(Number((scaleMin + i * step).toFixed(4)));
            }
            return arr;
          },
          values: (_self, splits) =>
            splits.map((v) => {
              if (Math.abs(v) < 1e-9) return "0.00";
              if (yInterval && yInterval < 0.01) return v.toFixed(3);
              return v.toFixed(2);
            }),
          size: 52,
          space: 25,
        },
      ],
      series: [
        {},
        {
          label: title,
          stroke: color,
          width: 1.5,
          //fill: seriesFill,  // pre-computed — avoids per-repaint string parse
          points: { show: false },
        },
      ],
    };

    const initialData: uPlot.AlignedData = [
      accXRef.current.length > 0 ? accXRef.current : [0],
      accYRef.current.length > 0 ? accYRef.current : [0],
    ];

    const u = new uPlot(opts, initialData, container);
    uplotRef.current = u;
    u.setScale("x", { min: 0, max: xAxisMax });

    const ro = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const entry = entries[0];
      const newW = entry.contentRect.width;
      const newH = entry.contentRect.height;
      if (newW > 0 && newH > 0 && uplotRef.current) {
        uplotRef.current.setSize({ width: newW, height: newH });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (cleanupListeners) cleanupListeners();
      if (uplotRef.current) {
        uplotRef.current.destroy();
        uplotRef.current = null;
      }
    };
  }, [domainMinY, domainMaxY, yInterval, yUnit, color, title, yLabel, stColName]);

  // Stepping / Accumulator Loop
  useEffect(() => {
    const breakerChanged = prevBreakerRef.current !== breakerOpen;
    const eventChanged = prevEventRef.current !== activeEvent;
    const cfgChanged = prevCfgRef.current !== cfgName;
    prevBreakerRef.current = breakerOpen;
    prevEventRef.current = activeEvent;
    prevCfgRef.current = cfgName;

    if (breakerOpen) {
      graphTimeRef.current = 0;
      csvReadTimeRef.current = 0;
      csvIdxRef.current = 0;
      accXRef.current = [];
      accYRef.current = [];
      preIdxRef.current = 0;
      eventXMaxRef.current = null;
      eventXPreRef.current = null;
      playbackDoneRef.current = false;
      dialsRevealedRef.current = false;
      armedDataSigRef.current = "";
      userZoomActiveRef.current = false;
      setIsUserZoomed(false);
      if (uplotRef.current) {
        uplotRef.current.setData([[], []], false);
        const curMax = chartXAxisMax({
          cfgName,
          graphTime: 0,
          eventXMax: null,
          hasPoints: false,
        });
        uplotRef.current.setScale("x", { min: 0, max: curMax });
      }
      return;
    }

    if (cfgChanged) {
      userZoomActiveRef.current = false;
      setIsUserZoomed(false);
      graphTimeRef.current = 0;
      csvReadTimeRef.current = 0;
      csvIdxRef.current = 0;
      accXRef.current = [];
      accYRef.current = [];
      preIdxRef.current = 0;
      eventXMaxRef.current = null;
      eventXPreRef.current = null;
      playbackDoneRef.current = false;
      dialsRevealedRef.current = false;
      armedDataSigRef.current = "";
      if (uplotRef.current) {
        uplotRef.current.setData([[], []], false);
        const curMax = chartXAxisMax({
          cfgName,
          graphTime: 0,
          eventXMax: null,
          hasPoints: false,
        });
        uplotRef.current.setScale("x", { min: 0, max: curMax });
      }
    }

    if (breakerChanged && !breakerOpen) {
      graphTimeRef.current = 0;
      csvReadTimeRef.current = 0;
      csvIdxRef.current = 0;
      accXRef.current = [];
      accYRef.current = [];
      preIdxRef.current = 0;
      eventXMaxRef.current = null;
      eventXPreRef.current = null;
      playbackDoneRef.current = false;
      dialsRevealedRef.current = false;
      armedDataSigRef.current = "";
      userZoomActiveRef.current = false;
      setIsUserZoomed(false);
      if (uplotRef.current) {
        uplotRef.current.setData([[], []], false);
        const curMax = chartXAxisMax({
          cfgName,
          graphTime: 0,
          eventXMax: null,
          hasPoints: false,
        });
        uplotRef.current.setScale("x", { min: 0, max: curMax });
      }
    }

    if (eventChanged && activeEvent !== "none") {
      userZoomActiveRef.current = false;
      setIsUserZoomed(false);
      const xPre = graphTimeRef.current;
      eventXPreRef.current = xPre;
      const initialSpan = getInitialXSize(cfgName) ?? 40;
      const expectedXMax = xPre + initialSpan;
      eventXMaxRef.current = expectedXMax;
      csvReadTimeRef.current = eventAt;
      csvIdxRef.current = 0;
      playbackDoneRef.current = false;
      dialsRevealedRef.current = false;
      armedDataSigRef.current = "";
      if (uplotRef.current) {
        uplotRef.current.setScale("x", { min: 0, max: expectedXMax });
      }
    }

    if (eventChanged && activeEvent === "none") {
      userZoomActiveRef.current = false;
      setIsUserZoomed(false);
      eventXMaxRef.current = null;
      eventXPreRef.current = null;
      playbackDoneRef.current = false;
      armedDataSigRef.current = "";
      preIdxRef.current = 0;
      csvIdxRef.current = 0;
      if (uplotRef.current) {
        const curMax = chartXAxisMax({
          cfgName,
          graphTime: graphTimeRef.current,
          eventXMax: null,
          hasPoints: accXRef.current.length > 0,
        });
        uplotRef.current.setScale("x", { min: 0, max: curMax });
      }
    }

    if (activeEvent !== "none" && isEventSeriesReady(data, eventAt)) {
      if (armedDataSigRef.current !== dataSig) {
        const tLast = Number(data[data.length - 1].time);
        const xPre = eventXPreRef.current ?? graphTimeRef.current;
        eventXPreRef.current = xPre;
        graphTimeRef.current = xPre;
        const computedMax = computeEventXMax({
          cfgName,
          xPre,
          tEvent: eventAt,
          tLast,
        });
        eventXMaxRef.current = computedMax;
        csvReadTimeRef.current = eventAt;
        csvIdxRef.current = 0;
        playbackDoneRef.current = false;
        dialsRevealedRef.current = false;
        armedDataSigRef.current = dataSig;
        userZoomActiveRef.current = false;
        setIsUserZoomed(false);

        // Trim any points at or beyond xPre so X remains strictly ascending
        while (
          accXRef.current.length > 0 &&
          accXRef.current[accXRef.current.length - 1] >= xPre - 1e-9
        ) {
          accXRef.current.pop();
          accYRef.current.pop();
        }

        if (uplotRef.current) {
          uplotRef.current.setScale("x", { min: 0, max: computedMax });
        }
      }
    }

    const attached = Number((data as { tickSize?: number } | undefined)?.tickSize);
    const preAttached = Number((preEventData as { tickSize?: number } | undefined)?.tickSize);
    const resolvedTick =
      tickSizeProp != null && tickSizeProp > 0
        ? tickSizeProp
        : Number.isFinite(attached) && attached > 0
          ? attached
          : Number.isFinite(preAttached) && preAttached > 0
            ? preAttached
            : resolveTickSize(
              cfgName,
              activeEvent === "none" ? "fault" : (activeEvent as StabilityEventType),
              data.length ? data : preEventData,
            );
    const perFrameIdle = ticksPerUiFrame(resolvedTick, IDLE_SIM_PER_FRAME_SEC);
    const perFrameEvent = ticksPerUiFrame(resolvedTick, EVENT_SIM_PER_FRAME_SEC);

    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      if (playbackDoneRef.current) return;

      const isEvent = activeEvent !== "none";
      const dk = dataKeyRef.current as "activeCurrent" | "reactiveCurrent";

      if (!isEvent || eventXMaxRef.current == null) {
        const pre = preEventRef.current;
        if (!pre?.length) return;

        for (let i = 0; i < perFrameIdle; i++) {
          const row = pre[preIdxRef.current % pre.length];
          preIdxRef.current = (preIdxRef.current + 1) % pre.length;
          if (isEvent && eventXPreRef.current != null) {
            // Waiting for post CSV: keep last point alive without pushing duplicate X
            const y = Number(row[dk]) || 0;
            if (accYRef.current.length > 0) {
              accYRef.current[accYRef.current.length - 1] = y;
            }
          } else {
            graphTimeRef.current += resolvedTick;
            const y = Number(row[dk]) || 0;
            const roundedTime = Number(graphTimeRef.current.toFixed(6));
            const lastX = accXRef.current.length > 0 ? accXRef.current[accXRef.current.length - 1] : -1;
            if (roundedTime > lastX) {
              accXRef.current.push(roundedTime);
              accYRef.current.push(y);
            }
          }
        }
      } else {
        const d = dataRef.current;
        if (!d?.length || !isEventSeriesReady(d, eventAt)) return;

        const tLast = d[d.length - 1]?.time ?? eventAt;
        const xMax = eventXMaxRef.current;

        for (let i = 0; i < perFrameEvent; i++) {
          if (csvReadTimeRef.current > tLast + 1e-9 || graphTimeRef.current >= xMax - 1e-12) {
            playbackDoneRef.current = true;
            break;
          }
          const val = lookupCsv(csvReadTimeRef.current);
          graphTimeRef.current += resolvedTick;
          csvReadTimeRef.current += resolvedTick;
          const roundedTime = Number(graphTimeRef.current.toFixed(6));
          const lastX = accXRef.current.length > 0 ? accXRef.current[accXRef.current.length - 1] : -1;
          if (roundedTime > lastX) {
            accXRef.current.push(roundedTime);
            accYRef.current.push(val);
          }
        }

        if (
          !dialsRevealedRef.current &&
          onEventPlaybackDone &&
          csvReadTimeRef.current >= eventAt + 0.3
        ) {
          dialsRevealedRef.current = true;
          onEventPlaybackDone();
        }
      }

      if (uplotRef.current && accXRef.current.length > 0) {
        uplotRef.current.setData([accXRef.current, accYRef.current], false);
        if (!userZoomActiveRef.current) {
          const curMax = chartXAxisMax({
            cfgName,
            graphTime: graphTimeRef.current,
            eventXMax: eventXMaxRef.current,
            hasPoints: accXRef.current.length > 0,
          });
          uplotRef.current.setScale("x", { min: 0, max: curMax });
        }
      }
    }, 20);

    return () => clearInterval(interval);
  }, [
    activeEvent,
    breakerOpen,
    currentEventTime,
    tickSizeProp,
    cfgName,
    preEventData,
    dataSig,
    data,
    eventAt,
  ]);

  const shellClass = fillContainer
    ? "border border-diagram-line/20 px-1.5 pt-1.5 pb-2 flex flex-col h-full min-h-0 overflow-hidden"
    : "border border-diagram-line/20 p-2.5 flex flex-col stability-chart-shell";

  return (
    <div className={`${shellClass} transition-colors group relative select-none`}>
      <div className="text-diagram-line text-xs sm:text-sm font-semibold mb-1 group-hover:text-primary transition-colors flex items-center justify-between z-10 gap-1.5 flex-wrap leading-none font-sans">
        <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
          <span className="truncate text-white font-bold" title={title}>
            {title}
          </span>
          {isPaused && (
            <span className="text-xs font-sans font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded animate-pulse shrink-0 leading-none">
              PAUSED
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 font-sans">
          {isUserZoomed && (
            <span className="text-xs font-sans font-semibold text-[#5FB7FF] bg-[#5FB7FF]/10 border border-[#5FB7FF]/40 px-2 py-0.5 rounded leading-none">
              ZOOM/PAN
            </span>
          )}
          <button
            type="button"
            onClick={() => handlePanStep(-1)}
            className="flex items-center justify-center px-2 py-0.5 text-xs font-sans font-bold rounded bg-lime/10 hover:bg-lime/20 text-lime border border-lime/30 transition-colors leading-none cursor-pointer"
            title="Pan Left (or Shift+Drag / Pan mode)"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => handlePanStep(1)}
            className="flex items-center justify-center px-2 py-0.5 text-xs font-sans font-bold rounded bg-lime/10 hover:bg-lime/20 text-lime border border-lime/30 transition-colors leading-none cursor-pointer"
            title="Pan Right (or Shift+Drag / Pan mode)"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => handleZoomStep(0.75)}
            className="flex items-center justify-center px-2 py-0.5 text-xs font-sans font-bold rounded bg-lime/10 hover:bg-lime/20 text-lime border border-lime/30 transition-colors leading-none cursor-pointer"
            title="Zoom In (or scroll wheel up)"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => handleZoomStep(1.35)}
            className="flex items-center justify-center px-2 py-0.5 text-xs font-sans font-bold rounded bg-lime/10 hover:bg-lime/20 text-lime border border-lime/30 transition-colors leading-none cursor-pointer"
            title="Zoom Out (or scroll wheel down)"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setIsPanMode((prev) => !prev)}
            className={`flex items-center gap-1 text-xs font-sans px-2 py-0.5 rounded transition-colors leading-none cursor-pointer ${isPanMode
              ? "bg-[#5FB7FF]/20 text-[#5FB7FF] font-bold border border-[#5FB7FF]/60 shadow-[0_0_8px_rgba(95,183,255,0.3)]"
              : "bg-lime/10 hover:bg-lime/20 text-lime border border-lime/30"
              }`}
            title={isPanMode ? "Pan Mode Active (click to switch to Box Zoom)" : "Toggle Pan Mode (Drag to Pan)"}
          >
            <Hand className="w-3 h-3" />
            Pan
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className={`flex items-center gap-1 text-xs font-sans px-2 py-0.5 rounded transition-colors leading-none cursor-pointer ${isUserZoomed
              ? "bg-primary text-black font-bold border border-primary animate-pulse"
              : "bg-lime/10 hover:bg-lime/20 text-lime border border-lime/30"
              }`}
            title="Reset Zoom & Pan / Restore live view"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0 ml-0.5"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>

      <div
        ref={chartDivRef}
        className={`flex-1 w-full max-w-full relative overflow-hidden ${fillContainer ? "min-h-0" : "min-h-[220px] h-[220px]"
          }`}
      />
    </div>
  );
}

export const EChartsRealtimeChart = UPlotRealtimeChart;

function GroundResistorSvg({ strokeColor = "#c8ff00" }: { strokeColor?: string }) {
  return (
    <svg
      id="GroundResistor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 34 38"
      className="w-[76px] h-[86px] object-contain transition-all duration-300"
      style={{ filter: `drop-shadow(0 0 8px ${strokeColor})` }}
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="0 0.14 19.82 0 19.82 11.71 16.75 16.02 20.92 18.05 17.47 21.53 21.99 23.40 17.83 26.74 21.99 31.55"
      />
      <polygon
        fill={strokeColor}
        points="23.07 32.70 20.63 32.17 21.55 31.11 22.67 29.98 23.07 32.70"
      />
      <line
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeLinecap="round"
        x1="13.86"
        y1="33.79"
        x2="31.90"
        y2="33.79"
      />
      <line
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeLinecap="round"
        x1="16.93"
        y1="36.09"
        x2="29.21"
        y2="36.09"
      />
    </svg>
  );
}

export function StabilityDashboard() {
  const [droppedAsset, setDroppedAsset] = useState<string | null>(null);
  const [breakerOpen, setBreakerOpen] = useState(true);
  /** Connected CFG specs hover — portaled so it never sits under charts / overflow clip. */
  const [droppedHoverPos, setDroppedHoverPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [hoveredSolutionCfg, setHoveredSolutionCfg] = useState<string | null>(null);
  const [hoveredSolutionPos, setHoveredSolutionPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<StabilityEventType | null>(null);
  /** Cached CSV rows for Event Details when hovering a non-active event (same source as click). */
  const [hoverPreviewData, setHoverPreviewData] = useState<any[]>([]);
  /** Grid (GEP params) hover — portaled so it never sits under Event Details / SLD transform. */
  const [gridHoverPos, setGridHoverPos] = useState<{ left: number; top: number } | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [preEventData, setPreEventData] = useState<PreeventRow[]>([]);
  const [preEventTick, setPreEventTick] = useState<number | null>(null);
  const [activeEvent, setActiveEvent] = useState<"none" | StabilityEventType>("none");
  /** CFG12-only: asset mode + event variants (Spain Grid Code catalogue). */
  const [cfg12Selection, setCfg12Selection] = useState<Cfg12Selection>(CFG12_DEFAULT_SELECTION);
  /** CFG13-only: AEMO / Transgrid catalogue. */
  const [cfg13Selection, setCfg13Selection] = useState<Cfg13Selection>(CFG13_DEFAULT_SELECTION);
  const [isCfg12FloatingOpen, setIsCfg12FloatingOpen] = useState(true);
  const [isFaultRed, setIsFaultRed] = useState(false);
  const [isGreenTheme, setIsGreenTheme] = useState(true);
  const [isFullscreenAnalytics, setIsFullscreenAnalytics] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [inertiaMWs, setInertiaMWs] = useState<number | null>(null);
  const [scDialPu, setScDialPu] = useState<number | null>(null);
  const [metricsStatus, setMetricsStatus] = useState<{ inertia: string; sc: string }>({
    inertia: "",
    sc: "",
  });
  /** Last Time Domain Ip/Iq results — kept across event switches until CFG trash. */
  const [latchedIpMetrics, setLatchedIpMetrics] = useState<ResponseMetrics | null>(null);
  const [latchedIqMetrics, setLatchedIqMetrics] = useState<ResponseMetrics | null>(null);
  /** Rolling immediate-previous CFG characterisation (promoted on trash). */
  const [previousSnapshot, setPreviousSnapshot] = useState<CfgCompareSnapshot | null>(null);
  const pendingDialRef = useRef<{
    event: "rocof" | "fault" | null;
    inertia: number | null;
    sc: number | null;
    inertiaLabel: string;
    scLabel: string;
  }>({
    event: null,
    inertia: null,
    sc: null,
    inertiaLabel: "",
    scLabel: "",
  });
  const dialRevealSentRef = useRef(false);
  const sldFit = useStabilitySldFitScale();
  const dialGenRef = useRef(0);
  const activeEventRef = useRef(activeEvent);
  activeEventRef.current = activeEvent;

  // Expandable tiles state
  const [isDiagramOpen, setIsDiagramOpen] = useState(true);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(true);
  const [isTelemetryPaused, setIsTelemetryPaused] = useState(false);
  // PCC / Time Domain Characterization: open by default; remember user toggle across refresh.
  const [timeDomainOpen, setTimeDomainOpen] = useState(() => timeDomainOpenBoot ?? true);
  const [timeDomainInstant, setTimeDomainInstant] = useState(true);
  const solutionsScrollRef = useRef<HTMLDivElement>(null);
  const [solutionsNav, setSolutionsNav] = useState({
    overflow: false,
    canLeft: false,
    canRight: false,
  });

  const updateSolutionsNav = () => {
    const el = solutionsScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const overflow = maxScroll > 4;
    const canLeft = overflow && el.scrollLeft > 2;
    const canRight = overflow && el.scrollLeft < maxScroll - 2;
    setSolutionsNav((prev) => {
      if (prev.overflow === overflow && prev.canLeft === canLeft && prev.canRight === canRight) {
        return prev;
      }
      return { overflow, canLeft, canRight };
    });
  };

  useLayoutEffect(() => {
    const open = timeDomainOpenBoot ?? readTimeDomainOpen();
    timeDomainOpenBoot = open;
    setTimeDomainOpen(open);
    const id = requestAnimationFrame(() => setTimeDomainInstant(false));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    const el = solutionsScrollRef.current;
    if (!el) return;
    updateSolutionsNav();
    const onScroll = () => updateSolutionsNav();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateSolutionsNav()) : null;
    ro?.observe(el);
    window.addEventListener("resize", updateSolutionsNav);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("resize", updateSolutionsNav);
    };
  }, []);

  const toggleTimeDomainOpen = () => {
    setTimeDomainOpen((prev) => {
      const open = !prev;
      timeDomainOpenBoot = open;
      writeTimeDomainOpen(open);
      return open;
    });
    setTimeDomainInstant(false);
  };

  const scrollSolutions = (direction: -1 | 1) => {
    const el = solutionsScrollRef.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>("[data-cfg-tile]");
    const step = tile ? tile.offsetWidth + 12 : 92;
    el.scrollBy({ left: direction * step * 2, behavior: "smooth" });
  };

  // Cache parsed CSV rows by path so CFG click → graph starts immediately
  const csvCacheRef = useRef<Record<string, any[]>>({});

  const cfgHasEvent = (cfg: string | null, event: StabilityEventType) => {
    if (!cfg) return false;
    if (cfg === "CFG12") {
      return cfg12EventAvailable(cfg12Selection.mode, event, cfg12Selection.gridCode);
    }
    if (cfg === "CFG13") {
      return cfg13EventAvailable(cfg13Selection.mode, event);
    }
    return hasDatabankEvent(cfg, event);
  };

  const resolveCsvUrl = (cfg: string, event: "none" | StabilityEventType) =>
    resolveDatabankCsvUrl(cfg, event, cfg12Selection, cfg13Selection, phaseForActiveEvent(event));

  const loadParsedCsv = async (path: string): Promise<any[] | null> => {
    const cached = csvCacheRef.current[path];
    if (cached?.length) return cached;
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    const text = await res.text();
    const cfgFromPath = path.match(/\/(CFG\d+)\//i)?.[1] ?? path.match(/series\/(CFG\d+)\//i)?.[1];
    const rows = parseStabilityCsvText(text, cfgFromPath);
    if (rows.length) csvCacheRef.current[path] = rows;
    return rows.length ? rows : null;
  };

  /** WP5: CFG1–11 prefer FastAPI / cropped .pre|.post; CFG12/13 keep study paths.
   *  Always UI-cap row count so full-rate Aug14 posts cannot crash the page. */
  const loadCfgEventRows = async (
    cfg: string,
    event: "none" | StabilityEventType,
    phaseOverride?: "pre" | "post" | "full",
  ): Promise<{ rows: any[]; url: string } | null> => {
    const phase = phaseOverride ?? phaseForActiveEvent(event);
    if (cfg === "CFG12" || cfg === "CFG13") {
      const path = resolveDatabankCsvUrl(cfg, event, cfg12Selection, cfg13Selection, phase);
      if (!path) return null;
      const cacheKey = `${cfg}|${event}|${phase}|${path}`;
      const cached = csvCacheRef.current[cacheKey];
      if (cached?.length) return { rows: cached, url: cacheKey };
      const rows = await loadParsedCsv(path);
      if (!rows?.length) return null;
      (rows as any).tickSize = resolveTickSize(cfg, event, rows);
      csvCacheRef.current[cacheKey] = rows;
      csvCacheRef.current[path] = rows;
      return { rows, url: path };
    }
    const cacheKey = `${cfg}|${event}|${phase}`;
    const cached = csvCacheRef.current[cacheKey];
    if (cached?.length) return { rows: cached, url: cacheKey };

    const { text, url } = await fetchDatabankCsvText(cfg, event, phase);
    const parsed = parseStabilityCsvText(text, cfg);
    if (!parsed.length) return null;
    const eventAt = event === "none" ? getEventTimeSec(cfg, "fault") : getEventTimeSec(cfg, event);
    // Tick from full crop BEFORE UI limit — stride would fake a larger Δt (WhatsApp W1).
    const tickSize = resolveTickSize(cfg, event, parsed);
    // Dial formulas on full crop (no downsample) — charts use limited rows only
    const metricPts = toMetricPoints(parsed);
    const dialSc = computeScDialPu(metricPts, eventAt);
    const dialInertia = computeInertiaMWs(metricPts, eventAt);
    const rows = limitRowsForUi(parsed, eventAt);
    (rows as any).headers = (parsed as any).headers;
    (rows as any).dialSc = dialSc;
    (rows as any).dialInertia = dialInertia;
    (rows as any).tickSize = tickSize;
    csvCacheRef.current[cacheKey] = rows;
    csvCacheRef.current[url] = rows;
    return { rows, url };
  };

  const resetDialsEmpty = () => {
    setInertiaMWs(null);
    setScDialPu(null);
    setMetricsStatus({ inertia: "", sc: "" });
    setLatchedIpMetrics(null);
    setLatchedIqMetrics(null);
    pendingDialRef.current = {
      event: null,
      inertia: null,
      sc: null,
      inertiaLabel: "",
      scLabel: "",
    };
    dialRevealSentRef.current = false;
  };

  /** Mode-qualified Current id for dials / TD (CFG12·Combined). */
  const currentCfgDisplayId = useMemo(() => {
    if (!droppedAsset) return null;
    if (droppedAsset === "CFG12") return formatCfgModeLabel("CFG12", cfg12Selection.mode);
    if (droppedAsset === "CFG13") return formatCfgModeLabel("CFG13", cfg13Selection.mode);
    return droppedAsset;
  }, [droppedAsset, cfg12Selection.mode, cfg13Selection.mode]);

  const buildCurrentSnapshot = (label: string): CfgCompareSnapshot => ({
    cfgId: label,
    inertiaMWs,
    scDialPu,
    inertiaLabel: dialLabelForSnapshot(
      metricsStatus.inertia,
      inertiaMWs != null ? `${inertiaMWs.toFixed(1)} MW.s` : "—",
    ),
    scLabel: dialLabelForSnapshot(
      metricsStatus.sc,
      scDialPu != null ? `${Math.abs(scDialPu).toFixed(3)} kA` : "—",
    ),
    ip: latchedIpMetrics,
    iq: latchedIqMetrics,
  });

  /** Latch Current → Previous (if metrics), then reset Current for the new CFG12/13 mode. */
  const switchCfg12Mode = (mode: Cfg12Mode) => {
    if (mode === cfg12Selection.mode) return;
    const outgoing = formatCfgModeLabel("CFG12", cfg12Selection.mode);
    const snap = buildCurrentSnapshot(outgoing);
    if (snapshotHasContent(snap)) setPreviousSnapshot(snap);

    dialGenRef.current += 1;
    resetDialsEmpty();
    setData([]);
    setParseError(null);
    setPlayTime(0);

    const keepEvent =
      activeEvent !== "none" && cfg12EventAvailable(mode, activeEvent, cfg12Selection.gridCode);
    if (!keepEvent) setActiveEvent("none");

    setCfg12Selection((prev) => ({ ...prev, mode }));
  };

  const switchCfg13Mode = (mode: Cfg13Mode) => {
    if (mode === cfg13Selection.mode) return;
    const outgoing = formatCfgModeLabel("CFG13", cfg13Selection.mode);
    const snap = buildCurrentSnapshot(outgoing);
    if (snapshotHasContent(snap)) setPreviousSnapshot(snap);

    dialGenRef.current += 1;
    resetDialsEmpty();
    setData([]);
    setParseError(null);
    setPlayTime(0);

    const keepEvent = activeEvent !== "none" && cfg13EventAvailable(mode, activeEvent);
    if (!keepEvent) setActiveEvent("none");

    setCfg13Selection((prev) => ({ ...prev, mode }));
  };

  /** SCL and Inertia dial values:
   *  - CFG1–11: Sourced directly from fixed JSON (golden reference) when event is clicked.
   *  - CFG12 & CFG13: Computed dynamically from study CSV files (combining pre+post for Inertia).
   *  - Values stay latched until asset trash / mode switch.
   */
  const revealPendingDials = () => {
    // Kept as safe callback for chart playback hook
  };

  useEffect(() => {
    if (!droppedAsset) {
      dialGenRef.current += 1;
      resetDialsEmpty();
      return;
    }

    // Prefetch small pre-windows only for charts
    (["fault", "rocof", "voltage_step", "phase_jump"] as const).forEach((ev) => {
      if (!cfgHasEvent(droppedAsset, ev)) return;
      void loadCfgEventRows(droppedAsset, ev, "pre").catch(() => { });
    });

    if (activeEvent !== "rocof" && activeEvent !== "fault") {
      return;
    }

    const eventForDial = activeEvent;
    const isCfg12or13 = droppedAsset === "CFG12" || droppedAsset === "CFG13";

    if (!isCfg12or13) {
      // CFG1–11: Instant lookup from fixed JSON
      const fixed = FIXED_ANALYTICS_METRICS[droppedAsset];
      if (eventForDial === "fault") {
        const sc = fixed?.scPu ?? null;
        const scLabel = sc != null ? `${Math.abs(sc).toFixed(3)} kA` : "N/A";
        setScDialPu(sc);
        setMetricsStatus((prev) => ({ ...prev, sc: scLabel }));
      } else if (eventForDial === "rocof") {
        const inertia = fixed?.inertiaMWs ?? null;
        const inertiaLabel = inertia != null ? `${inertia.toFixed(1)} MW.s` : "N/A";
        setInertiaMWs(inertia);
        setMetricsStatus((prev) => ({ ...prev, inertia: inertiaLabel }));
      }
      return;
    }

    // CFG12 & CFG13: Dynamic calculation from databank CSV files
    const gen = ++dialGenRef.current;

    (async () => {
      let inertia: number | null = null;
      let sc: number | null = null;
      let inertiaLabel = "";
      let scLabel = "";

      if (eventForDial === "rocof") {
        try {
          const prePath = resolveDatabankCsvUrl(
            droppedAsset,
            "rocof",
            cfg12Selection,
            cfg13Selection,
            "pre",
          );
          const postPath = resolveDatabankCsvUrl(
            droppedAsset,
            "rocof",
            cfg12Selection,
            cfg13Selection,
            "post",
          );
          const [preRows, postRows] = await Promise.all([
            prePath ? loadParsedCsv(prePath) : null,
            postPath ? loadParsedCsv(postPath) : null,
          ]);
          if (gen === dialGenRef.current) {
            const combined = [...(preRows ?? []), ...(postRows ?? [])];
            if (combined.length) {
              const eventAt = getEventTimeSec(droppedAsset, "rocof");
              const metricPts = toMetricPoints(combined);
              const val = computeInertiaMWs(metricPts, eventAt);
              if (val != null && Number.isFinite(val)) {
                inertia = val;
                inertiaLabel = `${val.toFixed(1)} MW.s`;
              } else {
                inertiaLabel = "N/A";
              }
            } else {
              inertiaLabel = "N/A";
            }
          }
        } catch (e) {
          console.error("Failed to compute CFG12/13 inertia", e);
          inertiaLabel = "N/A";
        }
      }

      if (eventForDial === "fault") {
        try {
          const postPath = resolveDatabankCsvUrl(
            droppedAsset,
            "fault",
            cfg12Selection,
            cfg13Selection,
            "post",
          );
          if (postPath) {
            const rows = await loadParsedCsv(postPath);
            if (gen === dialGenRef.current && rows?.length) {
              const eventAt = getEventTimeSec(droppedAsset, "fault");
              const metricPts = toMetricPoints(rows);
              const val = computeScDialPu(metricPts, eventAt);
              if (val != null && Number.isFinite(val)) {
                sc = val;
                const scUnit = (rows as any).headers?.scUnit === "kA" ? "kA" : "pu";
                scLabel = `${Math.abs(sc).toFixed(3)} ${scUnit}`;
              } else {
                scLabel = "N/A";
              }
            } else {
              scLabel = "N/A";
            }
          }
        } catch (e) {
          console.error("Failed to compute CFG12/13 SCL", e);
          scLabel = "N/A";
        }
      }

      if (gen !== dialGenRef.current) return;

      if (eventForDial === "rocof") {
        setInertiaMWs(inertia);
        setMetricsStatus((prev) => ({
          ...prev,
          inertia: inertiaLabel || (inertia == null ? "N/A" : `${inertia.toFixed(1)} MW.s`),
        }));
      } else if (eventForDial === "fault") {
        setScDialPu(sc);
        setMetricsStatus((prev) => ({
          ...prev,
          sc: scLabel || (sc == null ? "N/A" : `${Math.abs(sc).toFixed(3)}`),
        }));
      }
    })();
  }, [droppedAsset, activeEvent, cfg12Selection, cfg13Selection]);

  useEffect(() => {
    let cancelled = false;
    if (!droppedAsset) {
      setPreEventData([]);
      setPreEventTick(null);
      return () => {
        cancelled = true;
      };
    }
    const mode =
      droppedAsset === "CFG12"
        ? cfg12Selection.mode
        : droppedAsset === "CFG13"
          ? cfg13Selection.mode
          : undefined;

    void fetchPreeventRows(droppedAsset, mode).then((loaded) => {
      if (cancelled) return;
      if (loaded?.rows?.length) {
        setPreEventData(loaded.rows);
        setPreEventTick(loaded.tickSize);
      } else {
        setPreEventData([]);
        setPreEventTick(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [droppedAsset, cfg12Selection.mode, cfg13Selection.mode]);

  useEffect(() => {
    let cancelled = false;

    if (!droppedAsset) {
      setData([]);
      return () => {
        cancelled = true;
      };
    }

    const eventForLoad = activeEvent === "none" ? "fault" : activeEvent;
    if (!cfgHasEvent(droppedAsset, eventForLoad)) {
      setData([]);
      setParseError(`${droppedAsset} has no ${eventForLoad} Databank CSV`);
      return () => {
        cancelled = true;
      };
    }

    setParseError(null);

    void loadCfgEventRows(droppedAsset, activeEvent)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded?.rows?.length) {
          setData((prev) => (prev === loaded.rows ? prev : loaded.rows));
        } else {
          setData([]);
          setParseError("CSV parsed empty");
        }
      })
      .catch((err) => {
        console.error("Failed to load Databank CSV", err);
        if (!cancelled) {
          setData([]);
          setParseError(String(err?.message || err));
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedAsset, activeEvent, cfg12Selection, cfg13Selection]);

  useEffect(() => {
    // If breaker is open or no asset is connected, clear active events
    if (breakerOpen || !droppedAsset) {
      if (activeEvent !== "none") {
        setActiveEvent("none");
        setIsFaultRed(false);
      }
      setHoveredEvent(null);
      setHoverPreviewData([]);
    }
    // Clear event if connected CFG has no Databank CSV for it
    if (droppedAsset && activeEvent !== "none" && !cfgHasEvent(droppedAsset, activeEvent)) {
      setActiveEvent("none");
      setIsFaultRed(false);
    }
  }, [
    droppedAsset,
    breakerOpen,
    activeEvent,
    cfg12Selection.mode,
    cfg12Selection.gridCode,
    cfg13Selection.mode,
  ]);

  const selectEvent = (event: StabilityEventType) => {
    if (breakerOpen || !droppedAsset) return;
    if (!cfgHasEvent(droppedAsset, event)) return;
    // When an event is already active, other events are disabled until breaker is re-connected
    if (activeEvent !== "none" && activeEvent !== event) return;
    setActiveEvent(event);
    if (event === "fault") {
      setIsFaultRed(true);
      setTimeout(() => setIsFaultRed(false), 2000);
    }
  };

  /** Arvind 8 Aug: once a CFG is connected, library stays locked until trash — CB open alone must not unlock swap. */
  const canConnectSolution = !droppedAsset && breakerOpen;

  const handleDragStart = (e: React.DragEvent, assetType: string) => {
    if (!canConnectSolution) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("assetType", assetType);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canConnectSolution) {
      return;
    }
    const assetType = e.dataTransfer.getData("assetType");
    if (assetType) {
      setDroppedAsset(assetType);
      // Wait for user to click breaker to connect
    }
  };

  const svgCache: Record<string, string> = {};

  function SvgLoader({ src, className }: { src: string; className?: string }) {
    const [svgContent, setSvgContent] = useState<string>(() => svgCache[src] || "");

    useEffect(() => {
      if (svgCache[src]) {
        setSvgContent(svgCache[src]);
        return;
      }
      fetch(src)
        .then((res) => res.text())
        .then((text) => {
          const clean = text
            .replace(/<\?xml[^>]*\?>/, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
          svgCache[src] = clean;
          setSvgContent(clean);
        })
        .catch((err) => console.error("Failed to load SVG", err));
    }, [src]);

    return <div className={className} dangerouslySetInnerHTML={{ __html: svgContent }} />;
  }

  const clearDroppedAsset = () => {
    // Client: trash when breaker open → clear captured dial/chart data + remove asset
    if (!breakerOpen) return;
    const cfg = droppedAsset;

    if (cfg === "CFG12" || cfg === "CFG13") {
      // Leaving CFG12/13 family: do not keep mode history as Previous (13 Aug meeting)
      setPreviousSnapshot(null);
    } else if (cfg) {
      // Arvind: promote Current → Previous (overwrite) before wipe — immediate previous only
      const next = buildCurrentSnapshot(cfg);
      if (snapshotHasContent(next)) {
        setPreviousSnapshot(next);
      }
    }

    dialGenRef.current += 1;
    setDroppedAsset(null);
    setDroppedHoverPos(null);
    setData([]);
    setPreEventData([]);
    setPreEventTick(null);
    setActiveEvent("none");
    setCfg12Selection(CFG12_DEFAULT_SELECTION);
    setCfg13Selection(CFG13_DEFAULT_SELECTION);
    setParseError(null);
    resetDialsEmpty();
    setPlayTime(0);
    if (cfg) {
      const prefix = `/databank/${cfg}/`;
      Object.keys(csvCacheRef.current).forEach((key) => {
        if (key.startsWith(prefix)) delete csvCacheRef.current[key];
      });
    }
  };

  /** Databank_Info_Aug14 assets + Transformer (name only — Asha §1: no winding-type names). */
  const CFG_SPECS: Record<string, Array<{ name: string; rating: string; type: string }>> = {
    CFG1: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "150 MVA, H = 10.3s", type: "SynCon" },
      { name: "Synchronous Condenser", rating: "150 MVA, H = 10.3s", type: "SynCon" },
    ],
    CFG2: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "42.5 MVA, H = 1.53s", type: "SynCon" },
      { name: "Synchronous Condenser", rating: "150 MVA, H = 10.3s", type: "SynCon" },
      { name: "GFL BESS", rating: "107.884 MVA (3.853 MVA x 28 Inverters)", type: "BESS" },
    ],
    CFG3: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "150 MVA, H = 10.3s", type: "SynCon" },
      { name: "GFM BESS", rating: "152.68 MVA (3.47 MVA x 44 Inverters)", type: "BESS" },
    ],
    CFG4: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "300 MVA, H = 1.58s", type: "SynCon" },
    ],
    CFG5: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "150 MVA, H = 10.3s", type: "SynCon" },
      { name: "GFM e-STATCOM", rating: "300 MVA", type: "STATCOM" },
    ],
    CFG6: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "42.5 MVA, H = 1.53s", type: "SynCon" },
      { name: "GFM e-STATCOM", rating: "300 MVA", type: "STATCOM" },
    ],
    CFG7: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "42.5 MVA, H = 1.53s", type: "SynCon" },
      { name: "GFL STATCOM", rating: "300 MVA", type: "STATCOM" },
    ],
    CFG8: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "GFM e-STATCOM", rating: "300 MVA", type: "STATCOM" },
    ],
    CFG9: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "GFM STATCOM", rating: "300 MVA", type: "STATCOM" },
    ],
    CFG10: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "GFM e-STATCOM", rating: "300 MVA", type: "STATCOM" },
      { name: "GFM BESS", rating: "152.68 MVA (3.47 MVA x 44 Inverters)", type: "BESS" },
    ],
    CFG11: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "65 MVA, H = 6.92s", type: "SynCon" },
      {
        name: "Synchronous Condenser", rating: "65 MVA, H = 6.92s", type: "SynCon"
      },
      { name: "GFM BESS", rating: "70 MVA (3.47 MVA x 20 Inverters)", type: "BESS" },
    ],
    CFG12: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "50 MVA RS6", type: "SynCon" },
      { name: "Synchronous Condenser", rating: "50 MVA RS6", type: "SynCon" },
      { name: "GFM BESS", rating: "100 MVA", type: "BESS" },
    ],
    CFG13: [
      { name: "Transformer", rating: "Step-up", type: "Transformer" },
      { name: "Synchronous Condenser", rating: "70 MVA RS8", type: "SynCon" },
      { name: "Synchronous Condenser", rating: "70 MVA RS8", type: "SynCon" },
      { name: "GFM BESS", rating: "50 MVA", type: "BESS" },
    ],
  };

  const renderDroppedAsset = () => {
    if (!droppedAsset) return null;
    // Breaker CLOSED (!breakerOpen): transparent background (blends seamlessly into network diagram).
    // Breaker OPEN (breakerOpen): framed card background + Trash remove button.
    const isClosed = !breakerOpen;

    return (
      <div
        className={`group relative w-[290px] h-[210px] flex items-center justify-center p-2 animate-in zoom-in duration-300 transition-all ${isClosed
          ? "rounded-xl border-0 bg-transparent shadow-none backdrop-blur-none"
          : "rounded-xl border-2 border-white/80 bg-black/30 backdrop-blur-sm shadow-[0_0_12px_rgba(255,255,255,0.3)]"
          }`}
        onClick={(e) => {
          e.stopPropagation();
          if (droppedHoverPos) {
            setDroppedHoverPos(null);
          } else {
            const r = e.currentTarget.getBoundingClientRect();
            const cardH = 260;
            const gap = 10;
            let top = r.bottom + gap;
            if (top + cardH > window.innerHeight - 12) {
              top = Math.max(12, r.top - cardH - gap);
            }
            const halfW = 140;
            const left = Math.min(
              Math.max(r.left + r.width / 2, halfW + 12),
              window.innerWidth - halfW - 12,
            );
            setDroppedHoverPos({ left, top });
          }
        }}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const cardH = 260;
          const gap = 10;
          let top = r.bottom + gap;
          if (top + cardH > window.innerHeight - 12) {
            top = Math.max(12, r.top - cardH - gap);
          }
          const halfW = 140;
          const left = Math.min(
            Math.max(r.left + r.width / 2, halfW + 12),
            window.innerWidth - halfW - 12,
          );
          setDroppedHoverPos({ left, top });
        }}
        onMouseLeave={() => setDroppedHoverPos(null)}
      >
        {breakerOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearDroppedAsset();
            }}
            className="absolute -top-3 -right-3 z-30 p-1.5 rounded-md border border-red-400/50 bg-black/90 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.45)] transition-all"
            title="Remove asset and clear captured data"
            aria-label="Remove asset and clear captured data"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Specs card is portaled to document.body — see droppedHoverPos portal below */}

        {/* Solution SVG — keep native lime labels (#bff70d) like Grid / GEP; do not invert to grey */}
        <div className="relative w-full h-full">
          <img
            src={`/svgs/Display/${getCfgSvgStem(droppedAsset)}.svg`}
            alt={droppedAsset}
            className={`w-full h-full object-contain transition-all duration-300 ${isClosed
              ? "opacity-100 drop-shadow-[0_0_8px_rgba(200,255,8,0.45)]"
              : "opacity-95 drop-shadow-[0_0_6px_rgba(200,255,8,0.35)]"
              }`}
          />
          {/* Slide 19 — CFG12/13 only: grey unused asset when BESS-only or SynCon-only */}
          {(droppedAsset === "CFG12" || droppedAsset === "CFG13") &&
            (() => {
              const cbs =
                droppedAsset === "CFG12"
                  ? cfg12BreakerState(cfg12Selection.mode)
                  : cfg13BreakerState(cfg13Selection.mode);
              const greySyn = cbs.rsCb === "open";
              const greyBess = cbs.bessCb === "open";
              if (!greySyn && !greyBess) return null;
              return (
                <>
                  {greySyn ? (
                    <div
                      className="absolute pointer-events-none rounded-md bg-black/55 border border-white/15 flex items-center justify-center"
                      style={{ left: "52%", top: "4%", width: "46%", height: "42%" }}
                      title="SynCon out of service for this mode"
                    >
                      <span className="text-[11px] font-bold text-white/70 tracking-wide">
                        ✕ SynCon
                      </span>
                    </div>
                  ) : null}
                  {greyBess ? (
                    <div
                      className="absolute pointer-events-none rounded-md bg-black/55 border border-white/15 flex items-center justify-center"
                      style={{ left: "52%", top: "52%", width: "46%", height: "44%" }}
                      title="BESS out of service for this mode"
                    >
                      <span className="text-[11px] font-bold text-white/70 tracking-wide">
                        ✕ BESS
                      </span>
                    </div>
                  ) : null}
                </>
              );
            })()}
        </div>
      </div>
    );
  };

  const [playTime, setPlayTime] = useState<number>(0);

  const currentEventTime = droppedAsset ? getEventTimeSec(droppedAsset, activeEvent) : 5.0;

  /** WhatsApp W1 — per-case CSV Δt (attached on load, else derive/fallback). */
  const chartTickSize = useMemo(() => {
    if (activeEvent === "none" && preEventTick != null && preEventTick > 0) return preEventTick;
    return resolveTickSize(droppedAsset, activeEvent, data.length ? data : preEventData);
  }, [droppedAsset, activeEvent, data, preEventData, preEventTick]);

  /** WhatsApp W4 / email §15 — fixed Y from PDF; idle uses SCL/fault. */
  const chartActiveYAxis = useMemo(
    () => getYAxisRange(droppedAsset, activeEvent, "active"),
    [droppedAsset, activeEvent],
  );

  const chartReactiveYAxis = useMemo(
    () => getYAxisRange(droppedAsset, activeEvent, "reactive"),
    [droppedAsset, activeEvent],
  );

  /** CFG connected + CB closed → show Event Details waveform; otherwise keep events live but hide diagram. */
  const showEventDiagram = Boolean(droppedAsset) && !breakerOpen;

  const displayEvent =
    droppedAsset === "CFG12" || droppedAsset === "CFG13"
      ? activeEvent
      : (hoveredEvent ?? activeEvent);
  const eventDetail =
    droppedAsset === "CFG12"
      ? getCfg12EventDetails(cfg12Selection.mode, displayEvent, cfg12Selection)
      : droppedAsset === "CFG13"
        ? getCfg13EventDetails(cfg13Selection.mode, displayEvent, cfg13Selection)
        : getEventDetails(displayEvent);

  const displayEventTime =
    droppedAsset && displayEvent !== "none"
      ? getEventTimeSec(droppedAsset, displayEvent)
      : currentEventTime;

  const panelEventRows =
    showEventDiagram && hoveredEvent && hoveredEvent !== activeEvent && hoverPreviewData.length > 0
      ? hoverPreviewData
      : data;

  const showEventHover = (_e: React.MouseEvent<HTMLElement>, event: StabilityEventType) => {
    if (droppedAsset === "CFG12" || droppedAsset === "CFG13") {
      // In CFG12/13, event hovers prompt choosing from the list only
      return;
    }
    if (activeEvent !== "none" && activeEvent !== event) return;
    if (droppedAsset && !cfgHasEvent(droppedAsset, event)) return;

    // Updates left Event Details panel only (floating hover card stays disabled per client).
    setHoveredEvent(event);

    // Waveform only when CFG + CB closed (same CSV path as click)
    if (!showEventDiagram) {
      setHoverPreviewData([]);
      return;
    }
    if (event === activeEvent) {
      setHoverPreviewData([]);
      return;
    }
    void loadCfgEventRows(droppedAsset!, event).then((loaded) => {
      if (loaded?.rows?.length) setHoverPreviewData(loaded.rows);
      else setHoverPreviewData([]);
    });
  };

  const clearEventHover = () => {
    setHoveredEvent(null);
    setHoverPreviewData([]);
  };

  // Slide 15 — Time Domain Characterization from Ip / Iq (Voltage step / Phase jump)
  // For CFG1..CFG11, prefer CIGRE pages 3-4 table data.
  // Memoize so zoom/pause re-renders don't flip Peak / Rise tiles.
  const timeDomainEventActive = activeEvent === "voltage_step" || activeEvent === "phase_jump";
  const ipMetrics = useMemo(() => {
    if (!timeDomainEventActive || data.length === 0) return null;
    if (droppedAsset && /^CFG([1-9]|1[01])$/i.test(droppedAsset)) {
      const cigre = getCigreResponseMetrics(droppedAsset, "phase_jump");
      if (cigre) return cigre;
    }
    const base = computeResponseMetrics(
      data.map((r) => ({ time: r.time, value: r.activeCurrent })),
      currentEventTime,
    );
    const isPower =
      droppedAsset === "CFG12" ||
      droppedAsset === "CFG13" ||
      (data as { headers?: { chartKind?: string } }).headers?.chartKind === "power";
    const kaSeries = data
      .map((r) => ({
        time: r.time,
        value: Number((r as { activeCurrentKa?: number }).activeCurrentKa),
      }))
      .filter((p) => Number.isFinite(p.value));
    // CFG12/13 Peak stays on P_poc1 (MW). CFG1–11 Peak must use kA cols — never label pu as kA.
    if (kaSeries.length < 3) {
      return isPower ? base : { ...base, peakOvershootPu: null };
    }
    const ka = computeResponseMetrics(kaSeries, currentEventTime);
    return {
      ...base,
      peakOvershootPu: ka.peakOvershootPu,
      peakTimeMs: ka.peakTimeMs ?? base.peakTimeMs,
    };
  }, [timeDomainEventActive, data, currentEventTime, droppedAsset]);
  const iqMetrics = useMemo(() => {
    if (!timeDomainEventActive || data.length === 0) return null;
    if (droppedAsset && /^CFG([1-9]|1[01])$/i.test(droppedAsset)) {
      const cigre = getCigreResponseMetrics(droppedAsset, "voltage_step");
      if (cigre) return cigre;
    }
    const base = computeResponseMetrics(
      data.map((r) => ({ time: r.time, value: r.reactiveCurrent })),
      currentEventTime,
    );
    const isPower =
      droppedAsset === "CFG12" ||
      droppedAsset === "CFG13" ||
      (data as { headers?: { chartKind?: string } }).headers?.chartKind === "power";
    const kaSeries = data
      .map((r) => ({
        time: r.time,
        value: Number((r as { reactiveCurrentKa?: number }).reactiveCurrentKa),
      }))
      .filter((p) => Number.isFinite(p.value));
    if (kaSeries.length < 3) {
      return isPower ? base : { ...base, peakOvershootPu: null };
    }
    const ka = computeResponseMetrics(kaSeries, currentEventTime);
    return {
      ...base,
      peakOvershootPu: ka.peakOvershootPu,
      peakTimeMs: ka.peakTimeMs ?? base.peakTimeMs,
    };
  }, [timeDomainEventActive, data, currentEventTime, droppedAsset]);

  // Client: V-step latches Iq only; ø latches Ip only. Keep until CFG trash; re-run overrides.
  useEffect(() => {
    if (activeEvent === "voltage_step" && iqMetrics) setLatchedIqMetrics(iqMetrics);
    if (activeEvent === "phase_jump" && ipMetrics) setLatchedIpMetrics(ipMetrics);
  }, [activeEvent, ipMetrics, iqMetrics]);

  const displayIpMetrics =
    activeEvent === "phase_jump" ? (ipMetrics ?? latchedIpMetrics) : latchedIpMetrics;
  const displayIqMetrics =
    activeEvent === "voltage_step" ? (iqMetrics ?? latchedIqMetrics) : latchedIqMetrics;

  const latestPoint = data.length > 0 ? data[data.length - 1] : null;
  const avgP = latestPoint ? (Number(latestPoint.activeCurrent) || 0).toFixed(2) : "0.98";
  const avgQ = latestPoint ? (Number(latestPoint.reactiveCurrent) || 0).toFixed(2) : "0.15";
  const avgV = latestPoint
    ? (1.0 + (Number(latestPoint.reactiveCurrent) || 0) * 0.05).toFixed(2)
    : "1.00";
  const avgTheta = latestPoint
    ? ((Number(latestPoint.activeCurrent) || 0) * 12.5).toFixed(1)
    : "12.4";
  const avgFreq = latestPoint
    ? (50.0 + ((Number(latestPoint.activeCurrent) || 0) - 0.98) * 0.1).toFixed(2)
    : "50.02";

  // Dials: SCL = Iq_GEP_kA Main at tf + 0.04 s (Aug14 / Asha). Plant Base MVA from Excel.
  const machineBaseMva =
    (droppedAsset ? getPlantBaseMva(droppedAsset) : null) ??
    (droppedAsset && CFG_SPECS[droppedAsset]
      ? parseMachineBaseMva(CFG_SPECS[droppedAsset])
      : SYSTEM_BASE_MVA);
  const currentShortCircuit = scDialPu ?? 0;
  const inertiaDisplay = inertiaMWs ?? 0;
  const previousInertiaDisplay = previousSnapshot?.inertiaMWs ?? null;
  // kA dial — compare Current vs Previous on the same absolute scale (no pu base rescale)
  const previousScDisplay = previousSnapshot?.scDialPu ?? null;
  const inertiaMax = Math.max(
    200,
    Math.ceil(
      ((Math.max(Math.abs(inertiaDisplay), Math.abs(previousInertiaDisplay ?? 0)) || 200) * 1.25) /
      100,
    ) * 100,
  );
  const scMax = Math.max(
    5,
    Math.ceil(
      (Math.max(Math.abs(currentShortCircuit), Math.abs(previousScDisplay ?? 0)) || 5) * 1.25 * 2,
    ) / 2,
  );

  const renderSolutionLibrary = () => {
    // When CFG12 is selected, transform the Solutions bar in length into a full Grid Code Control Bar!
    if (droppedAsset === "CFG12") {
      const activeStudy =
        cfg12Selection.gridCode === "spain" && activeEvent !== "none"
          ? findCfg12Study(cfg12Selection, activeEvent)
          : undefined;

      const applyStudy = (study: Cfg12Study) => {
        setCfg12Selection(selectionFromCfg12Study(study));
        setActiveEvent(study.event);
        if (study.event === "fault") {
          setIsFaultRed(true);
          setTimeout(() => setIsFaultRed(false), 2000);
        }
      };

      const filterMode = cfg12Selection.mode;
      const visible = CFG12_SPAIN_STUDIES.filter((s) => s.mode === filterMode);
      const spainReady = cfg12Selection.gridCode === "spain";

      return (
        <div
          className={`w-full min-w-0 rounded-xl border shadow-md flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 px-3 py-2 animate-in fade-in duration-200 ${breakerOpen ? "border-border/35 bg-[#041518]/70" : "border-primary/40 bg-[#041518]/95"
            }`}
        >
          <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-border/25">
            <span className="text-primary text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
              CFG12 · Grid Code
            </span>
            {breakerOpen && (
              <span className="rounded bg-diagram-line/10 px-1.5 py-0.5 text-[8px] font-bold text-diagram-line/55 border border-border/30 uppercase tracking-wide">
                Use diagram trash to leave
              </span>
            )}
          </div>

          {/* Center-Left: Grid Code (Spain ready only) */}
          <div
            className={`flex items-center gap-1 shrink-0 ${breakerOpen ? "opacity-40 pointer-events-none" : ""
              }`}
          >
            {CFG12_GRID_CODE_OPTIONS.filter((opt) => opt.ready).map((opt) => (
              <button
                key={opt.id}
                type="button"
                title={opt.label}
                onClick={() => {
                  setCfg12Selection((prev) => ({
                    ...prev,
                    gridCode: opt.id as Cfg12GridCode,
                  }));
                }}
                className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase border transition-colors ${cfg12Selection.gridCode === opt.id
                  ? "border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(200,255,8,0.25)]"
                  : "border-border/40 text-diagram-line/80 hover:border-primary/40"
                  }`}
              >
                {opt.shortLabel}
              </button>
            ))}
          </div>

          {spainReady && (
            <>
              <div className="w-px h-6 bg-border/25 hidden sm:block shrink-0" />

              <div
                className={`flex items-center gap-1 shrink-0 ${breakerOpen ? "opacity-40 pointer-events-none" : ""
                  }`}
              >
                {(Object.keys(CFG12_MODE_LABELS) as Cfg12Mode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => switchCfg12Mode(mode)}
                    className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase border transition-colors ${cfg12Selection.mode === mode
                      ? "border-primary bg-primary/20 text-primary shadow-[0_0_8px_rgba(200,255,8,0.2)]"
                      : "border-border/40 text-diagram-line/80 hover:border-primary/40"
                      }`}
                  >
                    {CFG12_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-border/25 hidden md:block shrink-0" />

              <div className="flex-1 min-w-[220px] flex items-center gap-2">
                {breakerOpen ? (
                  <div
                    className="w-full rounded-lg border border-border/35 bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-diagram-line/50 cursor-default select-none pointer-events-none"
                    role="status"
                    aria-disabled="true"
                    title="Close the Circuit Breaker on the diagram to select and run a study"
                  >
                    Close Circuit Breaker on diagram to select study
                  </div>
                ) : (
                  <select
                    value={activeStudy?.id || ""}
                    title={`Select a ${CFG12_MODE_LABELS[filterMode]} study`}
                    onChange={(e) => {
                      const found = visible.find((s) => s.id === e.target.value);
                      if (found) applyStudy(found);
                    }}
                    className="w-full rounded-lg border border-primary/40 bg-black/60 px-3 py-1 text-[11px] font-semibold text-primary outline-none shadow-inner cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="" disabled>
                      {`-- Select Study (${visible.length} in ${CFG12_MODE_LABELS[filterMode]}) --`}
                    </option>
                    {visible.map((study) => (
                      <option key={study.id} value={study.id} className="bg-[#051619] text-white">
                        {study.id}: {study.description}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {activeEvent === "fault" && !breakerOpen && (
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  <span className="text-[9px] font-bold text-diagram-line/70 uppercase">
                    Fault:
                  </span>
                  <select
                    className="rounded border border-border/40 bg-black/60 px-2 py-0.5 text-[9px] text-white outline-none focus:border-primary"
                    value={cfg12Selection.fault}
                    onChange={(e) =>
                      setCfg12Selection((prev) => ({
                        ...prev,
                        fault: e.target.value as Cfg12Selection["fault"],
                      }))
                    }
                  >
                    {CFG12_FAULT_VARIANTS.map((v) => (
                      <option key={v.id} value={v.id} className="bg-[#051619]">
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // CFG13 AEMO / Transgrid — dedicated bar (do not modify CFG12 block above)
    if (droppedAsset === "CFG13") {
      const activeStudy =
        activeEvent !== "none" ? findCfg13Study(cfg13Selection, activeEvent) : undefined;

      const applyStudy = (study: Cfg13Study) => {
        setCfg13Selection(selectionFromCfg13Study(study));
        setActiveEvent(study.event);
        if (study.event === "fault") {
          setIsFaultRed(true);
          setTimeout(() => setIsFaultRed(false), 2000);
        }
      };

      const filterMode = cfg13Selection.mode;
      const visible = CFG13_AEMO_STUDIES.filter((s) => s.mode === filterMode);

      return (
        <div
          className={`w-full min-w-0 rounded-xl border shadow-md flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 px-3 py-2 animate-in fade-in duration-200 ${breakerOpen ? "border-border/35 bg-[#041518]/70" : "border-primary/40 bg-[#041518]/95"
            }`}
        >
          <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-border/25">
            <span className="text-primary text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
              CFG13 · AEMO
            </span>
            {breakerOpen && (
              <span className="rounded bg-diagram-line/10 px-1.5 py-0.5 text-[8px] font-bold text-diagram-line/55 border border-border/30 uppercase tracking-wide">
                Use diagram trash to leave
              </span>
            )}
          </div>

          <div
            className={`flex items-center gap-1 shrink-0 ${breakerOpen ? "opacity-40 pointer-events-none" : ""
              }`}
          >
            <span className="rounded px-2.5 py-1 text-[9px] font-bold uppercase border border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(200,255,8,0.25)]">
              AEMO
            </span>
          </div>

          <div className="w-px h-6 bg-border/25 hidden sm:block shrink-0" />

          <div
            className={`flex items-center gap-1 shrink-0 ${breakerOpen ? "opacity-40 pointer-events-none" : ""
              }`}
          >
            {(Object.keys(CFG13_MODE_LABELS) as Cfg13Mode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => switchCfg13Mode(mode)}
                className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase border transition-colors ${cfg13Selection.mode === mode
                  ? "border-primary bg-primary/20 text-primary shadow-[0_0_8px_rgba(200,255,8,0.2)]"
                  : "border-border/40 text-diagram-line/80 hover:border-primary/40"
                  }`}
              >
                {CFG13_MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border/25 hidden md:block shrink-0" />

          <div className="flex-1 min-w-[220px] flex items-center gap-2">
            {breakerOpen ? (
              <div
                className="w-full rounded-lg border border-border/35 bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-diagram-line/50 cursor-default select-none pointer-events-none"
                role="status"
                aria-disabled="true"
                title="Close the Circuit Breaker on the diagram to select and run a study"
              >
                Close Circuit Breaker on diagram to select study
              </div>
            ) : (
              <select
                value={activeStudy?.id || ""}
                title={`Select a ${CFG13_MODE_LABELS[filterMode]} study`}
                onChange={(e) => {
                  const found = visible.find((s) => s.id === e.target.value);
                  if (found) applyStudy(found);
                }}
                className="w-full rounded-lg border border-primary/40 bg-black/60 px-3 py-1 text-[11px] font-semibold text-primary outline-none shadow-inner cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>
                  {`-- Select Study (${visible.length} in ${CFG13_MODE_LABELS[filterMode]}) --`}
                </option>
                {visible.map((study) => (
                  <option key={study.id} value={study.id} className="bg-[#051619] text-white">
                    {study.id}: {study.description}
                  </option>
                ))}
              </select>
            )}
          </div>

          {activeEvent === "fault" && !breakerOpen && (
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="text-[9px] font-bold text-diagram-line/70 uppercase">Fault:</span>
              <select
                className="rounded border border-border/40 bg-black/60 px-2 py-0.5 text-[9px] text-white outline-none focus:border-primary"
                value={cfg13Selection.fault}
                onChange={(e) =>
                  setCfg13Selection((prev) => ({
                    ...prev,
                    fault: e.target.value as Cfg13Selection["fault"],
                  }))
                }
              >
                {CFG13_FAULT_VARIANTS.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#051619]">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeEvent === "voltage_step" && !breakerOpen && (
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="text-[9px] font-bold text-diagram-line/70 uppercase">V:</span>
              <select
                className="rounded border border-border/40 bg-black/60 px-2 py-0.5 text-[9px] text-white outline-none focus:border-primary"
                value={cfg13Selection.voltage_step}
                onChange={(e) =>
                  setCfg13Selection((prev) => ({
                    ...prev,
                    voltage_step: e.target.value as Cfg13Selection["voltage_step"],
                  }))
                }
              >
                {CFG13_VSTEP_VARIANTS.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#051619]">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeEvent === "rocof" && !breakerOpen && (
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="text-[9px] font-bold text-diagram-line/70 uppercase">f:</span>
              <select
                className="rounded border border-border/40 bg-black/60 px-2 py-0.5 text-[9px] text-white outline-none focus:border-primary"
                value={cfg13Selection.rocof}
                onChange={(e) =>
                  setCfg13Selection((prev) => ({
                    ...prev,
                    rocof: e.target.value as Cfg13Selection["rocof"],
                  }))
                }
              >
                {CFG13_ROCOF_VARIANTS.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#051619]">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeEvent === "phase_jump" && !breakerOpen && (
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="text-[9px] font-bold text-diagram-line/70 uppercase">ø:</span>
              <select
                className="rounded border border-border/40 bg-black/60 px-2 py-0.5 text-[9px] text-white outline-none focus:border-primary"
                value={cfg13Selection.phase_jump}
                onChange={(e) =>
                  setCfg13Selection((prev) => ({
                    ...prev,
                    phase_jump: e.target.value as Cfg13Selection["phase_jump"],
                  }))
                }
              >
                {CFG13_PHJUMP_VARIANTS.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#051619]">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      );
    }

    // Default view for CFG 1 - 11
    return (
      <div className="w-full min-w-0 rounded-xl border border-border/30 bg-background/5 shadow-sm flex items-center gap-3 px-3 py-2">
        <div className="flex flex-col justify-center gap-1 shrink-0 pr-3 border-r border-border/25 self-stretch min-w-[72px]">
          <span className="text-primary text-[10px] font-bold uppercase tracking-[0.14em] whitespace-nowrap leading-none">
            Solutions
          </span>
          <span className="inline-flex items-center self-start rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary border border-primary/25">
            {droppedAsset ? droppedAsset : `${CFG_OPTIONS.length} slots`}
          </span>
        </div>

        {solutionsNav.overflow && (
          <button
            type="button"
            onClick={() => scrollSolutions(-1)}
            disabled={!solutionsNav.canLeft}
            className={`shrink-0 grid h-9 w-9 place-items-center rounded-lg border transition-colors ${solutionsNav.canLeft
              ? "border-border/50 bg-background/30 text-diagram-line hover:text-primary hover:border-primary/40"
              : "border-border/20 bg-transparent text-diagram-line/25 cursor-default"
              }`}
            title="Previous solutions"
            aria-label="Previous solutions"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div
          ref={solutionsScrollRef}
          onScroll={() => setHoveredSolutionCfg(null)}
          className="flex flex-1 flex-nowrap items-center gap-1.5 sm:gap-2 justify-between overflow-x-auto scroll-smooth min-w-0 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {CFG_OPTIONS.map((cfg) => {
            const selected = droppedAsset === cfg;
            const tileTitle = canConnectSolution
              ? cfg.replace("CFG", "CFG ")
              : droppedAsset
                ? "Trash the connected CFG (CB open) to choose another solution"
                : "Open Circuit Breaker (CB) on diagram to connect a solution";
            return (
              <div
                key={cfg}
                data-cfg-tile
                draggable={canConnectSolution}
                onDragStart={(e) => handleDragStart(e, cfg)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const cardH = 320;
                  let top = rect.bottom + 10;
                  if (top + cardH > window.innerHeight - 12) {
                    top = Math.max(12, rect.top - cardH - 10);
                  }
                  const halfW = 170;
                  const margin = 12;
                  const left = Math.min(
                    Math.max(centerX, halfW + margin),
                    window.innerWidth - halfW - margin,
                  );
                  setHoveredSolutionPos({ left, top });
                  setHoveredSolutionCfg(cfg);
                }}
                onMouseLeave={() => setHoveredSolutionCfg(null)}
                onClick={() => {
                  if (canConnectSolution) {
                    setDroppedAsset(cfg);
                    setHoveredSolutionCfg(null);
                  }
                }}
                title={tileTitle}
                className={`shrink-0 flex-1 max-w-[64px] h-[54px] sm:h-[58px] lg:h-[62px] flex items-center justify-center p-1 sm:p-1.5 rounded-lg border transition-all ${canConnectSolution ? "cursor-pointer" : "cursor-not-allowed opacity-55"
                  } ${selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border/30 bg-background/30 hover:border-primary/35 hover:bg-primary/5"
                  }`}
              >
                <img
                  src={`/svgs/Panel/${getCfgPanelStem(cfg)}.svg`}
                  className={`w-full h-full object-contain transition-transform duration-200 hover:scale-105 ${selected ? "opacity-100" : "opacity-90"
                    }`}
                  alt={cfg}
                />
              </div>
            );
          })}
        </div>

        {solutionsNav.overflow && (
          <button
            type="button"
            onClick={() => {
              setHoveredSolutionCfg(null);
              scrollSolutions(1);
            }}
            disabled={!solutionsNav.canRight}
            className={`shrink-0 grid h-9 w-9 place-items-center rounded-lg border transition-colors ${solutionsNav.canRight
              ? "border-border/50 bg-background/30 text-diagram-line hover:text-primary hover:border-primary/40"
              : "border-border/20 bg-transparent text-diagram-line/25 cursor-default"
              }`}
            title="Next solutions"
            aria-label="Next solutions"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Floating Solution Details — portaled below (document.body) so charts never cover it */}
      </div>
    );
  };

  const renderNetworkDiagram = () => {
    const sldScale = STABILITY_SLD_BASE_SCALE * sldFit;
    const eventClearPx = sldFit <= 0.65 ? 18 : STABILITY_SLD_EVENT_CLEAR_PX;
    // Panel height follows the cropped visible band — not the empty lower 300px canvas.
    const sldLayoutH = Math.round(STABILITY_SLD_CROP_H * sldScale);
    const sldLayoutW = Math.round(STABILITY_SLD_NATIVE_W * sldScale);
    const viewportH = Math.max(STABILITY_SLD_TOP_PAD + sldLayoutH + STABILITY_SLD_BOTTOM_PAD, 205);

    return (
      <ExpandableTileBox
        title="Single-Line Network Diagram"
        badge={droppedAsset ? `${droppedAsset} Connected` : "SMIB Network"}
        open={isDiagramOpen}
        onToggle={() => setIsDiagramOpen(!isDiagramOpen)}
        className="w-full h-full min-h-0 flex flex-col"
        contentOverflowVisible
        headerExtra={
          <div className="flex items-center gap-2 mr-1" onClick={(e) => e.stopPropagation()}>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border uppercase tracking-wide leading-none ${activeEvent === "fault"
                ? "bg-red-500/25 text-red-300 border-red-500/50"
                : activeEvent !== "none"
                  ? "bg-primary/25 text-primary border-primary/50"
                  : "bg-black/25 text-white/70 border-white/20"
                }`}
            >
              {activeEvent === "none" && "Event: None"}
              {activeEvent === "fault" && "Event: 3-Ph Fault"}
              {activeEvent === "rocof" && "Event: RoCoF"}
              {activeEvent === "phase_jump" && "Event: Phase Jump"}
              {activeEvent === "voltage_step" && "Event: Voltage Step"}
            </span>

            <span
              onClick={() => setBreakerOpen(!breakerOpen)}
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border uppercase tracking-wide cursor-pointer hover:opacity-90 transition-all leading-none ${breakerOpen
                ? "bg-primary/25 text-primary border-primary/50"
                : "bg-red-500/25 text-red-300 border-red-500/50"
                }`}
              title="Click to toggle Breaker status"
            >
              CB: {breakerOpen ? "Open" : "Closed"}
            </span>

            <button
              type="button"
              onClick={() => setIsFullscreenAnalytics(true)}
              className="stability-analytics-btn inline-flex items-center gap-1.5 rounded-md border border-primary/60 bg-primary/20 px-2.5 py-1 text-primary hover:bg-primary/30 transition-colors shadow-sm cursor-pointer"
              title="Open Analytics — CFG Compare"
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider leading-none">
                Analytics
              </span>
            </button>
          </div>
        }
      >
        <div
          className="stability-sld-viewport w-full overflow-x-visible overflow-y-visible flex flex-row items-start gap-3 shrink-0 relative px-2 box-border"
          style={{
            height: `${viewportH}px`,
            paddingTop: `${STABILITY_SLD_TOP_PAD}px`,
            paddingBottom: `${STABILITY_SLD_BOTTOM_PAD}px`,
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* Event Details — fixed height so less/more data never jumps the card */}
          <div
            className="shrink-0 self-start pointer-events-none z-[5]"
            style={{ width: `${STABILITY_SLD_EVENT_COL_W}px` }}
          >
            <div
              className="rounded-lg bg-[#051619]/95 backdrop-blur-md px-2.5 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#005E60]/50 flex flex-col gap-1.5 box-border"
              style={{ minHeight: `${STABILITY_SLD_EVENT_CARD_H}px` }}
            >
              <div className="text-xs uppercase tracking-wider text-primary font-sans font-bold flex items-center justify-between gap-1.5 shrink-0 leading-none pb-0.5 border-b border-[#005E60]/40">
                <span>EVENT DETAILS</span>
                {hoveredEvent ? (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary font-bold normal-case tracking-normal">
                    Preview
                  </span>
                ) : eventDetail && activeEvent !== "none" ? (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary font-bold normal-case tracking-normal border border-primary/30">
                    Active
                  </span>
                ) : null}
              </div>
              {eventDetail ? (
                <>
                  <div className="min-w-0 flex flex-col gap-0.5 leading-snug font-sans">
                    <div className="text-xs font-bold text-white leading-tight">
                      {eventDetail.title}
                    </div>
                    {eventDetail.lines.map((line) => (
                      <div key={line} className="text-[11px] text-diagram-line/90 leading-tight">
                        {line}
                      </div>
                    ))}
                    <div className="text-[10px] text-diagram-line/70 leading-tight truncate pt-0.5" title={eventDetail.plotSignal}>
                      Plot signal: {eventDetail.plotSignal}
                    </div>
                  </div>
                  <div
                    className="relative rounded-md overflow-hidden flex items-center justify-center w-full h-[52px] shrink-0 mt-auto border border-white/10"
                    style={{
                      background:
                        "radial-gradient(ellipse at 40% 30%, rgba(200,255,8,0.12), transparent 55%), linear-gradient(165deg, #0a2226 0%, #031014 55%, #061a1e 100%)",
                    }}
                  >
                    {showEventDiagram && displayEvent !== "none" ? (
                      <EventDetailVisual
                        event={displayEvent as StabilityEventType}
                        instanceId="panel"
                        rows={panelEventRows}
                        eventAt={displayEventTime}
                        headers={(panelEventRows as any)?.headers}
                      />
                    ) : (
                      <div className="px-2 py-1 text-center flex flex-col items-center justify-center gap-0.5 font-sans">
                        <p className="text-xs font-bold text-primary leading-snug">
                          {!droppedAsset
                            ? "Select a CFG solution to continue"
                            : "Close circuit breaker to connect"}
                        </p>
                        <p className="text-xs text-diagram-line/80 leading-snug max-w-[160px]">
                          {!droppedAsset
                            ? "Choose CFG from Solutions, close CB to view waveform."
                            : "Close CB to view this event waveform."}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-diagram-line/70 leading-snug py-1 font-sans">
                  {droppedAsset === "CFG12" || droppedAsset === "CFG13"
                    ? "Select a study from the drop-down menu in the toolbar to proceed"
                    : "Hover or click an event on the diagram to show details (fault / RoCoF / V / ø)."}
                </p>
              )}
            </div>
          </div>

          {/* Network shell uses scaled layout size so CSS transform does not leave a tall empty band */}
          <div className="min-w-0 flex-1 flex items-start justify-start overflow-visible pr-2">
            <div
              className="relative shrink-0 overflow-visible"
              style={{
                width: `${sldLayoutW + eventClearPx}px`,
                height: `${sldLayoutH}px`,
                marginLeft: 0,
              }}
            >
              <div
                className="absolute top-0 left-0 overflow-visible"
                style={{
                  width: `${STABILITY_SLD_NATIVE_W}px`,
                  height: `${STABILITY_SLD_NATIVE_H}px`,
                  left: `${eventClearPx}px`,
                  transform: `scale(${sldScale})`,
                  transformOrigin: "left top",
                }}
              >
                <img
                  src="/svgs/Display/Gridline.svg"
                  alt="Single-Line Grid Network"
                  className="absolute top-[-35px] left-[-30px] w-[900px] h-[300px] object-contain pointer-events-none opacity-90 transition-all duration-300"
                />

                {/* SVG Markers & Converging Dashed Arrow Lines to Grid */}
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    top: "0",
                    left: "0",
                    zIndex: 5,
                    width: "100%",
                    height: "100%",
                    overflow: "visible",
                  }}
                >
                  <defs>
                    <marker
                      id="arrow-white"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#bd2525ff" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--primary, #00f2fe)" />
                    </marker>
                  </defs>

                  {/* Converging dashed arrows — all meet at middle-line Grid target */}
                  {/* Line 1: RoCoF (f) -> Grid center (same end as middle line) */}
                  <line
                    x1="-60"
                    y1="25"
                    x2="-28"
                    y2="100"
                    stroke={activeEvent === "rocof" ? "var(--primary)" : "#ffffff"}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity={activeEvent !== "none" && activeEvent !== "rocof" ? 0.2 : 1}
                    markerEnd={activeEvent === "rocof" ? "url(#arrow-active)" : "url(#arrow-white)"}
                    className={activeEvent === "rocof" ? "animate-electric-flow" : ""}
                    style={{
                      filter:
                        activeEvent === "rocof"
                          ? "drop-shadow(0 0 6px var(--primary))"
                          : "drop-shadow(0 0 4px rgba(255,255,255,0.7))",
                    }}
                  />

                  {/* Line 2: Voltage Step (V) -> Grid */}
                  <line
                    x1="-60"
                    y1="100"
                    x2="-28"
                    y2="100"
                    stroke={activeEvent === "voltage_step" ? "var(--primary)" : "#ffffff"}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity={activeEvent !== "none" && activeEvent !== "voltage_step" ? 0.2 : 1}
                    markerEnd={
                      activeEvent === "voltage_step" ? "url(#arrow-active)" : "url(#arrow-white)"
                    }
                    className={activeEvent === "voltage_step" ? "animate-electric-flow" : ""}
                    style={{
                      filter:
                        activeEvent === "voltage_step"
                          ? "drop-shadow(0 0 6px var(--primary))"
                          : "drop-shadow(0 0 4px rgba(255,255,255,0.7))",
                    }}
                  />

                  {/* Line 3: Phase Jump (ø) -> Grid center (same end as middle line) */}
                  <line
                    x1="-60"
                    y1="175"
                    x2="-28"
                    y2="100"
                    stroke={activeEvent === "phase_jump" ? "var(--primary)" : "#ffffff"}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity={activeEvent !== "none" && activeEvent !== "phase_jump" ? 0.2 : 1}
                    markerEnd={
                      activeEvent === "phase_jump" ? "url(#arrow-active)" : "url(#arrow-white)"
                    }
                    className={activeEvent === "phase_jump" ? "animate-electric-flow" : ""}
                    style={{
                      filter:
                        activeEvent === "phase_jump"
                          ? "drop-shadow(0 0 6px var(--primary))"
                          : "drop-shadow(0 0 4px rgba(255,255,255,0.7))",
                    }}
                  />
                </svg>

                {/* RoCoF Event (f) — top tile */}
                <div
                  className={`absolute top-[25px] left-[-85px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-start group transition-all z-10 ${breakerOpen ||
                    (droppedAsset && !cfgHasEvent(droppedAsset, "rocof")) ||
                    (activeEvent !== "none" && activeEvent !== "rocof")
                    ? "opacity-30 pointer-events-none cursor-not-allowed"
                    : "cursor-pointer"
                    }`}
                  onClick={() => selectEvent("rocof")}
                  onMouseEnter={(e) => showEventHover(e, "rocof")}
                  onMouseLeave={clearEventHover}
                  title={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13"
                      ? "Choose an event from the study list above"
                      : activeEvent !== "none" && activeEvent !== "rocof"
                        ? "Event active. Re-connect Circuit Breaker to run other events."
                        : droppedAsset && !cfgHasEvent(droppedAsset, "rocof")
                          ? "No ROCOF Databank for this CFG"
                          : "RoCoF (f) disturbance"
                  }
                >
                  <div className="transition-all duration-200 relative flex items-center justify-center p-0.5 rounded-lg">
                    <img
                      src="/svgs/Display/EventF.svg"
                      alt="RoCoF (f)"
                      className={`w-14 h-10 object-contain transition-all duration-200 ${
                        activeEvent === "rocof"
                          ? "drop-shadow-[0_0_10px_#C8FF08] drop-shadow-[0_0_20px_rgba(200,255,8,0.85)] brightness-125"
                          : "drop-shadow-[0_0_6px_rgba(53,158,164,0.6)] group-hover:brightness-110"
                      }`}
                    />
                  </div>
                </div>

                {/* Voltage Step Event (V) — middle tile */}
                <div
                  className={`absolute top-[100px] left-[-85px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-start group transition-all z-10 ${breakerOpen ||
                    (droppedAsset && !cfgHasEvent(droppedAsset, "voltage_step")) ||
                    (activeEvent !== "none" && activeEvent !== "voltage_step")
                    ? "opacity-30 pointer-events-none cursor-not-allowed"
                    : "cursor-pointer"
                    }`}
                  onClick={() => selectEvent("voltage_step")}
                  onMouseEnter={(e) => showEventHover(e, "voltage_step")}
                  onMouseLeave={clearEventHover}
                  title={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13"
                      ? "Choose an event from the study list above"
                      : activeEvent !== "none" && activeEvent !== "voltage_step"
                        ? "Event active. Re-connect Circuit Breaker to run other events."
                        : droppedAsset && !cfgHasEvent(droppedAsset, "voltage_step")
                          ? "No VSTEP Databank for this CFG"
                          : "Voltage Step (V) disturbance"
                  }
                >
                  <div className="transition-all duration-200 relative flex items-center justify-center p-0.5 rounded-lg">
                    <img
                      src="/svgs/Display/EventV.svg"
                      alt="Voltage Step (V)"
                      className={`w-14 h-10 object-contain transition-all duration-200 ${
                        activeEvent === "voltage_step"
                          ? "drop-shadow-[0_0_10px_#C8FF08] drop-shadow-[0_0_20px_rgba(200,255,8,0.85)] brightness-125"
                          : "drop-shadow-[0_0_6px_rgba(53,158,164,0.6)] group-hover:brightness-110"
                      }`}
                    />
                  </div>
                </div>

                {/* Phase Jump Event (ø) — bottom tile */}
                <div
                  className={`absolute top-[175px] left-[-85px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-start group transition-all z-10 ${breakerOpen ||
                    (droppedAsset && !cfgHasEvent(droppedAsset, "phase_jump")) ||
                    (activeEvent !== "none" && activeEvent !== "phase_jump")
                    ? "opacity-30 pointer-events-none cursor-not-allowed"
                    : "cursor-pointer"
                    }`}
                  onClick={() => selectEvent("phase_jump")}
                  onMouseEnter={(e) => showEventHover(e, "phase_jump")}
                  onMouseLeave={clearEventHover}
                  title={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13"
                      ? "Choose an event from the study list above"
                      : activeEvent !== "none" && activeEvent !== "phase_jump"
                        ? "Event active. Re-connect Circuit Breaker to run other events."
                        : droppedAsset && !cfgHasEvent(droppedAsset, "phase_jump")
                          ? "No PHJUMP Databank for this CFG"
                          : "Phase Jump (ø) disturbance"
                  }
                >
                  <div className="transition-all duration-200 relative flex items-center justify-center p-0.5 rounded-lg">
                    <img
                      src="/svgs/Display/EventO.svg"
                      alt="Phase Jump (ø)"
                      className={`w-14 h-10 object-contain transition-all duration-200 ${
                        activeEvent === "phase_jump"
                          ? "drop-shadow-[0_0_10px_#C8FF08] drop-shadow-[0_0_20px_rgba(200,255,8,0.85)] brightness-125"
                          : "drop-shadow-[0_0_6px_rgba(53,158,164,0.6)] group-hover:brightness-110"
                      }`}
                    />
                  </div>
                </div>

                {/* Ground Resistor & Fault Event — exact position under GEP line */}
                <div
                  className={`absolute group transition-all z-15 ${breakerOpen ||
                    (droppedAsset && !cfgHasEvent(droppedAsset, "fault")) ||
                    (activeEvent !== "none" && activeEvent !== "fault")
                    ? "opacity-30 pointer-events-none cursor-not-allowed"
                    : "cursor-pointer"
                    }`}
                  style={{ top: "147px", left: "551px" }}
                  onClick={() => selectEvent("fault")}
                  onMouseEnter={(e) => showEventHover(e, "fault")}
                  onMouseLeave={clearEventHover}
                  title={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13"
                      ? "Choose an event from the study list above"
                      : activeEvent !== "none" && activeEvent !== "fault"
                        ? "Event active. Re-connect Circuit Breaker to run other events."
                        : droppedAsset && !cfgHasEvent(droppedAsset, "fault")
                          ? "No SCL Databank for this CFG"
                          : "3-Phase SCL Fault"
                  }
                >
                  <div className="p-1 transition-all relative group-hover:scale-105">
                    <GroundResistorSvg strokeColor={isFaultRed ? "#ff2d3d" : "#c8ff00"} />
                  </div>
                </div>

                {/* Grid hit target — card is portaled to body (see below) so it never goes behind Event Details */}
                <div
                  className="absolute z-[80] cursor-pointer"
                  style={{ top: "48px", left: "8px", width: "88px", height: "135px" }}
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    // Open to the right of Grid so it clears the left Event Details column
                    const cardW = 260;
                    const left = Math.min(
                      r.right + 10 + cardW / 2,
                      window.innerWidth - cardW / 2 - 12,
                    );
                    const top = Math.min(r.top, window.innerHeight - 220);
                    setGridHoverPos({ left, top });
                  }}
                  onMouseLeave={() => setGridHoverPos(null)}
                />

                {/* Grid Label below Power Plant (GE Inter font, 12px) */}
                <div
                  className="absolute pointer-events-none select-none text-center font-sans font-bold text-[12px] text-[#C8FF08] tracking-wider z-10"
                  style={{
                    top: "154px",
                    left: "-12px",
                    width: "80px",
                    fontFamily: "'GE Inter', 'Inter', sans-serif",
                  }}
                >
                  Grid
                </div>

                {/* GEP Hover Telemetry Card — covers entire GEP label, busbar line, and dot */}
                <div
                  className="absolute cursor-pointer group z-[80]"
                  style={{ top: "0px", left: "509px", width: "80px", height: "250px" }}
                >
                  {/* Subtle hover glow along GEP vertical bus line */}
                  <div className="absolute top-[8px] left-[40px] w-[3px] h-[212px] rounded-full bg-lime/0 group-hover:bg-lime/25 group-hover:shadow-[0_0_10px_#c8ff00] transition-all pointer-events-none" />

                  {/* Pulsing indicator dot at GEP */}
                  <div className="absolute top-[28px] left-[48px] -translate-x-1/2 flex items-center justify-center p-1 rounded-full bg-lime/10 border border-lime/40 group-hover:bg-lime/30 group-hover:scale-125 group-hover:shadow-[0_0_12px_rgba(200,255,8,0.7)] transition-all pointer-events-none">
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-lime opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-lime"></span>
                  </div>

                  {/* GEP Label centered below GEP vertical bus line (GE Inter font, 12px) */}
                  <div
                    className="absolute pointer-events-none select-none text-center font-sans font-bold text-[12px] text-[#C8FF08] tracking-wider z-10 w-full"
                    style={{
                      top: "226px",
                      left: "0px",
                      fontFamily: "'GE Inter', 'Inter', sans-serif",
                    }}
                  >
                    GEP
                  </div>

                  {/* Hover Tooltip Card — same as GRID */}
                  <div className="absolute top-[55px] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[90] bg-black/95 border border-lime/50 rounded-xl p-3 shadow-[0_0_24px_rgba(200,255,8,0.45)] backdrop-blur-md w-[280px]">
                    <div className="flex items-center justify-between gap-2 border-b border-lime/20 pb-1.5 font-sans text-sm font-bold uppercase tracking-wider text-lime">
                      <span className="leading-tight">GRID ENTRY POINT</span>
                    </div>
                    <div className="flex flex-col gap-1.5 font-sans text-xs pt-1">
                      <div className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10">
                        <span className="text-xs font-bold text-lime flex items-start justify-between gap-2">
                          <span className="leading-snug">Short Circuit Ratio</span>
                          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider shrink-0 pt-0.5">
                            GEP
                          </span>
                        </span>
                        <span className="text-xs text-white/90 font-semibold leading-tight">
                          SCR: 3
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10">
                        <span className="text-xs font-bold text-lime flex items-start justify-between gap-2">
                          <span className="leading-snug">Nominal Voltage</span>
                          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider shrink-0 pt-0.5">
                            GEP
                          </span>
                        </span>
                        <span className="text-xs text-white/90 font-semibold leading-tight">
                          220 kV
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10">
                        <span className="text-xs font-bold text-lime flex items-start justify-between gap-2">
                          <span className="leading-snug">Nominal Frequency</span>
                          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider shrink-0 pt-0.5">
                            GEP
                          </span>
                        </span>
                        <span className="text-xs text-white/90 font-semibold leading-tight">
                          50 Hz
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thin dashed bus GEP → CB → CFG. Y=120 matches Gridline bus center + CFG1 input (~119.95). */}
                {(() => {
                  const BUS_Y = 120;
                  const gepX = 549;
                  const cbLeft = 601;
                  const cbRight = 660;
                  const wireEndX = droppedAsset ? getWireEndX(droppedAsset) : cbRight;
                  const busEndX = droppedAsset ? wireEndX : 655;
                  const busW = Math.max(1, busEndX - gepX);
                  const dash = "4 3";
                  const live = !breakerOpen;

                  return (
                    <svg
                      className="absolute pointer-events-none"
                      style={{
                        top: `${BUS_Y}px`,
                        left: `${gepX}px`,
                        zIndex: 15,
                        overflow: "visible",
                        width: `${busW}px`,
                        height: "1px",
                      }}
                    >
                      <line
                        x1="0"
                        y1="0.5"
                        x2={Math.max(0, cbLeft - gepX)}
                        y2="0.5"
                        stroke="#FFFFFF"
                        strokeWidth="1"
                        strokeLinecap="butt"
                        strokeDasharray={live ? dash : "none"}
                        className={live ? "animate-electric-flow" : undefined}
                      />
                      {droppedAsset && (
                        <line
                          x1={cbRight - gepX}
                          y1="0.5"
                          x2={busW}
                          y2="0.5"
                          stroke="#FFFFFF"
                          strokeWidth="1"
                          strokeLinecap="butt"
                          strokeDasharray={dash}
                          className={live ? "animate-electric-flow" : undefined}
                          style={{ opacity: live ? 1 : 0.45 }}
                        />
                      )}
                    </svg>
                  );
                })()}

                {/* Circuit Breaker — center on same bus Y as dashed wire */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group z-20 bg-background rounded-lg p-1.5 border border-border/40 shadow-sm"
                  style={{ top: "120px", left: "631px" }}
                  onClick={() => setBreakerOpen(!breakerOpen)}
                  title={`Circuit Breaker (${breakerOpen ? "Open" : "Closed"})`}
                >
                  <img
                    src={
                      breakerOpen
                        ? "/svgs/Display/Breakeropen.svg"
                        : "/svgs/Display/Breakerclosed.svg"
                    }
                    className="w-12 h-12 object-contain rotate-90 transition-all duration-200"
                    alt={breakerOpen ? "Breaker Open" : "Breaker Closed"}
                  />
                </div>

                {droppedAsset && (
                  <div
                    className="absolute animate-in fade-in slide-in-from-left-4 duration-300"
                    style={{ left: "715px", top: `${getContainerTop(droppedAsset)}px`, zIndex: 50 }}
                  >
                    {renderDroppedAsset()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ExpandableTileBox>
    );
  };

  const renderAnalyticsGrid = () => {
    const csvHeaders = (data as any)?.headers;
    const isCfg12Power =
      droppedAsset === "CFG12" || droppedAsset === "CFG13" || csvHeaders?.chartKind === "power";
    // Client mapping: Ip/Iq (CFG1–11) or P/Q at POC (CFG12/13 — Slide 18)
    const activeYLabel =
      csvHeaders?.activeCurrent || (isCfg12Power ? "P_POC (MW)" : "Ip_GEP_pu Main");
    const reactiveYLabel =
      csvHeaders?.reactiveCurrent || (isCfg12Power ? "Q_POC (MVAr)" : "Iq_GEP_pu Main");
    const activeTitle = isCfg12Power ? "Active Power at POC (MW)" : "Active current at GEP (Ip)";
    const reactiveTitle = isCfg12Power
      ? "Reactive Power at POC (MVAr)"
      : "Reactive current at GEP (Iq)";
    const activeYUnit = isCfg12Power ? "(MW)" : "Ip (pu)";
    const reactiveYUnit = isCfg12Power ? "(MVAr)" : "Iq (pu)";

    const activeCsvUrl = droppedAsset ? resolveCsvUrl(droppedAsset, activeEvent) : null;
    const activeCsvFileName = activeCsvUrl ? activeCsvUrl.replace(/^\/databank\//, "") : undefined;

    return (
      <ExpandableTileBox
        title="Stability Analytics (GEP)"
        open={isAnalyticsOpen}
        onToggle={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
        className="w-full h-full min-h-0 flex flex-col min-w-0"
      >
        <div className="p-1.5 sm:p-2 flex flex-col gap-1.5 h-full min-h-0">
          {droppedAsset ? (
            <div className="shrink-0 text-center text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-primary">
              BASE MVA = {machineBaseMva.toFixed(0)} MVA
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0">
              <div className="bg-background relative min-h-0 h-full min-w-0 rounded-lg overflow-hidden border border-border/20">
                <EChartsRealtimeChart
                  title={activeTitle}
                  data={data}
                  dataKey="activeCurrent"
                  yLabel={
                    csvHeaders?.ipColIndex != null
                      ? `${activeYLabel} [#${csvHeaders.ipColIndex}]`
                      : activeYLabel
                  }
                  color="#C8FF08"
                  currentEventTime={currentEventTime}
                  activeEvent={activeEvent}
                  breakerOpen={breakerOpen}
                  parseError={parseError}
                  isPaused={isTelemetryPaused}
                  onTogglePause={setIsTelemetryPaused}
                  onFullscreen={() => setIsFullscreenAnalytics(true)}
                  onEventPlaybackDone={revealPendingDials}
                  fillContainer
                  csvFileName={activeCsvFileName}
                  csvUrl={activeCsvUrl ?? undefined}
                  tickSize={chartTickSize}
                  cfgName={droppedAsset}
                  preEventData={preEventData}
                  yAxisRange={chartActiveYAxis}
                  yUnit={activeYUnit}
                />
              </div>
              <div className="bg-background relative min-h-0 h-full min-w-0 rounded-lg overflow-hidden border border-border/20">
                <EChartsRealtimeChart
                  title={reactiveTitle}
                  data={data}
                  dataKey="reactiveCurrent"
                  yLabel={
                    csvHeaders?.iqColIndex != null
                      ? `${reactiveYLabel} [#${csvHeaders.iqColIndex}]`
                      : reactiveYLabel
                  }
                  color="#C8FF08"
                  currentEventTime={currentEventTime}
                  activeEvent={activeEvent}
                  breakerOpen={breakerOpen}
                  parseError={parseError}
                  isPaused={isTelemetryPaused}
                  onTogglePause={setIsTelemetryPaused}
                  onFullscreen={() => setIsFullscreenAnalytics(true)}
                  fillContainer
                  csvFileName={activeCsvFileName}
                  csvUrl={activeCsvUrl ?? undefined}
                  tickSize={chartTickSize}
                  cfgName={droppedAsset}
                  preEventData={preEventData}
                  yAxisRange={chartReactiveYAxis}
                  yUnit={reactiveYUnit}
                />
              </div>
            </div>
          </div>
        </div>
      </ExpandableTileBox>
    );
  };

  const renderDiagnosticsSidebar = () => (
    <div className="stability-page__sidebar flex flex-col shrink-0 min-h-0 h-full">
      <ExpandableTileBox
        title="Stability Solution Characterization"
        badge={
          previousSnapshot
            ? currentCfgDisplayId
              ? `${currentCfgDisplayId} vs ${previousSnapshot.cfgId}`
              : `prev ${previousSnapshot.cfgId}`
            : currentCfgDisplayId
              ? `${currentCfgDisplayId} · ${droppedAsset === "CFG12" || droppedAsset === "CFG13" ? "Q←V · P←ø" : "Iq←V · Ip←ø"}`
              : droppedAsset === "CFG12" || droppedAsset === "CFG13"
                ? "Q←V · P←ø · latch"
                : "Iq←V · Ip←ø · latch"
        }
        open={isDiagnosticsOpen}
        onToggle={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
        className="w-full min-h-0 flex-1 flex flex-col"
      >
        <div className="px-2.5 py-2 flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
          {/* Top Section: Inertia and SCL Dials */}
          <div className="shrink-0">
            {previousSnapshot ? (
              /* Like Ip/Iq: after trash Current is empty, Previous keeps last CFG dials */
              <div className="stability-page__dials flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 justify-items-center items-start">
                  <div className="flex flex-col items-center">
                    <Speedometer
                      value={Math.abs(inertiaDisplay)}
                      max={inertiaMax}
                      label="Inertia (MW.s)"
                      isCalculating={Boolean(
                        droppedAsset && metricsStatus.inertia.includes("Calculating"),
                      )}
                      size="sm"
                    />
                    <DialRoleCaption role="current" cfgId={currentCfgDisplayId ?? "—"} />
                  </div>
                  <div className="flex flex-col items-center">
                    <Speedometer
                      value={Math.abs(previousInertiaDisplay ?? 0)}
                      max={inertiaMax}
                      label="Inertia (MW.s)"
                      size="sm"
                      tone="previous"
                    />
                    <DialRoleCaption role="previous" cfgId={previousSnapshot.cfgId} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 justify-items-center items-start">
                  <div className="flex flex-col items-center">
                    <Speedometer
                      value={Math.abs(currentShortCircuit)}
                      max={scMax}
                      label="SCL (kA)"
                      isCalculating={Boolean(
                        droppedAsset && metricsStatus.sc.includes("Calculating"),
                      )}
                      size="sm"
                    />
                    <DialRoleCaption role="current" cfgId={currentCfgDisplayId ?? "—"} />
                    {droppedAsset ? (
                      <div className="text-[7px] text-diagram-line/45 mt-0.5 text-center max-w-[90px] leading-tight">
                        Base MVA = {machineBaseMva.toFixed(0)} MVA
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-center">
                    <Speedometer
                      value={Math.abs(previousScDisplay ?? 0)}
                      max={scMax}
                      label="SCL (kA)"
                      size="sm"
                      tone="previous"
                    />
                    <DialRoleCaption role="previous" cfgId={previousSnapshot.cfgId} />
                  </div>
                </div>
              </div>
            ) : (
              /* No previous yet: single Inertia + SC dials */
              <div className="stability-page__dials flex flex-row justify-around gap-3 items-center py-1">
                <div className="flex flex-col items-center">
                  <Speedometer
                    value={Math.abs(inertiaDisplay)}
                    max={inertiaMax}
                    label="Inertia (MW.s)"
                    isCalculating={metricsStatus.inertia.includes("Calculating")}
                    size="md"
                  />
                  {metricsStatus.inertia.includes("Calculating") ? (
                    <div className="text-primary text-[8.5px] font-bold mt-1 text-center max-w-[120px] leading-tight animate-pulse">
                      {metricsStatus.inertia}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-center">
                  <Speedometer
                    value={Math.abs(currentShortCircuit)}
                    max={scMax}
                    label="SCL (kA)"
                    isCalculating={metricsStatus.sc.includes("Calculating")}
                    size="md"
                  />
                  {metricsStatus.sc.includes("Calculating") ? (
                    <div className="text-primary text-[8.5px] font-bold mt-1 text-center max-w-[120px] leading-tight animate-pulse">
                      {metricsStatus.sc}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 shrink-0" />

          {/* Bottom Section: Time Domain Characterization Tables */}
          <div className="stability-td-panel flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
            {previousSnapshot?.cfgId ? (
              <div className="min-w-0 min-h-0 flex-1 flex flex-col">
                <TimeDomainMetricsTable
                  currentCfg={currentCfgDisplayId}
                  previousCfg={previousSnapshot.cfgId}
                  currentIp={displayIpMetrics}
                  currentIq={displayIqMetrics}
                  previousIp={previousSnapshot.ip ?? null}
                  previousIq={previousSnapshot.iq ?? null}
                  activeColLabel={droppedAsset === "CFG12" || droppedAsset === "CFG13" ? "P" : "Ip"}
                  reactiveColLabel={droppedAsset === "CFG12" || droppedAsset === "CFG13" ? "Q" : "Iq"}
                  formatPeakActive={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13" ? formatMw : formatKa
                  }
                  formatPeakReactive={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13" ? formatMvar : formatKa
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 min-w-0 min-h-0 flex-1 items-stretch">
                <TimeDomainCompareTable
                  title={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13"
                      ? "P_POC — Active"
                      : "Ip — Active"
                  }
                  titleHint={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13"
                      ? "Active power at POC (MW)"
                      : "Phase jump → Ip"
                  }
                  currentCfg={currentCfgDisplayId}
                  current={displayIpMetrics}
                  formatPeak={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13" ? formatMw : formatKa
                  }
                />
                <TimeDomainCompareTable
                  title={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13"
                      ? "Q_POC — Reactive"
                      : "Iq — Reactive"
                  }
                  titleHint={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13"
                      ? "Reactive power at POC (MVAr)"
                      : "Voltage step → Iq"
                  }
                  currentCfg={currentCfgDisplayId}
                  current={displayIqMetrics}
                  formatPeak={
                    droppedAsset === "CFG12" || droppedAsset === "CFG13" ? formatMvar : formatKa
                  }
                />
              </div>
            )}
          </div>
        </div>
      </ExpandableTileBox>
    </div>
  );

  return (
    <div
      className={`stability-page w-full bg-[#212121] bg-[radial-gradient(ellipse_at_top,#004745_0%,#002b2a_40%,#212121_100%)] text-diagram-line flex flex-col font-sans max-lg:min-h-dvh max-lg:h-auto max-lg:overflow-y-auto lg:h-dvh lg:max-h-dvh lg:overflow-hidden ${isGreenTheme ? "green-theme" : ""} ${isFullscreenAnalytics ? "h-dvh overflow-hidden" : ""}`}
    >
      {/* Top Header: isolated logo on left, centered title, Back / Nav / Close App on right */}
      <header className="flex flex-row items-center justify-between gap-2 sm:gap-3 px-6 md:px-10 pt-6 md:pt-10 pb-2.5 shrink-0 bg-transparent border-b border-white/10 text-white select-none z-30 font-sans">
        <div className="flex shrink-0 items-center justify-start min-w-0 -ml-2.5 sm:-ml-3">
          <Link to="/" className="shrink-0 hover:opacity-90 transition-opacity">
            <img
              src="/logos/ge_vernova_white.svg"
              className="h-12 sm:h-14 md:h-16 lg:h-[68px] w-auto max-w-[260px] sm:max-w-[300px] object-contain object-left"
              alt="GE Vernova"
            />
          </Link>
        </div>

        {/* Center: Title in GE Inter font */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-2">
          <h1 className="font-sans font-extrabold text-sm sm:text-base md:text-lg lg:text-xl text-white uppercase tracking-wider truncate text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            Stability Solution Characterization
          </h1>
        </div>

        {/* Right: Navigation (with text), Home, Close App */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/windfarmstability"
            className="h-9 px-3.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 hover:bg-black/40 hover:border-[#C8FF08]/60 hover:text-[#C8FF08] text-white transition-all shadow-sm group shrink-0 text-xs sm:text-sm font-sans font-medium leading-none"
            title="Navigate to IBR Farm Stabilization"
            aria-label="Navigate to IBR Farm Stabilization"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-[#C8FF08] group-hover:-translate-x-0.5 transition-transform" />
            <span className="leading-none whitespace-nowrap">IBR Farm Stabilization</span>
          </Link>
          <Link
            to="/"
            onClick={() => {
              try {
                sessionStorage.setItem("flexiqsim.openUseCases", "1");
              } catch {
                /* private mode */
              }
            }}
            className="h-9 w-9 min-w-[36px] min-h-[36px] p-0 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white transition-all shadow-sm group cursor-pointer shrink-0"
            title="Home"
            aria-label="Home"
          >
            <Home className="w-4 h-4 shrink-0 text-white group-hover:text-[#C8FF08] group-hover:scale-110 transition-all" />
          </Link>
          <AppWindowControls showLabels={false} compact />
        </div>
      </header>

      {/* Solutions Library Subheader */}
      <div className="px-6 md:px-10 pt-1.5 pb-0.5 shrink-0">
        {renderSolutionLibrary()}
      </div>

      {/* Body: left column (Network Diagram + Analytics Graphs), right column (Diagnostics Sidebar) */}
      <div className="stability-page__body flex-1 min-h-0 flex flex-col lg:flex-row gap-2 md:gap-3 px-6 md:px-10 pb-1 sm:pb-2 mt-1 overflow-hidden">
        {/* Left Column: Network Diagram + Analytics Graphs */}
        <div className="flex-1 min-w-0 min-h-0 w-full flex flex-col gap-2 md:gap-3 relative z-20 overflow-hidden">
          {/* Diagram : waveforms with 20% taller plots */}
          <div className="relative z-30 isolate min-w-0 flex-[4.5] min-h-0 overflow-hidden flex flex-col">
            {renderNetworkDiagram()}
          </div>
          <div className="relative z-10 min-w-0 min-h-0 flex-[5.5] overflow-hidden flex flex-col">
            {renderAnalyticsGrid()}
          </div>
        </div>

        {/* Right Column: Stability Solution Characterization + Time Domain */}
        <div className="w-full lg:w-auto relative z-0 shrink-0 min-w-0 min-h-0 lg:h-full flex flex-col">
          {renderDiagnosticsSidebar()}
        </div>
      </div>

      {/* Full Screen Analytics — Slide 17 CFG Compare */}
      {isFullscreenAnalytics && (
        <div className="fixed inset-0 z-50 bg-[#212121] bg-[radial-gradient(ellipse_at_top,#004745_0%,#002b2a_40%,#212121_100%)] text-white h-dvh max-h-dvh overflow-hidden flex flex-col animate-in fade-in duration-200 font-sans select-none">
          {/* Top Header matching same style as other pages */}
          <header className="flex flex-row items-center justify-between gap-2 sm:gap-3 px-6 md:px-10 pt-6 md:pt-10 pb-2.5 shrink-0 bg-transparent border-b border-white/10 text-white select-none z-30 font-sans">
            {/* Left: GE Logo with identical left offset */}
            <div className="flex shrink-0 items-center justify-start min-w-0 -ml-2.5 sm:-ml-3">
              <img
                src="/logos/ge_vernova_white.svg"
                alt="GE Vernova"
                className="h-12 sm:h-14 md:h-16 lg:h-[68px] w-auto max-w-[260px] sm:max-w-[300px] object-contain object-left"
              />
            </div>

            {/* Center: Title */}
            <div className="flex-1 flex items-center justify-center min-w-0 px-2">
              <h1 className="font-sans font-extrabold text-sm sm:text-base md:text-lg lg:text-xl text-white uppercase tracking-wider truncate text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                Stability Solution Characterization · CFG Compare
              </h1>
            </div>

            {/* Right: Close X only button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFullscreenAnalytics(false)}
                className="h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-full border border-white/20 bg-black/20 hover:bg-black/40 hover:text-[#C8FF08] hover:border-[#C8FF08]/60 text-white transition-all shadow-sm group shrink-0 cursor-pointer"
                title="Close Analytics"
                aria-label="Close Analytics"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-white group-hover:text-[#C8FF08] group-hover:rotate-90 transition-all" />
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 px-6 md:px-10 py-2 sm:py-2.5 bg-transparent overflow-hidden">
            <StabilityCompareAnalytics parseCsv={parseStabilityCsvText} cfgSpecs={CFG_SPECS} />
          </div>
        </div>
      )}

      {/* Solutions-strip CFG hover — portaled above page chrome */}
      {typeof document !== "undefined" &&
        hoveredSolutionCfg &&
        hoveredSolutionPos &&
        createPortal(
          <div
            className="fixed z-[300] pointer-events-none -translate-x-1/2 flex flex-col gap-2 rounded-xl border border-primary/50 bg-black/95 p-3 shadow-[0_0_28px_rgba(200,255,8,0.4)] backdrop-blur-md min-w-[290px] sm:min-w-[330px]"
            style={{ left: hoveredSolutionPos.left, top: hoveredSolutionPos.top }}
          >
            <div className="flex items-center justify-between border-b border-primary/20 pb-1.5 font-sans text-sm font-bold uppercase tracking-wider text-primary">
              <span>{hoveredSolutionCfg}</span>
              <span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary font-bold">
                {canConnectSolution
                  ? "Click / Drag to Connect"
                  : droppedAsset
                    ? "Trash to change"
                    : "CB Closed"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg border border-white/10 p-2 min-h-[95px] relative overflow-hidden">
              <img
                src={`/svgs/Display/${getCfgSvgStem(hoveredSolutionCfg)}.svg`}
                alt={`${hoveredSolutionCfg} Diagram`}
                className="w-full h-20 object-contain drop-shadow-[0_0_8px_rgba(200,255,8,0.45)]"
              />
            </div>
            <div className="flex flex-col gap-1.5 font-sans text-xs">
              {(
                CFG_SPECS[hoveredSolutionCfg] ?? [
                  {
                    name: `${hoveredSolutionCfg} System`,
                    rating: "320 MVA Equipment Rating",
                    type: "Solution",
                  },
                ]
              ).map((item, idx) => {
                const isGfm = /\bGFMe?\b/i.test(item.name);
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10"
                  >
                    <div
                      className={`text-xs font-bold flex items-center justify-between ${isGfm ? "text-primary" : "text-white"}`}
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                        {item.type}
                      </span>
                    </div>
                    <div className="text-xs text-white/85 font-sans leading-tight">
                      {item.rating}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}

      {/* Connected CFG Component Specifications — portaled above charts / overflow clip */}
      {typeof document !== "undefined" &&
        droppedAsset &&
        droppedHoverPos &&
        createPortal(
          <div
            className="fixed z-[300] pointer-events-none -translate-x-1/2 flex flex-col gap-1.5 rounded-xl border border-lime/50 bg-black/95 p-3 shadow-[0_0_24px_rgba(200,255,8,0.45)] backdrop-blur-md w-[280px]"
            style={{
              left: Math.min(Math.max(droppedHoverPos.left, 150), window.innerWidth - 150),
              top: Math.min(Math.max(droppedHoverPos.top, 12), window.innerHeight - 280),
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-lime/20 pb-1.5 font-sans text-sm font-bold uppercase tracking-wider text-lime">
              <span className="leading-tight">{droppedAsset} COMPONENT SPECIFICATIONS</span>
            </div>
            <div className="flex flex-col gap-1.5 font-sans text-xs">
              {(
                CFG_SPECS[droppedAsset] ?? [
                  {
                    name: `${droppedAsset} System`,
                    rating: "320 MVA Equipment Rating",
                    type: "Solution",
                  },
                ]
              ).map((item, idx) => {
                const isGfm = /\bGFMe?\b/i.test(item.name);
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10"
                  >
                    <span
                      className={`text-xs font-bold flex items-start justify-between gap-2 ${isGfm ? "text-lime" : "text-white"}`}
                    >
                      <span className="leading-snug break-words">{item.name}</span>
                      <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider shrink-0 pt-0.5">
                        {item.type}
                      </span>
                    </span>
                    <span className="text-xs text-white/85 font-sans leading-tight">
                      {item.rating}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}

      {/* Grid ENTRY POINT hover — fixed to viewport so it never goes behind Event Details / header */}
      {typeof document !== "undefined" &&
        gridHoverPos &&
        createPortal(
          <div
            className="fixed z-[300] pointer-events-none -translate-x-1/2 flex flex-col gap-1.5 rounded-xl border border-lime/50 bg-black/95 p-3 shadow-[0_0_24px_rgba(200,255,8,0.45)] backdrop-blur-md w-[280px]"
            style={{ left: gridHoverPos.left, top: gridHoverPos.top }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-lime/20 pb-1.5 font-sans text-sm font-bold uppercase tracking-wider text-lime">
              <span className="leading-tight">GRID</span>
            </div>
            <div className="flex flex-col gap-1.5 font-sans text-xs pt-1">
              <div className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10">
                <span className="text-xs font-bold text-lime flex items-start justify-between gap-2">
                  <span className="leading-snug">Nominal Voltage</span>
                  <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider shrink-0 pt-0.5">
                    GRID
                  </span>
                </span>
                <span className="text-xs text-white/90 font-semibold leading-tight">220 kV</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10">
                <span className="text-xs font-bold text-lime flex items-start justify-between gap-2">
                  <span className="leading-snug">Nominal Frequency</span>
                  <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider shrink-0 pt-0.5">
                    GRID
                  </span>
                </span>
                <span className="text-xs text-white/90 font-semibold leading-tight">50 Hz</span>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Footer - GE Brand Guidelines compliant (20px box, centered horizontally & vertically) */}
      <footer className="ge-brand-footer">
        <span>
          © 2026 GE Vernova and/or its affiliates. All rights reserved.
        </span>
      </footer>
    </div>
  );
}
