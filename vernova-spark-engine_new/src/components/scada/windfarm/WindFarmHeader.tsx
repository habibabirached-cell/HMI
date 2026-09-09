import { Link } from "@tanstack/react-router";
import { Play, Pause, RotateCcw, Sliders, Activity, Home, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppWindowControls } from "../AppWindowControls";

export type WindFarmSolutionId = "CFG8" | "CFG11";

export const WIND_FARM_SOLUTIONS: Record<
  WindFarmSolutionId,
  { panel: string; display: string }
> = {
  CFG8: {
    panel: "/svgs/Panel/CFG8.svg",
    display: "/svgs/Display/CFG8.svg",
  },
  CFG11: {
    panel: "/svgs/Panel/CFG11.svg",
    display: "/svgs/Display/CFG11.svg",
  },
};

const SOLUTION_IDS = Object.keys(WIND_FARM_SOLUTIONS) as WindFarmSolutionId[];

export const FAULTS_LIST = [
  { id: "abc", label: "3-Phase (ABC)", short: "ABC" },
  { id: "slg", label: "Single-Line (SLG)", short: "SLG" },
  { id: "ll", label: "Line-Line (LL)", short: "LL" },
] as const;

export const LOADS_LIST = ["1", "0.4"] as const;

export function WindFarmHeader() {
  return (
    <header className="flex flex-row items-center justify-between gap-2 sm:gap-3 px-6 md:px-10 pt-6 md:pt-10 pb-2.5 shrink-0 bg-transparent border-b border-white/10 text-white select-none z-30 font-sans">
      {/* Left: GE Logo with standard left offset */}
      <div className="flex shrink-0 items-center justify-start min-w-0 -ml-2.5 sm:-ml-3">
        <Link to="/" className="shrink-0 hover:opacity-90 transition-opacity">
          <img
            src="/logos/ge_vernova_white.svg"
            alt="GE Vernova"
            className="h-12 sm:h-14 md:h-16 lg:h-[68px] w-auto max-w-[260px] sm:max-w-[300px] object-contain object-left"
          />
        </Link>
      </div>

      {/* Center: Title */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2">
        <h1 className="font-sans font-extrabold text-sm sm:text-base md:text-lg lg:text-xl text-white uppercase tracking-wider truncate text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          IBR Farm Stabilization
        </h1>
      </div>

      {/* Right: Navigation (with text), Home, Close App */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/stability"
          className="h-9 px-3.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 hover:bg-black/40 hover:border-[#C8FF08]/60 hover:text-[#C8FF08] text-white transition-all shadow-sm group shrink-0 text-xs sm:text-sm font-sans font-medium leading-none"
          title="Navigate to Stability Solution Characterization"
          aria-label="Navigate to Stability Solution Characterization"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-[#C8FF08] group-hover:-translate-x-0.5 transition-transform" />
          <span className="leading-none whitespace-nowrap">Stability Solution Characterization</span>
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
  );
}

export function WindFarmControlsSubheader({
  simState = "IDLE",
  simPhase = "IDLE",
  isPaused = false,
  breakerOpen = false,
  selectedSolution = "CFG8",
  onPlaceSolution,
  onStartSimulation,
  onReset,
  scrChangeMode = "none",
  onSelectScrChangeMode,
  load = "1",
  onSelectLoad,
  faultActive = false,
  onTriggerFault,
  // Backward compatibility fallbacks
  onTogglePlayPause,
  scrMode,
  onSelectScrMode,
  subdivision,
  onSelectSubdivision,
  fault,
}: {
  simState?: string;
  simPhase?: "IDLE" | "START_LOOP" | "SCR_CHANGE" | "FAULT";
  isPaused?: boolean;
  breakerOpen?: boolean;
  selectedSolution?: WindFarmSolutionId | null;
  onPlaceSolution?: (id: WindFarmSolutionId) => void;
  onStartSimulation?: () => void;
  onReset?: () => void;
  scrChangeMode?: "none" | "20_1.6" | "20_1.0";
  onSelectScrChangeMode?: (mode: "20_1.6" | "20_1.0") => void;
  load?: string | null;
  onSelectLoad?: (load: "1" | "0.4") => void;
  faultActive?: boolean;
  onTriggerFault?: (id?: string) => void;
  onTogglePlayPause?: () => void;
  scrMode?: string;
  onSelectScrMode?: (mode: string) => void;
  subdivision?: any;
  onSelectSubdivision?: any;
  fault?: any;
}) {
  const isStarted = simPhase !== "IDLE" || simState !== "IDLE";

  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 w-full select-none font-sans">
      {/* Compact Solutions Box */}
      {onPlaceSolution !== undefined && (
        <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-xl border border-[#005E60]/60 bg-[#004745] shadow-sm">
          <div className="flex flex-col justify-center shrink-0 text-left pr-2.5 border-r border-[#458A8A]/35">
            <span className="text-[#C8FF08] text-[10px] font-bold uppercase tracking-[0.14em] leading-none font-sans">
              SOLUTIONS
            </span>
            <span className="inline-flex items-center self-start rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#C8FF08] border border-[#C8FF08]/30 mt-1 leading-none">
              {selectedSolution ?? "None"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {SOLUTION_IDS.map((id) => {
              const placed = selectedSolution === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onPlaceSolution(id)}
                  title={`Select ${id} Solution`}
                  className={cn(
                    "shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center p-1 rounded-lg border transition-all cursor-pointer",
                    "hover:border-[#C8FF08] hover:bg-black/40 hover:scale-105 active:scale-95",
                    placed
                      ? "border-[#C8FF08] bg-black/50 ring-1 ring-[#C8FF08]/60 shadow-[0_0_8px_rgba(200,255,8,0.4)]"
                      : "border-[#005E60]/50 bg-[#051619]/90 opacity-80 hover:opacity-100",
                  )}
                >
                  <img
                    src={WIND_FARM_SOLUTIONS[id].panel}
                    alt={id}
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Squeezed Scenario Controls Bar */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-[#005E60]/60 bg-[#004745] shadow-sm overflow-x-auto custom-scrollbar-none">
        <div className="flex items-center gap-1.5 text-[#C8FF08] shrink-0 pr-2 border-r border-[#458A8A]/35">
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-xs font-sans font-bold uppercase tracking-wider whitespace-nowrap">
            SCENARIO CONTROLS
          </span>
        </div>

        {/* 1. Base SCR Display */}
        <div className="flex items-center gap-1 shrink-0 bg-[#051619]/90 px-2 py-1 rounded-lg border border-[#005E60]/50">
          <span className="text-[11px] font-bold text-[#C8FF08] uppercase tracking-wider">
            SCR:
          </span>
          <span className="px-1.5 py-0.5 text-[11px] font-mono font-bold rounded bg-primary/20 text-[#C8FF08] border border-[#C8FF08]/50">
            20
          </span>
        </div>

        {/* 2. Load Selection (1, 0.4) */}
        {onSelectLoad && (
          <div className="flex items-center gap-1.5 shrink-0 bg-[#051619]/90 px-2 py-1 rounded-lg border border-[#005E60]/50">
            <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider mr-0.5">
              LOAD:
            </span>
            {LOADS_LIST.map((l) => {
              const active = load === l || load === `${l} pu` || load === `${l}pu`;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => onSelectLoad(l as "1" | "0.4")}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-mono font-bold rounded border transition-all cursor-pointer active:scale-95",
                    active
                      ? "bg-primary/25 text-[#C8FF08] border border-[#C8FF08]/70 ring-1 ring-[#C8FF08]/50 shadow-[0_0_6px_rgba(200,255,8,0.3)]"
                      : "bg-black/40 text-white/70 border-white/20 hover:text-white"
                  )}
                >
                  {l} pu
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Start / Pause / Resume Simulation Button */}
        {(() => {
          if (!isStarted) {
            return (
              <button
                type="button"
                onClick={() => {
                  if (onStartSimulation) onStartSimulation();
                  else if (onTogglePlayPause) onTogglePlayPause();
                }}
                className="p-1.5 rounded-lg border transition-all flex items-center justify-center shrink-0 shadow-sm bg-[#C8FF08] text-[#004745] border-[#C8FF08] hover:brightness-110 shadow-[0_0_8px_rgba(200,255,8,0.4)] cursor-pointer ring-1 ring-[#C8FF08]/50 active:scale-95"
                title="Start Simulation"
                aria-label="Start Simulation"
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              </button>
            );
          }

          const handlePauseToggle = onTogglePlayPause || onStartSimulation;
          return (
            <button
              type="button"
              onClick={() => {
                if (handlePauseToggle) handlePauseToggle();
              }}
              className={cn(
                "p-1.5 rounded-lg border transition-all flex items-center justify-center shrink-0 shadow-sm cursor-pointer active:scale-95",
                isPaused
                  ? "bg-primary/25 text-[#C8FF08] border-[#C8FF08]/60 hover:bg-primary/35 shadow-[0_0_6px_rgba(200,255,8,0.3)]"
                  : "bg-amber-500/25 text-amber-300 border-amber-400/70 hover:bg-amber-500/35 shadow-[0_0_6px_rgba(245,158,11,0.3)]"
              )}
              title={isPaused ? "Resume Simulation" : "Pause Simulation"}
              aria-label={isPaused ? "Resume Simulation" : "Pause Simulation"}
            >
              {isPaused ? (
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              ) : (
                <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
              )}
            </button>
          );
        })()}

        {/* Reset Button */}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-lg border border-white/20 bg-black/25 text-white hover:text-[#C8FF08] hover:border-[#C8FF08]/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Reset Simulation"
            aria-label="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}

        {/* 4. SCR Change (20->1.6, 20->1.0) */}
        {(onSelectScrChangeMode || onSelectScrMode) && (() => {
          const isLoad04 = load === "0.4" || load === "0.4 pu";
          return (
            <div className={cn(
              "flex items-center gap-1 shrink-0 bg-[#051619]/90 px-2 py-1 rounded-lg border border-[#005E60]/50 transition-all",
              !isStarted && "opacity-50 pointer-events-none"
            )}>
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mr-0.5 whitespace-nowrap">
                SCR CHANGE:
              </span>
              <button
                type="button"
                disabled={!isStarted}
                onClick={() => {
                  if (onSelectScrChangeMode) onSelectScrChangeMode("20_1.6");
                  else if (onSelectScrMode) onSelectScrMode("20_1.6");
                }}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-mono font-bold rounded border transition-all cursor-pointer active:scale-95",
                  scrChangeMode === "20_1.6" || scrMode === "20_1.6"
                    ? "bg-amber-400/30 text-amber-300 border-amber-400/80 ring-1 ring-amber-400/50 shadow-[0_0_6px_rgba(251,191,36,0.3)]"
                    : "bg-black/40 text-white/70 border-white/20 hover:text-white"
                )}
                title="SCR Change: 20 → 1.6"
              >
                20→1.6
              </button>
              <button
                type="button"
                disabled={!isStarted || isLoad04}
                onClick={() => {
                  if (!isLoad04) {
                    if (onSelectScrChangeMode) onSelectScrChangeMode("20_1.0");
                    else if (onSelectScrMode) onSelectScrMode("20_1.0");
                  }
                }}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-mono font-bold rounded border transition-all",
                  isLoad04
                    ? "bg-black/30 text-white/30 border-white/10 cursor-not-allowed opacity-40"
                    : scrChangeMode === "20_1.0" || scrMode === "20_1.0"
                      ? "bg-amber-400/30 text-amber-300 border-amber-400/80 ring-1 ring-amber-400/50 shadow-[0_0_6px_rgba(251,191,36,0.3)] cursor-pointer active:scale-95"
                      : "bg-black/40 text-white/70 border-white/20 hover:text-white cursor-pointer active:scale-95"
                )}
                title={
                  isLoad04
                    ? "SCR Change 20→1.0 is not available when Load is 0.4 (only 20→1.6 is available for Load 0.4)"
                    : "SCR Change: 20 → 1.0"
                }
              >
                20→1.0
              </button>
            </div>
          );
        })()}

        {/* 5. Fault (Ag 0.5 pu) */}
        {onTriggerFault && (() => {
          const isLoad04 = load === "0.4" || load === "0.4 pu";
          const isScr20_16 = scrChangeMode === "20_1.6" || scrMode === "20_1.6";
          const isFaultAllowed = isLoad04 && isScr20_16;

          return (
            <div className={cn(
              "flex items-center gap-1 shrink-0 bg-[#051619]/90 px-2 py-1 rounded-lg border border-[#005E60]/50 transition-all",
              (!isStarted || !isFaultAllowed) && "opacity-40"
            )}>
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider mr-0.5">
                FAULT:
              </span>
              <button
                type="button"
                disabled={!isStarted || !isFaultAllowed}
                onClick={() => {
                  if (isFaultAllowed && typeof onTriggerFault === "function") {
                    onTriggerFault("ag_0.5");
                  }
                }}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-mono font-bold rounded border transition-all",
                  !isFaultAllowed
                    ? "bg-black/30 text-white/30 border-white/10 cursor-not-allowed"
                    : faultActive || simPhase === "FAULT" || fault === "ag_0.5"
                      ? "bg-purple-500/30 text-purple-200 border-purple-400/80 ring-1 ring-purple-400/50 shadow-[0_0_6px_rgba(192,132,252,0.3)] cursor-pointer active:scale-95"
                      : "bg-black/40 text-white/70 border-white/20 hover:text-white cursor-pointer active:scale-95"
                )}
                title={
                  !isFaultAllowed
                    ? "Fault (Ag 0.5 pu) can only be selected when Load is 0.4 and SCR Change 20→1.6 is selected"
                    : "Trigger Fault: Ag 0.5 pu"
                }
              >
                Ag 0.5 pu
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
