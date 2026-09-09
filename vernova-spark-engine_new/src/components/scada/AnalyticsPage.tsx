import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Maximize2, Zap } from "lucide-react";
import { EventsPanel } from "@/components/scada/EventsPanel";
import { MetricPanel } from "@/components/scada/MetricPanel";
import { AnalyticsPanel } from "@/components/scada/AnalyticsPanel";
import { FullscreenOverlay } from "@/components/scada/FullscreenOverlay";
import { buildSeries } from "@/lib/simData";
import { simulation, type SimRow } from "@/data/simulation";
import { fetchCsvRows, findEventOffset } from "@/lib/csvParser";
import { getNetworkLayout } from "@/lib/networkStore";
import { resolveActiveUseCase } from "@/lib/useCaseStore";
import type { NetworkModel } from "@/components/scada/NetworkDiagram";
import type { HybridType } from "@/lib/types";
import { cn } from "@/lib/utils";

const EVENT_LOG = [
  { label: "Line Trip", loc: "B3-B4", status: "Cleared" },
  { label: "Load Change", loc: "B4", status: "Active" },
  { label: "P Q Change", loc: "PCC", status: "Active" },
  { label: "3-ph Fault", status: "Cleared", loc: "B5" },
  { label: "Generator Trip", status: "Active", loc: "B7" },
];

