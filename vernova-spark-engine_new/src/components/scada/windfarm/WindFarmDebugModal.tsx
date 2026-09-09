import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Copy, Check, Bug, Activity, Clock, FileText } from "lucide-react";
import type { TelemetryPoint, WindCsvRow } from "./WindFarmCharts";

export interface WindFarmDebugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simTime: number;
  simPhase: "IDLE" | "START_LOOP" | "SCR_CHANGE" | "FAULT";
  simState: "IDLE" | "RUNNING_NORMAL" | "FAULT_ACTIVE" | "STABILIZING" | "STABILIZED";
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  leftIdx: number;
  rightIdx: number;
  noGfmeCsv: WindCsvRow[];
  gfmeCsv: WindCsvRow[];
  leftPoints: TelemetryPoint[];
  rightPoints: TelemetryPoint[];
  leftCsvPath: string;
  rightCsvPath: string;
  indices: {
    startIdx: number;
    endIdx: number;
    t219Left: number;
    t219Right: number;
    lastLeft: number;
    lastRight: number;
  };
  dtSim: number;
  samplesPerFrame: number;
  intervalMs: number;
}

export function WindFarmDebugModal({
  open,
  onOpenChange,
  simTime,
  simPhase,
  simState,
  isPaused,
  onTogglePause,
  onReset,
  leftIdx,
  rightIdx,
  noGfmeCsv,
  gfmeCsv,
  leftPoints,
  rightPoints,
  leftCsvPath,
  rightCsvPath,
  indices,
  dtSim,
  samplesPerFrame,
  intervalMs,
}: WindFarmDebugModalProps) {
  const [copied, setCopied] = React.useState(false);

  const leftRow = noGfmeCsv[leftIdx] || noGfmeCsv[0] || null;
  const rightRow = gfmeCsv[rightIdx] || gfmeCsv[0] || leftRow;

  const leftActualTime = leftRow ? Number(leftRow.t) : 0;
  const rightActualTime = rightRow ? Number(rightRow.t) : 0;

  const startLoopTimeStart = noGfmeCsv[indices.startIdx]?.t ?? 4.5;
  const startLoopTimeEnd = noGfmeCsv[indices.endIdx]?.t ?? 5.0;

  const recentLeft = leftPoints.slice(-10);
  const recentRight = rightPoints.slice(-10);

  const copyDebugJson = () => {
    const payload = {
      simTime,
      simPhase,
      simState,
      dtSim,
      samplesPerFrame,
      intervalMs,
      left: {
        file: leftCsvPath,
        currentRowIndex: leftIdx,
        actualSourceTimeSec: leftActualTime,
        totalRows: noGfmeCsv.length,
        values: leftRow,
      },
      right: {
        file: rightCsvPath,
        currentRowIndex: rightIdx,
        actualSourceTimeSec: rightActualTime,
        totalRows: gfmeCsv.length,
        values: rightRow,
      },
      loopIndices: indices,
      recentPointsSample: recentLeft.map((p, i) => ({
        pointIndex: leftPoints.length - recentLeft.length + i,
        plotSimTime: p.simTime,
        leftVa: p.va,
        leftVb: p.vb,
        leftVc: p.vc,
        leftP: p.p,
        leftQ: p.q,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#041518]/98 border border-lime/40 text-white shadow-[0_0_40px_rgba(200,255,8,0.25)] p-4 sm:p-6">
        <DialogHeader className="border-b border-lime/20 pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-lime/20 border border-lime/40 text-lime shadow-[0_0_12px_rgba(200,255,8,0.3)]">
                <Bug className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Wind Farm Telemetry & Time Data Inspector</span>
                  <span className="rounded bg-lime/20 px-2 py-0.5 text-[10px] font-mono font-bold text-lime border border-lime/30 uppercase tracking-wider">
                    Debug Mode
                  </span>
                </DialogTitle>
                <p className="text-xs text-diagram-line/75 font-mono">
                  Exact CSV row indices and actual source timestamps powering the live simulation
                </p>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onTogglePause}
                className="h-8 text-xs font-mono border-white/30 hover:border-lime hover:text-lime bg-black/40"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 mr-1 text-lime" /> : <Pause className="w-3.5 h-3.5 mr-1 text-amber-400" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onReset}
                className="h-8 text-xs font-mono border-white/30 hover:border-red-400 hover:text-red-400 bg-black/40"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyDebugJson}
                className="h-8 text-xs font-mono border-lime/50 text-lime bg-lime/10 hover:bg-lime/20"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? "Copied" : "Copy JSON"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {/* Top Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="bg-black/50 p-2.5 rounded-lg border border-white/10 flex flex-col gap-1">
              <span className="text-[10px] text-diagram-line/70 font-sans uppercase font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Plot Sim Time (X)
              </span>
              <span className="text-base font-bold text-cyan-300">
                {simTime.toFixed(3)} s
              </span>
              <span className="text-[9px] text-white/50">Elapsed on chart X-axis</span>
            </div>

            <div className="bg-black/50 p-2.5 rounded-lg border border-white/10 flex flex-col gap-1">
              <span className="text-[10px] text-diagram-line/70 font-sans uppercase font-bold flex items-center gap-1">
                <Activity className="w-3 h-3 text-lime" />
                Simulation Phase
              </span>
              <span className="text-sm font-bold text-lime">
                {simPhase}
              </span>
              <span className="text-[9px] text-white/50">State: {simState}</span>
            </div>

            <div className="bg-black/50 p-2.5 rounded-lg border border-white/10 flex flex-col gap-1">
              <span className="text-[10px] text-diagram-line/70 font-sans uppercase font-bold flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-300" />
                Resolution (Δt)
              </span>
              <span className="text-base font-bold text-amber-300">
                {(dtSim * 1000).toFixed(1)} ms
              </span>
              <span className="text-[9px] text-white/50">{samplesPerFrame} pts / {intervalMs}ms frame</span>
            </div>

            <div className="bg-black/50 p-2.5 rounded-lg border border-white/10 flex flex-col gap-1">
              <span className="text-[10px] text-diagram-line/70 font-sans uppercase font-bold">
                Buffer Points Total
              </span>
              <span className="text-base font-bold text-white">
                {leftPoints.length.toLocaleString()} pts
              </span>
              <span className="text-[9px] text-white/50">100% points preserved</span>
            </div>
          </div>

          {/* Side-by-Side Actual Source Time Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left Channel (Without Solution) */}
            <div className="bg-black/45 rounded-xl border border-cyan-400/40 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-cyan-400/20">
                <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#38bdf8]" />
                  Left: Without Solution
                </span>
                <span className="text-[10px] font-mono text-cyan-200/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-400/30">
                  Row #{leftIdx} / {noGfmeCsv.length}
                </span>
              </div>

              <div className="bg-[#05191c] rounded-lg p-2.5 border border-cyan-500/20 font-mono text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Actual Source CSV Time:</span>
                  <span className="font-bold text-cyan-300 text-sm bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/40">
                    {leftActualTime.toFixed(4)} s
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Active CSV File:</span>
                  <span className="text-white/90 truncate max-w-[200px]" title={leftCsvPath}>
                    {leftCsvPath.split("/").pop()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Active Phase Status:</span>
                  <span className="text-diagram-line/90 font-bold">
                    {simPhase === "START_LOOP"
                      ? `Pre-Event Loop (Row ${indices.startIdx} [${Number(startLoopTimeStart).toFixed(3)}s] ↔ Row ${indices.endIdx} [${Number(startLoopTimeEnd).toFixed(3)}s])`
                      : simPhase === "SCR_CHANGE"
                        ? `Advancing Event → Target Row ${indices.t219Left} (${noGfmeCsv[indices.t219Left]?.t ?? 21.9}s)`
                        : simPhase === "FAULT"
                          ? `Advancing Fault → Target Row ${indices.lastLeft} (${noGfmeCsv[indices.lastLeft]?.t ?? 25.0}s)`
                          : `Idle`}
                  </span>
                </div>
              </div>

              {/* Instant Telemetry Values */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">Va (R)</span>
                  <span className="font-bold text-red-400">{leftRow ? Number(leftRow.va).toFixed(2) : "0.00"} kV</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">Vb (Y)</span>
                  <span className="font-bold text-amber-300">{leftRow ? Number(leftRow.vb).toFixed(2) : "0.00"} kV</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">Vc (B)</span>
                  <span className="font-bold text-sky-400">{leftRow ? Number(leftRow.vc).toFixed(2) : "0.00"} kV</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">P_pcc</span>
                  <span className="font-bold text-lime">{leftRow ? Number(leftRow.p).toFixed(2) : "0.00"} MW</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">Q_pcc</span>
                  <span className="font-bold text-teal-300">{leftRow ? Number(leftRow.q).toFixed(2) : "0.00"} MVAR</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">V_rms</span>
                  <span className="font-bold text-purple-300">{leftRow ? Number(leftRow.vRms).toFixed(3) : "0.000"} pu</span>
                </div>
              </div>
            </div>

            {/* Right Channel (With Solution) */}
            <div className="bg-black/45 rounded-xl border border-lime/40 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-lime/20">
                <span className="text-xs font-bold text-lime font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-lime shadow-[0_0_6px_#c8ff08]" />
                  Right: With Solution
                </span>
                <span className="text-[10px] font-mono text-lime/90 bg-lime-950/60 px-1.5 py-0.5 rounded border border-lime/30">
                  Row #{rightIdx} / {gfmeCsv.length || noGfmeCsv.length}
                </span>
              </div>

              <div className="bg-[#0b1c09] rounded-lg p-2.5 border border-lime-500/20 font-mono text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Actual Source CSV Time:</span>
                  <span className="font-bold text-lime text-sm bg-lime-950/80 px-2 py-0.5 rounded border border-lime/40">
                    {rightActualTime.toFixed(4)} s
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Active CSV File:</span>
                  <span className="text-white/90 truncate max-w-[200px]" title={rightCsvPath}>
                    {rightCsvPath.split("/").pop()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Active Phase Status:</span>
                  <span className="text-diagram-line/90 font-bold">
                    {simPhase === "START_LOOP"
                      ? `Pre-Event Loop (Row ${indices.startIdx} [${Number(startLoopTimeStart).toFixed(3)}s] ↔ Row ${indices.endIdx} [${Number(startLoopTimeEnd).toFixed(3)}s])`
                      : simPhase === "SCR_CHANGE"
                        ? `Advancing Event → Target Row ${indices.t219Right} (${gfmeCsv[indices.t219Right]?.t ?? 21.9}s)`
                        : simPhase === "FAULT"
                          ? `Advancing Fault → Target Row ${indices.lastRight} (${gfmeCsv[indices.lastRight]?.t ?? 25.0}s)`
                          : `Idle`}
                  </span>
                </div>
              </div>

              {/* Instant Telemetry Values */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">Va (R)</span>
                  <span className="font-bold text-red-400">{rightRow ? Number(rightRow.va).toFixed(2) : "0.00"} kV</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">Vb (Y)</span>
                  <span className="font-bold text-amber-300">{rightRow ? Number(rightRow.vb).toFixed(2) : "0.00"} kV</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">Vc (B)</span>
                  <span className="font-bold text-sky-400">{rightRow ? Number(rightRow.vc).toFixed(2) : "0.00"} kV</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">P_pcc</span>
                  <span className="font-bold text-lime">{rightRow ? Number(rightRow.p).toFixed(2) : "0.00"} MW</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">Q_pcc</span>
                  <span className="font-bold text-teal-300">{rightRow ? Number(rightRow.q).toFixed(2) : "0.00"} MVAR</span>
                </div>
                <div className="bg-black/60 p-1.5 rounded border border-white/10 text-center">
                  <span className="text-white/50 block">V_rms</span>
                  <span className="font-bold text-purple-300">{rightRow ? Number(rightRow.vRms).toFixed(3) : "0.000"} pu</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Recent Stream Data Table */}
          <div className="bg-black/50 rounded-xl border border-white/15 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-lime" />
                Live Telemetry Stream Buffer (Latest 10 Points)
              </span>
              <span className="text-[10px] font-mono text-diagram-line/70">
                Rate: 1 point / {dtSim * 1000}ms
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/10 max-h-[220px]">
              <table className="w-full text-left font-mono text-[10px] text-white">
                <thead className="bg-[#062125] text-diagram-line/80 uppercase tracking-wider sticky top-0 border-b border-white/20">
                  <tr>
                    <th className="px-2 py-1.5"># Point</th>
                    <th className="px-2 py-1.5">Plot Time (s)</th>
                    <th className="px-2 py-1.5 text-cyan-300">Left Source (s)</th>
                    <th className="px-2 py-1.5 text-red-400">Va (kV)</th>
                    <th className="px-2 py-1.5 text-amber-300">Vb (kV)</th>
                    <th className="px-2 py-1.5 text-sky-400">Vc (kV)</th>
                    <th className="px-2 py-1.5 text-lime">P (MW)</th>
                    <th className="px-2 py-1.5 text-teal-300">Q (MVAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/40">
                  {recentLeft.map((pt, idx) => {
                    const absIdx = leftPoints.length - recentLeft.length + idx;
                    // Approximate source row from index
                    const estimatedSourceTime = ((indices.startIdx + (absIdx % (indices.endIdx - indices.startIdx))) * dtSim).toFixed(3);
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-2 py-1 text-white/50">#{absIdx + 1}</td>
                        <td className="px-2 py-1 font-bold text-white">{pt.simTime.toFixed(3)}s</td>
                        <td className="px-2 py-1 text-cyan-300">{leftActualTime.toFixed(3)}s</td>
                        <td className="px-2 py-1 text-red-400">{Number(pt.va).toFixed(2)}</td>
                        <td className="px-2 py-1 text-amber-300">{Number(pt.vb).toFixed(2)}</td>
                        <td className="px-2 py-1 text-sky-400">{Number(pt.vc).toFixed(2)}</td>
                        <td className="px-2 py-1 text-lime">{Number(pt.p).toFixed(2)}</td>
                        <td className="px-2 py-1 text-teal-300">{Number(pt.q).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {recentLeft.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-white/40">
                        Start the simulation to stream live data points.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
