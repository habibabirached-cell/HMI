import { useEffect, useState } from "react";
import {
  WindFarmHeader,
  WindFarmControlsSubheader,
  WIND_FARM_SOLUTIONS,
  type WindFarmSolutionId,
} from "./WindFarmHeader";
import {
  ComparisonColumn,
  useWindFarmPlayback,
  type SystemStatus,
  type WindEventKind,
} from "./WindFarmCharts";

/**
 * Wind Farm — fridge-stabilizer concept.
 * Solutions bar on TOP (CFG8 + CFG11). Click places solution on the right.
 * Left  = WFMS1 (no solution).
 * Right = WFMS1 + breaker; close CB after placing → With-GFMe data + solution shown.
 */

const FAULTS = [
  { id: "abc", label: "Three phase", short: "ABC" },
  { id: "slg", label: "SLG", short: "SLG" },
  { id: "ll", label: "LL", short: "LL" },
] as const;

const LOADS = ["1 pu", "0.8 pu", "0.5 pu", "0 pu"] as const;

const BASE_SVG = "/svgs/WindFarm/WFMS1.svg";

function snapScr(v: number) {
  const clamped = Math.max(1, Math.min(20, v));
  return Math.round(clamped * 10) / 10;
}

function deriveStatus(
  side: "left" | "right",
  running: boolean,
  activeEvent: WindEventKind,
  eventApplied: boolean,
  elapsedMs: number,
  solutionConnected: boolean,
): SystemStatus {
  if (!running || !eventApplied || activeEvent === "none") return "Normal";
  const elapsedSec = elapsedMs / 1000;
  if (activeEvent === "scr") {
    if (elapsedSec < 0.6) return "Weak Grid Detected";
    if (elapsedSec < 1.4) {
      return side === "left" || !solutionConnected
        ? "Weak Grid Detected"
        : "Anchoring";
    }
    return "Stable";
  }
  if (activeEvent === "fault") {
    if (elapsedSec < 0.4) return "Fault Detected";
    if (elapsedSec < 1.4) {
      return side === "left" || !solutionConnected ? "Unstable" : "Anchoring";
    }
    return side === "left" || !solutionConnected ? "Unstable" : "Stable";
  }
  if (!solutionConnected || side === "left") return "Unstable";
  if (elapsedSec < 0.6) return "Unstable";
  if (elapsedSec < 1.4) return "Anchoring";
  return "Stable";
}

export function WindFarmDashboard() {
  const [running, setRunning] = useState(false);
  const [scr, setScr] = useState(20);
  const [fault, setFault] = useState<(typeof FAULTS)[number]["id"]>("slg");
  const [load, setLoad] = useState<(typeof LOADS)[number]>("1 pu");
  const [activeEvent, setActiveEvent] = useState<WindEventKind>("none");
  const [eventApplied, setEventApplied] = useState(false);
  const [eventAt, setEventAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  /** Solution placed on right (from top Solutions bar). */
  const [selectedSolution, setSelectedSolution] = useState<WindFarmSolutionId | null>(null);
  /** Breaker is always CLOSED (connected). */
  const breakerOpen = false;

  const { noGfme, withGfme, playIndex, reset, seekSteady, seekEvent } =
    useWindFarmPlayback(running);

  const faultMeta = FAULTS.find((f) => f.id === fault) ?? FAULTS[1];
  const solutionConnected = selectedSolution !== null;

  const leftRows = noGfme;
  const rightRows = solutionConnected ? withGfme : noGfme;

  useEffect(() => {
    if (!eventApplied || !running) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [eventApplied, running]);

  const elapsed = eventAt ? now - eventAt : 0;
  const leftStatus = deriveStatus("left", running, activeEvent, eventApplied, elapsed, solutionConnected);
  const rightStatus = deriveStatus("right", running, activeEvent, eventApplied, elapsed, solutionConnected);

  const applyEvent = (kind: WindEventKind) => {
    setActiveEvent(kind);
    setEventApplied(true);
    setEventAt(Date.now());
    setNow(Date.now());
    if (!running) setRunning(true);
    seekEvent(22.0);
  };

  const onStart = () => {
    if (running) {
      setRunning(false);
      return;
    }
    setEventApplied(false);
    setActiveEvent("none");
    setEventAt(null);
    seekSteady();
    setRunning(true);
  };

  const onReset = () => {
    setRunning(false);
    setEventApplied(false);
    setActiveEvent("none");
    setEventAt(null);
    setScr(20);
    setFault("slg");
    setLoad("1 pu");
    setSelectedSolution(null);
    reset();
  };

  const placeSolution = (id: WindFarmSolutionId) => {
    setSelectedSolution(id);
  };

  return (
    <div className="green-theme min-h-screen w-full bg-[#1e4a4a] text-white flex flex-col font-sans">
      <WindFarmHeader />
      <div className="px-4 pt-1.5 pb-0.5 shrink-0">
        <WindFarmControlsSubheader
          simState={running ? "FAULT_ACTIVE" : "IDLE"}
          onTogglePlayPause={onStart}
          onReset={onReset}
          selectedSolution={selectedSolution}
          breakerOpen={breakerOpen}
          onPlaceSolution={placeSolution}
        />
      </div>

      <div className="flex-1 min-h-0 px-2 sm:px-4 py-2">
        <div className="h-full min-h-[450px] grid grid-cols-1 lg:grid-cols-2 border border-white/50 bg-[#163d3d]/55">
          <div className="min-h-0 border-b lg:border-b-0 lg:border-r border-white/50">
            <ComparisonColumn
              columnId="left"
              diagramSrc={BASE_SVG}
              diagramAlt="Customer network without GE solution"
              rows={leftRows}
              playIndex={Math.min(playIndex, Math.max(0, leftRows.length - 1))}
              turbinesSpinning={running}
              scr={scr}
              onScrChange={(v) => {
                setScr(snapScr(v));
                applyEvent("scr");
              }}
              fault={fault}
              faultLabel={faultMeta.short}
              onFaultChange={(f) => {
                setFault(f);
                applyEvent("fault");
              }}
              load={load}
              onLoadChange={(l) => {
                setLoad(l);
                applyEvent("load");
              }}
              activeEvent={activeEvent}
              status={leftStatus}
            />
          </div>

          <div className="min-h-0">
            <ComparisonColumn
              columnId="right"
              diagramSrc={BASE_SVG}
              diagramAlt="Customer network with GE solution via breaker"
              rows={rightRows}
              playIndex={Math.min(playIndex, Math.max(0, rightRows.length - 1))}
              turbinesSpinning={running}
              scr={scr}
              onScrChange={(v) => {
                setScr(snapScr(v));
                applyEvent("scr");
              }}
              fault={fault}
              faultLabel={faultMeta.short}
              onFaultChange={(f) => {
                setFault(f);
                applyEvent("fault");
              }}
              load={load}
              onLoadChange={(l) => {
                setLoad(l);
                applyEvent("load");
              }}
              activeEvent={activeEvent}
              status={rightStatus}
              breakerOpen={false}
              solutionId={selectedSolution}
              solutionSvg={
                selectedSolution
                  ? WIND_FARM_SOLUTIONS[selectedSolution].display
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
