/**
 * Slide 17 Analytics — CFG multi-select + SCL / Inertia bars + Time Domain bars.
 * WhatsApp 10 Aug (Arvind via Gyan): keep Analytics tab with selection as slide 17.
 * UI: modern compare cockpit — same teal/lime theme + same databank logic.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactEChartsModule from "echarts-for-react";
import {
  resolveDatabankCsvUrl,
  getEventTimeSec,
  getPlantBaseMva,
} from "@/lib/stabilityDatabank";
import { fetchDatabankCsvText, limitRowsForUi } from "@/lib/databankFetch";
import {
  computeInertiaMWs,
  computeScDialPu,
  computeResponseMetrics,
  toMetricPoints,
  type ResponseMetrics,
} from "@/lib/databankMetrics";
import { getCigreResponseMetrics } from "@/lib/cigreTimeDomain";
import PRECOMPUTED_METRICS_DATA from "@/data/stabilityAnalyticsMetrics.json";

const ReactECharts =
  (ReactEChartsModule as unknown as { default?: React.ComponentType<any> }).default ??
  (ReactEChartsModule as React.ComponentType<any>);

const PRECOMPUTED_METRICS = PRECOMPUTED_METRICS_DATA as Record<string, CfgMetrics>;

const CFG1_11 = Array.from({ length: 11 }, (_, i) => `CFG${i + 1}`);

const LIME = "#C8FF08";
const LIME_SOFT = "rgba(200,255,8,0.18)";
const LIME_MID = "rgba(200,255,8,0.55)";
const EVERGREEN = "#458A8A";
const EVERGREEN_SOFT = "rgba(69,138,138,0.22)";
const EVERGREEN_MID = "rgba(150,189,189,0.65)";
const FOREST = "#7BDD3C";
const FOREST_SOFT = "rgba(123,221,60,0.18)";
const FOREST_MID = "rgba(123,221,60,0.55)";
const AXIS = "#96BDBD";
const GRID = "rgba(255,255,255,0.08)";
const TOOLTIP_BG = "rgba(0,71,69,0.96)";

export type CfgSpecItem = { name: string; rating: string; type: string };

/** Slide 17 — compact MVA + asset blurb so Analytics doesn't need the main page. */
function cfgAnalyticsCaption(
  cfgId: string,
  specs: Record<string, CfgSpecItem[]>,
): { base: string; detail: string } {
  const plant = getPlantBaseMva(cfgId);
  const items = (specs[cfgId] ?? []).filter((s) => s.type !== "Transformer");
  const syn = items.filter((s) => /syncon/i.test(s.type));
  const bess = items.filter((s) => /bess/i.test(s.type));
  const stat = items.filter((s) => /statcom/i.test(s.type));
  const parts: string[] = [];
  if (syn.length === 1) parts.push(`SynCon ${syn[0].rating.replace(/,.*/, "").trim()}`);
  else if (syn.length > 1) {
    const r0 = syn[0].rating.replace(/,.*/, "").trim();
    const same = syn.every((s) => s.rating.replace(/,.*/, "").trim() === r0);
    parts.push(same ? `${syn.length}× SynCon ${r0}` : `${syn.length}× SynCon`);
  }
  if (bess.length)
    parts.push(
      bess
        .map(
          (b) => `${b.name.replace(/^GF[LM]e?\s*/i, "")} ${b.rating.replace(/\s*\(.*/, "").trim()}`,
        )
        .join(" · "),
    );
  if (stat.length)
    parts.push(stat.map((s) => `${s.name.replace(/^GF[LM]e?\s*/i, "")} ${s.rating}`).join(" · "));
  return {
    base: plant != null ? `${plant} MVA` : items.length ? "—" : "",
    detail: parts.join(" · ") || "—",
  };
}

export type CompareAnalyticsProps = {
  /** Shared CSV parser from StabilityDashboard */
  parseCsv: (
    text: string,
    cfgName?: string,
  ) => Array<{
    time: number;
    activeCurrent: number;
    reactiveCurrent: number;
    shortCircuitCurrent: number;
    pMw: number;
  }>;
  cfgSpecs: Record<string, CfgSpecItem[]>;
};

type CfgMetrics = {
  cfgId: string;
  label: string;
  scPu: number | null;
  inertiaMWs: number | null;
  /** Prefer Iq (V-step) for TD; fall back to Ip (phase jump) */
  td: ResponseMetrics | null;
  tdIp?: ResponseMetrics | null;
  tdIq?: ResponseMetrics | null;
  error?: string;
};