const panel =
  "rounded-xl border border-white/40 bg-[#163d3d]/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export function AnalyticsPage() {
  const search = useSearch({ from: "/analytics" }) as { model?: NetworkModel; hybrid?: HybridType };
  const model = search.model || "SMIB";
  const hybrid = search.hybrid || "GFMe";

  const [event, setEvent] = useState<string | null>(null);
  const [cbOn, setCbOn] = useState(true);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [useRawData, setUseRawData] = useState(false);
  const [rows, setRows] = useState<SimRow[]>(simulation);
  const [playbackOffset, setPlaybackOffset] = useState(0);
  const [eventPlaying, setEventPlaying] = useState(false);
  const [fullView, setFullView] = useState<"graphs" | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const layout = useMemo(() => getNetworkLayout(model), [model]);
  const placedIcons = useMemo(() => layout.placed.map((p) => p.icon), [layout]);
  const matchedUseCase = useMemo(
    () => resolveActiveUseCase(model, hybrid, placedIcons),
    [model, hybrid, placedIcons],
  );
  const eventMarkers = matchedUseCase?.events ?? [];

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!matchedUseCase) {
      setUseRawData(false);
      setRows(simulation);
      return;
    }
    let cancelled = false;
    setCsvLoading(true);
    fetchCsvRows(matchedUseCase.csvPath)
      .then((data) => {
        if (cancelled || !data.length) return;
        setRows(data);
        setUseRawData(true);
        setPlaybackOffset(0);
        setTick(0);
      })
      .catch(() => showToast("Failed to load use-case CSV."))
      .finally(() => {
        if (!cancelled) setCsvLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchedUseCase, showToast]);

  const windowSize = 40;
  const maxOffset = Math.max(0, rows.length - windowSize);
  const rollingOffset = useMemo(
    () => (maxOffset === 0 ? 0 : (playbackOffset + tick * 4) % (maxOffset + 1)),
    [tick, maxOffset, playbackOffset],
  );

  const playbackTime = rows[rollingOffset]?.t ?? 0;

  const opts = {
    model,
    hybrid,
    cbOn,
    event: useRawData ? null : event,
    offset: rollingOffset,
    windowSize,
    rows,
    pccGain: { p: 1, q: 1, v: 1 },
    useRawData,
  };
  const grid = useMemo(
    () => buildSeries("gep", opts),
    [model, hybrid, cbOn, event, rollingOffset, rows, useRawData],
  );
  const wind = useMemo(
    () => buildSeries("rs", opts),
    [model, hybrid, cbOn, event, rollingOffset, rows, useRawData],
  );

  function triggerEvent(v: string) {
    const next = event === v ? null : v;
    setEvent(next);
    if (v === "LINE_TRIP" || v === "FAULT_3PH" || v === "GEN_TRIP") setCbOn(false);
    else if (next) setCbOn(true);

    if (matchedUseCase && useRawData) {
      const marker = matchedUseCase.events.find((e) => e.type === v);
      if (marker) {
        const offset = findEventOffset(rows, marker.timeSec);
        setPlaybackOffset(offset);
        setEventPlaying(true);
        showToast(`Playing ${marker.label} from t=${marker.timeSec}s`);
      }
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#212121] bg-[radial-gradient(ellipse_at_top,#004745_0%,#002b2a_40%,#212121_100%)] text-white font-sans flex flex-col">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-lg border border-lime/50 bg-[#163d3d] px-4 py-2 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Header — floating header with centered title and GE Inter typography */}
      <header className="flex flex-row items-center justify-between gap-2 sm:gap-3 px-6 md:px-10 pt-6 md:pt-10 pb-2.5 shrink-0 bg-transparent border-b border-white/10 text-white select-none z-30 font-sans">
        <div className="flex shrink-0 items-center justify-start min-w-0 -ml-2.5 sm:-ml-3">
          <Link to="/" className="shrink-0 hover:opacity-90 transition-opacity">
            <img
              src="/logos/ge_vernova_white.svg"
              alt="GE Vernova"
              className="h-12 sm:h-14 md:h-16 lg:h-[68px] w-auto max-w-[260px] sm:max-w-[300px] object-contain object-left"
            />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center min-w-0 px-2">
          <h1 className="font-sans font-extrabold text-sm sm:text-base md:text-lg lg:text-xl text-white uppercase tracking-wider truncate text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            Analytics & Sensitivity Comparison
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-[10px] sm:text-xs text-white/60">
            {model} · {hybrid}
            {csvLoading ? " · loading…" : ""}
          </span>
          <Link
            to="/windfarmstability"
            className="h-9 px-3.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 hover:bg-black/40 hover:border-[#C8FF08]/60 hover:text-[#C8FF08] text-white transition-all shadow-sm group shrink-0 text-xs sm:text-sm font-sans font-medium leading-none"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-[#C8FF08] group-hover:-translate-x-0.5 transition-transform" />
            <span className="leading-none whitespace-nowrap">Back</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 min-h-0 px-6 md:px-10 py-3 grid grid-cols-1 gap-3 lg:grid-cols-[240px_1fr_240px]">
        {/* Left */}
        <aside className="space-y-3">
          <div className={cn(panel, "p-3")}>
            <div className="mb-2 flex items-center justify-between border-b border-white/25 pb-1.5">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-lime">
                Breaker Control
              </h2>
              <span className={cn("h-2 w-2 rounded-full", cbOn ? "bg-lime" : "bg-red-500")} />
            </div>
            <button
              type="button"
              onClick={() => setCbOn((s) => !s)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase transition-all border",
                cbOn
                  ? "bg-lime text-[#005E60] border-lime"
                  : "bg-red-500/20 text-red-300 border-red-400/50",
              )}
            >
              <Zap className="h-4 w-4" /> CB {cbOn ? "ON (Energised)" : "OFF (Tripped)"}
            </button>
          </div>

          <div className={panel}>
            <EventsPanel active={event} onTrigger={triggerEvent} />
          </div>

          <div className={cn(panel, "p-3")}>
            <div className="mb-2 border-b border-white/25 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-lime">
              System Event Log
            </div>
            <div className="space-y-2">
              {EVENT_LOG.map((e, i) => (
                <div key={i} className="border-b border-white/15 pb-2 last:border-b-0 last:pb-0 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-lime">{e.label}</span>
                    <span className={e.status === "Active" ? "text-amber-300" : "text-white/60"}>
                      {e.status}
                    </span>
                  </div>
                  <div className="text-white/50 text-[10px] mt-0.5">Location: {e.loc}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center */}
        <section className="min-w-0">
          <div className={cn(panel, "relative p-3 sm:p-4 h-full")}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold tracking-wide text-white">
                Real-time Oscilloscope Telemetry
              </h2>
              <button
                type="button"
                onClick={() => setFullView("graphs")}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-lime"
              >
                <Maximize2 className="h-3.5 w-3.5" /> Full screen
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <MetricPanel title="Grid side (GEP)" series={grid} cbOn={cbOn} />
              <MetricPanel title="Wind farm side (RS)" series={wind} cbOn={cbOn} />
            </div>
          </div>
        </section>

        {/* Right */}
        <aside>
          <AnalyticsPanel
            useCase={matchedUseCase}
            activeEvent={event}
            eventMarkers={eventMarkers}
            grid={grid}
            wind={wind}
            playbackTime={playbackTime}
            playing={eventPlaying}
          />
        </aside>
      </div>

      {fullView === "graphs" && (
        <FullscreenOverlay
          title="Wind Farm Oscilloscope — Full View"
          onClose={() => setFullView(null)}
        >
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 bg-[#1e4a4a] h-[calc(100vh-100px)] overflow-y-auto">
            <MetricPanel title="Grid side (GEP)" series={grid} cbOn={cbOn} />
            <MetricPanel title="Wind farm side (RS)" series={wind} cbOn={cbOn} />
          </div>
        </FullscreenOverlay>
      )}

      {/* Footer - GE Brand Guidelines compliant (20px box, centered horizontally & vertically) */}
      <footer className="ge-brand-footer">
        <span>
          © 2026 GE Vernova and/or its affiliates. All rights reserved.
        </span>
      </footer>
    </main>
  );
}
