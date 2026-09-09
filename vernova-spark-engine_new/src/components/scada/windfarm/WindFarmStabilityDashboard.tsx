import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  WindFarmHeader,
  WindFarmControlsSubheader,
  WIND_FARM_SOLUTIONS,
  type WindFarmSolutionId,
} from "./WindFarmHeader";
import {
  PlotBox,
  EChartPlotBox,
  loadWindCsv,
  type WindCsvRow,
  type TelemetryPoint,
  type EventMarker,
  useWindFarmPlayback,
  type SystemStatus,
  HoverTooltipCard,
  WIND_SOLUTION_SPECS,
} from "./WindFarmCharts";
import {
  ScrRegulatorSelector,
  FaultRegulatorSelector,
  LoadRegulatorSelector,
} from "./RegulatorSelectors";
import { AnimatedWindmill, WFMS_TURBINE_SLOTS } from "./AnimatedWindmill";
import { WindFarmDebugModal } from "./WindFarmDebugModal";
import { Sliders, Play, Pause, Square, RotateCcw, CheckCircle2, Zap, Activity, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import windFarmStatusConfig from "@/data/windFarmStatusConfig.json";

const SCR_OPTIONS = [1, 1.6, 20] as const;

const FAULTS = [
  { id: "abc", label: "Three phase", short: "ABC" },
  { id: "slg", label: "SLG", short: "SLG" },
  { id: "ll", label: "LL", short: "LL" },
] as const;

const LOADS = ["1 pu", "0.8 pu", "0.6 pu", "0.4 pu", "0.2 pu", "0 pu"] as const;

const DIAGRAM_CONFIG = {
  CFG8: {
    svg: "/svgs/WindFarm/Gridplansinglealign.svg",
    width: 633.15,
    height: 226.06,
    breakerLeft: "67.13%",
    breakerTop: "48.66%",
    turbineSlots: [
      { left: "61.64%", top: "6.54%" },
      { left: "66.59%", top: "6.54%" },
      { left: "70.95%", top: "6.54%" },
    ],
    windFarmHover: { left: "58%", top: "0%", width: "18%", height: "32%" },
    solutionHover: { left: "76%", top: "45%", width: "22%", height: "48%" },
  },
  CFG11: {
    svg: "/svgs/WindFarm/WFM_CFG11.svg",
    width: 633.15,
    height: 226.06,
    breakerLeft: "67.13%",
    breakerTop: "48.66%",
    turbineSlots: [
      { left: "61.64%", top: "6.54%" },
      { left: "66.59%", top: "6.54%" },
      { left: "70.95%", top: "6.54%" },
    ],
    windFarmHover: { left: "58%", top: "0%", width: "18%", height: "32%" },
    solutionHover: { left: "74%", top: "35%", width: "25%", height: "58%" },
  },
} as const;

function StatusPill({ status }: { status: SystemStatus }) {
  const styles: Record<SystemStatus, string> = {
    Normal: "bg-primary/25 text-[#C8FF08] border-[#C8FF08]/60 shadow-[0_0_8px_rgba(200,255,8,0.25)]",
    "Weak Grid Detected":
      "bg-amber-400/25 text-amber-300 border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.35)]",
    "Fault Detected":
      "bg-amber-400/25 text-amber-300 border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.35)]",
    Unstable:
      "bg-red-500/25 text-red-300 border-red-400/60 shadow-[0_0_8px_rgba(239,68,68,0.35)] animate-pulse",
    Anchoring:
      "bg-red-500/25 text-red-300 border-red-400/60 shadow-[0_0_8px_rgba(239,68,68,0.35)] animate-pulse",
    Stable: "bg-primary/25 text-[#C8FF08] border-[#C8FF08]/60 shadow-[0_0_8px_rgba(200,255,8,0.25)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border transition-all whitespace-nowrap",
        styles[status]
      )}
    >
      <span className="w-2 h-2 rounded-full bg-current shrink-0" />
      {status}
    </span>
  );
}

/**
 * Status derivation based on windfarm status.xlsx specification (both CFG8 and CFG11).
 * Matches time from CSV after event is triggered.
 */
function deriveIbrFarmStatusFromConfig(
  side: "left" | "right",
  phase: "IDLE" | "START_LOOP" | "SCR_CHANGE" | "FAULT",
  elapsedCsvSec: number,
  solutionConnected: boolean,
  loadVal: "1" | "0.4",
  scrMode: "none" | "20_1.6" | "20_1.0"
): SystemStatus {
  if (phase === "IDLE" || phase === "START_LOOP") return "Normal";

  const scenarioKey =
    loadVal === "0.4"
      ? "load_0.4_scr_20_1.6"
      : scrMode === "20_1.0"
        ? "load_1.0_scr_20_1.0"
        : "load_1.0_scr_20_1.6";

  const scenario =
    windFarmStatusConfig.scenarios[scenarioKey as keyof typeof windFarmStatusConfig.scenarios];
  if (!scenario) return "Normal";

  const stepList = phase === "FAULT" ? (scenario as any).fault : (scenario as any).scr_change;
  if (!stepList || stepList.length === 0) return "Normal";

  for (const step of stepList) {
    const min = step.minTime;
    const max = step.maxTime ?? Infinity;
    if (elapsedCsvSec >= min && elapsedCsvSec < max) {
      if (side === "left") {
        return step.left as SystemStatus;
      }
      if (solutionConnected) {
        return step.right as SystemStatus;
      }
      return (step.rightWithoutSolution || step.left) as SystemStatus;
    }
  }

  const lastStep = stepList[stepList.length - 1];
  if (side === "left") return lastStep.left as SystemStatus;
  return (solutionConnected ? lastStep.right : (lastStep.rightWithoutSolution || lastStep.left)) as SystemStatus;
}

function snapScr(val: number): number {
  if (val <= 1.3) return 1;
  if (val <= 10) return 1.6;
  return 20;
}