async function fetchRows(
  path: string | null,
  parseCsv: CompareAnalyticsProps["parseCsv"],
  cfgName: string,
): Promise<Array<{
  time: number;
  activeCurrent: number;
  reactiveCurrent: number;
  shortCircuitCurrent: number;
  pMw: number;
}> | null> {
  if (!path) return null;
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const text = await res.text();
    const rows = parseCsv(text, cfgName);
    return rows.length ? rows : null;
  } catch {
    return null;
  }
}

async function loadCfgMetrics(
  key: string,
  parseCsv: CompareAnalyticsProps["parseCsv"],
  cfgSpecs: Record<string, CfgSpecItem[]>,
): Promise<CfgMetrics> {
  const baseCfg = key;
  const label = key;

  const loadEvent = async (ev: "fault" | "rocof" | "voltage_step" | "phase_jump") => {
    const finish = (rows: any[]) => {
      if (!rows.length) return null;
      const t = getEventTimeSec(baseCfg, ev);
      const metricPts = toMetricPoints(rows);
      const limited = limitRowsForUi(rows, t);
      (limited as any).dialSc = computeScDialPu(metricPts, t);
      (limited as any).dialInertia = computeInertiaMWs(metricPts, t);
      (limited as any).headers = (rows as any).headers;
      return limited;
    };
    try {
      const { text } = await fetchDatabankCsvText(baseCfg, ev, "full");
      const done = finish(parseCsv(text, baseCfg));
      if (done) return done;
    } catch {
      /* fall through */
    }
    const path = resolveDatabankCsvUrl(baseCfg, ev);
    const rows = await fetchRows(path, parseCsv, baseCfg);
    return rows ? finish(rows) : null;
  };

  const [sclRows, rocofRows, vstepRows, phjumpRows] = await Promise.all([
    loadEvent("fault"),
    loadEvent("rocof"),
    loadEvent("voltage_step"),
    loadEvent("phase_jump"),
  ]);

  let scPu: number | null = null;
  if (sclRows?.length) {
    const tf = getEventTimeSec(baseCfg, "fault");
    // Aug14: Iq_GEP_kA Main @ tf+0.04 — prefer pre-downsample dial on full crop
    const raw = (sclRows as any).dialSc ?? computeScDialPu(toMetricPoints(sclRows), tf);
    scPu = raw != null ? raw : null;
  }

  let inertiaMWs: number | null = null;
  if (rocofRows?.length) {
    const tr = getEventTimeSec(baseCfg, "rocof");
    inertiaMWs = (rocofRows as any).dialInertia ?? computeInertiaMWs(toMetricPoints(rocofRows), tr);
  }

  // Time domain: separate Ip (phase jump) and Iq (voltage step)
  let tdIp: ResponseMetrics | null = getCigreResponseMetrics(baseCfg, "phase_jump");
  if (!tdIp && phjumpRows?.length) {
    const t = getEventTimeSec(baseCfg, "phase_jump");
    tdIp = computeResponseMetrics(
      phjumpRows.map((r) => ({ time: r.time, value: r.activeCurrent })),
      t,
    );
  }

  let tdIq: ResponseMetrics | null = getCigreResponseMetrics(baseCfg, "voltage_step");
  if (!tdIq && vstepRows?.length) {
    const t = getEventTimeSec(baseCfg, "voltage_step");
    tdIq = computeResponseMetrics(
      vstepRows.map((r) => ({ time: r.time, value: r.reactiveCurrent })),
      t,
    );
  }

  const td = tdIq ?? tdIp;

  return { cfgId: key, label, scPu, inertiaMWs, td, tdIp, tdIq };
}

function fmtShort(v: number, unit: string) {
  if (v == null || !Number.isFinite(v) || v === 0) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const u = unit ? ` ${unit}` : "";
  if (abs >= 100) return `${sign}${Math.round(abs)}${u}`;
  if (abs >= 10) return `${sign}${abs.toFixed(1)}${u}`;
  if (abs >= 1) return `${sign}${abs.toFixed(2)}${u}`;
  return `${sign}${abs.toFixed(3)}${u}`;
}

