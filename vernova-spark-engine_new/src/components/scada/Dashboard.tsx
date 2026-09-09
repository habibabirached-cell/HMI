import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GridPlantIcon,
  TransformerIcon,
  TowerIcon,
  WindIcon,
  WindFarmIcon,
  SolarIcon,
  GeneratorIcon,
  CapacitorIcon,
  LoadIcon,
  BatteryIcon,
  StatcomIcon,
  SynConIcon,
} from "@/components/scada/icons";
import { ScadaDropdown } from "@/components/scada/Dropdown";
import { EventsPanel } from "@/components/scada/EventsPanel";
import { MetricPanel } from "@/components/scada/MetricPanel";
import { NetworkDiagram, type NetworkModel } from "@/components/scada/NetworkDiagram";
import { AnalyticsPanel } from "@/components/scada/AnalyticsPanel";
import { UseCaseAdminModal } from "@/components/scada/UseCaseAdminModal";
import { buildSeries, csvToRows, rowsToCsv } from "@/lib/simData";
import { simulation, type SimRow } from "@/data/simulation";
import { fetchCsvRows, findEventOffset, parseClientCsv } from "@/lib/csvParser";
import { getLibraryForHybrid } from "@/lib/hybridConfig";
import { getNetworkLayout, saveNetworkLayout } from "@/lib/networkStore";
import { canAddComponent, resolveActiveUseCase } from "@/lib/useCaseStore";
import type { HybridType, PlacedComponent, Connection, UseCase } from "@/lib/types";
import { Download, Upload, X, AlertCircle, Maximize2, BarChart2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/scada/DashboardHeader";
import { ScadaAccordion } from "@/components/scada/ScadaAccordion";
import { HelpModal } from "@/components/scada/HelpModal";
import { FullscreenOverlay } from "@/components/scada/FullscreenOverlay";

const MODEL_OPTS = [
  { value: "SMIB", label: "SMIB" },
  { value: "MMI", label: "MMIB" },
  { value: "TWOAREA", label: "Two-Area" },
];
const HYBRID_OPTS = [
  { value: "GFMe", label: "GFM e-STATCOM" },
  { value: "GFM", label: "GFM STATCOM" },
  { value: "SynCon", label: "SynCon" },
];

const SPIN_ICONS = new Set(["wind", "windfarm", "solar", "generator", "syncon"]);

const PCC_POS: Record<NetworkModel, { x: number; y: number; label: string }> = {
  SMIB: { x: 61, y: 45, label: "PCC" },
  MMI: { x: 59, y: 44, label: "PCC" },
  TWOAREA: { x: 57.6, y: 33, label: "B3 (PCC)" },
};

const ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  grid: GridPlantIcon,
  transformer: TransformerIcon,
  tower: TowerIcon,
  wind: WindIcon,
  windfarm: WindFarmIcon,
  solar: SolarIcon,
  generator: GeneratorIcon,
  capacitor: CapacitorIcon,
  load: LoadIcon,
  battery: BatteryIcon,
  statcom: StatcomIcon,
  syncon: SynConIcon,
  cb: (props) => (
    <svg viewBox="0 0 18 18" width={18} height={18} {...props}>
      <rect width={18} height={18} className="fill-status-off" />
    </svg>
  ),
};

const EVENT_LOG = [
  { label: "Line Trip", loc: "B3-B4", status: "Cleared" },
  { label: "Load Change", loc: "B4", status: "Active" },
  { label: "P Q Change", loc: "PCC", status: "Active" },
  { label: "3-ph Fault", loc: "B5", status: "Cleared" },
  { label: "Generator Trip", loc: "B7", status: "Active" },
];

interface DragState { id: string; moved: boolean; startX: number; startY: number; }