function FaultIndicator({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;
  return (
    <div
      className="absolute left-[46.2%] top-[48%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse z-[20] pointer-events-none"
      title={`Active fault: ${label}`}
    >
      <div className="text-2xl sm:text-3xl drop-shadow-[0_0_10px_rgba(250,204,21,0.95)]">⚡</div>
      <div className="mt-0.5 rounded bg-amber-300 px-2 py-0.5 text-[8px] sm:text-[9px] font-bold text-[#1a1a00] uppercase tracking-wide border border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.5)]">
        {label}
      </div>
    </div>
  );
}

function LoadIndicator({ value, active }: { value: string; active: boolean }) {
  const displayVal = value.includes("pu") ? value : `${value} pu`;
  return (
    <div
      className={cn(
        "rounded px-1.5 py-1 text-center border transition-all pointer-events-none z-[20]",
        active
          ? "bg-amber-300/95 border-amber-100 text-[#1a1a00] shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          : "bg-black/65 border-white/40 text-white"
      )}
      title={`Load = ${displayVal}`}
    >
      <div className="text-[9px] leading-none">▼</div>
      <div className="text-[8px] sm:text-[9px] font-bold leading-tight mt-0.5 whitespace-nowrap">{displayVal}</div>
    </div>
  );
}

export function getWindFarmCsvPaths(
  loadVal: "1" | "0.4",
  scrChange: "none" | "20_1.6" | "20_1.0",
  faultActive: boolean = false,
  solution: WindFarmSolutionId = "CFG8"
): { noGfmePath: string; gfmePath: string } {
  const sol = solution ?? "CFG8";
  if (sol === "CFG11") {
    if (faultActive) {
      return {
        noGfmePath: "/windfarm/CFG11/ONW1xWithoutCFG11/Load_0.4pu_SCR_20_to_1.6_Fault_0.5_Ag.csv",
        gfmePath: "/windfarm/CFG11/ONW1xWithCFG11/Load_0.4pu_SCR_20_to_1.6_Fault_0.5_Ag_withCFG11.csv",
      };
    }
    if (scrChange === "20_1.0") {
      return {
        noGfmePath: "/windfarm/CFG11/ONW1xWithoutCFG11/Load_1pu_SCR_20_to_1.csv",
        gfmePath: "/windfarm/CFG11/ONW1xWithCFG11/Load_1pu_SCR_20_to_1_withCFG11.csv",
      };
    }
    if (loadVal === "0.4") {
      return {
        noGfmePath: "/windfarm/CFG11/ONW1xWithoutCFG11/Load_0.4pu_SCR_20_to_1.6_Fault_0.5_Ag.csv",
        gfmePath: "/windfarm/CFG11/ONW1xWithCFG11/Load_0.4pu_SCR_20_to_1.6_Fault_0.5_Ag_withCFG11.csv",
      };
    }
    return {
      noGfmePath: "/windfarm/CFG11/ONW1xWithoutCFG11/Load_1pu_SCR_20_to_1.6.csv",
      gfmePath: "/windfarm/CFG11/ONW1xWithCFG11/Load_1pu_SCR_20_to_1.6_withCFG11.csv",
    };
  }

  // CFG8
  if (faultActive) {
    return {
      noGfmePath: "/windfarm/CFG8/ONW1xWithoutGFMe/Load_0.4pu_SCR_20_to_1.6_Fault_0.5_Ag.csv",
      gfmePath: "/windfarm/CFG8/ONW1xWithGFMe/Load_0.4pu_SCR_20_to_1.6_Fault_0.5_Ag_withCFG8.csv",
    };
  }
  if (scrChange === "20_1.0") {
    return {
      noGfmePath: "/windfarm/CFG8/ONW1xWithoutGFMe/Load_1pu_SCR_20_to_1.csv",
      gfmePath: "/windfarm/CFG8/ONW1xWithGFMe/Load_1pu_SCR_20_to_1_withCFG8.csv",
    };
  }
  if (loadVal === "0.4") {
    return {
      noGfmePath: "/windfarm/CFG8/ONW1xWithoutGFMe/Load_0.4pu_SCR_20_to_1.6_Fault_0.5_Ag.csv",
      gfmePath: "/windfarm/CFG8/ONW1xWithGFMe/Load_0.4pu_SCR_20_to_1.6_Fault_0.5_Ag_withCFG8.csv",
    };
  }
  return {
    noGfmePath: "/windfarm/CFG8/ONW1xWithoutGFMe/Load_1pu_SCR_20_to_1.6.csv",
    gfmePath: "/windfarm/CFG8/ONW1xWithGFMe/Load_1pu_SCR_20_to_1.6_withCFG8.csv",
  };
}

function findRowIndexByTime(rows: WindCsvRow[], targetTime: number): number {
  if (!rows || rows.length === 0) return 0;
  const idx = rows.findIndex((r) => r.t >= targetTime);
  if (idx >= 0) return idx;
  return Math.max(0, rows.length - 1);
}

export function WindFarmStabilityDashboard() {
  const [loadOption, setLoadOption] = useState<"1" | "0.4">("1");
  const [scrChangeMode, setScrChangeMode] = useState<"none" | "20_1.6" | "20_1.0">("none");
  const [faultActive, setFaultActive] = useState<boolean>(false);
  const [faultBranchRed, setFaultBranchRed] = useState<boolean>(false);
  const [gridOrangePulse, setGridOrangePulse] = useState<boolean>(false);
  const gridPulseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [simPhase, setSimPhase] = useState<"IDLE" | "START_LOOP" | "SCR_CHANGE" | "FAULT">("IDLE");
  const [activeHoverData, setActiveHoverData] = useState<{
    title: string;
    items: Array<{ label: string; value: string; type?: string }>;
    pos: { left: number; top: number };
  } | null>(null);

  const triggerGridOrangePulse = () => {
    if (gridPulseTimerRef.current) {
      clearTimeout(gridPulseTimerRef.current);
      gridPulseTimerRef.current = null;
    }
    setGridOrangePulse(true);
    gridPulseTimerRef.current = setTimeout(() => {
      setGridOrangePulse(false);
      gridPulseTimerRef.current = null;
    }, 2000);
  };

  // When Ag 0.5 pu fault occurs, highlight fault grounding branch in glowing red for 1.4s then return to normal
  useEffect(() => {
    if (faultActive) {
      setFaultBranchRed(true);
      const timer = setTimeout(() => {
        setFaultBranchRed(false);
      }, 1400);
      return () => clearTimeout(timer);
    } else {
      setFaultBranchRed(false);
    }
  }, [faultActive]);

  /** Solution placed on right (from top Solutions bar). Default: CFG8 connected */
  const [selectedSolution, setSelectedSolution] = useState<WindFarmSolutionId | null>("CFG8");
  /** Breaker is always CLOSED (connected). */
  const breakerOpen = false;

  /** Simulation State: IDLE | RUNNING_NORMAL | FAULT_ACTIVE | STABILIZING | STABILIZED */
  const [simState, setSimState] = useState<"IDLE" | "RUNNING_NORMAL" | "FAULT_ACTIVE" | "STABILIZING" | "STABILIZED">("IDLE");
  const [isPaused, setIsPaused] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [simTime, setSimTime] = useState<number>(0);

  /** CSV datasets from public/windfarm */
  const [noGfmeCsv, setNoGfmeCsv] = useState<WindCsvRow[]>([]);
  const [gfmeCsv, setGfmeCsv] = useState<WindCsvRow[]>([]);

  /** Accumulated telemetry points for Left (Without Solution) & Right (With Solution) */
  const [leftPoints, setLeftPoints] = useState<TelemetryPoint[]>([]);
  const [rightPoints, setRightPoints] = useState<TelemetryPoint[]>([]);

  /** Event markers for Left & Right charts */
  const [leftMarkers, setLeftMarkers] = useState<EventMarker[]>([]);
  const [rightMarkers, setRightMarkers] = useState<EventMarker[]>([]);

  const simTimeRef = useRef<number>(0);
  const leftIdxRef = useRef(0);
  const rightIdxRef = useRef(0);
  const eventStartSimTimeRef = useRef<number | null>(null);
  const [eventElapsedSec, setEventElapsedSec] = useState(0);
  const timerRef = useRef<number | null>(null);
  const simPhaseRef = useRef(simPhase);
  const loadOptionRef = useRef<"1" | "0.4">("1");
  const scrChangeModeRef = useRef<"none" | "20_1.6" | "20_1.0">("none");
  const faultActiveRef = useRef<boolean>(false);
  const reqGenRef = useRef(0);

  const selectedSolutionRef = useRef<WindFarmSolutionId | null>(selectedSolution);
  useEffect(() => {
    selectedSolutionRef.current = selectedSolution;
  }, [selectedSolution]);

  // Helper to load datasets dynamically based on current selections
  const loadDatasets = async (
    loadVal: "1" | "0.4",
    mode: "none" | "20_1.6" | "20_1.0",
    isFault: boolean = false,
    solution?: WindFarmSolutionId
  ) => {
    const sol = solution ?? selectedSolutionRef.current ?? selectedSolution ?? "CFG8";
    const paths = getWindFarmCsvPaths(loadVal, mode, isFault, sol);
    try {
      const [noGData, gData] = await Promise.all([
        loadWindCsv(paths.noGfmePath),
        loadWindCsv(paths.gfmePath),
      ]);
      setNoGfmeCsv(noGData);
      setGfmeCsv(gData);
      return { noGData, gData };
    } catch (err) {
      console.error("Error loading wind farm CSVs:", err);
      return { noGData: [], gData: [] };
    }
  };

  // Preload initial dataset on mount
  useEffect(() => {
    loadDatasets("1", "none", false, "CFG8");
  }, []);

  const solutionConnected = selectedSolution !== null && !breakerOpen;

  // Handler for Start Simulation
  const handleStartSimulation = async () => {
    const gen = ++reqGenRef.current;
    faultActiveRef.current = false;
    setFaultActive(false);
    scrChangeModeRef.current = "none";
    setScrChangeMode("none");
    eventStartSimTimeRef.current = null;
    setEventElapsedSec(0);
    setSimPhase("START_LOOP");
    simPhaseRef.current = "START_LOOP";
    setSimState("RUNNING_NORMAL");
    setIsPaused(false);
    setLeftMarkers([]);
    setRightMarkers([]);
    setSimTime(0);
    simTimeRef.current = 0;

    const currentLoad = loadOptionRef.current;
    const { noGData } = await loadDatasets(currentLoad, "none", false);
    if (gen !== reqGenRef.current) return;

    const startIdx = findRowIndexByTime(noGData, 4.5);
    leftIdxRef.current = startIdx;
    rightIdxRef.current = startIdx;
  };

  // Handler for Load selection
  const handleSelectLoad = async (l: "1" | "0.4") => {
    const gen = ++reqGenRef.current;
    loadOptionRef.current = l;
    setLoadOption(l);

    let nextScrMode = scrChangeModeRef.current;
    if (l === "0.4" && scrChangeModeRef.current === "20_1.0") {
      nextScrMode = "20_1.6";
      scrChangeModeRef.current = "20_1.6";
      setScrChangeMode("20_1.6");
    }
    if (l !== "0.4") {
      faultActiveRef.current = false;
      setFaultActive(false);
    }

    // Always load the dataset for the selected load option (in IDLE and during active simulation)
    const isFault = l === "0.4" && nextScrMode === "20_1.6" && faultActiveRef.current;
    const { noGData } = await loadDatasets(l, nextScrMode, isFault);
    if (gen !== reqGenRef.current) return;

    if (simPhaseRef.current !== "IDLE") {
      const targetTime =
        simPhaseRef.current === "START_LOOP"
          ? 4.5
          : simPhaseRef.current === "SCR_CHANGE"
            ? 5.0
            : 22.0;
      const startIdx = findRowIndexByTime(noGData, targetTime);
      leftIdxRef.current = startIdx;
      rightIdxRef.current = startIdx;
    }
  };

  // Handler for SCR Change selection (20->1.6, 20->1.0)
  const handleSelectScrChangeMode = async (mode: "20_1.6" | "20_1.0") => {
    const currentLoad = loadOptionRef.current;
    if (currentLoad === "0.4" && mode === "20_1.0") return;
    const gen = ++reqGenRef.current;

    // Trigger glowing orange pulse on transmission grid for 2 seconds
    triggerGridOrangePulse();

    faultActiveRef.current = false;
    setFaultActive(false);
    scrChangeModeRef.current = mode;
    setScrChangeMode(mode);
    setSimPhase("SCR_CHANGE");
    simPhaseRef.current = "SCR_CHANGE";
    setSimState("FAULT_ACTIVE");
    eventStartSimTimeRef.current = simTime;
    setEventElapsedSec(0);
    setIsPaused(false);

    const labelStr = mode === "20_1.6" ? "SCR Change (20 → 1.6)" : "SCR Change (20 → 1.0)";
    const marker: EventMarker = {
      simTime,
      label: labelStr,
      color: "#f59e0b",
    };
    setLeftMarkers((prev) => [...prev, marker]);
    setRightMarkers((prev) => [...prev, marker]);

    const { noGData } = await loadDatasets(currentLoad, mode, false);
    if (gen !== reqGenRef.current) return;

    const startIdx = findRowIndexByTime(noGData, 5.0);
    leftIdxRef.current = startIdx;
    rightIdxRef.current = startIdx;
  };

  // Handler for Fault (Ag 0.5 pu) — Only allowed when Load is 0.4 and SCR Change 20->1.6 is selected
  const handleTriggerFault = async () => {
    const currentLoad = loadOptionRef.current;
    const currentScrMode = scrChangeModeRef.current;
    if (currentLoad !== "0.4" || currentScrMode !== "20_1.6") return;
    const gen = ++reqGenRef.current;

    faultActiveRef.current = true;
    setFaultActive(true);
    setSimPhase("FAULT");
    simPhaseRef.current = "FAULT";
    setSimState("FAULT_ACTIVE");
    eventStartSimTimeRef.current = simTime;
    setEventElapsedSec(0);
    setIsPaused(false);

    const marker: EventMarker = {
      simTime,
      label: "Fault: Ag 0.5 pu",
      color: "#c084fc",
    };
    setLeftMarkers((prev) => [...prev, marker]);
    setRightMarkers((prev) => [...prev, marker]);

    const { noGData } = await loadDatasets("0.4", "20_1.6", true);
    if (gen !== reqGenRef.current) return;

    const startIdx = findRowIndexByTime(noGData, 22.0);
    leftIdxRef.current = startIdx;
    rightIdxRef.current = startIdx;
  };

  const placeSolution = async (id: WindFarmSolutionId) => {
    setSelectedSolution(id);
    selectedSolutionRef.current = id;
    const currentLoad = loadOptionRef.current;
    const currentScrMode = scrChangeModeRef.current;
    const isFault = currentLoad === "0.4" && currentScrMode === "20_1.6" && faultActiveRef.current;
    const { noGData } = await loadDatasets(currentLoad, currentScrMode, isFault, id);

    if (simPhaseRef.current !== "IDLE") {
      const targetTime =
        simPhaseRef.current === "START_LOOP"
          ? 4.5
          : simPhaseRef.current === "SCR_CHANGE"
            ? 5.0
            : 22.0;
      const startIdx = findRowIndexByTime(noGData, targetTime);
      leftIdxRef.current = startIdx;
      rightIdxRef.current = startIdx;
    }
  };

  const onReset = () => {
    const gen = ++reqGenRef.current;
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (gridPulseTimerRef.current) {
      clearTimeout(gridPulseTimerRef.current);
      gridPulseTimerRef.current = null;
    }
    setGridOrangePulse(false);
    simPhaseRef.current = "IDLE";
    setSimPhase("IDLE");
    setSimState("IDLE");
    setIsPaused(false);
    scrChangeModeRef.current = "none";
    setScrChangeMode("none");
    faultActiveRef.current = false;
    setFaultActive(false);
    loadOptionRef.current = "1";
    setLoadOption("1");
    setLeftPoints([]);
    setRightPoints([]);
    setLeftMarkers([]);
    setRightMarkers([]);
    setSimTime(0);
    simTimeRef.current = 0;
    leftIdxRef.current = 0;
    rightIdxRef.current = 0;
    eventStartSimTimeRef.current = null;
    setEventElapsedSec(0);

    loadDatasets("1", "none", false, selectedSolution ?? "CFG8");
  };

  // Pre-calculate dataset indices so interval tick doesn't run findIndex over 30,000 items every 40ms
  const indices = useMemo(() => {
    if (!noGfmeCsv.length) {
      return { startIdx: 0, endIdx: 0, t219Left: 0, t219Right: 0, lastLeft: 0, lastRight: 0 };
    }
    const startIdx = Math.max(0, noGfmeCsv.findIndex((r) => r.t >= 4.5));
    // 500 samples @ dt=0.001 is exactly 25 full cycles at 50Hz (500 * 0.001 = 0.500s)
    const maxLoop = Math.min(noGfmeCsv.length - 1, startIdx + 500);

    const t219L = noGfmeCsv.findIndex((r) => r.t >= 21.9);
    const t219Left = t219L >= 0 ? t219L : noGfmeCsv.length - 1;

    const t219R = gfmeCsv.length ? gfmeCsv.findIndex((r) => r.t >= 21.9) : -1;
    const t219Right = t219R >= 0 ? t219R : (gfmeCsv.length ? gfmeCsv.length - 1 : t219Left);

    const lastLeft = noGfmeCsv.length - 1;
    const lastRight = gfmeCsv.length ? gfmeCsv.length - 1 : lastLeft;

    return { startIdx, endIdx: maxLoop, t219Left, t219Right, lastLeft, lastRight };
  }, [noGfmeCsv, gfmeCsv]);

  // Master Simulation Playback Loop
  useEffect(() => {
    if (simPhase === "IDLE" || isPaused || !noGfmeCsv.length) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const intervalMs = 40;
    // Derive exact raw Δt directly from consecutive CSV rows (0 manipulation)
    const rawDt =
      noGfmeCsv.length >= 2 ? Math.abs(noGfmeCsv[1].t - noGfmeCsv[0].t) : 0.001;
    const dtSim = rawDt > 0 ? rawDt : 0.001;
    const samplesPerFrame = Math.max(1, Math.round(0.01 / dtSim));
    const stepSize = 1;

    const advanceIdx = (
      phase: typeof simPhase,
      side: "left" | "right",
      idx: number,
    ): number => {
      if (phase === "START_LOOP") {
        let next = idx + stepSize;
        if (next >= indices.endIdx) next = indices.startIdx;
        return next;
      }
      if (phase === "SCR_CHANGE") {
        const target = side === "left" ? indices.t219Left : indices.t219Right;
        if (idx < target) return Math.min(target, idx + stepSize);
        // Loop a continuous 5-cycle window (100 samples at 50Hz dt=0.001) instead of 4 points
        const loopWindow = 100;
        const cycleStart = Math.max(0, target - loopWindow);
        return idx >= target ? cycleStart : idx + 1;
      }
      if (phase === "FAULT") {
        const last = side === "left" ? indices.lastLeft : indices.lastRight;
        if (idx < last) return Math.min(last, idx + stepSize);
        const loopWindow = 100;
        const cycleStart = Math.max(0, last - loopWindow);
        return idx >= last ? cycleStart : idx + 1;
      }
      return idx;
    };

    timerRef.current = window.setInterval(() => {
      if (simPhaseRef.current === "IDLE") return;

      let leftIdx = leftIdxRef.current;
      let rightIdx = rightIdxRef.current;
      let curSimTime = simTimeRef.current;
      const leftBatch: TelemetryPoint[] = [];
      const rightBatch: TelemetryPoint[] = [];

      for (let n = 0; n < samplesPerFrame; n++) {
        // Pure tick size increment per data sample
        curSimTime = Number((curSimTime + dtSim).toFixed(6));

        if (simPhaseRef.current === "START_LOOP") {
          leftIdx = advanceIdx("START_LOOP", "left", leftIdx);
          rightIdx = leftIdx;
        } else {
          leftIdx = advanceIdx(simPhaseRef.current, "left", leftIdx);
          rightIdx = advanceIdx(simPhaseRef.current, "right", rightIdx);
        }

        const leftRow = noGfmeCsv[leftIdx] || noGfmeCsv[0];
        const rightRow = solutionConnected
          ? gfmeCsv[rightIdx] || leftRow
          : leftRow;

        leftBatch.push({
          simTime: curSimTime,
          p: leftRow.p ?? 0,
          q: leftRow.q ?? 0,
          va: leftRow.va ?? 0,
          vb: leftRow.vb ?? 0,
          vc: leftRow.vc ?? 0,
        });
        rightBatch.push({
          simTime: curSimTime,
          p: rightRow.p ?? 0,
          q: rightRow.q ?? 0,
          va: rightRow.va ?? 0,
          vb: rightRow.vb ?? 0,
          vc: rightRow.vc ?? 0,
        });
      }

      leftIdxRef.current = leftIdx;
      rightIdxRef.current = rightIdx;
      simTimeRef.current = curSimTime;

      // Update CSV-based elapsed time after event trigger for exact status matching
      if (
        eventStartSimTimeRef.current != null &&
        (simPhaseRef.current === "SCR_CHANGE" || simPhaseRef.current === "FAULT")
      ) {
        const elapsedCsv = Math.max(0, curSimTime - eventStartSimTimeRef.current);
        setEventElapsedSec(elapsedCsv);
      }

      setSimTime(curSimTime);
      setLeftPoints((prev) => [...prev, ...leftBatch]);
      setRightPoints((prev) => [...prev, ...rightBatch]);
    }, intervalMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [simPhase, isPaused, noGfmeCsv, gfmeCsv, solutionConnected, indices]);

  // Reset elapsed time when in IDLE or START_LOOP
  useEffect(() => {
    if (simPhase === "IDLE" || simPhase === "START_LOOP") {
      setEventElapsedSec(0);
    }
  }, [simPhase]);

  useEffect(() => {
    if (simPhase === "SCR_CHANGE" || simPhase === "FAULT") {
      if (breakerOpen || !solutionConnected) {
        setSimState("FAULT_ACTIVE");
      } else {
        const threshold = simPhase === "FAULT" ? 0.3 : 0.2;
        if (eventElapsedSec < threshold) {
          setSimState("FAULT_ACTIVE");
        } else if (eventElapsedSec < 2.0) {
          setSimState("STABILIZING");
        } else {
          setSimState("STABILIZED");
        }
      }
    }
  }, [simPhase, breakerOpen, solutionConnected, eventElapsedSec]);

  const leftStatus = deriveIbrFarmStatusFromConfig(
    "left",
    simPhase,
    eventElapsedSec,
    solutionConnected,
    loadOption,
    scrChangeMode,
  );
  const rightStatus = deriveIbrFarmStatusFromConfig(
    "right",
    simPhase,
    eventElapsedSec,
    solutionConnected,
    loadOption,
    scrChangeMode,
  );

  const paths = getWindFarmCsvPaths(loadOption, scrChangeMode, faultActive, selectedSolution ?? "CFG8");
  const leftCsvPath = paths.noGfmePath;
  const rightCsvPath = paths.gfmePath;
  const leftCsvFileName = leftCsvPath.split("/").pop() ?? "";
  const rightCsvFileName = rightCsvPath.split("/").pop() ?? "";

  const { yMinP, yMaxP, yMinV, yMaxV } = useMemo(() => {
    const isCfg11 = selectedSolution === "CFG11";
    const isLoad04 = loadOption === "0.4" || faultActive || simPhase === "FAULT";
    const isScr20_10 = scrChangeMode === "20_1.0";

    if (isCfg11) {
      if (isLoad04) {
        // Point 2: CFG-11 with Wind farm -> Load 0.4 pu : SCR 20 ->1.6 -> Ag_0.5 pu
        return { yMinP: 20, yMaxP: 110, yMinV: -400, yMaxV: 400 };
      }
      if (isScr20_10) {
        // Point 2: CFG-11 with Wind farm -> Load 1pu SCR 20->1.0
        return { yMinP: 25, yMaxP: 105, yMinV: -430, yMaxV: 430 };
      }
      // Point 2: CFG-11 with Wind farm -> Load 1pu SCR 20->1.6 (default)
      return { yMinP: 60, yMaxP: 105, yMinV: -400, yMaxV: 400 };
    }

    // Point 2: CFG-8 with Wind farm (default)
    if (isLoad04) {
      // Point 2: CFG-8 with Wind farm -> Load 0.4 pu : SCR 20 ->1.6 -> Ag_0.5 pu
      return { yMinP: 20, yMaxP: 140, yMinV: -410, yMaxV: 410 };
    }
    if (isScr20_10) {
      // Point 2: CFG-8 with Wind farm -> Load 1pu SCR 20->1.0
      return { yMinP: 25, yMaxP: 120, yMinV: -410, yMaxV: 410 };
    }
    // Point 2: CFG-8 with Wind farm -> Load 1pu SCR 20->1.6 (default)
    return { yMinP: 60, yMaxP: 135, yMinV: -410, yMaxV: 410 };
  }, [selectedSolution, loadOption, faultActive, simPhase, scrChangeMode]);

  const solutionSvg = selectedSolution
    ? WIND_FARM_SOLUTIONS[selectedSolution].display
    : undefined;
  const [activeHotspotTooltip, setActiveHotspotTooltip] = useState<
    "grid" | "windfarm" | "load" | "solution" | null
  >(null);

  const solutionLabel = selectedSolution ?? "CFG";
  const diagConfig = DIAGRAM_CONFIG[selectedSolution ?? "CFG8"] || DIAGRAM_CONFIG.CFG8;

  return (
    <div
      className="green-theme min-h-screen lg:h-dvh lg:max-h-dvh w-full bg-[#212121] bg-[radial-gradient(ellipse_at_top,#004745_0%,#002b2a_40%,#212121_100%)] text-white flex flex-col font-sans max-lg:overflow-y-auto lg:overflow-hidden touch-scroll select-none"
      onClick={() => setActiveHotspotTooltip(null)}
    >
      <WindFarmHeader />

      {/* Solutions & Scenario Controls Subheader */}
      <div className="px-6 md:px-10 pt-1.5 pb-0.5 shrink-0">
        <WindFarmControlsSubheader
          simState={simState}
          simPhase={simPhase}
          isPaused={isPaused}
          breakerOpen={breakerOpen}
          selectedSolution={selectedSolution}
          onPlaceSolution={placeSolution}
          onStartSimulation={handleStartSimulation}
          onTogglePlayPause={() => setIsPaused((prev) => !prev)}
          onReset={onReset}
          scrChangeMode={scrChangeMode}
          onSelectScrChangeMode={handleSelectScrChangeMode}
          load={loadOption}
          onSelectLoad={handleSelectLoad}
          faultActive={faultActive}
          onTriggerFault={handleTriggerFault}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 px-6 md:px-10 py-1.5 max-lg:overflow-y-auto lg:overflow-hidden flex flex-col gap-1.5 sm:gap-2 bg-transparent font-sans">
        {/* Top Section: Single Line Diagram (Left) & Scenario Writeup (Right) - Tightened to maximize graph viewport space */}
        <div className="scada-accordion rounded-xl border border-[#005E60]/60 bg-[#004745] shadow-sm overflow-hidden flex flex-col shrink-0 font-sans">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_275px] divide-y lg:divide-y-0 lg:divide-x divide-[#458A8A]/35">
            {/* Left Panel: Dynamic Network Diagram with Overlays */}
            <div className="flex flex-col min-h-0 relative">
              {/* Header / Parameter readout banner */}
              <div className="bg-[#005E60] border-b border-[#458A8A]/35 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 flex-wrap min-h-[34px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-white text-xs sm:text-sm font-sans font-bold uppercase tracking-wider truncate">
                    SINGLE-LINE NETWORK DIAGRAM
                  </span>
                  <span className="inline-flex items-center rounded-md bg-black/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#C8FF08] border border-[#C8FF08]/30 shrink-0 leading-tight">
                    Wind Farm (1xONWF)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-mono font-bold border transition-all leading-tight",
                      scrChangeMode !== "none"
                        ? "bg-amber-400/25 text-amber-300 border-amber-400/60 ring-1 ring-amber-300/50 shadow-[0_0_8px_rgba(251,191,36,0.35)]"
                        : "bg-black/40 text-[#C8FF08] border-[#C8FF08]/40"
                    )}
                  >
                    SCR: {scrChangeMode === "20_1.6" ? "20 → 1.6" : scrChangeMode === "20_1.0" ? "20 → 1.0" : "20.0"}
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-mono font-bold border transition-all leading-tight",
                      faultActive
                        ? "bg-purple-500/25 text-purple-200 border-purple-400/60 ring-1 ring-purple-300/50 shadow-[0_0_8px_rgba(192,132,252,0.35)]"
                        : "bg-black/40 text-white/50 border-white/20"
                    )}
                  >
                    ⚡ {faultActive ? "Ag 0.5 pu" : "No Fault"}
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-mono font-bold border transition-all bg-black/40 text-[#96BDBD] border-white/20 leading-tight"
                    )}
                  >
                    Load: {loadOption.includes("pu") ? loadOption : `${loadOption} pu`}
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold border uppercase tracking-wider shrink-0 ml-0.5 leading-tight",
                      solutionConnected
                        ? "bg-primary/20 text-[#C8FF08] border-[#C8FF08]/50"
                        : solutionSvg
                          ? "bg-primary/10 text-white border-white/30"
                          : "bg-white/5 text-white/60 border-white/20"
                    )}
                  >
                    {solutionConnected
                      ? `${solutionLabel} Connected`
                      : solutionSvg
                        ? `${solutionLabel} Ready`
                        : "IBR Network"}
                  </span>
                </div>
              </div>

              {/* Diagram Canvas - centered with balanced margins on top, bottom, left, and right */}
              <div className="relative flex-1 w-full p-2.5 sm:p-3 flex items-center justify-center min-h-[145px]">
                <div
                  className="relative w-[63%] max-w-[63%] my-auto flex items-center justify-center transition-all duration-300"
                  style={{ aspectRatio: `${diagConfig.width} / ${diagConfig.height}` }}
                >
                  <img
                    src={diagConfig.svg}
                    alt="Single Line Network Diagram"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300"
                    draggable={false}
                  />

                  {/* Orange Pulse Transmission Grid (SCR Change 20->1.6 / 20->1.0) — lights up in glowing orange for 2s */}
                  {gridOrangePulse && (
                    <svg
                      viewBox="0 0 645.01 205.72"
                      className="absolute inset-0 w-full h-full pointer-events-none z-[15] animate-pulse"
                      style={{
                        filter: "drop-shadow(0 0 6px rgba(249, 115, 22, 0.95)) drop-shadow(0 0 14px rgba(249, 115, 22, 0.75))",
                      }}
                    >
                      <g stroke="#f97316" fill="#f97316">
                        {/* Line from Generator Transformer to Tower 1 */}
                        <line x1="95.15" y1="51.68" x2="133.48" y2="51.68" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" />

                        {/* Overhead Transmission Lines between Tower 1 and Tower 2 */}
                        <line x1="192.76" y1="43.61" x2="261.09" y2="43.61" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="192.76" y1="56.61" x2="261.09" y2="56.61" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" />

                        {/* Tower 1 (Lattice structure, crossarms & insulators) */}
                        <path d="M180.79,76.38h-5.87l-4.98-22.81h8.04v3.57c0,.52.42.94.95.94s.95-.42.95-.94v-4.51s-.02-.06-.02-.1c.02-.3-.08-.62-.34-.82l-9.62-7.5v-3.55h8.1v3.57c0,.52.42.94.95.94s.95-.42.95-.94v-4.51s-.02-.06-.02-.1c.02-.31-.08-.62-.34-.82l-9.62-7.49v-.66c0-.59-.24-1.12-.61-1.53,0,0,0-.02-.02-.02h0c-.41-.43-.98-.69-1.61-.69h-8.21c-.63,0-1.2.26-1.61.68h0c-.4.4-.64.96-.64,1.56v.66l-9.63,7.5c-.26.21-.37.51-.34.82,0,.03-.02.06-.02.1v4.51c0,.52.42.94.95.94s.95-.42.95-.94v-3.57h8.11v3.55l-9.63,7.5c-.26.21-.37.51-.34.82,0,.03-.02.06-.02.1v4.51c0,.52.42.94.95.94s.95-.42.95-.94v-3.57h8.05l-4.98,22.81h-5.87c-.52,0-.95.42-.95.94s.42.94.95.94h34.5c.52,0,.95-.42.95-.94s-.42-.94-.95-.94h0ZM159.07,31.63l3.03,2.99-3.03,2.89v-5.88h0ZM170.96,67.05l1.88,8.59-7.57-4.9,5.69-3.69h0ZM163.53,69.62l-6.62-4.29,6.45-5.99,6.59,6.13-6.41,4.15h0ZM164.73,58.05l3.54-3.29,1.8,8.25-5.34-4.96h0ZM166.79,53.56l-3.44,3.21-3.44-3.21h6.89,0ZM160.08,51.68l3.27-3.91,3.27,3.91h-6.53ZM167.99,50.4l-3.42-4.09,3.42-4.09v8.19h0ZM166.83,40.66l-3.49,4.18-3.49-4.18h6.98ZM160.47,38.78l2.96-2.83,2.85,2.83h-5.82,0ZM167.99,37.82l-3.2-3.17,3.2-3.06v6.22h0ZM163.45,33.33l-3.08-3.05h6.28l-3.2,3.05h0ZM159.06,42.65l3.05,3.66-3.05,3.66v-7.31h0ZM158.73,55.04l3.23,3.01-4.88,4.54,1.65-7.54h0ZM156.1,67.05l5.69,3.69-7.57,4.9,1.88-8.58h0ZM163.53,71.86l6.97,4.51h-13.93l6.97-4.51h0ZM176.41,51.68h-6.53v-5.08l6.53,5.08h0ZM176.41,38.78h-6.53v-5.08l6.53,5.08h0ZM150.63,38.78l6.53-5.09v5.09h-6.53ZM157.17,51.68h-6.53l6.53-5.09v5.09h0Z" />
                        <path d="M139.46,46.03c-1.61,0-3.21-.36-4.59-1.08l-.07-.04h-.52c-.27,0-.49-.22-.49-.49s.22-.49.49-.49h.65c.08,0,.16.02.23.06l.18.09c2.46,1.3,5.78,1.3,8.24,0l.18-.09c.07-.04.15-.06.23-.06h1.85c.27,0,.49.22.49.49s-.22.49-.49.49l-1.8.04c-1.37.72-2.97,1.08-4.58,1.08h0Z" />
                        <path d="M145.84,42.09c0,.54-.44.98-.99.98s-.99-.44-.99-.98c0-.54.44-.98.99-.98s.99.44.99.98h0Z" />
                        <path d="M139.46,58.74c-1.61,0-3.21-.36-4.59-1.08l-.07-.04h-.52c-.27,0-.49-.22-.49-.49s.22-.49.49-.49h.65c.08,0,.16.02.23.06l.18.1c2.46,1.3,5.78,1.3,8.24,0l.18-.1c.07-.04.15-.06.23-.06h1.85c.27,0,.49.22.49.49s-.22.49-.49.49l-1.8.04c-1.37.72-2.97,1.08-4.58,1.08h0Z" />
                        <path d="M145.84,54.81c0,.54-.44.98-.99.98s-.99-.44-.99-.98c0-.54.44-.98.99-.98s.99.44.99.98h0Z" />
                        <path d="M187.97,46.03c-1.61,0-3.21-.36-4.58-1.08l-.07-.04h-1.73c-.27,0-.49-.22-.49-.49s.22-.49.49-.49h1.85c.08,0,.16.02.23.06l.18.09c2.46,1.3,5.78,1.3,8.24,0l.18-.09c.07-.04.15-.06.23-.06h.65c.27,0,.49.22.49.49s-.22.49-.49.49l-.6.04c-1.37.72-2.98,1.08-4.59,1.08h0Z" />
                        <path d="M183.55,42.09c0,.54-.44.98-.99.98s-.99-.44-.99-.98c0-.54.44-.98.99-.98s.99.44.99.98h0Z" />
                        <path d="M187.97,58.74c-1.61,0-3.21-.36-4.58-1.08l-.07-.04h-1.73c-.27,0-.49-.22-.49-.49s.22-.49.49-.49h1.85c.08,0,.16.02.23.06l.18.1c2.46,1.3,5.78,1.3,8.24,0l.18-.1c.07-.04.15-.06.23-.06h.65c.27,0,.49.22.49.49s-.22.49-.49.49l-.6.04c-1.37.72-2.98,1.08-4.59,1.08h0Z" />
                        <path d="M183.55,54.81c0,.54-.44.98-.99.98s-.99-.44-.99-.98c0-.54.44-.98.99-.98s.99.44.99.98h0Z" />

                        {/* Tower 2 (Lattice structure, crossarms & insulators) */}
                        <path d="M307.79,76.38h-5.87l-4.98-22.81h8.04v3.57c0,.52.42.94.95.94s.95-.42.95-.94v-4.51s-.02-.06-.02-.1c.02-.3-.08-.62-.34-.82l-9.62-7.5v-3.55h8.1v3.57c0,.52.42.94.95.94s.95-.42.95-.94v-4.51s-.02-.06-.02-.1c.02-.31-.08-.62-.34-.82l-9.62-7.49v-.66c0-.59-.24-1.12-.61-1.53,0,0,0-.02-.02-.02h0c-.41-.43-.98-.69-1.61-.69h-8.21c-.63,0-1.2.26-1.61.68h0c-.4.4-.64.96-.64,1.56v.66l-9.63,7.5c-.26.21-.37.51-.34.82,0,.03-.02.06-.02.1v4.51c0,.52.42.94.95.94s.95-.42.95-.94v-3.57h8.11v3.55l-9.63,7.5c-.26.21-.37.51-.34.82,0,.03-.02.06-.02.1v4.51c0,.52.42.94.95.94s.95-.42.95-.94v-3.57h8.05l-4.98,22.81h-5.87c-.52,0-.95.42-.95.94s.42.94.95.94h34.5c.52,0,.95-.42.95-.94s-.42-.94-.95-.94h0ZM286.07,31.63l3.03,2.99-3.03,2.89v-5.88h0ZM297.96,67.05l1.88,8.59-7.57-4.9,5.69-3.69h0ZM290.53,69.62l-6.62-4.29,6.45-5.99,6.59,6.13-6.41,4.15h0ZM291.73,58.05l3.54-3.29,1.8,8.25-5.34-4.96h0ZM293.79,53.56l-3.44,3.21-3.44-3.21h6.89,0ZM287.08,51.68l3.27-3.91,3.27,3.91h-6.53ZM294.99,50.4l-3.42-4.09,3.42-4.09v8.19h0ZM293.83,40.66l-3.49,4.18-3.49-4.18h6.98ZM287.47,38.78l2.96-2.83,2.85,2.83h-5.82,0ZM294.99,37.82l-3.2-3.17,3.2-3.06v6.22h0ZM290.45,33.33l-3.08-3.05h6.28l-3.2,3.05h0ZM286.06,42.65l3.05,3.66-3.05,3.66v-7.31h0ZM285.73,55.04l3.23,3.01-4.88,4.54,1.65-7.54h0ZM283.1,67.05l5.69,3.69-7.57,4.9,1.88-8.58h0ZM290.53,71.86l6.97,4.51h-13.93l6.97-4.51h0ZM303.41,51.68h-6.53v-5.08l6.53,5.08h0ZM303.41,38.78h-6.53v-5.08l6.53,5.08h0ZM277.63,38.78l6.53-5.09v5.09h-6.53ZM284.17,51.68h-6.53l6.53-5.09v5.09h0Z" />
                        <path d="M266.46,46.03c-1.61,0-3.21-.36-4.59-1.08l-.07-.04h-.52c-.27,0-.49-.22-.49-.49s.22-.49.49-.49h.65c.08,0,.16.02.23.06l.18.09c2.46,1.3,5.78,1.3,8.24,0l.18-.09c.07-.04.15-.06.23-.06h1.85c.27,0,.49.22.49.49s-.22.49-.49.49l-1.8.04c-1.37.72-2.97,1.08-4.58,1.08h0Z" />
                        <path d="M272.84,42.09c0,.54-.44.98-.99.98s-.99-.44-.99-.98c0-.54.44-.98.99-.98s.99.44.99.98h0Z" />
                        <path d="M266.46,58.74c-1.61,0-3.21-.36-4.59-1.08l-.07-.04h-.52c-.27,0-.49-.22-.49-.49s.22-.49.49-.49h.65c.08,0,.16.02.23.06l.18.1c2.46,1.3,5.78,1.3,8.24,0l.18-.1c.07-.04.15-.06.23-.06h1.85c.27,0,.49.22.49.49s-.22.49-.49.49l-1.8.04c-1.37.72-2.97,1.08-4.58,1.08h0Z" />
                        <path d="M272.84,54.81c0,.54-.44.98-.99.98s-.99-.44-.99-.98c0-.54.44-.98.99-.98s.99.44.99.98h0Z" />
                        <path d="M314.97,46.03c-1.61,0-3.21-.36-4.58-1.08l-.07-.04h-1.73c-.27,0-.49-.22-.49-.49s.22-.49.49-.49h1.85c.08,0,.16.02.23.06l.18.09c2.46,1.3,5.78,1.3,8.24,0l.18-.09c.07-.04.15-.06.23-.06h.65c.27,0,.49.22.49.49s-.22.49-.49.49l-.6.04c-1.37.72-2.98,1.08-4.59,1.08h0Z" />
                        <path d="M310.55,42.09c0,.54-.44.98-.99.98s-.99-.44-.99-.98c0-.54.44-.98.99-.98s.99.44.99.98h0Z" />
                        <path d="M314.97,58.74c-1.61,0-3.21-.36-4.58-1.08l-.07-.04h-1.73c-.27,0-.49-.22-.49-.49s.22-.49.49-.49h1.85c.08,0,.16.02.23.06l.18.1c2.46,1.3,5.78,1.3,8.24,0l.18-.1c.07-.04.15-.06.23-.06h.65c.27,0,.49.22.49.49s-.22.49-.49.49l-.6.04c-1.37.72-2.98,1.08-4.59,1.08h0Z" />
                        <path d="M310.55,54.81c0,.54-.44.98-.99.98s-.99-.44-.99-.98c0-.54.44-.98.99-.98s.99.44.99.98h0Z" />
                      </g>
                    </svg>
                  )}

                  {/* Red Pulse Fault Branch (Ag 0.5 pu) — lights up in glowing red for 1.4s then returns to normal */}
                  {faultBranchRed && (
                    <svg
                      viewBox="0 0 645.01 205.72"
                      className="absolute inset-0 w-full h-full pointer-events-none z-[15] animate-pulse"
                      style={{
                        filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.95)) drop-shadow(0 0 14px rgba(239, 68, 68, 0.75))",
                      }}
                    >
                      <g
                        stroke="#ef4444"
                        strokeWidth="2.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="321.03" y1="103.54" x2="356.25" y2="103.54" />
                        <line x1="355.95" y1="103.54" x2="355.95" y2="117.72" />
                        <line x1="355.93" y1="117.7" x2="350.43" y2="125.99" />
                        <line x1="358.08" y1="129.74" x2="350.31" y2="125.62" />
                        <line x1="358.71" y1="129.46" x2="350.31" y2="136.14" />
                        <line x1="358.08" y1="141.11" x2="350.31" y2="136.06" />
                        <line x1="357.99" y1="140.26" x2="349.59" y2="146.94" />
                        <line x1="350.31" y1="146.86" x2="355.78" y2="154.45" />
                        <polygon
                          fill="#ef4444"
                          stroke="#ef4444"
                          strokeWidth="1"
                          points="357.63 151.89 358.71 158.51 352.77 155.4 357.63 151.89"
                        />
                        <line x1="344.31" y1="158.5" x2="368.69" y2="158.5" />
                        <line x1="351.87" y1="161.38" x2="360.5" y2="161.38" />
                      </g>
                    </svg>
                  )}

                  {diagConfig.turbineSlots.map((slot: { left: string; top: string }, i: number) => (
                    <div
                      key={`wf-mill-${i}`}
                      className="absolute z-[8] w-[4.2%] -translate-x-[53.213%] -translate-y-[61.76%] pointer-events-none"
                      style={{ left: slot.left, top: slot.top }}
                    >
                      <AnimatedWindmill spinning={simPhase !== "IDLE" && !isPaused} className="w-full" />
                    </div>
                  ))}

                  {/* Grid & Transformer Hotspot */}
                  <div
                    className="absolute left-[0%] top-[15%] w-[12%] h-[40%] z-40 cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveHoverData({
                        title: "GRID",
                        items: [
                          { label: "Nominal Voltage", value: "400 kV", type: "GRID" },
                          { label: "System Frequency", value: "50 Hz", type: "AC SYSTEM" },
                        ],
                        pos: { left: rect.left + rect.width / 2, top: rect.top },
                      });
                    }}
                    onMouseLeave={() => setActiveHoverData(null)}
                  />

                  {/* Transmission Lines & Towers Hotspot */}
                  <div
                    className="absolute left-[13%] top-[15%] w-[25%] h-[40%] z-40 cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveHoverData({
                        title: "TRANSMISSION LINE",
                        items: [
                          {
                            label: "Grid Strength (SCR)",
                            value:
                              scrChangeMode === "20_1.6"
                                ? "20 → 1.6"
                                : scrChangeMode === "20_1.0"
                                  ? "20 → 1.0"
                                  : "20.0 (Strong)",
                            type: "SYSTEM",
                          },
                          { label: "Operating Voltage", value: "400 kV", type: "GRID" },
                        ],
                        pos: { left: rect.left + rect.width / 2, top: rect.top },
                      });
                    }}
                    onMouseLeave={() => setActiveHoverData(null)}
                  />

                  {/* Wind Farm Hotspot */}
                  <div
                    className="absolute z-40 cursor-pointer"
                    style={{
                      left: diagConfig.windFarmHover.left,
                      top: diagConfig.windFarmHover.top,
                      width: diagConfig.windFarmHover.width,
                      height: diagConfig.windFarmHover.height,
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveHoverData({
                        title: "WIND FARM (1xONWF)",
                        items: [
                          { label: "Plant Capacity", value: "100 MW", type: "POWER" },
                          { label: "Technology", value: "Grid Following (GFL)", type: "TYPE-4" },
                        ],
                        pos: { left: rect.left + rect.width / 2, top: rect.top },
                      });
                    }}
                    onMouseLeave={() => setActiveHoverData(null)}
                  />

                  {/* Local Load Hotspot */}
                  <div
                    className="absolute left-[44%] top-[62%] w-[10%] h-[32%] z-40 cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveHoverData({
                        title: "LOCAL LOAD",
                        items: [
                          {
                            label: "Active Power Demand",
                            value: loadOption.includes("pu") ? loadOption : `${loadOption} pu`,
                            type: "DEMAND",
                          },
                          { label: "Operating Base", value: "100 MW", type: "RATING" },
                        ],
                        pos: { left: rect.left + rect.width / 2, top: rect.top },
                      });
                    }}
                    onMouseLeave={() => setActiveHoverData(null)}
                  />

                  {/* Connected Solution Hotspot (CFG8 / CFG11) */}
                  <div
                    className="absolute z-40 cursor-pointer"
                    style={{
                      left: diagConfig.solutionHover.left,
                      top: diagConfig.solutionHover.top,
                      width: diagConfig.solutionHover.width,
                      height: diagConfig.solutionHover.height,
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const specs = (
                        WIND_SOLUTION_SPECS[selectedSolution ?? "CFG8"] || WIND_SOLUTION_SPECS["CFG8"]
                      ).map((spec) => ({
                        label: spec.name,
                        value: spec.rating,
                        type: spec.type,
                      }));
                      setActiveHoverData({
                        title: `${selectedSolution ?? "CFG8"} COMPONENT SPECIFICATIONS`,
                        items: specs,
                        pos: { left: rect.left + rect.width / 2, top: rect.top },
                      });
                    }}
                    onMouseLeave={() => setActiveHoverData(null)}
                  />
                </div>
              </div>
            </div>

            {/* Right Panel: Scenario Details & Live Status Writeup */}
            <div className="min-h-0 bg-[#004745] flex flex-col font-sans">
              <div className="bg-[#005E60] border-b border-[#458A8A]/35 px-3 py-1.5 flex items-center gap-1.5 shrink-0 min-h-[34px]">
                <Info className="w-3.5 h-3.5 text-[#C8FF08]" />
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-white">
                  SCENARIO DETAILS
                </span>
              </div>

              <div className="p-2 flex flex-col gap-1.5 overflow-y-auto flex-1 custom-scrollbar">
                {/* Active Combination Summary */}
                <div className="flex flex-col gap-1 rounded-lg bg-[#051619]/95 backdrop-blur-md p-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#005E60]/50 text-[10.5px] font-sans">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-white/80">Grid Strength:</span>
                    <span className="font-mono font-bold text-[#C8FF08]">
                      {scrChangeMode === "20_1.6" ? "SCR 20 → 1.6" : scrChangeMode === "20_1.0" ? "SCR 20 → 1.0" : "SCR 20.0 (Strong)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-white/80">Fault Event:</span>
                    <span className="font-mono font-bold text-white">
                      {faultActive ? "Ag 0.5 pu" : "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-white/80">Grid Load:</span>
                    <span className="font-mono font-bold text-[#96BDBD]">{loadOption} pu</span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-white/80">Connected Solution:</span>
                    <span className="font-bold text-[#C8FF08]">
                      {solutionConnected ? solutionLabel : "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-white/80">Circuit Breaker:</span>
                    <span className="font-bold text-white">Closed (Connected)</span>
                  </div>
                </div>

                {/* Technical Context Writeup */}
                <div className="flex-1 flex flex-col gap-1 rounded-lg bg-[#051619]/95 backdrop-blur-md p-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#005E60]/50 text-[10.5px] leading-tight text-white/90 font-sans">
                  <span className="text-[10px] font-sans font-bold text-[#C8FF08] tracking-wider uppercase">
                    LIVE EVENT STATUS
                  </span>
                  {simPhase === "START_LOOP" ? (
                    <p className="text-white/95 font-sans leading-snug">
                      Wind farm online at steady state injecting active power.
                    </p>
                  ) : simPhase === "SCR_CHANGE" ? (
                    <p className="text-white/95 font-sans leading-snug">
                      SCR change triggered (strong → weak grid). Solution anchors wind farm to stable point.
                    </p>
                  ) : simPhase === "FAULT" ? (
                    <p className="text-white/95 font-sans leading-snug">
                      Fault active at PCC. Solution provides fast dynamic support to maintain stability.
                    </p>
                  ) : (
                    <p className="text-white/80 font-sans leading-snug">
                      Wind farm on standby. Press <strong className="text-[#C8FF08] font-bold">START SIMULATION</strong> in Scenario Controls to begin.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Side-by-Side Telemetry Comparison Graphs - Expanded to Consume Rest of Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 sm:gap-2 flex-1 min-h-0">
          {/* Left Column: IBR NETWORK Without Solution */}
          <div className="flex flex-col gap-2 flex-1 min-h-0 h-full">
            <EChartPlotBox
              title="IBR NETWORK (WITHOUT SOLUTION)"
              badge="P_WF (MW)"
              statusNode={
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-white/80 hidden sm:inline font-semibold">Status:</span>
                  <StatusPill status={leftStatus} />
                </div>
              }
              points={leftPoints}
              eventMarkers={leftMarkers}
              series={[{ key: "p", label: "P_WF" }]}
              colors={["#C8FF08"]}
              yLabel="P_WF (MW)"
              yMin={yMinP}
              yMax={yMaxP}
              isPaused={isPaused}
              onTogglePause={setIsPaused}
              className="flex-1 min-h-0 h-full"
            />
            <EChartPlotBox
              title="IBR NETWORK (WITHOUT SOLUTION)"
              badge="THREE-PHASE VOLTAGES (V_PCC)"
              points={leftPoints}
              eventMarkers={leftMarkers}
              series={[
                { key: "va", label: "Va (R)" },
                { key: "vb", label: "Vb (Y)" },
                { key: "vc", label: "Vc (B)" },
              ]}
              colors={["#ef4444", "#facc15", "#96BDBD"]}
              yLabel="V_pcc (kV)"
              yMin={yMinV}
              yMax={yMaxV}
              isPaused={isPaused}
              onTogglePause={setIsPaused}
              className="flex-1 min-h-0 h-full"
            />
          </div>

          {/* Right Column: IBR NETWORK With Solution */}
          <div className="flex flex-col gap-2.5 flex-1 min-h-0 h-full">
            <EChartPlotBox
              title={solutionConnected ? `IBR NETWORK + ${solutionLabel}` : "IBR NETWORK (SOLUTION READY)"}
              badge="P_WF (MW)"
              statusNode={
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-white/80 hidden sm:inline font-semibold">Status:</span>
                  <StatusPill status={rightStatus} />
                </div>
              }
              points={rightPoints}
              eventMarkers={rightMarkers}
              series={[{ key: "p", label: "P_WF" }]}
              colors={["#C8FF08"]}
              yLabel="P_WF (MW)"
              yMin={yMinP}
              yMax={yMaxP}
              isPaused={isPaused}
              onTogglePause={setIsPaused}
              className="flex-1 min-h-0 h-full"
            />
            <EChartPlotBox
              title={solutionConnected ? `IBR NETWORK + ${solutionLabel}` : "IBR NETWORK (SOLUTION READY)"}
              badge="THREE-PHASE VOLTAGES (V_PCC)"
              points={rightPoints}
              eventMarkers={rightMarkers}
              series={[
                { key: "va", label: "Va (R)" },
                { key: "vb", label: "Vb (Y)" },
                { key: "vc", label: "Vc (B)" },
              ]}
              colors={["#ef4444", "#facc15", "#96BDBD"]}
              yLabel="V_pcc (kV)"
              yMin={yMinV}
              yMax={yMaxV}
              isPaused={isPaused}
              onTogglePause={setIsPaused}
              className="flex-1 min-h-0 h-full"
            />
          </div>
        </div>
      </div>

      {/* Real-time Telemetry & CSV Source Time Debug Modal */}
      <WindFarmDebugModal
        open={isDebugModalOpen}
        onOpenChange={setIsDebugModalOpen}
        simTime={simTime}
        simPhase={simPhase}
        simState={simState}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        onReset={onReset}
        leftIdx={leftIdxRef.current}
        rightIdx={rightIdxRef.current}
        noGfmeCsv={noGfmeCsv}
        gfmeCsv={gfmeCsv}
        leftPoints={leftPoints}
        rightPoints={rightPoints}
        leftCsvPath={leftCsvPath}
        rightCsvPath={rightCsvPath}
        indices={indices}
        dtSim={noGfmeCsv.length >= 2 ? Math.abs(noGfmeCsv[1].t - noGfmeCsv[0].t) : 0.001}
        samplesPerFrame={10}
        intervalMs={40}
      />

      {/* Footer - GE Brand Guidelines compliant (20px box, centered horizontally & vertically) */}
      <footer className="ge-brand-footer">
        <span>
          © 2026 GE Vernova and/or its affiliates. All rights reserved.
        </span>
      </footer>

      {/* Dynamic Hover Details Portal — exact same styling as Stability Dashboard, completely immune to container overflow clipping */}
      {typeof document !== "undefined" &&
        activeHoverData &&
        createPortal(
          <div
            className="fixed z-[300] pointer-events-none -translate-x-1/2 flex flex-col gap-1.5 rounded-xl border border-[#C8FF08]/50 bg-black/95 p-3 shadow-[0_0_24px_rgba(200,255,8,0.45)] backdrop-blur-md w-[280px] sm:w-[300px] font-sans transition-all duration-150 animate-in fade-in"
            style={{
              left: Math.min(Math.max(activeHoverData.pos.left, 160), window.innerWidth - 160),
              top: Math.min(Math.max(activeHoverData.pos.top - 12, 12), window.innerHeight - 280),
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#C8FF08]/20 pb-1.5 font-sans text-sm font-bold uppercase tracking-wider text-[#C8FF08]">
              <span className="leading-tight truncate">{activeHoverData.title}</span>
            </div>
            <div className="flex flex-col gap-1.5 font-sans text-xs pt-1">
              {activeHoverData.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-0.5 rounded bg-white/5 p-2 border border-white/10"
                >
                  <span className="text-xs font-bold text-[#C8FF08] flex items-start justify-between gap-2">
                    <span className="leading-snug break-words">{item.label}</span>
                    {item.type && (
                      <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider shrink-0 pt-0.5 font-sans">
                        {item.type}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-white/90 font-semibold leading-tight font-sans">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
