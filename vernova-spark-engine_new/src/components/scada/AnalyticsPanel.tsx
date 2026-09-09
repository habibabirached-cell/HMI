import type { MetricSeries } from "@/lib/simData";
import type { UseCase, EventMarker } from "@/lib/types";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";

export function AnalyticsPanel({
  useCase,
  activeEvent,
  eventMarkers,
  grid,
  wind,
  playbackTime,
  playing,
}: {
  useCase: UseCase | null;
  activeEvent: string | null;
  eventMarkers: EventMarker[];
  grid: MetricSeries;
  wind: MetricSeries;
  playbackTime: number;
  playing: boolean;
}) {
  const activeMarker = eventMarkers.find((e) => e.type === activeEvent);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/40 bg-[#163d3d]/80 p-3 text-xs text-white",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-lime">Analytics</span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
            playing ? "text-lime" : "text-white/50",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", playing ? "bg-lime" : "bg-white/30")} />
          {playing ? "Replaying" : "Idle"}
        </span>
      </div>

      {useCase ? (
        <div className="mb-2 rounded-md border border-white/20 bg-black/30 px-2 py-1.5">
          <div className="font-semibold text-lime">{useCase.name}</div>
          <div className="text-white/55">
            {useCase.network} · {useCase.hybrid}
          </div>
        </div>
      ) : (
        <p className="mb-2 text-white/50">Loading scenario data…</p>
      )}

      <div className="mb-2 flex justify-between tabular-nums text-white/80">
        <span>Playback time</span>
        <span className="font-bold text-lime">{playbackTime.toFixed(2)} s</span>
      </div>

      {activeMarker && (
        <div className="mb-2 rounded-md border border-lime/40 bg-lime/10 px-2 py-1.5">
          <div className="font-bold text-lime">{activeMarker.label}</div>
          <div className="text-white/70">Triggered at t = {activeMarker.timeSec}s</div>
        </div>
      )}

      <div className="space-y-2 border-t border-white/25 pt-2">
        <div>
          <div className="flex justify-between">
            <span className="text-white/80">Grid P (MW)</span>
            <span className="font-bold text-lime">{grid.last?.p.toFixed(2) ?? "—"}</span>
          </div>
          <Sparkline values={grid.points.map((p) => p.p)} height={32} />
        </div>
        <div>
          <div className="flex justify-between">
            <span className="text-white/80">Wind P (MW)</span>
            <span className="font-bold text-lime">{wind.last?.p.toFixed(2) ?? "—"}</span>
          </div>
          <Sparkline values={wind.points.map((p) => p.p)} height={32} />
        </div>
        <div>
          <div className="flex justify-between">
            <span className="text-white/80">Voltage (pu)</span>
            <span className="font-bold text-lime">{grid.last?.v.toFixed(3) ?? "—"}</span>
          </div>
          <Sparkline values={grid.points.map((p) => p.v)} height={32} />
        </div>
      </div>

      {eventMarkers.length > 0 && (
        <div className="mt-2 border-t border-white/25 pt-2">
          <div className="mb-1 font-semibold text-lime/90">CSV event markers</div>
          {eventMarkers.map((e) => (
            <div
              key={`${e.type}-${e.timeSec}`}
              className={cn(
                "flex justify-between py-0.5",
                activeEvent === e.type ? "text-lime" : "text-white/60",
              )}
            >
              <span>{e.label}</span>
              <span className="tabular-nums">{e.timeSec}s</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