export function Dashboard() {
  const [model, setModel] = useState<NetworkModel>("SMIB");
  const [hybrid, setHybrid] = useState<HybridType>("GFMe");
  const [event, setEvent] = useState<string | null>(null);
  const [cbOn, setCbOn] = useState(true);
  const [tick, setTick] = useState(0);
  const [editMode, setEditMode] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark"; // Default to dark mode
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);
  const [animate, setAnimate] = useState(true);
  const [animOff, setAnimOff] = useState<Record<string, boolean>>({});
  const [wireFrom, setWireFrom] = useState<string | null>(null);
  const [wireMouse, setWireMouse] = useState<{ x: number; y: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const [rows, setRows] = useState<SimRow[]>(simulation);
  const [useRawData, setUseRawData] = useState(false);
  const [matchedUseCase, setMatchedUseCase] = useState<UseCase | null>(null);
  const [playbackOffset, setPlaybackOffset] = useState(0);
  const [eventPlaying, setEventPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [fullView, setFullView] = useState<"diagram" | "graphs" | null>(null);

  const [placedByModel, setPlacedByModel] = useState<Record<string, PlacedComponent[]>>({});
  const [connsByModel, setConnsByModel] = useState<Record<string, Connection[]>>({});
  const [pccGain, setPccGain] = useState({ p: 1, q: 1, v: 1 });

  const dragRef = useRef<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const layoutLoaded = useRef<Set<string>>(new Set());

  const library = useMemo(() => getLibraryForHybrid(hybrid), [hybrid]);
  const placed = placedByModel[model] ?? [];
  const conns = connsByModel[model] ?? [];
  const placedIcons = useMemo(() => placed.map((p) => p.icon), [placed]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load saved layout when switching network model (empty by default — SVG is the diagram)
  // Load saved layout when switching network model (empty by default — SVG is the diagram)
  useEffect(() => {
    if (!layoutLoaded.current.has(model)) {
      const layout = getNetworkLayout(model);
      setPlacedByModel((m) => ({ ...m, [model]: layout.placed }));
      setConnsByModel((m) => ({ ...m, [model]: layout.connections }));
      layoutLoaded.current.add(model);
    }
  }, [model]);

  // Resolve use case + load CSV whenever network, hybrid, or placed components change
  useEffect(() => {
    const uc = resolveActiveUseCase(model, hybrid, placedIcons);
    setMatchedUseCase(uc);
    if (!uc) {
      setUseRawData(false);
      setRows(simulation);
      return;
    }
    let cancelled = false;
    setCsvLoading(true);
    fetchCsvRows(uc.csvPath)
      .then((data) => {
        if (cancelled || !data.length) return;
        setRows(data);
        setUseRawData(true);
        setPlaybackOffset(0);
        setTick(0);
      })
      .catch(() => showToast("Failed to load use-case CSV."))
      .finally(() => { if (!cancelled) setCsvLoading(false); });
    return () => { cancelled = true; };
  }, [model, hybrid, placedIcons.join(","), showToast]);

  function handleModelChange(v: NetworkModel) {
    setModel(v);
    setEvent(null);
    setEventPlaying(false);
    setPlaybackOffset(0);
    setTick(0);
    setCbOn(true);
  }

  function handleHybridChange(v: string) {
    setHybrid(v as HybridType);
    setEvent(null);
    setEventPlaying(false);
    setPlaybackOffset(0);
    setTick(0);
  }

  // Live playback tick
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const windowSize = 40;
  const maxOffset = Math.max(0, rows.length - windowSize);
  const rollingOffset = useMemo(
    () => (maxOffset === 0 ? 0 : (playbackOffset + tick * 4) % (maxOffset + 1)),
    [tick, maxOffset, playbackOffset],
  );

  const playbackTime = rows[rollingOffset]?.t ?? 0;

  const opts = {
    model, hybrid, cbOn, event: useRawData ? null : event,
    offset: rollingOffset, windowSize, rows, pccGain, useRawData,
  };
  const grid = useMemo(() => buildSeries("gep", opts), [model, hybrid, cbOn, event, rollingOffset, rows, pccGain, useRawData]);
  const wind = useMemo(() => buildSeries("rs", opts), [model, hybrid, cbOn, event, rollingOffset, rows, pccGain, useRawData]);

  const eventMarkers = matchedUseCase?.events ?? [];

  function saveLayout() {
    saveNetworkLayout(model, { placed, connections: conns });
    showToast(`${model} network layout saved as default.`);
  }

  function addComponent(item: { key: string; label: string; icon: string }) {
    const check = canAddComponent(model, hybrid, placedIcons, item.icon);
    if (!check.allowed) {
      showToast(check.message ?? "Component not allowed.");
      return;
    }
    if (!editMode) setEditMode(true);
    const id = `${item.key}-${Date.now()}`;
    const n = placed.length;
    const x = 26 + (n % 5) * 12;
    const y = 78 + Math.floor(n / 5) * 9;
    setPlacedByModel((m) => ({
      ...m,
      [model]: [...(m[model] ?? []), { id, label: item.label, icon: item.icon, x, y }],
    }));
  }

  function removeComponent(id: string) {
    setPlacedByModel((m) => ({ ...m, [model]: (m[model] ?? []).filter((c) => c.id !== id) }));
    setConnsByModel((m) => ({
      ...m,
      [model]: (m[model] ?? []).filter((c) => c.from !== id && c.to !== id),
    }));
    if (wireFrom === id) { setWireFrom(null); setWireMouse(null); }
    setCtxMenu(null);
  }

  function toggleAnimOff(id: string) {
    setAnimOff((a) => ({ ...a, [id]: !a[id] }));
    setCtxMenu(null);
  }

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



  function startWire(nodeId: string) { setWireFrom(nodeId); setWireMouse(null); }
  function completeWire(nodeId: string) {
    if (!wireFrom || wireFrom === nodeId) { setWireFrom(null); setWireMouse(null); return; }
    setConnsByModel((m) => {
      const list = m[model] ?? [];
      const dup = list.some((c) => (c.from === wireFrom && c.to === nodeId) || (c.from === nodeId && c.to === wireFrom));
      if (dup) return m;
      return { ...m, [model]: [...list, { id: `c-${Date.now()}`, from: wireFrom, to: nodeId }] };
    });
    setWireFrom(null);
    setWireMouse(null);
  }
  function cancelWire() { setWireFrom(null); setWireMouse(null); }
  function removeConn(id: string) {
    setConnsByModel((m) => ({ ...m, [model]: (m[model] ?? []).filter((c) => c.id !== id) }));
  }

  function getConnectionPoint(nodeId: string, otherNodeOrPos: string | { y: number }): { x: number; y: number } | null {
    const c = placed.find((p) => p.id === nodeId);
    if (!c) return null;
    
    if (c.id.startsWith("pcc")) {
      let targetY = c.y;
      if (typeof otherNodeOrPos === "string") {
        const other = placed.find((p) => p.id === otherNodeOrPos);
        if (other) targetY = other.y;
      } else if (otherNodeOrPos && typeof otherNodeOrPos.y === "number") {
        targetY = otherNodeOrPos.y;
      }
      const top = c.y - 18; // h-40 is 160px height. 160/440 * 100 = 36% total height. Half is 18%.
      const bottom = c.y + 18;
      const connectY = Math.max(top, Math.min(bottom, targetY));
      return { x: c.x, y: connectY };
    }
    
    return { x: c.x, y: c.y };
  }

  function nodePos(id: string): { x: number; y: number } | null {
    const c = placed.find((p) => p.id === id);
    return c ? { x: c.x, y: c.y } : null;
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (e.button === 2) return;
    setCtxMenu(null);
    if (!editMode || wireFrom) return;
    const target = (e.target as HTMLElement).closest("[data-placed-id]") as HTMLElement | null;
    if (!target) return;
    dragRef.current = { id: target.dataset.placedId!, moved: false, startX: e.clientX, startY: e.clientY };
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (wireFrom) {
      const box = canvasRef.current?.getBoundingClientRect();
      if (box) setWireMouse({ x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100 });
    }
    const d = dragRef.current;
    if (!d) return;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.sqrt(dx * dx + dy * dy) > 4) d.moved = true;
    if (!d.moved) return;
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    
    const constrainedX = Math.max(2, Math.min(96, x));
    const constrainedY = Math.max(4, Math.min(94, y));

    setPlacedByModel((m) => ({
      ...m,
      [model]: (m[model] ?? []).map((c) =>
        c.id === d.id ? { ...c, x: constrainedX, y: constrainedY } : c,
      ),
    }));
  }

  function onCanvasPointerUp(e: React.PointerEvent) {
    if (e.button === 2) return;
    dragRef.current = null;
  }

  function onComponentContextMenu(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ id, x: e.clientX, y: e.clientY });
  }

  const flowActive = animate && cbOn;
  const pcc = placed.find((p) => p.id.startsWith("pcc") || p.id.startsWith("grid"));

  return (
    <main className="min-h-screen bg-grid-bg px-4 py-3 text-foreground">
      <UseCaseAdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-lg border border-lime/50 bg-popover px-4 py-2 text-sm shadow-xl">
          <AlertCircle className="h-4 w-4 shrink-0 text-lime" />
          {toast}
        </div>
      )}

      {ctxMenu && (
        <div
          className="fixed z-50 rounded-lg border border-border bg-popover py-1 text-sm shadow-xl"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            className="block w-full px-4 py-1.5 text-left hover:bg-panel"
            onClick={() => toggleAnimOff(ctxMenu.id)}
          >
            {animOff[ctxMenu.id] ? "Animation On" : "Animation Off"}
          </button>
          {editMode && (
            <button
              className="block w-full px-4 py-1.5 text-left text-status-off hover:bg-panel"
              onClick={() => removeComponent(ctxMenu.id)}
            >
              Remove component
            </button>
          )}
        </div>
      )}

      <DashboardHeader
        matchedUseCaseName={matchedUseCase?.name}
        csvLoading={csvLoading}
        editMode={editMode}
        onToggleEdit={() => setEditMode((s) => !s)}
        onSave={saveLayout}
        onOpenSettings={() => setAdminOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        cbOn={cbOn}
        onToggleCb={() => setCbOn((s) => !s)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        model={model}
        hybrid={hybrid}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2.5">
          <ScadaDropdown title="Network Model" options={MODEL_OPTS} value={model} onChange={(v) => handleModelChange(v as NetworkModel)} />
          <ScadaDropdown title="Hybrid" options={HYBRID_OPTS} value={hybrid} onChange={handleHybridChange} />

          <Link
            to="/analytics"
            search={{ model, hybrid }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-2.5 text-center text-xs font-bold text-primary-foreground shadow-lg shadow-lime/20 transition-all hover:bg-lime/90 hover:scale-[1.01]"
          >
            <BarChart2 className="h-4 w-4" /> View Analytics Page
          </Link>

          <ScadaAccordion
            label="Component Library"
            selectedLabel={`${library.length} components`}
            open={libOpen}
            onToggle={() => setLibOpen((o) => !o)}
          >
            <div className="grid grid-cols-2 gap-1.5 px-1 pb-1">
              {library.map((it) => {
                const Icon = ICONS[it.icon] ?? StatcomIcon;
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => addComponent(it)}
                    title={`Add ${it.label}`}
                    className="group flex flex-col items-center gap-1 rounded-lg border border-border/40 bg-background/20 px-1 py-2 text-[11px] font-semibold text-foreground/85 transition-all hover:border-lime/50 hover:bg-lime/5 hover:text-lime"
                  >
                    {it.icon === "wind" ? (
                      <WindIcon className="h-7 w-7 text-current transition-transform group-hover:scale-105" bladeClass="anim-spin" />
                    ) : (
                      <Icon className="h-7 w-7 text-current transition-transform group-hover:scale-105" />
                    )}
                    <span className="truncate text-center leading-tight">{it.label}</span>
                  </button>
                );
              })}
            </div>
          </ScadaAccordion>
        </aside>

        <section className="space-y-3">
          <div
            ref={canvasRef}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => { if (editMode) e.preventDefault(); }}
            className={`relative h-[440px] overflow-hidden rounded-xl border border-border bg-grid-bg p-2 ${
              flowActive ? "flow-on" : ""
            } ${editMode ? "ring-2 ring-lime/60" : ""} ${wireFrom ? "cursor-crosshair" : ""}`}
          >
            <button
              type="button"
              onClick={() => setFullView("diagram")}
              className="absolute right-2 top-2 z-30 rounded-md bg-panel/90 p-1.5 text-foreground/70 shadow hover:text-lime"
              title="Full view"
              aria-label="Open network diagram full view"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <NetworkDiagram model={model} cbOn={cbOn} editMode={true} />

            {(editMode || conns.length > 0) && (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`pointer-events-none absolute inset-0 h-full w-full text-lime ${flowActive ? "conn-animated" : ""}`}>
                {conns.map((c) => {
                  const a = getConnectionPoint(c.from, c.to);
                  const b = getConnectionPoint(c.to, c.from);
                  if (!a || !b) return null;
                  return (
                    <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="conn-line" stroke="currentColor" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
                  );
                })}
                {wireFrom && wireMouse && getConnectionPoint(wireFrom, wireMouse) && (
                  (() => {
                    const fromPos = getConnectionPoint(wireFrom, wireMouse)!;
                    return (
                      <line x1={fromPos.x} y1={fromPos.y} x2={wireMouse.x} y2={wireMouse.y} stroke="white" strokeWidth={0.6} strokeDasharray="3 3" opacity={0.7} vectorEffect="non-scaling-stroke" />
                    );
                  })()
                )}
              </svg>
            )}

            {editMode && conns.map((c) => {
              const a = getConnectionPoint(c.from, c.to);
              const b = getConnectionPoint(c.to, c.from);
              if (!a || !b) return null;
              return (
                <button key={`del-${c.id}`} onClick={() => removeConn(c.id)} title="Remove connection"
                  style={{ left: `${(a.x + b.x) / 2}%`, top: `${(a.y + b.y) / 2}%` }}
                  className="absolute z-20 grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-status-off text-destructive-foreground">
                  <X className="h-2.5 w-2.5" />
                </button>
              );
            })}

            {pcc && (
              <div style={{ left: `${pcc.x}%`, top: `${pcc.y}%` }} className="group absolute z-10 -translate-x-1/2 -translate-y-1/2">
                <button className="h-12 w-8 cursor-help rounded" aria-label="PCC telemetry" />
                <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-44 -translate-x-1/2 rounded-lg border border-lime/50 bg-popover p-2 text-[11px] shadow-xl group-hover:block">
                  <div className="mb-1 font-bold text-lime">{pcc.label} — live CSV</div>
                  <div className="flex justify-between"><span>P</span><span className="tabular-nums">{grid.last?.p.toFixed(1)} MW</span></div>
                  <div className="flex justify-between"><span>Q</span><span className="tabular-nums">{grid.last?.q.toFixed(1)} MVAR</span></div>
                  <div className="flex justify-between"><span>V</span><span className="tabular-nums">{grid.last?.v.toFixed(3)} pu</span></div>
                  <div className="flex justify-between"><span>f</span><span className="tabular-nums">{grid.last?.f.toFixed(2)} Hz</span></div>
                </div>
              </div>
            )}

            {placed.map((c) => {
              const isPcc = c.id.startsWith("pcc");
              const Icon = ICONS[c.icon] ?? StatcomIcon;
              const off = animOff[c.id];
              const spin = !off && animate && SPIN_ICONS.has(c.icon);
              const pulse = !off && animate && !SPIN_ICONS.has(c.icon);
              const isWireSource = wireFrom === c.id;
              const isWireTarget = !!(wireFrom && wireFrom !== c.id);

              if (isPcc) {
                return (
                  <div
                    key={c.id}
                    data-placed-id={c.id}
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    onContextMenu={(e) => onComponentContextMenu(e, c.id)}
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none flex flex-col items-center transition-all ${
                      isWireSource ? "ring-2 ring-white/60"
                      : isWireTarget ? "cursor-pointer ring-1 ring-lime/40"
                      : editMode ? "cursor-grab" : ""
                    }`}
                  >
                    {/* Glowing vertical bar */}
                    <div className={`w-2 h-40 rounded bg-lime shadow-[0_0_12px_var(--lime)] ${editMode ? "border border-white/20" : ""}`} />
                    <div className="absolute top-1/2 left-4 -translate-y-1/2 whitespace-nowrap bg-panel/90 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider text-lime border border-lime/30">
                      {c.label}
                    </div>

                    {editMode && !wireFrom && (
                      <>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeComponent(c.id); }}
                          className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-status-off text-destructive-foreground" title="Remove">
                          <X className="h-3 w-3" />
                        </button>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); startWire(c.id); }}
                          className="absolute -left-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-lime text-[9px] font-bold text-primary-foreground" title="Connect">⚡</button>
                      </>
                    )}
                    {editMode && isWireTarget && (
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); completeWire(c.id); }}
                        className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lime px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-lg">
                        Connect here
                      </button>
                    )}
                    {editMode && isWireSource && (
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); cancelWire(); }}
                        className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-status-off px-2 py-0.5 text-[9px] font-bold text-destructive-foreground shadow-lg">
                        Cancel
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={c.id}
                  data-placed-id={c.id}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  onContextMenu={(e) => onComponentContextMenu(e, c.id)}
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none rounded-lg border px-2 py-1 text-center transition-all ${
                    isWireSource ? "border-white bg-panel ring-2 ring-white/60"
                    : isWireTarget ? "border-lime/60 bg-panel ring-1 ring-lime/40 cursor-pointer"
                    : editMode ? "cursor-grab border-lime bg-panel hover:ring-1 hover:ring-lime"
                    : "border-transparent"
                  }`}
                >
                  {c.icon === "wind" ? (
                    <WindIcon className="mx-auto h-8 w-8 text-diagram-line" bladeClass={spin ? "anim-spin" : pulse ? "anim-pulse" : ""} />
                  ) : (
                    <Icon className={`mx-auto h-8 w-8 text-diagram-line ${spin ? "anim-spin" : pulse ? "anim-pulse" : ""}`} />
                  )}
                  <div className="text-[11px] font-semibold text-label-lime">{c.label}</div>
                  {off && <div className="text-[9px] text-foreground/40">anim off</div>}

                  {editMode && !wireFrom && (
                    <>
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeComponent(c.id); }}
                        className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-status-off text-destructive-foreground" title="Remove">
                        <X className="h-3 w-3" />
                      </button>
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); startWire(c.id); }}
                        className="absolute -left-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-lime text-[9px] font-bold text-primary-foreground" title="Connect">⚡</button>
                    </>
                  )}
                  {editMode && isWireTarget && (
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); completeWire(c.id); }}
                      className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lime px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-lg">
                      Connect here
                    </button>
                  )}
                  {editMode && isWireSource && (
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); cancelWire(); }}
                      className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-status-off px-2 py-0.5 text-[9px] font-bold text-destructive-foreground shadow-lg">
                      Cancel
                    </button>
                  )}
                </div>
              );
            })}



            {editMode && (
              <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-panel/90 px-3 py-1 text-[11px] text-foreground/70">
                {wireFrom ? "Click 'Connect here' on a target — or 'Cancel'"
                  : "Edit — drag · right-click anim · ⚡ wire · Save to persist"}
              </div>
            )}
          </div>

        </section>
      </div>

      {fullView === "diagram" && (
        <FullscreenOverlay title="Network Diagram — Full View" onClose={() => setFullView(null)}>
          <div className={`relative h-[calc(100vh-120px)] min-h-[500px] overflow-hidden rounded-xl border border-border bg-grid-bg p-4 ${flowActive ? "flow-on" : ""}`}>
            <NetworkDiagram model={model} cbOn={cbOn} />
            {pcc && (
              <div style={{ left: `${pcc.x}%`, top: `${pcc.y}%` }} className="group absolute z-10 -translate-x-1/2 -translate-y-1/2">
                <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-44 -translate-x-1/2 rounded-lg border border-lime/50 bg-popover p-2 text-[11px] shadow-xl">
                  <div className="mb-1 font-bold text-lime">{pcc.label} — live CSV</div>
                  <div className="flex justify-between"><span>P</span><span className="tabular-nums">{grid.last?.p.toFixed(1)} MW</span></div>
                  <div className="flex justify-between"><span>Q</span><span className="tabular-nums">{grid.last?.q.toFixed(1)} MVAR</span></div>
                  <div className="flex justify-between"><span>V</span><span className="tabular-nums">{grid.last?.v.toFixed(3)} pu</span></div>
                  <div className="flex justify-between"><span>f</span><span className="tabular-nums">{grid.last?.f.toFixed(2)} Hz</span></div>
                </div>
              </div>
            )}
          </div>
        </FullscreenOverlay>
      )}

      {fullView === "graphs" && (
        <FullscreenOverlay title="Live Telemetry Graphs — Full View" onClose={() => setFullView(null)}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MetricPanel title="Grid side (GEP)" series={grid} cbOn={cbOn} large />
            <MetricPanel title="Wind farm side (RS)" series={wind} cbOn={cbOn} large />
          </div>
        </FullscreenOverlay>
      )}

      <footer className="ge-brand-footer mt-2">
        <span>
          © 2026 GE Vernova and/or its affiliates. All rights reserved.
        </span>
      </footer>
    </main>
  );
}