function computeNiceNum(val: number): number {
  if (val <= 0) return 1;
  const rawTarget = val * 1.25;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawTarget)));
  const normalized = rawTarget / magnitude;

  let niceFactor = 10;
  if (normalized <= 1) niceFactor = 1;
  else if (normalized <= 1.2) niceFactor = 1.2;
  else if (normalized <= 1.5) niceFactor = 1.5;
  else if (normalized <= 2) niceFactor = 2;
  else if (normalized <= 2.5) niceFactor = 2.5;
  else if (normalized <= 3) niceFactor = 3;
  else if (normalized <= 3.5) niceFactor = 3.5;
  else if (normalized <= 4) niceFactor = 4;
  else if (normalized <= 4.5) niceFactor = 4.5;
  else if (normalized <= 5) niceFactor = 5;
  else if (normalized <= 6) niceFactor = 6;
  else if (normalized <= 7) niceFactor = 7;
  else if (normalized <= 8) niceFactor = 8;
  else if (normalized <= 9) niceFactor = 9;
  else niceFactor = 10;

  return Number((niceFactor * magnitude).toFixed(4));
}

function computeAxisBounds(values: Array<number | null>): { min: number; max: number } {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!valid.length) return { min: 0, max: 10 };

  const rawMin = Math.min(...valid);
  const rawMax = Math.max(...valid);

  if (rawMin >= 0) {
    return { min: 0, max: computeNiceNum(rawMax) };
  }

  const niceMin = -computeNiceNum(Math.abs(rawMin));
  const niceMax = rawMax > 0 ? computeNiceNum(rawMax) : 0;
  return { min: niceMin, max: niceMax };
}

type BarColorScheme = "lime" | "evergreen" | "forest";

function horizontalBarOption(
  labels: string[],
  values: Array<number | null>,
  unit: string,
  colorScheme: BarColorScheme = "lime",
) {
  const isEvergreen = colorScheme === "evergreen";
  const isForest = colorScheme === "forest";

  // Official GEV Brand Guidelines: Urgency Green (#C8FF08), Evergreen Tint 1 (#458A8A), Forest (#7BDD3C)
  const primaryColor = isEvergreen ? "#458A8A" : isForest ? "#7BDD3C" : LIME;
  const softColor = isEvergreen ? EVERGREEN_SOFT : isForest ? FOREST_SOFT : LIME_SOFT;
  const midColor = isEvergreen ? EVERGREEN_MID : isForest ? FOREST_MID : LIME_MID;
  const glowColor = isEvergreen
    ? "rgba(69, 138, 138, 0.4)"
    : isForest
      ? "rgba(123, 221, 60, 0.35)"
      : "rgba(200, 255, 8, 0.35)";
  const labelColor = isEvergreen ? "#C7DBDB" : isForest ? "#E3E3E3" : "#FFFFFF";

  const data = values.map((v) => {
    const num = v != null && Number.isFinite(v) ? v : 0;
    return {
      value: num,
      label: {
        show: true,
        position: num < 0 ? "left" : "right",
      },
      itemStyle: {
        borderRadius: num < 0 ? [6, 0, 0, 6] : [0, 6, 6, 0],
      },
    };
  });
  const { min, max } = computeAxisBounds(values);
  const hasNegative = min < 0;

  return {
    backgroundColor: "transparent",
    animationDuration: 450,
    grid: { left: hasNegative ? 56 : 42, right: 80, top: 14, bottom: 22, containLabel: false },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: { color: softColor },
      },
      backgroundColor: TOOLTIP_BG,
      borderColor: glowColor,
      borderWidth: 1,
      textStyle: { color: "#FFFFFF", fontSize: 12, fontFamily: "'GE Inter', 'Inter', sans-serif" },
      valueFormatter: (_v: number, dataIndex?: number) => {
        const raw = (dataIndex != null && values[dataIndex] != null) ? values[dataIndex]! : Number(_v);
        return fmtShort(raw, unit);
      },
    },
    xAxis: {
      type: "value",
      min,
      max,
      axisLabel: {
        color: AXIS,
        fontSize: 11,
        fontFamily: "'GE Inter', 'Inter', sans-serif",
        formatter: (val: number) => {
          if (val === 0) return "0";
          const sign = val < 0 ? "-" : "";
          const abs = Math.abs(val);
          if (abs >= 1000) return `${sign}${abs / 1000}k`;
          if (abs >= 100) return `${sign}${Math.round(abs)}`;
          if (abs >= 10) return `${sign}${Number(abs.toFixed(1))}`;
          if (abs >= 1) return `${sign}${Number(abs.toFixed(2))}`;
          return `${sign}${Number(abs.toFixed(3))}`;
        },
      },
      splitLine: {
        lineStyle: {
          color: GRID,
          type: "dashed",
        },
      },
      axisLine: { show: hasNegative, lineStyle: { color: "rgba(255,255,255,0.25)" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        color: primaryColor,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'GE Inter', 'Inter', sans-serif",
        margin: 10,
      },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.15)" } },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    series: [
      {
        name: "Metric",
        type: "bar",
        data,
        barMaxWidth: 16,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: softColor },
              { offset: 0.5, color: midColor },
              { offset: 1, color: primaryColor },
            ],
          },
          shadowColor: glowColor,
          shadowBlur: 8,
        },
        label: {
          show: true,
          position: "right",
          color: labelColor,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'GE Inter', 'Inter', sans-serif",
          distance: 8,
          formatter: (params: { dataIndex: number; value: number }) => {
            const raw = values[params.dataIndex];
            if (raw == null || !Number.isFinite(raw) || raw === 0) return "";
            return fmtShort(raw, unit);
          },
        },
      },
    ],
  };
}

type TimeDomainMetricKey = "response" | "rise" | "peakKa";

const TIME_DOMAIN_METRIC_TABS: Array<{
  id: TimeDomainMetricKey;
  label: string;
  unit: string;
  description: string;
}> = [
  { id: "response", label: "Response", unit: "ms", description: "Time to first detectable response onset" },
  { id: "rise", label: "Rise", unit: "ms", description: "Time to 90% first-cycle peak" },
  { id: "peakKa", label: "Peak (kA)", unit: "kA", description: "Peak overshoot magnitude" },
];

export function StabilityCompareAnalytics({ parseCsv, cfgSpecs }: CompareAnalyticsProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["CFG1", "CFG2", "CFG5", "CFG9", "CFG11"]),
  );
  const [loading, setLoading] = useState(false);
  const [ipMetric, setIpMetric] = useState<TimeDomainMetricKey>("response");
  const [iqMetric, setIqMetric] = useState<TimeDomainMetricKey>("response");
  const [rows, setRows] = useState<CfgMetrics[]>(() => {
    const initialKeys = ["CFG1", "CFG2", "CFG5", "CFG9", "CFG11"];
    return initialKeys
      .map((k): CfgMetrics | null => {
        const found = PRECOMPUTED_METRICS[k];
        if (!found) return null;
        const cigreIp = getCigreResponseMetrics(k, "phase_jump");
        const cigreIq = getCigreResponseMetrics(k, "voltage_step");
        return {
          ...found,
          tdIp: cigreIp ?? found.tdIp ?? found.td ?? null,
          tdIq: cigreIq ?? found.tdIq ?? found.td ?? null,
        };
      })
      .filter((r): r is CfgMetrics => r != null);
  });

  const activeKeys = useMemo(() => {
    return [...selected].sort(
      (a, b) => Number(a.replace("CFG", "")) - Number(b.replace("CFG", "")),
    );
  }, [selected]);

  const reload = useCallback(async () => {
    if (!activeKeys.length) {
      setRows([]);
      return;
    }

    const directRows: CfgMetrics[] = [];
    const missingKeys: string[] = [];

    for (const key of activeKeys) {
      const found = PRECOMPUTED_METRICS[key];
      if (found) {
        const cigreIp = getCigreResponseMetrics(key, "phase_jump");
        const cigreIq = getCigreResponseMetrics(key, "voltage_step");
        directRows.push({
          ...found,
          tdIp: cigreIp ?? found.tdIp,
          tdIq: cigreIq ?? found.tdIq,
        });
      } else {
        missingKeys.push(key);
      }
    }

    if (!missingKeys.length) {
      setRows(directRows);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const fetched = await Promise.all(
        missingKeys.map((id) => loadCfgMetrics(id, parseCsv, cfgSpecs)),
      );
      setRows([...directRows, ...fetched]);
    } catch (err) {
      console.error("Failed to load metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [activeKeys, cfgSpecs, parseCsv]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = (cfg: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cfg)) next.delete(cfg);
      else next.add(cfg);
      return next;
    });
  };

  const selectAll111 = () => setSelected(new Set(CFG1_11));
  const clear111 = () => setSelected(new Set());

  const labels = rows.map((r) => r.cfgId.replace("CFG", ""));
  const scVals = rows.map((r) => r.scPu);
  const inertiaVals = rows.map((r) => r.inertiaMWs);

  const ipActiveTab = TIME_DOMAIN_METRIC_TABS.find((t) => t.id === ipMetric) ?? TIME_DOMAIN_METRIC_TABS[0];
  const iqActiveTab = TIME_DOMAIN_METRIC_TABS.find((t) => t.id === iqMetric) ?? TIME_DOMAIN_METRIC_TABS[0];

  const ipVals = useMemo(() => {
    return rows.map((r) => {
      if (ipMetric === "response") return r.tdIp?.responseTimeMs ?? r.td?.responseTimeMs ?? null;
      if (ipMetric === "rise") return r.tdIp?.riseTimeMs ?? r.td?.riseTimeMs ?? null;
      if (ipMetric === "peakKa") return r.tdIp?.peakOvershootPu ?? r.td?.peakOvershootPu ?? null;
      return null;
    });
  }, [rows, ipMetric]);

  const iqVals = useMemo(() => {
    return rows.map((r) => {
      if (iqMetric === "response") return r.tdIq?.responseTimeMs ?? r.td?.responseTimeMs ?? null;
      if (iqMetric === "rise") return r.tdIq?.riseTimeMs ?? r.td?.riseTimeMs ?? null;
      if (iqMetric === "peakKa") return r.tdIq?.peakOvershootPu ?? r.td?.peakOvershootPu ?? null;
      return null;
    });
  }, [rows, iqMetric]);

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 text-white font-sans">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/35 backdrop-blur-md px-4 py-2 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-sans font-bold text-[#C8FF08] uppercase tracking-wider">
              CFG COMPARE METRICS
            </h3>
            <span className="text-xs text-white/40">|</span>
            <p className="text-xs text-white/80 truncate font-sans">
              SCL (kA) @ tf+0.04 · Inertia (MW.s) · Ip Time Domain (ø) · Iq Time Domain (V)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {loading && (
            <span className="text-xs text-[#C8FF08] animate-pulse font-bold px-2">Loading…</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] gap-2.5">
        <aside className="min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border border-white/15 bg-black/35 backdrop-blur-md p-3 flex flex-col gap-2.5 shadow-sm custom-scrollbar">
          <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-1.5 shrink-0">
            <div className="text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-[#C8FF08]">
              Configurations
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={selectAll111}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
              >
                All
              </button>
              <button
                type="button"
                onClick={clear111}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/60 font-bold mb-1.5">
              With Details · CFG 1–11
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {CFG1_11.map((cfg) => {
                const on = selected.has(cfg);
                const cap = cfgAnalyticsCaption(cfg, cfgSpecs);
                return (
                  <button
                    key={cfg}
                    type="button"
                    onClick={() => toggle(cfg)}
                    aria-pressed={on}
                    title={`${cfg} · Base ${cap.base} · ${cap.detail}`}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-all border cursor-pointer overflow-hidden ${
                      on
                        ? "bg-[#004745]/90 border-[#C8FF08]/80 text-white shadow-[0_0_12px_rgba(200,255,8,0.25)]"
                        : "bg-black/30 border-white/10 text-white/70 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2 min-w-0">
                      <span className="text-xs sm:text-sm font-mono font-bold shrink-0">
                        {cfg.replace("CFG", "")}
                      </span>
                      <span className="text-xs font-mono font-bold tabular-nums text-[#C8FF08] shrink-0">
                        {cap.base}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs font-sans leading-snug text-white/80 line-clamp-2 break-words">
                      {cap.detail}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2.5">
          <ChartPanel
            title="Inertia"
            subtitle="Stored kinetic energy (MW.s)"
            loading={loading && !labels.length}
          >
            {labels.length ? (
              <ReactECharts
                option={horizontalBarOption(labels, inertiaVals, "MW.s", "lime")}
                style={{ height: "100%", width: "100%", minHeight: 180 }}
                opts={{ renderer: "canvas" }}
                notMerge
              />
            ) : (
              <EmptyPick />
            )}
          </ChartPanel>

          <ChartPanel
            title="SCL (kA)"
            subtitle="Iq_GEP_kA Main @ tf+0.04 s"
            loading={loading && !labels.length}
          >
            {labels.length ? (
              <ReactECharts
                option={horizontalBarOption(labels, scVals, "kA", "lime")}
                style={{ height: "100%", width: "100%", minHeight: 180 }}
                opts={{ renderer: "canvas" }}
                notMerge
              />
            ) : (
              <EmptyPick />
            )}
          </ChartPanel>

          <ChartPanel
            title="Ip Time Domain"
            subtitle={`${ipActiveTab.label} · Phase Jump (ø) disturbance`}
            loading={loading && !labels.length}
            headerAction={
              <div className="flex items-center gap-0.5 bg-black/75 p-0.5 rounded-lg border border-white/20 backdrop-blur-md shadow-sm">
                {TIME_DOMAIN_METRIC_TABS.map((tab) => {
                  const active = ipMetric === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setIpMetric(tab.id)}
                      className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                        active
                          ? "bg-primary/30 text-[#C8FF08] border border-[#C8FF08]/60 shadow-[0_0_8px_rgba(200,255,8,0.3)]"
                          : "text-white/70 hover:text-white border border-transparent"
                      }`}
                      title={`${tab.label} — ${tab.description}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            }
          >
            {labels.length ? (
              <ReactECharts
                option={horizontalBarOption(labels, ipVals, ipActiveTab.unit, "evergreen")}
                style={{ height: "100%", width: "100%", minHeight: 180 }}
                opts={{ renderer: "canvas" }}
                notMerge
              />
            ) : (
              <EmptyPick />
            )}
          </ChartPanel>

          <ChartPanel
            title="Iq Time Domain"
            subtitle={`${iqActiveTab.label} · Voltage Step (V) disturbance`}
            loading={loading && !labels.length}
            headerAction={
              <div className="flex items-center gap-0.5 bg-black/75 p-0.5 rounded-lg border border-white/20 backdrop-blur-md shadow-sm">
                {TIME_DOMAIN_METRIC_TABS.map((tab) => {
                  const active = iqMetric === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setIqMetric(tab.id)}
                      className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                        active
                          ? "bg-primary/30 text-[#C8FF08] border border-[#C8FF08]/60 shadow-[0_0_8px_rgba(200,255,8,0.3)]"
                          : "text-white/70 hover:text-white border border-transparent"
                      }`}
                      title={`${tab.label} — ${tab.description}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            }
          >
            {labels.length ? (
              <ReactECharts
                option={horizontalBarOption(labels, iqVals, iqActiveTab.unit, "evergreen")}
                style={{ height: "100%", width: "100%", minHeight: 180 }}
                opts={{ renderer: "canvas" }}
                notMerge
              />
            ) : (
              <EmptyPick />
            )}
          </ChartPanel>
        </section>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
  loading,
  headerAction,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  loading?: boolean;
  headerAction?: React.ReactNode;
}) {
  return (
    <div
      className={`relative min-h-0 rounded-xl border border-white/15 bg-black/35 backdrop-blur-md overflow-hidden shadow-sm flex flex-col ${
        loading ? "animate-pulse" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8FF08]/40 to-transparent" />
      
      {/* Integrated Header Bar with border separator */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-2.5 pb-2 border-b border-white/10 shrink-0 bg-white/[0.02]">
        <div className="min-w-0 flex flex-col">
          <h4 className="font-sans font-bold text-xs sm:text-sm uppercase tracking-wider text-white truncate">
            {title}
          </h4>
          <span className="font-sans text-[11px] text-[#96BDBD] font-medium truncate">
            {subtitle}
          </span>
        </div>
        {headerAction && (
          <div className="shrink-0 flex items-center">
            {headerAction}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 w-full h-full">
        {children}
      </div>
    </div>
  );
}

function EmptyPick() {
  return (
    <div className="h-full min-h-[140px] flex flex-col items-center justify-center gap-1.5 text-center px-6 font-sans">
      <div className="h-8 w-8 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center">
        <span className="text-primary text-xs font-bold">+</span>
      </div>
      <div className="text-xs font-bold text-white/80">No CFGs selected</div>
      <div className="text-xs text-white/60 max-w-[14rem]">
        Pick one or more configurations on the left to plot SCL, Inertia, and Time Domain
      </div>
    </div>
  );
}
